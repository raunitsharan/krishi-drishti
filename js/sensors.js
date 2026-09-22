/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Sensor Simulation Engine
   Simulates: soil moisture, NPK, pH, soil temp, air temp,
   humidity, rainfall, light, wind speed, water level,
   solar power, battery, CPU, RAM.
   Features: Gaussian noise, slow drift, diurnal cycles,
   injection overrides, threshold alerting.
═══════════════════════════════════════════════════════════════ */

const SensorEngine = (() => {

  /* ── Tick interval (ms) ─────────────────────────────────── */
  const TICK_MS = 1800;

  /* ── Injection overrides (set by ProblemInjector) ────────── */
  const injections = {
    flood:    { active: false, level: 0 },
    drought:  { active: false, severity: 0, days: 0 },
    disease:  { active: false, type: '', severity: 0 },
    pest:     { active: false, type: '', density: 0 },
    nutrient: { active: false, element: '', deficit: 0 },
    heat:     { active: false, temp: 0, days: 0 },
  };

  /* ── Sensor state (current values) ─────────────────────── */
  const state = {
    moisture:  55,    // % (optimal 40-70)
    n:         180,   // mg/kg
    p:         95,    // mg/kg
    k:         210,   // mg/kg
    ph:        6.8,   // pH (optimal 6.0-7.5)
    soilTemp:  24,    // °C
    airTemp:   29,    // °C
    humidity:  62,    // %RH
    rainfall:  0,     // mm/h
    light:     52,    // klux
    wind:      8,     // km/h
    waterLevel:1.2,   // m (canal level)
    solar:     18,    // W (panel output)
    battery:   87,    // %
    cpu:       34,    // % (RPi 4B)
    ram:       48,    // %
  };

  /* ── Slow drift accumulators ────────────────────────────── */
  const drift = {
    moisture:   0,
    airTemp:    0,
    humidity:   0,
    waterLevel: 0,
  };

  /* ── Thresholds for alerting ─────────────────────────────── */
  const THRESHOLDS = {
    moisture:   { low: 25,  high: 85,  unit: '%',    name: 'Soil Moisture' },
    ph:         { low: 5.5, high: 8.0, unit: 'pH',   name: 'Soil pH' },
    soilTemp:   { low: 8,   high: 38,  unit: '°C',   name: 'Soil Temp' },
    airTemp:    { low: 5,   high: 42,  unit: '°C',   name: 'Air Temp' },
    humidity:   { low: 20,  high: 92,  unit: '%RH',  name: 'Humidity' },
    rainfall:   { low: 0,   high: 80,  unit: 'mm/h', name: 'Rainfall' },
    waterLevel: { low: 0.3, high: 3.5, unit: 'm',    name: 'Water Level' },
    n:          { low: 80,  high: 350, unit: 'mg/kg',name: 'Nitrogen' },
    p:          { low: 30,  high: 200, unit: 'mg/kg',name: 'Phosphorus' },
    k:          { low: 80,  high: 350, unit: 'mg/kg',name: 'Potassium' },
    battery:    { low: 15,  high: 100, unit: '%',    name: 'Battery' },
  };

  /* ── Subscribers ─────────────────────────────────────────── */
  const subscribers = [];

  /* ── Diurnal time (simulated hour 0-23) ─────────────────── */
  let simHour  = 10;    // start at 10 AM
  let simTicks = 0;
  const TICKS_PER_HOUR = 20;   // one sim-hour every 20 real ticks

  /* ── Noise helper ────────────────────────────────────────── */
  function gaussian(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ── Diurnal profile helpers ─────────────────────────────── */
  // Returns 0-1 intensity for a given hour with peak at peakH
  function diurnal(hour, peakH = 13, width = 6) {
    const d = Math.abs(((hour - peakH + 12) % 24) - 12);
    return Math.max(0, 1 - d / width);
  }

  /* ══════════════════════════════════════════════════════════
     TICK — compute one sensor update
  ══════════════════════════════════════════════════════════ */
  function tick() {
    simTicks++;
    if (simTicks % TICKS_PER_HOUR === 0) {
      simHour = (simHour + 1) % 24;
    }

    const h = simHour;
    const daylight = diurnal(h, 13, 7);
    const isDry    = injections.drought.active;
    const isFlood  = injections.flood.active;
    const isHeat   = injections.heat.active;

    /* ── Air Temperature ─────────────────────────── */
    const baseTempDay  = isHeat ? (injections.heat.temp || 42) : 32;
    const baseTempNight= isHeat ? baseTempDay - 4 : 21;
    const baseTemp     = baseTempNight + daylight * (baseTempDay - baseTempNight);
    drift.airTemp     += gaussian(0, 0.05);
    drift.airTemp      = clamp(drift.airTemp, -3, 3);
    state.airTemp      = clamp(baseTemp + drift.airTemp + gaussian(0, 0.4), -5, 55);

    /* ── Humidity ───────────────────────────────── */
    const baseHum = isFlood ? 88 : isDry ? 22 : 65 - daylight * 18;
    drift.humidity += gaussian(0, 0.1);
    drift.humidity  = clamp(drift.humidity, -8, 8);
    state.humidity  = clamp(baseHum + drift.humidity + gaussian(0, 1.2), 5, 99);

    /* ── Soil Moisture ──────────────────────────── */
    const baseMoist = isFlood
      ? 88 + Math.random() * 8
      : isDry
        ? Math.max(8, state.moisture - 0.6 * (injections.drought.severity / 100))
        : 52 + Math.sin(simTicks * 0.12) * 10;
    drift.moisture += gaussian(0, 0.08);
    drift.moisture  = clamp(drift.moisture, -6, 6);
    state.moisture  = clamp(baseMoist + drift.moisture + gaussian(0, 0.8), 5, 98);

    /* ── Rainfall ───────────────────────────────── */
    if (isFlood) {
      const rBase = injections.flood.level === 'flash'   ? 180 + Math.random() * 60
                  : injections.flood.level === 'cyclone' ? 250 + Math.random() * 80
                  : injections.flood.level === 'river'   ? 40  + Math.random() * 30
                  : 20 + Math.random() * 15;
      state.rainfall = clamp(rBase + gaussian(0, 8), 0, 500);
    } else if (isDry) {
      state.rainfall = clamp(gaussian(0, 0.2), 0, 2);
    } else {
      // occasional rain events
      state.rainfall = simTicks % 120 < 8
        ? clamp(15 + gaussian(0, 4), 0, 60)
        : clamp(gaussian(0, 0.3), 0, 60);
    }

    /* ── Light Intensity ─────────────────────────── */
    const baseLight = daylight * (isHeat ? 95 : 72);
    state.light = clamp(baseLight + gaussian(0, 3), 0, 120);

    /* ── Soil Temperature ────────────────────────── */
    state.soilTemp = clamp(state.airTemp - 4 + gaussian(0, 0.5) + (isDry ? 3 : 0), 5, 48);

    /* ── Wind Speed ──────────────────────────────── */
    const baseWind = isFlood && injections.flood.level === 'cyclone' ? 65 : isDry ? 18 : 8;
    state.wind = clamp(baseWind + gaussian(0, 2) + Math.abs(Math.sin(simTicks * 0.08)) * 5, 0, 120);

    /* ── NPK ─────────────────────────────────────── */
    const { active: nActive, element: nElem, deficit: nDef } = injections.nutrient;
    state.n = clamp(state.n + gaussian(0, 1.5)
      - (nActive && (nElem === 'nitrogen'   || nElem === '') ? nDef * 0.08 : 0), 20, 420);
    state.p = clamp(state.p + gaussian(0, 0.8)
      - (nActive && (nElem === 'phosphorus' || nElem === '') ? nDef * 0.06 : 0), 10, 300);
    state.k = clamp(state.k + gaussian(0, 1.2)
      - (nActive && (nElem === 'potassium'  || nElem === '') ? nDef * 0.07 : 0), 20, 380);

    /* ── pH ──────────────────────────────────────── */
    const phShift = isFlood ? -0.3 : isDry ? 0.2 : 0;
    state.ph = clamp(state.ph + gaussian(0, 0.02) + phShift * 0.05, 4.0, 9.5);

    /* ── Water Level (canal) ─────────────────────── */
    const wlBase = isFlood ? 3.2 + injections.flood.level === 'flash' ? 1.2 : 0.6
                 : isDry   ? 0.4
                 : 1.2 + Math.sin(simTicks * 0.05) * 0.2;
    drift.waterLevel += gaussian(0, 0.01);
    drift.waterLevel  = clamp(drift.waterLevel, -0.15, 0.15);
    state.waterLevel  = clamp(
      (typeof wlBase === 'number' ? wlBase : 1.2) + drift.waterLevel + gaussian(0, 0.04),
      0, 5.5
    );

    /* ── Device health ───────────────────────────── */
    state.solar   = clamp(daylight * (isHeat ? 22 : 20) + gaussian(0, 0.8), 0, 28);
    state.battery = clamp(state.battery + (state.solar > 3 ? 0.08 : -0.15) + gaussian(0, 0.05), 5, 100);
    state.cpu     = clamp(30 + gaussian(0, 5) + (injections.pest.active ? 8 : 0), 10, 95);
    state.ram     = clamp(45 + gaussian(0, 4), 20, 90);

    /* ── Notify subscribers ──────────────────────── */
    subscribers.forEach(fn => fn({ ...state }, simHour));
  }

  /* ══════════════════════════════════════════════════════════
     THRESHOLD CHECKING
  ══════════════════════════════════════════════════════════ */
  function getAlertLevel(key, value) {
    const t = THRESHOLDS[key];
    if (!t) return 'ok';
    const lo = value < t.low;
    const hi = value > t.high;
    if (!lo && !hi) return 'ok';
    const pct = lo
      ? (t.low  - value) / (t.low  || 1)
      : (value  - t.high) / (t.high || 1);
    if (pct > 0.4) return 'critical';
    if (pct > 0.2) return 'danger';
    return 'warn';
  }

  function getAlerts() {
    const alerts = [];
    for (const [key, thresh] of Object.entries(THRESHOLDS)) {
      const val   = state[key];
      const level = getAlertLevel(key, val);
      if (level !== 'ok') {
        const dir = val < thresh.low ? 'LOW' : 'HIGH';
        alerts.push({
          key,
          level,
          dir,
          value: val,
          unit: thresh.unit,
          name: thresh.name,
          message: `${thresh.name} is ${dir} (${val.toFixed(1)} ${thresh.unit})`
        });
      }
    }
    return alerts;
  }

  /* ══════════════════════════════════════════════════════════
     STATUS helper for each sensor card
  ══════════════════════════════════════════════════════════ */
  function getSensorStatus(key, value) {
    const lvl = getAlertLevel(key, value);
    if (lvl === 'critical') return { label: 'CRITICAL', css: 'critical' };
    if (lvl === 'danger')   return { label: 'ALERT',    css: 'danger' };
    if (lvl === 'warn')     return { label: 'WARN',     css: 'warn' };
    return { label: 'OK', css: 'ok' };
  }

  /* Bar fill percentage (0-100) for visual bars */
  function getBarPct(key, value) {
    const ranges = {
      moisture:   [0, 100],
      ph:         [4, 10],
      soilTemp:   [0, 55],
      airTemp:    [0, 55],
      humidity:   [0, 100],
      rainfall:   [0, 100],
      light:      [0, 120],
      wind:       [0, 80],
      waterLevel: [0, 5.5],
    };
    const r = ranges[key];
    if (!r) return 50;
    return clamp(((value - r[0]) / (r[1] - r[0])) * 100, 0, 100);
  }

  /* ══════════════════════════════════════════════════════════
     INJECTION API
  ══════════════════════════════════════════════════════════ */
  function setInjection(type, params) {
    Object.assign(injections[type], { active: true, ...params });
  }

  function clearInjection(type) {
    const inj = injections[type];
    Object.keys(inj).forEach(k => {
      inj[k] = k === 'active' ? false : (typeof inj[k] === 'number' ? 0 : '');
    });
  }

  function clearAllInjections() {
    Object.keys(injections).forEach(clearInjection);
    /* Restore NPK to healthy defaults */
    state.n = 180; state.p = 95; state.k = 210;
    state.ph = 6.8;
  }

  function getInjections() { return { ...injections }; }

  /* ══════════════════════════════════════════════════════════
     SUBSCRIBE / START / STOP
  ══════════════════════════════════════════════════════════ */
  function subscribe(fn) { subscribers.push(fn); }

  let _interval = null;
  function start() {
    if (_interval) return;
    tick(); // immediate first reading
    _interval = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
  }

  function getState()   { return { ...state }; }
  function getSimHour() { return simHour; }

  /* ══════════════════════════════════════════════════════════
     EXPORT
  ══════════════════════════════════════════════════════════ */
  return {
    start, stop, subscribe,
    getState, getSimHour,
    getAlerts, getAlertLevel, getSensorStatus, getBarPct,
    setInjection, clearInjection, clearAllInjections, getInjections,
    THRESHOLDS,
  };
})();
