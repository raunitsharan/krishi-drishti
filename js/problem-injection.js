/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Problem Injection Panel Controller
   Handles: panel toggle, slider live-labels, inject buttons,
   reset, full-disaster scenario, random scenario.
   Bridges: SensorEngine ↔ FarmScene ↔ AlertSystem.
═══════════════════════════════════════════════════════════════ */

const ProblemInjector = (() => {

  /* ── Track active injections for label display ───────────── */
  const active = new Set();

  /* ── $ helper ────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  /* ══════════════════════════════════════════════════════════
     INIT — wire up all sliders
  ══════════════════════════════════════════════════════════ */
  function init() {
    _wireSlider('sev-disease',  'sev-disease-val',  v => `${v}%`);
    _wireSlider('sev-pest',     'sev-pest-val',     v => `${v}%`);
    _wireSlider('sev-nutrient', 'sev-nutrient-val', v => `${v}%`);
    _wireSlider('sev-drought',  'sev-drought-val',  v => `${v} days`);
    _wireSlider('sev-flood',    'sev-flood-val',    v => `${v} mm`);
    _wireSlider('sev-heat',     'sev-heat-val',     v => `${v} days`);
  }

  function _wireSlider(sliderId, labelId, fmt) {
    const slider = $(sliderId);
    const label  = $(labelId);
    if (!slider || !label) return;
    label.textContent = fmt(slider.value);
    slider.addEventListener('input', () => { label.textContent = fmt(slider.value); });
  }

  /* ══════════════════════════════════════════════════════════
     PANEL TOGGLE
  ══════════════════════════════════════════════════════════ */
  function toggleInjectionPanel() {
    const bar = $('injectionBar');
    if (!bar) return;
    bar.classList.toggle('open');
    const fab = document.querySelector('.inj-fab-btn');
    if (fab) fab.style.opacity = bar.classList.contains('open') ? '0' : '1';
  }

  /* ══════════════════════════════════════════════════════════
     INJECT A PROBLEM
  ══════════════════════════════════════════════════════════ */
  function injectProblem(type) {
    switch (type) {
      case 'disease':  _injectDisease(); break;
      case 'pest':     _injectPest();    break;
      case 'nutrient': _injectNutrient();break;
      case 'drought':  _injectDrought(); break;
      case 'flood':    _injectFlood();   break;
      case 'heat':     _injectHeat();    break;
    }
    _updateActiveTag();
  }

  /* ── Disease ─────────────────────────────────────────────── */
  function _injectDisease() {
    const type = $('sel-disease')?.value;
    const sev  = parseInt($('sev-disease')?.value || 60);
    if (!type) { AlertSystem.toast('warn', 'Select Disease', 'Please select a disease type first.'); return; }

    SensorEngine.setInjection('disease', { type, severity: sev });
    FarmScene.applyDisease(sev);
    active.add('Disease');

    AlertSystem.toast('danger', 'Disease Injected', `${_diseaseLabel(type)} at ${sev}% severity — AI detection active.`);
    AlertSystem.logAlert('danger', `Problem injected: ${_diseaseLabel(type)} (${sev}% severity)`, 'fa-biohazard');
    Dashboard.setSystemStatus('orange', 'DISEASE DETECTED · AI SCANNING');
  }

  /* ── Pest ────────────────────────────────────────────────── */
  function _injectPest() {
    const type = $('sel-pest')?.value;
    const den  = parseInt($('sev-pest')?.value || 70);
    if (!type) { AlertSystem.toast('warn', 'Select Pest', 'Please select a pest type first.'); return; }

    SensorEngine.setInjection('pest', { type, density: den });
    FarmScene.applyPest(den);
    FarmScene.flashPestDetection();
    active.add('Pest');

    AlertSystem.toast('danger', 'Pest Injected', `${_pestLabel(type)} at ${den}% density — YOLOv8 scanning.`);
    AlertSystem.logAlert('danger', `Pest injected: ${_pestLabel(type)} (${den}% density)`, 'fa-bug');
    Dashboard.setSystemStatus('orange', 'PEST DETECTED · YOLO SCANNING');
  }

  /* ── Nutrient ────────────────────────────────────────────── */
  function _injectNutrient() {
    const el   = $('sel-nutrient')?.value;
    const def  = parseInt($('sev-nutrient')?.value || 50);
    if (!el) { AlertSystem.toast('warn', 'Select Element', 'Please select a nutrient deficiency type.'); return; }

    SensorEngine.setInjection('nutrient', { element: el, deficit: def });
    active.add('Nutrient');

    AlertSystem.toast('warn', 'Nutrient Deficiency', `${_nutrientLabel(el)} at ${def}% deficit — NPK model active.`);
    AlertSystem.logAlert('warn', `Nutrient deficiency: ${_nutrientLabel(el)} (${def}%)`, 'fa-flask');
  }

  /* ── Drought ─────────────────────────────────────────────── */
  function _injectDrought() {
    const level = $('sel-drought')?.value;
    const days  = parseInt($('sev-drought')?.value || 7);
    if (!level) { AlertSystem.toast('warn', 'Select Level', 'Please select a drought level.'); return; }

    const severityMap = { mild: 30, moderate: 60, severe: 80, extreme: 95 };
    const severity    = severityMap[level] || 60;

    SensorEngine.setInjection('drought', { severity, days });
    FarmScene.applyDrought(severity);
    active.add('Drought');

    AlertSystem.toast('warn', 'Drought Injected', `${_cap(level)} drought — ${days} day duration. XGBoost risk model active.`);
    AlertSystem.logAlert('warn', `Drought injected: ${level} (${days} days, ${severity}% severity)`, 'fa-sun-plant-wilt');
    Dashboard.setSystemStatus('yellow', 'DROUGHT STRESS · MOISTURE DROPPING');
  }

  /* ── Flood ───────────────────────────────────────────────── */
  function _injectFlood() {
    const level = $('sel-flood')?.value;
    const rain  = parseInt($('sev-flood')?.value || 150);
    if (!level) { AlertSystem.toast('warn', 'Select Type', 'Please select a flood type.'); return; }

    SensorEngine.setInjection('flood', { level, rainfall: rain });
    FarmScene.applyFlood(1);
    active.add('Flood');

    AlertSystem.toast('critical', '⚠ FLOOD WARNING', `${_floodLabel(level)} — ${rain}mm/h rainfall. LSTM probability rising.`, 0);
    AlertSystem.logAlert('danger', `Flood injected: ${_floodLabel(level)} (${rain}mm/h)`, 'fa-house-flood-water');
    Dashboard.setSystemStatus('red', 'FLOOD RISK · CRITICAL ALERT');
  }

  /* ── Heat ────────────────────────────────────────────────── */
  function _injectHeat() {
    const level = $('sel-heat')?.value;
    const days  = parseInt($('sev-heat')?.value || 3);
    if (!level) { AlertSystem.toast('warn', 'Select Intensity', 'Please select heat wave intensity.'); return; }

    const tempMap = { warm: 37, hot: 41, extreme: 46 };
    const temp    = tempMap[level] || 41;

    SensorEngine.setInjection('heat', { temp, days });
    FarmScene.applyHeat(temp);
    active.add('Heat Wave');

    AlertSystem.toast('danger', 'Heat Wave Injected', `${_cap(level)} heat wave — ${temp}°C for ${days} days. Crop stress active.`);
    AlertSystem.logAlert('danger', `Heat wave injected: ${level} (${temp}°C, ${days} days)`, 'fa-fire');
    Dashboard.setSystemStatus('red', 'HEAT WAVE · CROP STRESS HIGH');
  }

  /* ══════════════════════════════════════════════════════════
     RESET ALL
  ══════════════════════════════════════════════════════════ */
  function resetAllInjections() {
    SensorEngine.clearAllInjections();
    FarmScene.resetScene();
    active.clear();

    /* Clear toasts */
    const tc = $('toastContainer');
    if (tc) tc.innerHTML = '';

    Dashboard.setSystemStatus('green', 'SYSTEM ONLINE · EDGE-AI ACTIVE');
    AlertSystem.toast('ok', 'System Reset', 'All injections cleared. Normal monitoring resumed.');
    AlertSystem.logAlert('info', 'All problem injections cleared — baseline restored', 'fa-rotate-left');
    _updateActiveTag();
  }

  /* ══════════════════════════════════════════════════════════
     FULL DISASTER SCENARIO
  ══════════════════════════════════════════════════════════ */
  function runFullScenario() {
    resetAllInjections();

    setTimeout(() => {
      /* 1. Start flood */
      $('sel-flood').value  = 'flash';
      $('sev-flood').value  = '280';
      $('sev-flood-val').textContent = '280 mm';
      _injectFlood();
    }, 300);

    setTimeout(() => {
      /* 2. Add disease */
      $('sel-disease').value = 'blight';
      $('sev-disease').value = '78';
      $('sev-disease-val').textContent = '78%';
      _injectDisease();
    }, 800);

    setTimeout(() => {
      /* 3. Add pest */
      $('sel-pest').value = 'locust';
      $('sev-pest').value = '85';
      $('sev-pest-val').textContent = '85%';
      _injectPest();
    }, 1300);

    setTimeout(() => {
      /* 4. Nutrient depletion */
      $('sel-nutrient').value = 'nitrogen';
      $('sev-nutrient').value = '72';
      $('sev-nutrient-val').textContent = '72%';
      _injectNutrient();
    }, 1800);

    AlertSystem.toast('critical', '🚨 FULL DISASTER SCENARIO', 'Flash flood + Late Blight + Desert Locust + N-deficiency activated!', 0);
    AlertSystem.logAlert('danger', 'FULL DISASTER SCENARIO activated — all 4 stressors running', 'fa-radiation');
    _updateActiveTag();
  }

  /* ══════════════════════════════════════════════════════════
     RANDOM SCENARIO
  ══════════════════════════════════════════════════════════ */
  function runRandomScenario() {
    resetAllInjections();

    const scenarios = [
      () => {
        $('sel-disease').value = _randOf(['blight','rust','mildew','mosaic']);
        $('sev-disease').value = String(_rand(40, 90));
        $('sev-disease-val').textContent = $('sev-disease').value + '%';
        _injectDisease();
      },
      () => {
        $('sel-pest').value   = _randOf(['aphids','stemBorer','whitefly','mite']);
        $('sev-pest').value   = String(_rand(50, 90));
        $('sev-pest-val').textContent = $('sev-pest').value + '%';
        _injectPest();
      },
      () => {
        $('sel-drought').value = _randOf(['mild','moderate','severe']);
        $('sev-drought').value = String(_rand(3, 20));
        $('sev-drought-val').textContent = $('sev-drought').value + ' days';
        _injectDrought();
      },
      () => {
        $('sel-nutrient').value = _randOf(['nitrogen','phosphorus','potassium','iron','zinc']);
        $('sev-nutrient').value = String(_rand(30, 80));
        $('sev-nutrient-val').textContent = $('sev-nutrient').value + '%';
        _injectNutrient();
      },
      () => {
        $('sel-heat').value = _randOf(['warm','hot']);
        $('sev-heat').value = String(_rand(1, 7));
        $('sev-heat-val').textContent = $('sev-heat').value + ' days';
        _injectHeat();
      },
      () => {
        $('sel-flood').value = _randOf(['waterlog','river']);
        $('sev-flood').value = String(_rand(60, 180));
        $('sev-flood-val').textContent = $('sev-flood').value + ' mm';
        _injectFlood();
      },
    ];

    /* Pick 1–2 random scenarios */
    const count = _rand(1, 2);
    const chosen = _shuffle(scenarios).slice(0, count);
    chosen.forEach((fn, i) => setTimeout(fn, i * 400));

    AlertSystem.toast('info', 'Random Scenario', `Running ${count} random stress injection(s).`);
    _updateActiveTag();
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */
  function _updateActiveTag() {
    const el = $('injActiveTag');
    if (!el) return;
    el.textContent = active.size === 0
      ? 'No active injections'
      : `Active: ${[...active].join(', ')}`;
    el.style.color = active.size > 0 ? '#f97316' : '';
  }

  function _diseaseLabel(v) {
    return { blight:'Late Blight', rust:'Wheat Rust', smut:'Loose Smut', mildew:'Powdery Mildew', mosaic:'Mosaic Virus' }[v] || v;
  }
  function _pestLabel(v) {
    return { aphids:'Aphids', stemBorer:'Stem Borer', whitefly:'Whitefly', locust:'Desert Locust', mite:'Spider Mite' }[v] || v;
  }
  function _nutrientLabel(v) {
    return { nitrogen:'Nitrogen (N)', phosphorus:'Phosphorus (P)', potassium:'Potassium (K)', iron:'Iron (Fe)', zinc:'Zinc (Zn)' }[v] || v;
  }
  function _floodLabel(v) {
    return { flash:'Flash Flood', river:'River Overflow', waterlog:'Waterlogging', cyclone:'Cyclone Rain' }[v] || v;
  }
  function _cap(s)     { return s.charAt(0).toUpperCase() + s.slice(1); }
  function _rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function _randOf(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function _shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

  return {
    init, toggleInjectionPanel, injectProblem,
    resetAllInjections, runFullScenario, runRandomScenario,
  };
})();

/* ── Global shims for onclick="" in HTML ─────────────────────── */
function toggleInjectionPanel() { ProblemInjector.toggleInjectionPanel(); }
function injectProblem(t)       { ProblemInjector.injectProblem(t); }
function resetAllInjections()   { ProblemInjector.resetAllInjections(); }
function runFullScenario()      { ProblemInjector.runFullScenario(); }
function runRandomScenario()    { ProblemInjector.runRandomScenario(); }
