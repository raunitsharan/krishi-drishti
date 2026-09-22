/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Main Orchestrator v2
   Light theme + live 3D injection responses
═══════════════════════════════════════════════════════════════ */

(function boot() {

  Dashboard.init();

  SensorEngine.subscribe((state, simHour) => {
    Dashboard.updateSensors(state, simHour);

    const injections = SensorEngine.getInjections();
    const output     = AIEngine.infer(state, simHour, injections);

    Dashboard.updateAI(output);

    AlertSystem.processSensorAlerts(SensorEngine.getAlerts());
    AlertSystem.processAIAlerts(output);

    /* ── Live 3D scene reactions to AI output ─────────── */
    if (typeof FarmScene !== 'undefined') {
      /* Flood — visually raise water when LSTM says >55% */
      FarmScene.applyFlood(output.flood.prob > 55 ? output.flood.prob / 100 : 0);

      /* Harvest sparkle when AI says ready */
      if (output.harvest.days <= 5 && !injections.disease.active && !injections.pest.active) {
        FarmScene.setHarvestMode(true);
      } else if (!injections.drought.active && !injections.disease.active) {
        FarmScene.setHarvestMode(false);
      }
    }
  });

  /* ── Init 3D Scene ──────────────────────────────────── */
  try { FarmScene.init(); } catch(e) { console.warn('[FarmScene]', e); }

  /* ── Init Problem Injector ──────────────────────────── */
  ProblemInjector.init();

  /* ── Start sensor loop ──────────────────────────────── */
  SensorEngine.start();

  /* ── Boot toast ─────────────────────────────────────── */
  setTimeout(() => {
    AlertSystem.toast('ok', '🌿 Krishi Drishti Online',
      'Edge-AI active · RPi 4B + ESP32 · LoRaWAN connected · Daytime monitoring started.', 6000);
    AlertSystem.logAlert('info', 'System boot complete — light mode, all 3D animations active', 'fa-power-off');
  }, 900);

  /* ── Inference counter ──────────────────────────────── */
  setInterval(() => {
    const el = document.getElementById('inferenceCount');
    if (el) el.textContent = AIEngine.getInferenceCount().toLocaleString();
  }, 500);

  console.log('%c🌿 Krishi Drishti v2 — Light Theme · Live 3D Animations', 'color:#2e7d32;font-size:14px;font-weight:bold');
  console.log('%cSIH 2026 · PS-26180 · Team: Raunit, Nainsi, Nikhil, Aditya, Satwik, Sunny', 'color:#1565c0;font-size:12px');
})();
