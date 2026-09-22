/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Edge-AI Inference Engine (Simulation)
   Models simulated: MobileNetV3 (disease), YOLOv8-nano (pest),
   XGBoost (drought), LSTM (flood), Hybrid CNN (nutrition),
   Rule-based (irrigation), Regression (harvest).
   All inference is on-device — no cloud dependency.
═══════════════════════════════════════════════════════════════ */

const AIEngine = (() => {

  /* ── Inference counter ───────────────────────────────────── */
  let inferenceCount = 0;

  /* ── Disease labels (MobileNetV3 output classes) ─────────── */
  const DISEASE_CLASSES = [
    'Healthy',
    'Late Blight',
    'Wheat Rust',
    'Powdery Mildew',
    'Mosaic Virus',
    'Leaf Spot',
    'Loose Smut',
    'Bacterial Wilt',
  ];

  /* ── Pest labels (YOLOv8-nano) ───────────────────────────── */
  const PEST_CLASSES = [
    'None Detected',
    'Aphids',
    'Stem Borer',
    'Whitefly',
    'Desert Locust',
    'Spider Mite',
    'Thrips',
    'Leaf Miner',
  ];

  /* ── Nutrient deficiency mapping ─────────────────────────── */
  const NUTRIENT_MAP = {
    nitrogen:   'Nitrogen (N) Deficiency',
    phosphorus: 'Phosphorus (P) Deficiency',
    potassium:  'Potassium (K) Deficiency',
    iron:       'Iron (Fe) Deficiency',
    zinc:       'Zinc (Zn) Deficiency',
  };

  /* ── Recommendation templates ────────────────────────────── */
  const RECS = {
    healthy:    'All parameters nominal. Continue monitoring. Next scheduled inspection in 6h.',
    disease:    (d, c) => `⚠ Disease alert: ${d} detected with ${c}% confidence. Apply fungicide treatment immediately. Isolate affected zone.`,
    pest:       (p, c) => `🐛 Pest alert: ${p} detected at ${c}% confidence. Spray neem-based biopesticide. Alert neighbouring farms.`,
    flood:      (p) => `🌊 Flood risk at ${p}% probability. Open drainage gates. Move livestock to high ground. Notify district authorities.`,
    drought:    (p) => `☀ Drought stress at ${p}% risk. Activate drip irrigation immediately. Apply mulching to retain soil moisture.`,
    irrigation: (need) => need === 'Irrigate Now'
      ? '💧 Soil moisture critically low. Activate pump immediately. Target moisture: 55–65%.'
      : need === 'Irrigate Soon'
        ? '💧 Soil moisture below optimal. Schedule irrigation within 4 hours.'
        : 'Irrigation not required. Soil moisture within optimal range.',
    nutrient:   (el) => `🧪 ${el} detected. Apply recommended fertiliser dose. Re-test soil in 72h.`,
    harvest:    (days) => days <= 5
      ? `🚜 Crop ready for harvest! Estimated optimal window: ${days}–${days + 3} days. Book harvesting equipment.`
      : `📅 Harvest in approximately ${days} days. Monitor grain moisture daily.`,
    heat:       (t) => `🔥 Extreme heat stress (${t}°C). Activate shade nets, increase irrigation frequency. Risk of crop failure if unaddressed.`,
  };

  /* ── Subscribers ─────────────────────────────────────────── */
  const subscribers = [];

  /* ── Last output cache ───────────────────────────────────── */
  let lastOutput = null;

  /* ══════════════════════════════════════════════════════════
     CORE INFERENCE — called once per sensor tick
  ══════════════════════════════════════════════════════════ */
  function infer(sensorState, simHour, injections) {
    inferenceCount++;

    const s   = sensorState;
    const inj = injections;

    /* ── 1. Crop Health Score (0-100) ────────────────────── */
    let health = 100;
    health -= _moisturePenalty(s.moisture);
    health -= _phPenalty(s.ph);
    health -= _tempPenalty(s.airTemp);
    health -= _npkPenalty(s.n, s.p, s.k);
    if (inj.disease.active) health -= inj.disease.severity * 0.45;
    if (inj.pest.active)    health -= inj.pest.density    * 0.25;
    if (inj.drought.active) health -= inj.drought.severity * 0.30;
    health = Math.round(Math.max(0, Math.min(100, health + gaussian(0, 1))));

    const healthLabel  = health >= 80 ? 'Excellent' : health >= 60 ? 'Good' : health >= 40 ? 'Fair' : health >= 20 ? 'Poor' : 'Critical';
    const healthConf   = Math.round(clamp(85 + gaussian(0, 4), 70, 99));

    /* ── 2. Disease Detection (MobileNetV3) ──────────────── */
    let diseaseLabel, diseaseConf, diseaseAlert = false;
    if (inj.disease.active && inj.disease.type) {
      const mapping = {
        blight:  'Late Blight',
        rust:    'Wheat Rust',
        smut:    'Loose Smut',
        mildew:  'Powdery Mildew',
        mosaic:  'Mosaic Virus',
      };
      diseaseLabel = mapping[inj.disease.type] || 'Unknown Disease';
      diseaseConf  = Math.round(clamp(inj.disease.severity * 0.9 + gaussian(0, 3), 55, 99));
      diseaseAlert = diseaseConf > 60;
    } else {
      diseaseLabel = 'Healthy';
      diseaseConf  = Math.round(clamp(94 + gaussian(0, 3), 80, 99));
    }

    /* ── 3. Pest Detection (YOLOv8-nano) ─────────────────── */
    let pestLabel, pestConf, pestAlert = false;
    if (inj.pest.active && inj.pest.type) {
      const mapping = {
        aphids:    'Aphids',
        stemBorer: 'Stem Borer',
        whitefly:  'Whitefly',
        locust:    'Desert Locust',
        mite:      'Spider Mite',
      };
      pestLabel = mapping[inj.pest.type] || 'Unknown Pest';
      pestConf  = Math.round(clamp(inj.pest.density * 0.92 + gaussian(0, 3), 50, 99));
      pestAlert = pestConf > 55;
    } else {
      pestLabel = 'None Detected';
      pestConf  = Math.round(clamp(96 + gaussian(0, 2), 88, 99));
    }

    /* ── 4. Irrigation Need ──────────────────────────────── */
    let irrigLabel, irrigConf;
    const m = s.moisture;
    if (m < 25 || (inj.drought.active && m < 35)) {
      irrigLabel = 'Irrigate Now';
      irrigConf  = Math.round(clamp(92 + gaussian(0, 2), 80, 99));
    } else if (m < 40) {
      irrigLabel = 'Irrigate Soon';
      irrigConf  = Math.round(clamp(84 + gaussian(0, 3), 70, 95));
    } else if (m > 82) {
      irrigLabel = 'Waterlogged';
      irrigConf  = Math.round(clamp(88 + gaussian(0, 3), 75, 98));
    } else {
      irrigLabel = 'Not Required';
      irrigConf  = Math.round(clamp(91 + gaussian(0, 3), 78, 99));
    }

    /* ── 5. Flood Probability (LSTM) ─────────────────────── */
    let floodProb;
    if (inj.flood.active) {
      const base = inj.flood.level === 'flash'   ? 88
                 : inj.flood.level === 'cyclone' ? 95
                 : inj.flood.level === 'river'   ? 76
                 : 65;
      floodProb = Math.round(clamp(base + gaussian(0, 3), 50, 99));
    } else {
      const rfFactor = Math.min(s.rainfall / 80, 1);
      const wlFactor = Math.min(Math.max((s.waterLevel - 1.5) / 2, 0), 1);
      floodProb = Math.round(clamp((rfFactor * 40 + wlFactor * 35 + gaussian(0, 2)), 0, 99));
    }
    const floodLabel = floodProb > 70 ? 'High Risk'
                     : floodProb > 40 ? 'Moderate'
                     : floodProb > 15 ? 'Low Risk'
                     : 'Minimal';
    const floodConf  = Math.round(clamp(88 + gaussian(0, 3), 75, 98));

    /* ── 6. Drought Risk (XGBoost) ───────────────────────── */
    let droughtProb;
    if (inj.drought.active) {
      const base = inj.drought.severity === 0  ? 5
                 : inj.drought.severity < 35   ? 45
                 : inj.drought.severity < 65   ? 68
                 : 88;
      droughtProb = Math.round(clamp(base + gaussian(0, 3), 0, 99));
    } else {
      const mFactor = Math.max((40 - s.moisture) / 40, 0);
      const tFactor = Math.min(Math.max((s.airTemp - 35) / 15, 0), 1);
      droughtProb = Math.round(clamp((mFactor * 35 + tFactor * 30 + gaussian(0, 2)), 0, 99));
    }
    const droughtLabel = droughtProb > 70 ? 'Severe Risk'
                       : droughtProb > 45 ? 'Moderate'
                       : droughtProb > 20 ? 'Low Risk'
                       : 'None';
    const droughtConf  = Math.round(clamp(86 + gaussian(0, 3), 72, 98));

    /* ── 7. Nutrient Deficiency ──────────────────────────── */
    let nutrientLabel, nutrientConf, nutrientAlert = false;
    if (inj.nutrient.active && inj.nutrient.element) {
      nutrientLabel = NUTRIENT_MAP[inj.nutrient.element] || 'Multi-nutrient Deficit';
      nutrientConf  = Math.round(clamp(inj.nutrient.deficit * 0.88 + gaussian(0, 3), 45, 99));
      nutrientAlert = nutrientConf > 50;
    } else {
      // Detect from NPK thresholds
      if (s.n < 90)       { nutrientLabel = 'Nitrogen Low';     nutrientConf = 82; nutrientAlert = true; }
      else if (s.p < 35)  { nutrientLabel = 'Phosphorus Low';   nutrientConf = 78; nutrientAlert = true; }
      else if (s.k < 90)  { nutrientLabel = 'Potassium Low';    nutrientConf = 80; nutrientAlert = true; }
      else {
        nutrientLabel = 'Balanced';
        nutrientConf  = Math.round(clamp(93 + gaussian(0, 2), 85, 99));
      }
    }

    /* ── 8. Harvest Readiness ────────────────────────────── */
    const daysToHarvest = _estimateHarvestDays(s, health);
    const harvestLabel  = daysToHarvest <= 3 ? 'Ready Now!'
                        : daysToHarvest <= 7 ? `${daysToHarvest}d window`
                        : `~${daysToHarvest} days`;
    const harvestConf   = Math.round(clamp(80 + gaussian(0, 5), 65, 95));

    /* ── Composite recommendation ────────────────────────── */
    let recommendation, recClass = '';
    if (floodProb > 70) {
      recommendation = RECS.flood(floodProb);
      recClass = 'danger-bg';
    } else if (inj.heat.active && s.airTemp > 40) {
      recommendation = RECS.heat(s.airTemp.toFixed(1));
      recClass = 'danger-bg';
    } else if (diseaseAlert) {
      recommendation = RECS.disease(diseaseLabel, diseaseConf);
      recClass = 'warn-bg';
    } else if (pestAlert) {
      recommendation = RECS.pest(pestLabel, pestConf);
      recClass = 'warn-bg';
    } else if (droughtProb > 55) {
      recommendation = RECS.drought(droughtProb);
      recClass = 'warn-bg';
    } else if (nutrientAlert) {
      recommendation = RECS.nutrient(nutrientLabel);
      recClass = 'warn-bg';
    } else if (irrigLabel === 'Irrigate Now') {
      recommendation = RECS.irrigation(irrigLabel);
      recClass = 'warn-bg';
    } else if (daysToHarvest <= 5) {
      recommendation = RECS.harvest(daysToHarvest);
      recClass = '';
    } else {
      recommendation = RECS.healthy;
      recClass = '';
    }

    /* ── Package output ──────────────────────────────────── */
    lastOutput = {
      inferenceCount,
      ts: Date.now(),

      health:   { label: healthLabel,   conf: healthConf,   value: health,       alert: health < 40 },
      disease:  { label: diseaseLabel,  conf: diseaseConf,  alert: diseaseAlert },
      pest:     { label: pestLabel,     conf: pestConf,     alert: pestAlert },
      irrigation:{ label: irrigLabel,  conf: irrigConf,    alert: irrigLabel === 'Irrigate Now' },
      flood:    { label: floodLabel,    conf: floodConf,    prob: floodProb,     alert: floodProb > 60 },
      drought:  { label: droughtLabel,  conf: droughtConf,  prob: droughtProb,   alert: droughtProb > 55 },
      nutrient: { label: nutrientLabel, conf: nutrientConf, alert: nutrientAlert },
      harvest:  { label: harvestLabel,  conf: harvestConf,  days: daysToHarvest, alert: daysToHarvest <= 3 },

      recommendation,
      recClass,
      simHour,
    };

    subscribers.forEach(fn => fn(lastOutput));
    return lastOutput;
  }

  /* ── Penalty functions ─────────────────────────────────── */
  function _moisturePenalty(m) {
    if (m < 15) return 40;
    if (m < 25) return 25;
    if (m < 35) return 10;
    if (m > 88) return 30;
    if (m > 78) return 12;
    return 0;
  }

  function _phPenalty(ph) {
    if (ph < 5.0 || ph > 8.5) return 25;
    if (ph < 5.5 || ph > 7.8) return 12;
    return 0;
  }

  function _tempPenalty(t) {
    if (t > 45 || t < 5)  return 30;
    if (t > 40 || t < 10) return 15;
    if (t > 35) return 5;
    return 0;
  }

  function _npkPenalty(n, p, k) {
    let pen = 0;
    if (n < 80)  pen += 15;
    if (n < 50)  pen += 10;
    if (p < 30)  pen += 12;
    if (k < 80)  pen += 12;
    return pen;
  }

  function _estimateHarvestDays(s, health) {
    // Base: 18 days from now
    let days = 18;
    days -= Math.floor(health / 10);             // healthier = sooner
    days += s.airTemp > 38 ? 3 : 0;             // heat delay
    days += s.moisture < 30 ? 2 : 0;            // drought delay
    days -= s.light > 60 ? 2 : 0;               // good light = faster
    days += s.n < 100 ? 3 : 0;                  // nutrient deficiency = slower
    return Math.max(1, Math.min(30, days + Math.round(gaussian(0, 1))));
  }

  /* ── Utility ─────────────────────────────────────────────── */
  function gaussian(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ── Public API ──────────────────────────────────────────── */
  function subscribe(fn) { subscribers.push(fn); }
  function getLastOutput() { return lastOutput; }
  function getInferenceCount() { return inferenceCount; }

  return { infer, subscribe, getLastOutput, getInferenceCount };
})();
