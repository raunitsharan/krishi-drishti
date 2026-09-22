/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Main Orchestrator v3
   Light theme + live 3D · Bugfixed injection wiring
═══════════════════════════════════════════════════════════════ */

(function boot() {

  /* 1. Init Dashboard (charts + clock) */
  Dashboard.init();

  /* 2. Wire sensor tick → dashboard + AI + alerts + 3D */
  SensorEngine.subscribe((state, simHour) => {
    Dashboard.updateSensors(state, simHour);

    const injections = SensorEngine.getInjections();
    const output     = AIEngine.infer(state, simHour, injections);

    Dashboard.updateAI(output);
    AlertSystem.processSensorAlerts(SensorEngine.getAlerts());
    AlertSystem.processAIAlerts(output);

    /* 3D scene — only react to AI flood output if no manual flood
       injection is active (avoid fighting the user's injections) */
    if (typeof FarmScene !== 'undefined') {
      if (!injections.flood.active) {
        FarmScene.applyFlood(output.flood.prob > 65 ? output.flood.prob / 100 : 0);
      }
      /* Harvest sparkles when AI says crop is ready and no stressors */
      const anyStressor = injections.disease.active || injections.pest.active
                       || injections.drought.active  || injections.heat.active
                       || injections.flood.active;
      FarmScene.setHarvestMode(!anyStressor && output.harvest.days <= 5);
    }
  });

  /* 3. Init 3D Scene (with 2D fallback) */
  let use2DFallback = false;
  try {
    FarmScene.init();
    /* Force resize after a frame so the canvas is fully painted */
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  } catch (e) {
    use2DFallback = true;
    console.warn('[FarmScene] init error:', e); if (e.message && e.message.includes('WebGL')) { const msg = document.createElement('div'); msg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,0.95);padding:30px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.2);text-align:center;max-width:500px;z-index:1000'; msg.innerHTML = '<div style=font-size:48px>??</div><div style=font-size:20px;font-weight:700;color:#d32f2f;margin:16px>WebGL Not Available</div><div style=color:#666>Enable WebGL in your browser settings to view the 3D scene.</div>'; document.getElementById('sceneContainer').appendChild(msg); }
  }

  /* 4. Init Problem Injector (sliders + buttons) */
  ProblemInjector.init();

  /* 5. Open bottom AI panel by default */
  setTimeout(() => {
    const bp = document.getElementById('panelAI');
    if (bp) bp.classList.remove('hidden');
  }, 100);

  /* 5. Start sensor engine (drives everything) */
  SensorEngine.start();

  /* 6. Boot toast */
  setTimeout(() => {
    AlertSystem.toast('ok', '🌿 Krishi Drishti Online',
      'Edge-AI active · RPi 4B + ESP32 · LoRaWAN · All 3D animations live.', 6000);
    AlertSystem.logAlert('info',
      'System boot complete — light theme, 3D scene active', 'fa-power-off');
  }, 900);

  /* 7. Sync inference counter every 500ms */
  setInterval(() => {
    const el = document.getElementById('inferenceCount');
    if (el) el.textContent = AIEngine.getInferenceCount().toLocaleString();
  }, 500);

  console.log('%c🌿 Krishi Drishti v3 — Light Theme · Live 3D Daytime Scene', 'color:#2e7d32;font-size:14px;font-weight:bold');
  console.log('%cSIH 2026 · PS-26180 · Team: Raunit, Nainsi, Nikhil, Aditya, Satwik, Sunny', 'color:#1565c0;font-size:12px');
})();
