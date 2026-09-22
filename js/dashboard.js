/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Live Dashboard UI
   Updates: sensor cards, AI output cards, Chart.js sparklines,
   device health, connectivity panel, live clock, solar %.
═══════════════════════════════════════════════════════════════ */

const Dashboard = (() => {

  /* ── Chart.js instances ──────────────────────────────────── */
  let chartMoisture, chartTemp, chartRisk;
  const HISTORY_LEN = 60;

  const history = {
    moisture: Array(HISTORY_LEN).fill(55),
    temp:     Array(HISTORY_LEN).fill(29),
    risk:     Array(HISTORY_LEN).fill(0),
    labels:   Array(HISTORY_LEN).fill(''),
  };

  /* ── Colour helpers ──────────────────────────────────────── */
  const COL = {
    green:  '#2e7d32', cyan:   '#0097a7', orange: '#e65100',
    red:    '#c62828', blue:   '#1565c0', yellow: '#f57f17',
    purple: '#6a1b9a', lime:   '#558b2f', muted:  '#5a7d5c',
  };

  /* ── $ helper ────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  /* ══════════════════════════════════════════════════════════
     INIT — build Chart.js sparklines
  ══════════════════════════════════════════════════════════ */
  function init() {
    _buildClockTick();
    _buildCharts();
  }

  /* ── Clock ───────────────────────────────────────────────── */
  function _buildClockTick() {
    function tick() {
      const now = new Date();
      const el  = $('liveTime');
      if (el) el.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── Sparkline charts ────────────────────────────────────── */
  function _buildCharts() {
    const baseOpts = (label, color) => ({
      type: 'line',
      data: {
        labels: history.labels,
        datasets: [{
          label,
          data: [],
          borderColor: color,
          backgroundColor: color + '18',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(46,125,50,0.08)', drawBorder: false },
            ticks: { color: COL.muted, font: { size: 9 }, maxTicksLimit: 4 },
            border: { display: false },
          }
        }
      }
    });

    const ctxM = $('chartMoisture');
    const ctxT = $('chartTemp');
    const ctxR = $('chartRisk');

    if (ctxM) chartMoisture = new Chart(ctxM, baseOpts('Moisture %',   COL.cyan));
    if (ctxT) chartTemp     = new Chart(ctxT, baseOpts('Air Temp °C',  COL.orange));
    if (ctxR) chartRisk     = new Chart(ctxR, baseOpts('Risk Score',   COL.red));
  }

  /* ══════════════════════════════════════════════════════════
     UPDATE SENSORS — called on every sensor tick
  ══════════════════════════════════════════════════════════ */
  function updateSensors(state, simHour) {
    const S = SensorEngine;

    /* helper: set value + bar + status */
    function set(key, rawVal, decimals = 1) {
      const valEl  = $(`val-${key}`);
      const barEl  = $(`bar-${key}`);
      const stEl   = $(`st-${key}`);
      const cardEl = $(`sc-${key}`);
      if (!valEl) return;

      const display = typeof rawVal === 'number' ? rawVal.toFixed(decimals) : rawVal;
      valEl.textContent = display;

      if (barEl) {
        const pct    = S.getBarPct(key, rawVal);
        barEl.style.width = pct + '%';
        barEl.className   = 'sensor-bar' + (pct > 80 ? ' danger' : pct > 65 ? ' warn' : '');
      }

      if (stEl || cardEl) {
        const status = S.getSensorStatus(key, rawVal);
        if (stEl) { stEl.textContent = status.label; stEl.className = `sensor-status ${status.css}`; }
        if (cardEl) { cardEl.className = `sensor-card ${status.css === 'ok' ? '' : status.css}`; }
      }
    }

    set('moisture',  state.moisture,  1);
    set('ph',        state.ph,        2);
    set('stemp',     state.soilTemp,  1);
    set('atemp',     state.airTemp,   1);
    set('humidity',  state.humidity,  1);
    set('rain',      state.rainfall,  1);
    set('light',     state.light,     1);
    set('wind',      state.wind,      1);
    set('wlevel',    state.waterLevel,2);

    /* NPK — no bar, custom display */
    const vn = $('val-n'), vp = $('val-p'), vk = $('val-k');
    if (vn) vn.textContent = Math.round(state.n);
    if (vp) vp.textContent = Math.round(state.p);
    if (vk) vk.textContent = Math.round(state.k);

    /* Device health */
    const dSolar   = $('dh-solar');
    const dBattery = $('dh-battery');
    const dCpu     = $('dh-cpu');
    const dRam     = $('dh-ram');
    if (dSolar)   dSolar.textContent   = state.solar.toFixed(1) + 'W';
    if (dBattery) dBattery.textContent = Math.round(state.battery) + '%';
    if (dCpu)     dCpu.textContent     = Math.round(state.cpu) + '%';
    if (dRam)     dRam.textContent     = Math.round(state.ram) + '%';

    /* Topbar solar */
    const solarPct = $('solarPct');
    if (solarPct) solarPct.textContent = Math.round(state.battery) + '%';

    /* History push */
    const label = new Date().toLocaleTimeString('en-IN', { hour12: false });
    _pushHistory('moisture', state.moisture, label);
    _pushHistory('temp',     state.airTemp,  label);

    /* Connectivity RSSI shimmer */
    _updateConnectivity(state);
  }

  /* ══════════════════════════════════════════════════════════
     UPDATE AI OUTPUTS — called on every inference tick
  ══════════════════════════════════════════════════════════ */
  function updateAI(output) {
    /* inference counter */
    const ic = $('inferenceCount');
    if (ic) ic.textContent = output.inferenceCount.toLocaleString();

    /* helper */
    function setCard(key, label, sub, conf, isAlert) {
      const labelEl = $(`aov-${key}`);
      const subEl   = $(`aos-${key}`);
      const confEl  = $(`acf-${key}`);
      const cardEl  = $(`aoc-${key}`);
      if (labelEl) labelEl.textContent = label;
      if (subEl)   subEl.textContent   = sub;
      if (confEl)  confEl.style.width  = conf + '%';
      if (cardEl) {
        cardEl.classList.toggle('alert-active', !!isAlert);
      }
    }

    const o = output;

    setCard('health',
      o.health.label,
      `Score: ${o.health.value}/100 · Conf: ${o.health.conf}%`,
      o.health.conf,
      o.health.alert
    );

    setCard('disease',
      o.disease.label,
      `MobileNetV3 · ${o.disease.conf}% conf`,
      o.disease.conf,
      o.disease.alert
    );

    setCard('pest',
      o.pest.label,
      `YOLOv8-nano · ${o.pest.conf}% conf`,
      o.pest.conf,
      o.pest.alert
    );

    setCard('irrigation',
      o.irrigation.label,
      `Rule-based + LSTM · ${o.irrigation.conf}%`,
      o.irrigation.conf,
      o.irrigation.alert
    );

    setCard('flood',
      o.flood.label,
      `LSTM · ${o.flood.prob}% probability`,
      o.flood.prob,
      o.flood.alert
    );

    setCard('drought',
      o.drought.label,
      `XGBoost · ${o.drought.prob}% risk`,
      o.drought.prob,
      o.drought.alert
    );

    setCard('nutrient',
      o.nutrient.label,
      `Hybrid CNN · ${o.nutrient.conf}% conf`,
      o.nutrient.conf,
      o.nutrient.alert
    );

    setCard('harvest',
      o.harvest.label,
      `Regression · ${o.harvest.conf}% conf`,
      o.harvest.conf,
      o.harvest.alert
    );

    /* Risk score = max of flood/drought probs + disease/pest boost */
    const riskScore = Math.min(99, Math.round(
      Math.max(o.flood.prob, o.drought.prob) * 0.6 +
      (o.disease.alert ? 20 : 0) + (o.pest.alert ? 15 : 0)
    ));
    _pushHistory('risk', riskScore, '');

    /* Recommendation strip */
    const recEl  = $('recText');
    const stripEl= $('recommendationStrip');
    if (recEl)  recEl.textContent = o.recommendation;
    if (stripEl) {
      stripEl.className = 'recommendation-strip ' + (o.recClass || '');
    }

    /* Detection overlay for high-confidence pest/disease */
    if (o.pest.alert && o.pest.conf > 75) {
      _showDetectionOverlay('pest', o.pest.label, o.pest.conf, 'YOLOv8-nano');
    } else if (o.disease.alert && o.disease.conf > 75) {
      _showDetectionOverlay('disease', o.disease.label, o.disease.conf, 'MobileNetV3');
    }
  }

  /* ══════════════════════════════════════════════════════════
     DETECTION OVERLAY
  ══════════════════════════════════════════════════════════ */
  function _showDetectionOverlay(type, label, conf, model) {
    const ov    = $('detectionOverlay');
    const icon  = $('detIcon');
    const title = $('detTitle');
    const confEl= $('detConf');
    const modEl = $('detModel');
    if (!ov) return;

    icon.innerHTML  = type === 'pest'
      ? '<i class="fa-solid fa-bug"></i>'
      : '<i class="fa-solid fa-virus"></i>';
    title.textContent = label + ' Detected';
    confEl.textContent= `Confidence: ${conf}%`;
    modEl.textContent = `Model: ${model}`;
    ov.style.display  = 'flex';
  }

  /* ══════════════════════════════════════════════════════════
     CONNECTIVITY PANEL shimmer
  ══════════════════════════════════════════════════════════ */
  function _updateConnectivity(state) {
    /* simulate RSSI variation */
    const loraRssi = -87 + Math.round(gaussian(0, 3));
    const gsmRssi  = -62 + Math.round(gaussian(0, 2));
    const crLora = $('cr-lora');
    const crGsm  = $('cr-gsm');
    if (crLora) crLora.textContent = `${loraRssi} dBm`;
    if (crGsm)  crGsm.textContent  = `4G · ${gsmRssi} dBm`;

    /* edge inference no-cloud tag */
    const crEdge = $('cr-edge');
    if (crEdge) crEdge.textContent = `No Cloud · ${state.cpu.toFixed(0)}% CPU`;
  }

  /* ══════════════════════════════════════════════════════════
     HISTORY PUSH + CHART UPDATE
  ══════════════════════════════════════════════════════════ */
  function _pushHistory(key, value, label) {
    history[key].push(value);
    if (history[key].length > HISTORY_LEN) history[key].shift();
    if (label) { history.labels.push(label); if (history.labels.length > HISTORY_LEN) history.labels.shift(); }

    const chartMap = { moisture: chartMoisture, temp: chartTemp, risk: chartRisk };
    const chart    = chartMap[key];
    if (!chart) return;

    chart.data.datasets[0].data   = [...history[key]];
    chart.data.labels             = [...history.labels];
    chart.update('none');
  }

  /* ══════════════════════════════════════════════════════════
     SYSTEM STATUS BANNER
  ══════════════════════════════════════════════════════════ */
  function setSystemStatus(level, text) {
    const dot  = document.querySelector('.pulse-dot');
    const st   = $('statusText');
    if (!dot || !st) return;
    dot.className = `pulse-dot ${level}`;
    st.textContent = text;
  }

  /* ── gaussian (local copy for connectivity shimmer) ──────── */
  function gaussian(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  return { init, updateSensors, updateAI, setSystemStatus };
})();
