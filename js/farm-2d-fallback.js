/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — 2D Canvas Fallback (WebGL not available)
   Provides a beautiful 2D farm visualization when WebGL fails
═══════════════════════════════════════════════════════════════ */

const FarmScene2D = (() => {
  let canvas, ctx;
  let crops = [];
  let animFrame = 0;
  let state = {
    flood: 0,
    drought: 0,
    disease: 0,
    pest: 0,
    heat: 0,
    harvest: false
  };

  const colors = {
    sky: '#87CEEB',
    skyFlood: '#546E7A',
    ground: '#4A8A35',
    groundDry: '#B07030',
    groundFlood: '#1A4A1A',
    crop: '#2D8C3E',
    cropDry: '#C8A040',
    cropSick: '#7A6030',
    stem: '#3A7020',
    soil: '#3D2010',
    water: '#29B6F6',
    sensor: '#546E7A',
    sun: '#FFFDE7',
    sunHeat: '#FF8F00'
  };

  function init() {
    canvas = document.getElementById('farmCanvas');
    if (!canvas) {
      console.error('[Farm2D] Canvas not found');
      return;
    }

    ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[Farm2D] Could not get 2D context');
      return;
    }

    resize();
    window.addEventListener('resize', resize);

    // Create crop grid
    const rows = 7, cols = 11;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        crops.push({
          x: c / cols,
          y: r / rows,
          height: 0.7 + Math.random() * 0.3,
          swayOffset: Math.random() * Math.PI * 2
        });
      }
    }

    animate();
    console.log('[Farm2D] 2D fallback initialized successfully');
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function animate() {
    if (!ctx || !canvas) return;

    animFrame++;
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Sky
    const skyColor = state.flood > 0 ? colors.skyFlood : colors.sky;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, skyColor);
    skyGrad.addColorStop(1, '#E3F2FD');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Sun
    const sunColor = state.heat > 0 ? colors.sunHeat : colors.sun;
    ctx.fillStyle = sunColor;
    ctx.shadowBlur = 30;
    ctx.shadowColor = sunColor;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.15, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ground
    const groundY = h * 0.6;
    let groundColor = colors.ground;
    if (state.flood > 0) groundColor = colors.groundFlood;
    else if (state.drought > 0) {
      const t = state.drought / 100;
      groundColor = lerpColor(colors.ground, colors.groundDry, t);
    }

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, groundColor);
    groundGrad.addColorStop(1, darken(groundColor, 0.3));
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Soil rows
    ctx.fillStyle = colors.soil;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 7; i++) {
      const y = groundY + (h - groundY) * ((i + 1) / 8);
      ctx.fillRect(w * 0.1, y - 3, w * 0.8, 6);
    }
    ctx.globalAlpha = 1;

    // Crops
    const fieldX = w * 0.15;
    const fieldW = w * 0.7;
    const fieldY = groundY - h * 0.15;
    const fieldH = h * 0.15;

    crops.forEach((crop, i) => {
      const x = fieldX + crop.x * fieldW;
      const baseY = fieldY + crop.y * fieldH;
      const cropH = h * 0.12 * crop.height;
      
      // Sway animation
      const sway = Math.sin(animFrame * 0.02 + crop.swayOffset) * 3;

      // Crop color based on state
      let cropColor = colors.crop;
      if (state.disease > 0 && i < crops.length * state.disease / 100) {
        cropColor = colors.cropSick;
      } else if (state.drought > 0) {
        const t = state.drought / 100;
        cropColor = lerpColor(colors.crop, colors.cropDry, t);
      }
      if (state.heat > 0) {
        cropColor = colors.cropDry;
      }

      // Stem
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + sway, baseY - cropH);
      ctx.stroke();

      // Leaves
      ctx.fillStyle = cropColor;
      for (let j = 0; j < 3; j++) {
        const ly = baseY - cropH * (0.3 + j * 0.25);
        ctx.beginPath();
        ctx.ellipse(x + sway * (1 - j * 0.3), ly, 8, 15, Math.PI / 4 + j * Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Top (grain)
      if (state.harvest) {
        ctx.fillStyle = '#FFD54F';
      } else {
        ctx.fillStyle = '#D4A020';
      }
      ctx.beginPath();
      ctx.arc(x + sway, baseY - cropH, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sensors
    for (let i = 0; i < 6; i++) {
      const sx = fieldX + (i % 3) * fieldW / 2.5 + fieldW * 0.1;
      const sy = groundY + (Math.floor(i / 3) * (h - groundY) * 0.4) + 20;
      
      // Pole
      ctx.fillStyle = '#607D8B';
      ctx.fillRect(sx - 2, sy, 4, 30);
      
      // Sensor box
      ctx.fillStyle = colors.sensor;
      ctx.fillRect(sx - 8, sy - 8, 16, 16);
      
      // LED
      ctx.fillStyle = '#00E676';
      ctx.beginPath();
      ctx.arc(sx, sy - 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flood water overlay
    if (state.flood > 0) {
      const waterY = h - (h - groundY) * (state.flood / 150);
      ctx.fillStyle = colors.water;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(0, waterY, w, h - waterY);
      ctx.globalAlpha = 1;

      // Water ripples
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 3; i++) {
        const y = waterY + 10 + i * 15;
        const offset = (animFrame * 2 + i * 30) % w;
        ctx.beginPath();
        ctx.moveTo(offset - 30, y);
        for (let x = offset - 30; x < w + 30; x += 20) {
          ctx.quadraticCurveTo(x + 5, y - 5, x + 10, y);
          ctx.quadraticCurveTo(x + 15, y + 5, x + 20, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Pest overlay
    if (state.pest > 0) {
      ctx.fillStyle = '#FF5722';
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 20; i++) {
        const px = fieldX + Math.random() * fieldW;
        const py = fieldY + Math.random() * fieldH;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Status text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2D Fallback Mode (WebGL not available)', w / 2, 30);

    requestAnimationFrame(animate);
  }

  function lerpColor(color1, color2, t) {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return #+((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function darken(color, amount) {
    const c = parseInt(color.slice(1), 16);
    const r = Math.max(0, ((c >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((c >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (c & 0xff) * (1 - amount));
    return #+((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Public API
  function applyFlood(level) { state.flood = level * 100; }
  function applyDrought(severity) { state.drought = severity; }
  function applyDisease(severity) { state.disease = severity; }
  function applyPest(density) { state.pest = density; }
  function applyHeat(temp) { state.heat = temp; }
  function setHarvestMode(active) { state.harvest = active; }
  function resetScene() { state = { flood: 0, drought: 0, disease: 0, pest: 0, heat: 0, harvest: false }; }
  function flashPestDetection() { state.pest = 100; setTimeout(() => { state.pest = 0; }, 2000); }

  return {
    init,
    applyFlood,
    applyDrought,
    applyDisease,
    applyPest,
    applyHeat,
    setHarvestMode,
    resetScene,
    flashPestDetection
  };
})();