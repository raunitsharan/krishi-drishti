/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — Alert & Notification System
   Features: toast notifications, alert log panel, SMS simulation,
   emergency mode, audio cue simulation, deduplication.
═══════════════════════════════════════════════════════════════ */

const AlertSystem = (() => {

  /* ── Config ──────────────────────────────────────────────── */
  const MAX_LOG   = 50;
  const DEDUP_MS  = 12000;   // suppress same alert for 12s

  /* ── State ───────────────────────────────────────────────── */
  const alertLog   = [];
  const recentKeys = new Map();   // key → timestamp, for dedup
  let emergencyMode = false;

  /* ── $ helper ────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  /* ══════════════════════════════════════════════════════════
     TOAST NOTIFICATION
  ══════════════════════════════════════════════════════════ */
  function toast(type, title, message, duration = 5000) {
    const container = $('toastContainer');
    if (!container) return;

    const icons = {
      ok:       'fa-circle-check',
      info:     'fa-circle-info',
      warn:     'fa-triangle-exclamation',
      danger:   'fa-circle-exclamation',
      critical: 'fa-radiation',
    };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${_esc(title)}</div>
        <div class="toast-msg">${_esc(message)}</div>
      </div>
      <i class="fa-solid fa-xmark toast-close" onclick="this.closest('.toast').remove()"></i>
    `;
    container.appendChild(el);

    if (duration > 0) {
      setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
      }, duration);
    }
    return el;
  }

  /* ══════════════════════════════════════════════════════════
     ALERT LOG ENTRY
  ══════════════════════════════════════════════════════════ */
  function logAlert(level, message, icon = 'fa-bell') {
    const listEl = $('alertLogList');
    if (!listEl) return;

    /* Remove empty placeholder */
    const empty = listEl.querySelector('.alert-log-empty');
    if (empty) empty.remove();

    const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const item = document.createElement('div');
    item.className = `alert-log-item ${level}`;
    item.innerHTML = `
      <i class="fa-solid ${icon} ali-icon" style="color:${_levelColor(level)}"></i>
      <span class="ali-msg">${_esc(message)}</span>
      <span class="ali-time">${time}</span>
    `;
    listEl.insertBefore(item, listEl.firstChild);

    /* Trim to max */
    while (listEl.children.length > MAX_LOG) {
      listEl.removeChild(listEl.lastChild);
    }

    /* Push to internal log */
    alertLog.unshift({ time, level, message });
    if (alertLog.length > MAX_LOG) alertLog.pop();
  }

  /* ══════════════════════════════════════════════════════════
     PROCESS SENSOR ALERTS (called each tick)
  ══════════════════════════════════════════════════════════ */
  function processSensorAlerts(alerts) {
    alerts.forEach(a => {
      const key     = `${a.key}_${a.dir}`;
      const lastSent= recentKeys.get(key) || 0;
      if (Date.now() - lastSent < DEDUP_MS) return;   // deduplicate
      recentKeys.set(key, Date.now());

      const type = a.level === 'critical' ? 'critical' : a.level === 'danger' ? 'danger' : 'warn';
      const icon  = _sensorIcon(a.key);
      toast(type, `${a.name} ${a.dir}`, a.message);
      logAlert(type, a.message, icon);
    });
  }

  /* ══════════════════════════════════════════════════════════
     PROCESS AI ALERTS (called on inference output)
  ══════════════════════════════════════════════════════════ */
  function processAIAlerts(output) {
    const checks = [
      { cond: output.disease.alert,    key: 'disease',   type: 'danger',
        title: 'Disease Alert',  msg: `${output.disease.label} — ${output.disease.conf}% confidence`,
        icon: 'fa-virus' },
      { cond: output.pest.alert,       key: 'pest',      type: 'danger',
        title: 'Pest Alert',     msg: `${output.pest.label} — ${output.pest.conf}% confidence`,
        icon: 'fa-bug' },
      { cond: output.flood.alert,      key: 'flood',     type: 'critical',
        title: 'Flood Warning',  msg: `Probability: ${output.flood.prob}% — LSTM model`,
        icon: 'fa-house-flood-water' },
      { cond: output.drought.alert,    key: 'drought',   type: 'warn',
        title: 'Drought Risk',   msg: `Risk: ${output.drought.prob}% — XGBoost model`,
        icon: 'fa-sun-plant-wilt' },
      { cond: output.nutrient.alert,   key: 'nutrient',  type: 'warn',
        title: 'Nutrient Deficiency', msg: output.nutrient.label,
        icon: 'fa-flask' },
      { cond: output.irrigation.alert, key: 'irrigate',  type: 'warn',
        title: 'Irrigation Required', msg: 'Soil moisture critically low — activate pump',
        icon: 'fa-faucet-drip' },
      { cond: output.harvest.alert,    key: 'harvest',   type: 'info',
        title: 'Harvest Ready',  msg: `Optimal harvest window open — ${output.harvest.days} days`,
        icon: 'fa-tractor' },
    ];

    checks.forEach(c => {
      if (!c.cond) return;
      const k       = `ai_${c.key}`;
      const lastSent= recentKeys.get(k) || 0;
      if (Date.now() - lastSent < DEDUP_MS * 1.5) return;
      recentKeys.set(k, Date.now());
      toast(c.type, c.title, c.msg);
      logAlert(c.type, `${c.title}: ${c.msg}`, c.icon);
    });

    /* Update system status banner */
    const hasEmergency = output.flood.alert && output.flood.prob > 75;
    const hasDanger    = output.disease.alert || output.pest.alert || output.flood.alert;
    const hasWarn      = output.drought.alert || output.nutrient.alert || output.irrigation.alert;

    if (emergencyMode || hasEmergency) {
      Dashboard.setSystemStatus('red', 'EMERGENCY · CRITICAL ALERT ACTIVE');
    } else if (hasDanger) {
      Dashboard.setSystemStatus('orange', 'ALERT ACTIVE · ACTION REQUIRED');
    } else if (hasWarn) {
      Dashboard.setSystemStatus('yellow', 'WARNING · MONITORING CLOSELY');
    } else {
      Dashboard.setSystemStatus('green', 'SYSTEM ONLINE · EDGE-AI ACTIVE');
    }
  }

  /* ══════════════════════════════════════════════════════════
     SMS ALERT SIMULATION
  ══════════════════════════════════════════════════════════ */
  function sendSMSAlert() {
    const output = AIEngine.getLastOutput();
    if (!output) { toast('info', 'SMS', 'No active alert to send.'); return; }

    const msg = output.recommendation.substring(0, 160);
    const modal = $('modalOverlay');
    const mIcon = $('modalIcon');
    const mTitle= $('modalTitle');
    const mBody = $('modalBody');
    if (!modal) return;

    mIcon.innerHTML = '<i class="fa-solid fa-sms" style="color:#22c55e"></i>';
    mTitle.textContent = 'SMS Alert Sent';
    mBody.innerHTML = `
      <strong>To:</strong> Farmer (registered number)<br/>
      <strong>Gateway:</strong> SMS Gateway (Offline-first)<br/>
      <strong>Message:</strong><br/><em>"${_esc(msg)}"</em><br/><br/>
      <span style="color:#4a7a99;font-size:11px">Delivered via GSM fallback · No internet required</span>
    `;
    modal.style.display = 'flex';

    toast('ok', 'SMS Sent', 'Alert delivered to farmer mobile via SMS gateway.');
    logAlert('info', 'SMS alert sent to registered farmer number.', 'fa-sms');
  }

  /* ══════════════════════════════════════════════════════════
     IRRIGATION ACTION
  ══════════════════════════════════════════════════════════ */
  function triggerIrrigationAction() {
    toast('ok', 'Irrigation Triggered', 'Pump activated via GPIO relay. Target zone: Main Field.');
    logAlert('info', 'Auto-irrigation triggered — pump ON (relay GPIO 17)', 'fa-faucet-drip');
    const modal = $('modalOverlay');
    const mIcon = $('modalIcon');
    const mTitle= $('modalTitle');
    const mBody = $('modalBody');
    if (!modal) return;
    mIcon.innerHTML = '<i class="fa-solid fa-faucet-drip" style="color:#06b6d4"></i>';
    mTitle.textContent = 'Irrigation Activated';
    mBody.innerHTML = `
      <strong>Action:</strong> Pump ON via GPIO relay (RPi 4B)<br/>
      <strong>Zone:</strong> Main Field (2.4 ha)<br/>
      <strong>Duration:</strong> 45 minutes (estimated)<br/>
      <strong>Mode:</strong> Drip irrigation · Water saved: ~35%<br/><br/>
      <span style="color:#4a7a99;font-size:11px">Automated response · No manual intervention needed</span>
    `;
    modal.style.display = 'flex';
  }

  /* ══════════════════════════════════════════════════════════
     LOG EVENT
  ══════════════════════════════════════════════════════════ */
  function logEvent() {
    const output = AIEngine.getLastOutput();
    const state  = SensorEngine.getState();
    if (!output) return;
    const entry = {
      ts:        new Date().toISOString(),
      moisture:  state.moisture.toFixed(1),
      airTemp:   state.airTemp.toFixed(1),
      flood:     output.flood.prob,
      drought:   output.drought.prob,
      disease:   output.disease.label,
      pest:      output.pest.label,
    };
    console.log('[Krishi Drishti] Event logged:', entry);
    toast('info', 'Event Logged', 'Sensor + AI snapshot stored locally (edge storage).');
    logAlert('info', `Data snapshot logged: moisture=${entry.moisture}% temp=${entry.airTemp}°C`, 'fa-database');
  }

  /* ══════════════════════════════════════════════════════════
     EMERGENCY MODE
  ══════════════════════════════════════════════════════════ */
  function triggerEmergency() {
    emergencyMode = !emergencyMode;
    const btn = $('emergencyBtn');
    if (emergencyMode) {
      toast('critical', 'EMERGENCY MODE ON', 'All emergency protocols activated. Authorities notified.', 0);
      logAlert('danger', 'EMERGENCY MODE ACTIVATED — All systems on high alert', 'fa-radiation');
      Dashboard.setSystemStatus('red', 'EMERGENCY MODE · ALL SYSTEMS ALERT');
      if (btn) btn.style.background = 'linear-gradient(135deg,#7f1d1d,#dc2626)';
    } else {
      const t = $('toastContainer');
      if (t) t.innerHTML = '';
      toast('info', 'Emergency Cleared', 'Returning to normal monitoring mode.');
      logAlert('info', 'Emergency mode cleared — normal monitoring resumed', 'fa-check-circle');
      Dashboard.setSystemStatus('green', 'SYSTEM ONLINE · EDGE-AI ACTIVE');
      if (btn) btn.style.background = '';
    }
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */
  function closeModal()     { const m = $('modalOverlay'); if (m) m.style.display = 'none'; }
  function closeDetection() { const d = $('detectionOverlay'); if (d) d.style.display = 'none'; }

  function _levelColor(level) {
    return { ok: '#22c55e', info: '#3b82f6', warn: '#f97316', danger: '#ef4444', critical: '#dc2626' }[level] || '#7bacc4';
  }

  function _sensorIcon(key) {
    const map = {
      moisture: 'fa-droplet', ph: 'fa-vial', soilTemp: 'fa-temperature-half',
      airTemp: 'fa-thermometer', humidity: 'fa-water', rainfall: 'fa-cloud-rain',
      waterLevel: 'fa-ruler-vertical', battery: 'fa-battery-quarter',
      n: 'fa-flask', p: 'fa-flask', k: 'fa-flask',
    };
    return map[key] || 'fa-triangle-exclamation';
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    toast, logAlert,
    processSensorAlerts, processAIAlerts,
    sendSMSAlert, triggerIrrigationAction, logEvent,
    triggerEmergency, closeModal, closeDetection,
  };
})();

/* ── Global shims so onclick="" attributes in HTML work ─────── */
function sendSMSAlert()          { AlertSystem.sendSMSAlert(); }
function triggerIrrigationAction(){ AlertSystem.triggerIrrigationAction(); }
function logEvent()              { AlertSystem.logEvent(); }
function triggerEmergency()      { AlertSystem.triggerEmergency(); }
function closeModal()            { AlertSystem.closeModal(); }
function closeDetection()        { AlertSystem.closeDetection(); }
