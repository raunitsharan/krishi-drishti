/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — 3D Farm Scene (Three.js)
   Renders: terrain, crops, solar panel, edge-AI unit, sensor nodes,
   water canal, sky, animated scan beams, pest/disease overlays,
   drone flyby, ambient particles.
═══════════════════════════════════════════════════════════════ */

const FarmScene = (() => {
  /* ── internal state ─────────────────────────────────────── */
  let renderer, scene, camera, clock;
  let animFrameId;
  let isInitialised = false;

  /* scene objects */
  const objects = {};
  const cropMeshes = [];
  const sensorNodes = [];
  const scanBeams = [];
  const particles = [];
  let droneGroup, droneT = 0;
  let floodPlane;

  /* state flags */
  let floodActive = false;
  let floodLevel  = 0;
  let pestActive  = false;
  let droughtActive = false;
  let heatActive  = false;
  let diseaseActive = false;

  /* orbit controls */
  let isDragging = false, prevMouse = { x: 0, y: 0 };
  let spherical = { theta: -0.5, phi: 1.0, radius: 28 };
  let targetSpherical = { theta: -0.5, phi: 1.0, radius: 28 };

  /* ── color palette ──────────────────────────────────────── */
  const C = {
    sky_top:    0x020d1a,
    sky_bot:    0x041425,
    ground:     0x1a3a1f,
    ground_dry: 0x5c3d1a,
    crop_green: 0x2d8a3e,
    crop_sick:  0x8b7355,
    crop_dry:   0xc4a35a,
    stem:       0x3d5c2a,
    soil:       0x2c1810,
    solar_dark: 0x1a2535,
    solar_blue: 0x1e4d8c,
    solar_cell: 0x0d3166,
    pole:       0x374151,
    sensor_body:0x1e3a52,
    sensor_glow:0x00e5ff,
    water:      0x0a3d5c,
    water_flood:0x1565c0,
    scan_line:  0x00ff88,
    pest_red:   0xff3300,
    alert_orb:  0xff6600,
  };

  /* ══════════════════════════════════════════════════════════
     PUBLIC: init
  ══════════════════════════════════════════════════════════ */
  function init() {
    const canvas    = document.getElementById('farmCanvas');
    const container = document.getElementById('sceneContainer');

    /* Renderer */
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    /* Scene */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.sky_top);
    scene.fog        = new THREE.FogExp2(C.sky_bot, 0.018);

    /* Camera */
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    updateCameraFromSpherical();

    clock = new THREE.Clock();

    /* Build scene */
    _buildLighting();
    _buildGround();
    _buildSky();
    _buildCrops();
    _buildSolarUnit();
    _buildSensorNodes();
    _buildWaterCanal();
    _buildDrone();
    _buildParticles();
    _buildFloodPlane();

    /* Events */
    _setupOrbitControls(canvas);
    _setupResize(container);

    /* First resize */
    _resize(container);

    isInitialised = true;
    _loop();
  }

  /* ══════════════════════════════════════════════════════════
     LIGHTING
  ══════════════════════════════════════════════════════════ */
  function _buildLighting() {
    /* Ambient */
    const amb = new THREE.AmbientLight(0x1a3a5c, 0.8);
    scene.add(amb);

    /* Sun */
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 80;
    sun.shadow.camera.left   = -30;
    sun.shadow.camera.right  =  30;
    sun.shadow.camera.top    =  30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    objects.sun = sun;

    /* Fill */
    const fill = new THREE.DirectionalLight(0x3a7ab5, 0.4);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    /* Ground bounce */
    const bounce = new THREE.HemisphereLight(0x2d5a1e, 0x1a1208, 0.5);
    scene.add(bounce);
  }

  /* ══════════════════════════════════════════════════════════
     GROUND / TERRAIN
  ══════════════════════════════════════════════════════════ */
  function _buildGround() {
    /* Main field */
    const geo  = new THREE.PlaneGeometry(60, 40, 32, 32);
    /* Slight height variation */
    const pos  = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i)) < 28 && Math.abs(pos.getZ(i)) < 18) {
        pos.setY(i, (Math.random() - 0.5) * 0.15);
      }
    }
    geo.computeVertexNormals();

    const mat  = new THREE.MeshLambertMaterial({ color: C.ground });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    objects.ground = mesh;

    /* Soil rows (planting lines) */
    for (let row = -3; row <= 3; row++) {
      const rGeo = new THREE.PlaneGeometry(22, 0.5);
      const rMat = new THREE.MeshLambertMaterial({ color: C.soil });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(-2, 0.01, row * 2.4);
      scene.add(rMesh);
    }

    /* Field border */
    const borderMat = new THREE.MeshLambertMaterial({ color: 0x2a5c38 });
    [-20, 20].forEach(x => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 40), borderMat);
      b.position.set(x, 0.15, 0);
      scene.add(b);
    });
    [-14, 14].forEach(z => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 0.3), borderMat);
      b.position.set(0, 0.15, z);
      scene.add(b);
    });
  }

  /* ══════════════════════════════════════════════════════════
     SKY — gradient dome + stars
  ══════════════════════════════════════════════════════════ */
  function _buildSky() {
    /* Sky sphere */
    const skyGeo = new THREE.SphereGeometry(90, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor:    { value: new THREE.Color(0x020810) },
        bottomColor: { value: new THREE.Color(0x041a2e) },
        offset:      { value: 20 },
        exponent:    { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor, bottomColor;
        uniform float offset, exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }`
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    /* Stars */
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 800; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 80 + Math.random() * 5;
      starVerts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.25, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    /* Moon */
    const moonGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xd0e0f0 });
    const moon    = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(40, 50, -60);
    scene.add(moon);
  }

  /* ══════════════════════════════════════════════════════════
     CROPS
  ══════════════════════════════════════════════════════════ */
  function _buildCrops() {
    const rows = 7, cols = 10;
    const startX = -10, startZ = -7.2;
    const spaceX = 2.2, spaceZ = 2.4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * spaceX + (Math.random() - 0.5) * 0.2;
        const z = startZ + r * spaceZ + (Math.random() - 0.5) * 0.2;
        const crop = _makeCrop(x, z);
        cropMeshes.push(crop);
      }
    }
  }

  function _makeCrop(x, z) {
    const group  = new THREE.Group();
    const height = 0.8 + Math.random() * 0.5;

    /* Stem */
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, height, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: C.stem });
    const stem    = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = height / 2;
    stem.castShadow = true;
    group.add(stem);

    /* Leaves (3 crossing planes) */
    const leafColor = new THREE.Color(C.crop_green);
    const leafMat   = new THREE.MeshLambertMaterial({ color: leafColor, side: THREE.DoubleSide });

    for (let i = 0; i < 3; i++) {
      const lGeo = new THREE.PlaneGeometry(0.5, 0.3);
      const leaf = new THREE.Mesh(lGeo, leafMat.clone());
      leaf.rotation.y = (i / 3) * Math.PI;
      leaf.rotation.z = 0.3;
      leaf.position.y = height * 0.6;
      leaf.position.x = 0.1 * Math.sin(i);
      leaf.castShadow = true;
      group.add(leaf);
    }

    /* Grain head */
    const headGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xd4a017 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = height + 0.08;
    group.add(head);

    group.position.set(x, 0, z);
    group.userData.baseHeight  = height;
    group.userData.swayOffset  = Math.random() * Math.PI * 2;
    group.userData.healthy     = true;
    group.userData.leafMats    = group.children.slice(1, 4).map(c => c.material);

    scene.add(group);
    return group;
  }

  /* ══════════════════════════════════════════════════════════
     SOLAR PANEL + EDGE-AI UNIT
  ══════════════════════════════════════════════════════════ */
  function _buildSolarUnit() {
    const group = new THREE.Group();

    /* Pole */
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4, 8);
    const poleMat = new THREE.MeshLambertMaterial({ color: C.pole });
    const pole    = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    /* Solar panel support arm */
    const armGeo = new THREE.BoxGeometry(0.06, 0.06, 0.8);
    const armMat = new THREE.MeshLambertMaterial({ color: C.pole });
    const arm    = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0, 4, -0.4);
    group.add(arm);

    /* Solar panel frame */
    const frameGeo = new THREE.BoxGeometry(2.4, 0.06, 1.4);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x2a3a4a });
    const frame    = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 4.2, -0.5);
    frame.rotation.x = 0.35;
    frame.castShadow = true;
    group.add(frame);

    /* Solar cells */
    for (let ci = 0; ci < 3; ci++) {
      for (let ri = 0; ri < 2; ri++) {
        const cellGeo = new THREE.BoxGeometry(0.7, 0.02, 0.58);
        const cellMat = new THREE.MeshLambertMaterial({ color: C.solar_cell });
        const cell    = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(
          -0.75 + ci * 0.77,
          4.24,
          -0.8 + ri * 0.62
        );
        cell.rotation.x = 0.35;
        group.add(cell);

        /* Cell grid lines */
        const wireGeo = new THREE.EdgesGeometry(cellGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x2060a0, linewidth: 1 });
        const wire    = new THREE.LineSegments(wireGeo, wireMat);
        wire.position.copy(cell.position);
        wire.rotation.copy(cell.rotation);
        group.add(wire);
      }
    }

    /* Edge-AI unit box (RPi enclosure) */
    const boxGeo = new THREE.BoxGeometry(0.4, 0.3, 0.25);
    const boxMat = new THREE.MeshLambertMaterial({ color: C.sensor_body });
    const box    = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 1.5, 0);
    box.castShadow = true;
    group.add(box);

    /* Camera module on the box */
    const camGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12);
    const camMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
    const cam    = new THREE.Mesh(camGeo, camMat);
    cam.rotation.z = Math.PI / 2;
    cam.position.set(0.22, 1.5, 0);
    group.add(cam);

    /* Camera lens glow */
    const lensGeo = new THREE.CircleGeometry(0.04, 16);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const lens    = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.y = -Math.PI / 2;
    lens.position.set(0.285, 1.5, 0);
    group.add(lens);
    objects.cameraLens = lens;

    /* LED indicator */
    const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const led    = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.1, 1.65, 0.13);
    group.add(led);
    objects.led = led;

    /* Scan beam (line from camera to crops) */
    const beamMat = new THREE.LineBasicMaterial({ color: C.scan_line, transparent: true, opacity: 0.4 });
    const beamPts = [
      new THREE.Vector3(0.285, 1.5, 0),
      new THREE.Vector3(8, 0.5, 0)
    ];
    const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPts);
    const beam    = new THREE.Line(beamGeo, beamMat);
    group.add(beam);
    scanBeams.push({ line: beam, mat: beamMat });

    group.position.set(-14, 0, 0);
    scene.add(group);
    objects.solarUnit = group;
  }

  /* ══════════════════════════════════════════════════════════
     SENSOR NODES (6 field nodes)
  ══════════════════════════════════════════════════════════ */
  function _buildSensorNodes() {
    const positions = [
      [-5, 8],  [3, 8],  [10, 8],
      [-5, -8], [3, -8], [10, -8]
    ];

    positions.forEach((pos, idx) => {
      const group = new THREE.Group();

      /* Stake */
      const stakeGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6);
      const stakeMat = new THREE.MeshLambertMaterial({ color: 0x3a5068 });
      const stake    = new THREE.Mesh(stakeGeo, stakeMat);
      stake.position.y = 0.4;
      group.add(stake);

      /* Node body */
      const bodyGeo = new THREE.BoxGeometry(0.22, 0.16, 0.14);
      const bodyMat = new THREE.MeshLambertMaterial({ color: C.sensor_body });
      const body    = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.9;
      body.castShadow = true;
      group.add(body);

      /* Glow sphere */
      const glowGeo = new THREE.SphereGeometry(0.07, 10, 10);
      const glowMat = new THREE.MeshBasicMaterial({ color: C.sensor_glow, transparent: true, opacity: 0.8 });
      const glow    = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 1.07;
      group.add(glow);

      /* Soil probe */
      const probeGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.3, 6);
      const probeMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const probe    = new THREE.Mesh(probeGeo, probeMat);
      probe.position.set(0.06, 0.15, 0);
      group.add(probe);

      /* Connectivity antenna */
      const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4);
      const antMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const ant    = new THREE.Mesh(antGeo, antMat);
      ant.position.set(-0.07, 1.0, 0);
      group.add(ant);

      group.position.set(pos[0], 0, pos[1]);
      group.userData.glowMesh = glow;
      group.userData.glowMat  = glowMat;
      group.userData.id       = idx;

      scene.add(group);
      sensorNodes.push(group);
    });
  }

  /* ══════════════════════════════════════════════════════════
     WATER CANAL
  ══════════════════════════════════════════════════════════ */
  function _buildWaterCanal() {
    /* Canal bed */
    const bedGeo = new THREE.BoxGeometry(2.0, 0.3, 40);
    const bedMat = new THREE.MeshLambertMaterial({ color: 0x1a2a1a });
    const bed    = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(18, -0.12, 0);
    bed.receiveShadow = true;
    scene.add(bed);

    /* Canal walls */
    [-1.1, 1.1].forEach(dx => {
      const wallGeo = new THREE.BoxGeometry(0.2, 0.4, 40);
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a3a2a });
      const wall    = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(18 + dx, 0.1, 0);
      scene.add(wall);
    });

    /* Water surface */
    const waterGeo = new THREE.PlaneGeometry(1.5, 40);
    const waterMat = new THREE.MeshLambertMaterial({
      color: C.water,
      transparent: true,
      opacity: 0.75
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(18, 0.01, 0);
    scene.add(water);
    objects.water = water;
    objects.waterMat = waterMat;
  }

  /* ══════════════════════════════════════════════════════════
     DRONE
  ══════════════════════════════════════════════════════════ */
  function _buildDrone() {
    droneGroup = new THREE.Group();

    /* Body */
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.1, 0.3);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    droneGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

    /* 4 arms + rotors */
    const armDirs = [[1,1],[-1,1],[1,-1],[-1,-1]];
    armDirs.forEach(d => {
      const armGeo  = new THREE.BoxGeometry(0.5, 0.03, 0.05);
      const rotorGeo= new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16);
      const mat     = new THREE.MeshLambertMaterial({ color: 0x2a3a4a });
      const rotorMat= new THREE.MeshLambertMaterial({ color: 0x405060, transparent: true, opacity: 0.5 });

      const arm   = new THREE.Mesh(armGeo, mat);
      arm.rotation.y = d[0] === d[1] ? Math.PI/4 : -Math.PI/4;
      arm.position.set(d[0]*0.18, 0, d[1]*0.18);
      droneGroup.add(arm);

      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.set(d[0]*0.25, 0.05, d[1]*0.25);
      rotor.userData.isRotor = true;
      droneGroup.add(rotor);
    });

    /* Camera underneath */
    const camGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const camMat = new THREE.MeshBasicMaterial({ color: 0x001122 });
    const dCam   = new THREE.Mesh(camGeo, camMat);
    dCam.position.y = -0.08;
    droneGroup.add(dCam);

    droneGroup.position.set(-14, 6, 0);
    scene.add(droneGroup);
    objects.drone = droneGroup;
  }

  /* ══════════════════════════════════════════════════════════
     PARTICLES (dust / pollen)
  ══════════════════════════════════════════════════════════ */
  function _buildParticles() {
    const geo  = new THREE.BufferGeometry();
    const verts = [];
    const N = 200;
    for (let i = 0; i < N; i++) {
      verts.push(
        (Math.random() - 0.5) * 30,
        Math.random() * 5 + 0.5,
        (Math.random() - 0.5) * 20
      );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({ color: 0x88cc88, size: 0.06, transparent: true, opacity: 0.4 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    objects.particles = pts;
    objects.particleMat = mat;
  }

  /* ══════════════════════════════════════════════════════════
     FLOOD PLANE
  ══════════════════════════════════════════════════════════ */
  function _buildFloodPlane() {
    const geo = new THREE.PlaneGeometry(60, 40);
    const mat = new THREE.MeshLambertMaterial({
      color: C.water_flood,
      transparent: true,
      opacity: 0
    });
    floodPlane = new THREE.Mesh(geo, mat);
    floodPlane.rotation.x = -Math.PI / 2;
    floodPlane.position.y = 0.05;
    scene.add(floodPlane);
    objects.floodPlane = floodPlane;
    objects.floodMat   = mat;
  }

  /* ══════════════════════════════════════════════════════════
     ORBIT CONTROLS (manual mouse drag)
  ══════════════════════════════════════════════════════════ */
  function _setupOrbitControls(canvas) {
    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      prevMouse  = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('mouseup',   () => { isDragging = false; });
    canvas.addEventListener('mouseleave',() => { isDragging = false; });
    canvas.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = (e.clientX - prevMouse.x) * 0.005;
      const dy = (e.clientY - prevMouse.y) * 0.005;
      prevMouse = { x: e.clientX, y: e.clientY };
      targetSpherical.theta -= dx;
      targetSpherical.phi    = Math.max(0.3, Math.min(1.4, targetSpherical.phi + dy));
    });
    canvas.addEventListener('wheel', e => {
      targetSpherical.radius = Math.max(10, Math.min(50, targetSpherical.radius + e.deltaY * 0.04));
      e.preventDefault();
    }, { passive: false });

    /* Touch support */
    let lastTouch = null;
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastTouch  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
      if (!isDragging || !lastTouch) return;
      const dx = (e.touches[0].clientX - lastTouch.x) * 0.005;
      const dy = (e.touches[0].clientY - lastTouch.y) * 0.005;
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      targetSpherical.theta -= dx;
      targetSpherical.phi    = Math.max(0.3, Math.min(1.4, targetSpherical.phi + dy));
      e.preventDefault();
    }, { passive: false });
  }

  /* ══════════════════════════════════════════════════════════
     RESIZE
  ══════════════════════════════════════════════════════════ */
  function _setupResize(container) {
    const ro = new ResizeObserver(() => _resize(container));
    ro.observe(container);
  }

  function _resize(container) {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ══════════════════════════════════════════════════════════
     CAMERA UPDATE
  ══════════════════════════════════════════════════════════ */
  function updateCameraFromSpherical() {
    spherical.theta  += (targetSpherical.theta  - spherical.theta)  * 0.08;
    spherical.phi    += (targetSpherical.phi    - spherical.phi)    * 0.08;
    spherical.radius += (targetSpherical.radius - spherical.radius) * 0.08;

    camera.position.set(
      spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      spherical.radius * Math.cos(spherical.phi),
      spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
    );
    camera.lookAt(0, 1, 0);
  }

  /* ══════════════════════════════════════════════════════════
     ANIMATION LOOP
  ══════════════════════════════════════════════════════════ */
  function _loop() {
    animFrameId = requestAnimationFrame(_loop);
    const t   = clock.getElapsedTime();
    const dt  = clock.getDelta();

    updateCameraFromSpherical();
    _animateCrops(t);
    _animateSensorNodes(t);
    _animateDrone(t);
    _animateScanBeams(t);
    _animateParticles(t);
    _animateFlood(t);
    _animateWater(t);
    _animateLed(t);

    renderer.render(scene, camera);
  }

  /* ── Crop sway ─────────────────────────────────────────── */
  function _animateCrops(t) {
    cropMeshes.forEach(crop => {
      const sway = Math.sin(t * 0.8 + crop.userData.swayOffset) * 0.03;
      crop.rotation.z = sway;
      crop.rotation.x = Math.sin(t * 0.5 + crop.userData.swayOffset) * 0.02;
    });
  }

  /* ── Sensor node glow pulse ────────────────────────────── */
  function _animateSensorNodes(t) {
    sensorNodes.forEach((node, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.2);
      node.userData.glowMat.opacity = 0.4 + 0.5 * pulse;

      // Stagger colours when alerts active
      if (pestActive || diseaseActive) {
        node.userData.glowMat.color.setHex(0xff6600);
      } else if (droughtActive) {
        node.userData.glowMat.color.setHex(0xff9900);
      } else if (floodActive) {
        node.userData.glowMat.color.setHex(0x0066ff);
      } else if (heatActive) {
        node.userData.glowMat.color.setHex(0xff3300);
      } else {
        node.userData.glowMat.color.setHex(C.sensor_glow);
      }
    });
  }

  /* ── Drone patrol ──────────────────────────────────────── */
  function _animateDrone(t) {
    droneT = t * 0.25;
    const rx = Math.cos(droneT) * 12;
    const rz = Math.sin(droneT) * 8;
    droneGroup.position.set(rx, 5 + Math.sin(t) * 0.2, rz);
    droneGroup.rotation.y = -droneT + Math.PI / 2;

    /* Spin rotors */
    droneGroup.children.forEach(c => {
      if (c.userData.isRotor) c.rotation.y += 0.4;
    });
  }

  /* ── Scan beams ────────────────────────────────────────── */
  function _animateScanBeams(t) {
    scanBeams.forEach(b => {
      b.mat.opacity = 0.15 + 0.35 * Math.abs(Math.sin(t * 1.5));
    });
  }

  /* ── Dust particles ────────────────────────────────────── */
  function _animateParticles(t) {
    if (!objects.particles) return;
    const pos = objects.particles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + 0.003);
      if (pos.getY(i) > 6) pos.setY(i, 0.3);
    }
    pos.needsUpdate = true;
    objects.particleMat.opacity = droughtActive ? 0.7 : 0.3;
    objects.particleMat.color.setHex(droughtActive ? 0xd4a060 : 0x88cc88);
  }

  /* ── Flood plane rise/fall ─────────────────────────────── */
  function _animateFlood(t) {
    if (!objects.floodMat) return;
    const target = floodActive ? 0.55 : 0;
    objects.floodMat.opacity += (target - objects.floodMat.opacity) * 0.02;
    if (floodActive) {
      floodPlane.position.y = 0.1 + Math.sin(t * 0.3) * 0.05;
      objects.floodMat.color.setHex(C.water_flood);
    }
  }

  /* ── Water canal shimmer ───────────────────────────────── */
  function _animateWater(t) {
    if (!objects.waterMat) return;
    objects.waterMat.opacity = 0.6 + 0.15 * Math.sin(t * 1.8);
    objects.water.position.y = 0.01 + Math.sin(t * 0.6) * 0.02;
  }

  /* ── LED blink ─────────────────────────────────────────── */
  function _animateLed(t) {
    if (!objects.led) return;
    const on = Math.sin(t * 3) > 0;
    objects.led.material.color.setHex(pestActive || diseaseActive ? (on ? 0xff2200 : 0x220000) : (on ? 0x00ff44 : 0x004411));
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API — called by problem-injection.js
  ══════════════════════════════════════════════════════════ */

  function applyFlood(level) {
    floodActive = level > 0;
    if (floodActive) {
      objects.ground.material.color.setHex(0x0a2a0a);
    } else {
      objects.ground.material.color.setHex(C.ground);
    }
  }

  function applyDrought(severity) {
    droughtActive = severity > 0;
    const col = droughtActive ? new THREE.Color(C.ground_dry) : new THREE.Color(C.ground);
    objects.ground.material.color.copy(col);
    cropMeshes.forEach(crop => {
      const targetCol = droughtActive
        ? new THREE.Color(C.crop_dry)
        : new THREE.Color(C.crop_green);
      crop.userData.leafMats.forEach(m => m.color.copy(targetCol));
    });
  }

  function applyDisease(severity) {
    diseaseActive = severity > 0;
    const affected = Math.floor(cropMeshes.length * (severity / 100));
    cropMeshes.forEach((crop, i) => {
      const sick = diseaseActive && i < affected;
      crop.userData.leafMats.forEach(m => {
        m.color.setHex(sick ? C.crop_sick : C.crop_green);
      });
    });
  }

  function applyPest(severity) {
    pestActive = severity > 0;
    if (pestActive) {
      _spawnPestParticles(severity);
    }
  }

  function applyHeat(temp) {
    heatActive = temp > 0;
    if (heatActive) {
      scene.fog.color.setHex(0x1a0c00);
      objects.sun.color.setHex(0xff8c40);
      objects.sun.intensity = 2.2;
    } else {
      scene.fog.color.setHex(C.sky_bot);
      objects.sun.color.setHex(0xfff5e0);
      objects.sun.intensity = 1.6;
    }
  }

  function resetScene() {
    floodActive   = false;
    droughtActive = false;
    diseaseActive = false;
    pestActive    = false;
    heatActive    = false;

    objects.ground.material.color.setHex(C.ground);
    cropMeshes.forEach(crop => {
      crop.userData.leafMats.forEach(m => m.color.setHex(C.crop_green));
    });
    if (objects.floodMat) objects.floodMat.opacity = 0;
    scene.fog.color.setHex(C.sky_bot);
    if (objects.sun) {
      objects.sun.color.setHex(0xfff5e0);
      objects.sun.intensity = 1.6;
    }
  }

  function _spawnPestParticles(severity) {
    /* Recolour some particles red-ish to simulate pests */
    if (objects.particleMat) {
      objects.particleMat.color.setHex(0xff5500);
      objects.particleMat.size = 0.1;
    }
  }

  /* Show pest detection box floating over a random crop */
  function flashPestDetection() {
    const crop = cropMeshes[Math.floor(Math.random() * cropMeshes.length)];
    if (!crop) return;
    /* Brief orange flash on that crop's leaves */
    crop.userData.leafMats.forEach(m => {
      m.color.setHex(0xff4400);
      setTimeout(() => m.color.setHex(diseaseActive ? C.crop_sick : C.crop_green), 1200);
    });
  }

  /* ══════════════════════════════════════════════════════════
     EXPORT
  ══════════════════════════════════════════════════════════ */
  return {
    init,
    applyFlood,
    applyDrought,
    applyDisease,
    applyPest,
    applyHeat,
    resetScene,
    flashPestDetection
  };
})();
