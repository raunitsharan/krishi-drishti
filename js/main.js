/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Main Orchestrator
   Boot sequence: Dashboard → SensorEngine → AIEngine →
   FarmScene → ProblemInjector → start loops.
═══════════════════════════════════════════════════════════════ */

(function boot() {

  /* ── 1. Init Dashboard (charts + clock) ─────────────────── */
  Dashboard.init();

  /* ── 2. Wire sensor → dashboard + AI ───────────────────── */
  SensorEngine.subscribe((state, simHour) => {
    /* Update left panel */
    Dashboard.updateSensors(state, simHour);

    /* Run AI inference */
    const injections = SensorEngine.getInjections();
    const output     = AIEngine.infer(state, simHour, injections);

    /* Update AI output cards + recommendation */
    Dashboard.updateAI(output);

    /* Process alerts */
    const sensorAlerts = SensorEngine.getAlerts();
    AlertSystem.processSensorAlerts(sensorAlerts);
    AlertSystem.processAIAlerts(output);

    /* Update 3D scene based on AI output */
    if (typeof FarmScene !== 'undefined') {
      FarmScene.applyFlood(output.flood.prob > 55 ? output.flood.prob / 100 : 0);
    }
  });

  /* ── 3. Start 3D Scene ──────────────────────────────────── */
  try {
    FarmScene.init();
  } catch (e) {
    console.warn('[FarmScene] Init error:', e);
  }

  /* ── 4. Init Problem Injector ───────────────────────────── */
  ProblemInjector.init();

  /* ── 5. Start sensor engine (drives everything) ─────────── */
  SensorEngine.start();

  /* ── 6. Boot toast ──────────────────────────────────────── */
  setTimeout(() => {
    AlertSystem.toast('ok', 'Krishi Drishti Online',
      'Edge-AI system initialised. RPi 4B + ESP32 sensors active. LoRaWAN connected.', 6000);
    AlertSystem.logAlert('info', 'System boot complete — all subsystems nominal', 'fa-power-off');
  }, 800);

  /* ── 7. Simulate periodic inference log message ─────────── */
  setInterval(() => {
    const ic = AIEngine.getInferenceCount();
    const el = document.getElementById('inferenceCount');
    if (el) el.textContent = ic.toLocaleString();
  }, 500);

  console.log('%c🌿 Krishi Drishti — SIH 2026 PS-26180 | Edge-AI Smart Farming', 'color:#22c55e;font-size:14px;font-weight:bold');
  console.log('%cTeam: Raunit, Nainsi, Nikhil, Aditya, Satwik, Sunny', 'color:#06b6d4;font-size:12px');

})();
