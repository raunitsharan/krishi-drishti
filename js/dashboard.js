/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Live Dashboard UI v4
   Matches new full-page layout element IDs.
═══════════════════════════════════════════════════════════════ */

const Dashboard = (() => {

  let chartMoisture, chartTemp, chartRisk;
  const HIST = 60;

  const history = {
    moisture: Array(HIST).fill(55),
    temp:     Array(HIST).fill(29),
    risk:     Array(HIST).fill(0),
    labels:   Array(HIST).fill(''),
  };

  const COL = {
    green:  '#2e7d32', cyan:   '#0097a7', orange: '#e65100',
    red:    '#c62828', blue:   '#1565c0', yellow: '#f57f17',
    muted:  '#6a8c6b',
  };

  const $ = id => document.getElementById(id);

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    _clock();
    _buildCharts();
  }

  function _clock() {
    const tick = () => {
      const el = $('liveTime');
      if (el) el.textContent = new Date().toLocaleTimeString('en-IN',{hour12:false});
    };
    tick();
    setInterval(tick, 1000);
  }

  function _buildCharts() {
    const base = (label, color) => ({
      type: 'line',
      data: { labels: [], datasets: [{ label, data: [], borderColor: color,
        backgroundColor: color+'18', borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: true,
            grid:  { color:'rgba(46,125,50,0.07)', drawBorder: false },
            ticks: { color: COL.muted, font: { size: 9 }, maxTicksLimit: 4 },
            border:{ display: false },
          }
        }
      }
    });

    const cm = $('chartMoisture'), ct = $('chartTemp'), cr = $('chartRisk');
    if (cm) chartMoisture = new Chart(cm, base('Moisture %', COL.cyan));
    if (ct) chartTemp     = new Chart(ct, base('Air Temp °C', COL.orange));
    if (cr) chartRisk     = new Chart(cr, base('Risk Score',  COL.red));
  }

  /* ── Update sensors ───────────────────────────────────── */
  function updateSensors(state, simHour) {
    const S = SensorEngine;

    /* helper — new HTML uses sc-badge / sc-bar / sc-* classes */
    function set(key, rawVal, decimals) {
      const valEl  = $(`val-${key}`);
      const barEl  = $(`bar-${key}`);
      const stEl   = $(`st-${key}`);
      const cardEl = $(`sc-${key}`);

      if (valEl) valEl.textContent = typeof rawVal === 'number' ? rawVal.toFixed(decimals ?? 1) : rawVal;

      if (barEl) {
        const pct = S.getBarPct(key, rawVal);
        barEl.style.width = pct + '%';
        barEl.className   = 'sc-bar' + (pct > 80 ? ' danger' : pct > 65 ? ' warn' : '');
      }

      if (stEl || cardEl) {
        const status = S.getSensorStatus(key, rawVal);
        if (stEl) { stEl.textContent = status.label; stEl.className = `sc-badge ${status.css}`; }
        if (cardEl) {
          cardEl.className = 'sensor-card' + (status.css !== 'ok' ? ` ${status.css}` : '');
        }
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

    /* NPK */
    const vn=$('val-n'), vp=$('val-p'), vk=$('val-k');
    if (vn) vn.textContent = Math.round(state.n);
    if (vp) vp.textContent = Math.round(state.p);
    if (vk) vk.textContent = Math.round(state.k);

    /* Device health */
    const ds=$('dh-solar'),db=$('dh-battery'),dc=$('dh-cpu'),dr=$('dh-ram');
    if (ds) ds.textContent = state.solar.toFixed(1)+'W';
    if (db) db.textContent = Math.round(state.battery)+'%';
    if (dc) dc.textContent = Math.round(state.cpu)+'%';
    if (dr) dr.textContent = Math.round(state.ram)+'%';

    /* Topbar battery */
    const sp = $('solarPct');
    if (sp) sp.textContent = Math.round(state.battery)+'%';

    /* Charts */
    const lbl = new Date().toLocaleTimeString('en-IN',{hour12:false});
    _push('moisture', state.moisture, lbl);
    _push('temp',     state.airTemp,  lbl);
    _updateConn(state);
  }

  /* ── Update AI cards ──────────────────────────────────── */
  function updateAI(output) {
    const ic = $('inferenceCount');
    if (ic) ic.textContent = output.inferenceCount.toLocaleString();

    function setCard(key, label, sub, conf, alert) {
      const lEl = $(`aov-${key}`);
      const sEl = $(`aos-${key}`);
      const bEl = $(`acf-${key}`);
      const cEl = $(`aoc-${key}`);
      if (lEl) lEl.textContent = label;
      if (sEl) sEl.textContent = sub;
      if (bEl) bEl.style.width = conf + '%';
      if (cEl) cEl.classList.toggle('alert-active', !!alert);
    }

    const o = output;
    setCard('health',    o.health.label,    `Score: ${o.health.value}/100 · ${o.health.conf}%`, o.health.conf,     o.health.alert);
    setCard('disease',   o.disease.label,   `MobileNetV3 · ${o.disease.conf}%`,                 o.disease.conf,    o.disease.alert);
    setCard('pest',      o.pest.label,       `YOLOv8-nano · ${o.pest.conf}%`,                    o.pest.conf,       o.pest.alert);
    setCard('irrigation',o.irrigation.label,`Rule-based · ${o.irrigation.conf}%`,               o.irrigation.conf, o.irrigation.alert);
    setCard('flood',     o.flood.label,     `LSTM · ${o.flood.prob}% prob`,                      o.flood.prob,      o.flood.alert);
    setCard('drought',   o.drought.label,   `XGBoost · ${o.drought.prob}% risk`,                o.drought.prob,    o.drought.alert);
    setCard('nutrient',  o.nutrient.label,  `Hybrid CNN · ${o.nutrient.conf}%`,                  o.nutrient.conf,   o.nutrient.alert);
    setCard('harvest',   o.harvest.label,   `Regression · ${o.harvest.conf}%`,                   o.harvest.conf,    o.harvest.alert);

    /* Risk sparkline */
    const riskScore = Math.min(99, Math.round(
      Math.max(o.flood.prob, o.drought.prob) * 0.6 +
      (o.disease.alert ? 20 : 0) + (o.pest.alert ? 15 : 0)
    ));
    _push('risk', riskScore, '');

    /* Recommendation strip */
    const rEl  = $('recText');
    const strip= $('recommendationStrip');
    if (rEl)  rEl.textContent = o.recommendation;
    if (strip) strip.className = 'rec-bar' + (o.recClass ? ' ' + o.recClass : '');

    /* Detection overlay */
    if (o.pest.alert && o.pest.conf > 75) _showDetection('pest', o.pest.label, o.pest.conf, 'YOLOv8-nano');
    else if (o.disease.alert && o.disease.conf > 75) _showDetection('disease', o.disease.label, o.disease.conf, 'MobileNetV3');
  }

  function _showDetection(type, label, conf, model) {
    const ov = $('detectionOverlay');
    const ic = $('detIcon');
    const ti = $('detTitle');
    const co = $('detConf');
    const mo = $('detModel');
    if (!ov) return;
    if (ic) ic.innerHTML = type === 'pest' ? '<i class="fa-solid fa-bug"></i>' : '<i class="fa-solid fa-virus"></i>';
    if (ti) ti.textContent = label + ' Detected';
    if (co) co.textContent = `Confidence: ${conf}%`;
    if (mo) mo.textContent = `Model: ${model}`;
    ov.style.display = 'flex';
  }

  function _updateConn(state) {
    const lr = $('cr-lora'), gr = $('cr-gsm'), er = $('cr-edge');
    if (lr) lr.textContent = `${(-87 + Math.round(_g(0,3)))} dBm`;
    if (gr) gr.textContent = `4G · ${(-62 + Math.round(_g(0,2)))} dBm`;
    if (er) er.textContent = `No Cloud · ${state.cpu.toFixed(0)}% CPU`;
  }

  function _push(key, value, label) {
    history[key].push(value);
    if (history[key].length > HIST) history[key].shift();
    if (label) { history.labels.push(label); if (history.labels.length > HIST) history.labels.shift(); }
    const m = { moisture: chartMoisture, temp: chartTemp, risk: chartRisk };
    const c = m[key];
    if (!c) return;
    c.data.datasets[0].data = [...history[key]];
    c.data.labels           = [...history.labels];
    c.update('none');
  }

  function _g(m=0,s=1) {
    let u=0,v=0;
    while(!u) u=Math.random(); while(!v) v=Math.random();
    return m + s * Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
  }

  function setSystemStatus(level, text) {
    const dot = document.querySelector('.pulse-dot');
    const st  = $('statusText');
    if (dot) dot.className = `pulse-dot ${level}`;
    if (st)  st.textContent = text;
  }

  return { init, updateSensors, updateAI, setSystemStatus };
})();
