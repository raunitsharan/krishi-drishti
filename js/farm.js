/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — 3D Farm Scene v3 (Bugfixed + Light Daytime)
   All bugs fixed:
   - obj.pests key corrected
   - outputColorSpace removed (r160 compat)
   - Object.assign position fix
   - glowMat closure fix
   - skyMat uniform names consistent
   - canvas sizing guaranteed via explicit resize
═══════════════════════════════════════════════════════════════ */

const FarmScene = (() => {

  let renderer, scene, camera, clock;

  const obj          = {};
  const cropMeshes   = [];
  const sensorNodes  = [];
  const cloudMeshes  = [];

  /* injection state */
  let floodActive   = false;
  let droughtActive = false;
  let diseaseActive = false;
  let pestActive    = false;
  let heatActive    = false;
  let harvestActive = false;

  /* orbit state */
  let isDragging = false;
  let prevMouse  = { x: 0, y: 0 };
  let sph    = { theta: -0.5,  phi: 1.05, r: 30 };
  let sphTgt = { theta: -0.5,  phi: 1.05, r: 30 };

  /* colours */
  const C = {
    ground:    0x5a8a3c,
    groundDry: 0xb5813a,
    soilLine:  0x4a2e1a,
    cropGreen: 0x2d8c3e,
    cropSick:  0x8b7040,
    cropDry:   0xc9a24a,
    cropYellow:0xc8a82a,
    water:     0x4fc3f7,
    waterDeep: 0x0288d1,
    sensorBod: 0x546e7a,
    sensorOk:  0x00e676,
    sensorWrn: 0xff9800,
    sensorDng: 0xf44336,
    pole:      0x78909c,
    pestOrange:0xff5722,
    rain:      0x90caf9,
    dust:      0xd4a762,
  };

  /* sky uniform colours — defined once, mutated later */
  const SKY = {
    top:     new THREE.Color(0x1565c0),
    mid:     new THREE.Color(0x42a5f5),
    bot:     new THREE.Color(0x87ceeb),
    horizon: new THREE.Color(0xdceefb),
  };

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  function init() {
    const canvas    = document.getElementById('farmCanvas');
    const container = document.getElementById('sceneContainer');
    if (!canvas || !container) return;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure= 1.1;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog        = new THREE.FogExp2(0xc8e6f5, 0.012);

    camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
    clock  = new THREE.Clock();

    _buildLighting();
    _buildSkyDome();
    _buildSunDisc();
    _buildGround();
    _buildCrops();
    _buildSolarUnit();
    _buildSensorNodes();
    _buildWaterCanal();
    _buildDrone();
    _buildClouds();
    _buildRain();
    _buildDust();
    _buildPests();
    _buildFloodPlane();
    _buildHarvestSparkles();

    _setupOrbit(canvas);
    _setupResize(container);
    _resize(container);
    _loop();
  }

  /* ══════════════════════════════════════════════════════════
     LIGHTING
  ══════════════════════════════════════════════════════════ */
  function _buildLighting() {
    scene.add(new THREE.AmbientLight(0xfff8e1, 1.1));

    const sun = new THREE.DirectionalLight(0xfffde7, 2.2);
    sun.position.set(25, 45, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left   = -30; sun.shadow.camera.right  =  30;
    sun.shadow.camera.top    =  30; sun.shadow.camera.bottom = -30;
    sun.shadow.camera.far    =  90;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    obj.sunLight = sun;

    const fill = new THREE.DirectionalLight(0xdceefb, 0.5);
    fill.position.set(-15, 10, -10);
    scene.add(fill);

    scene.add(new THREE.HemisphereLight(0x9dc7e8, 0x5a8a3c, 0.65));
  }

  /* ══════════════════════════════════════════════════════════
     SKY DOME — gradient shader
  ══════════════════════════════════════════════════════════ */
  function _buildSkyDome() {
    const geo = new THREE.SphereGeometry(120, 28, 14);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTop:    { value: SKY.top },
        uMid:    { value: SKY.mid },
        uBot:    { value: SKY.bot },
        uHorizon:{ value: SKY.horizon },
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop, uMid, uBot, uHorizon;
        varying vec3 vPos;
        void main(){
          float h = normalize(vPos).y;
          vec3 col;
          if(h > 0.45) col = mix(uMid, uTop, (h - 0.45) / 0.55);
          else if(h > 0.0) col = mix(uHorizon, uMid, h / 0.45);
          else col = mix(uBot, uHorizon, 1.0 + h * 3.0);
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    scene.add(new THREE.Mesh(geo, mat));
    obj.skyMat = mat;
  }

  /* ══════════════════════════════════════════════════════════
     SUN DISC + HALO
  ══════════════════════════════════════════════════════════ */
  function _buildSunDisc() {
    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfffde7 })
    );
    disc.position.set(55, 70, -45);
    scene.add(disc);
    obj.sunDisc = disc;

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe57f, transparent: true, opacity: 0.22 })
    );
    halo.position.copy(disc.position);
    scene.add(halo);
  }

  /* ══════════════════════════════════════════════════════════
     GROUND + FEATURES
  ══════════════════════════════════════════════════════════ */
  function _buildGround() {
    const geo = new THREE.PlaneGeometry(64, 44, 40, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (Math.random() - 0.5) * 0.15);
    }
    geo.computeVertexNormals();

    const mat  = new THREE.MeshLambertMaterial({ color: C.ground });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x    = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obj.ground    = mesh;
    obj.groundMat = mat;

    /* soil planting rows */
    for (let r = -3; r <= 3; r++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 0.55),
        new THREE.MeshLambertMaterial({ color: C.soilLine })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(-1.5, 0.012, r * 2.4);
      scene.add(m);
    }

    /* hedgerow borders */
    const hMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
    [-21, 21].forEach(x => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 44), hMat);
      b.position.set(x, 0.25, 0);
      b.castShadow = true;
      scene.add(b);
    });
    [-15, 15].forEach(z => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(44, 0.5, 0.5), hMat);
      b.position.set(0, 0.25, z);
      b.castShadow = true;
      scene.add(b);
    });

    /* dirt path */
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 44),
      new THREE.MeshLambertMaterial({ color: 0xb8976a })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(13, 0.02, 0);
    scene.add(path);
  }

  /* ══════════════════════════════════════════════════════════
     CROPS
  ══════════════════════════════════════════════════════════ */
  function _buildCrops() {
    const rows = 7, cols = 10;
    const sx = -10, sz = -7.2, dx = 2.1, dz = 2.4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cropMeshes.push(_makeCrop(
          sx + c * dx + (Math.random() - 0.5) * 0.2,
          sz + r * dz + (Math.random() - 0.5) * 0.2
        ));
      }
    }
  }

  function _makeCrop(x, z) {
    const g   = new THREE.Group();
    const h   = 0.8 + Math.random() * 0.5;
    const baseColor = new THREE.Color(C.cropGreen);
    baseColor.offsetHSL(0, (Math.random() - 0.5) * 0.07, (Math.random() - 0.5) * 0.09);

    /* stem */
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x4a7c2e });
    const stem    = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, h, 6), stemMat);
    stem.position.y = h / 2;
    stem.castShadow = true;
    g.add(stem);

    /* leaves */
    const leafMats = [];
    for (let i = 0; i < 4; i++) {
      const lMat = new THREE.MeshLambertMaterial({ color: baseColor.clone(), side: THREE.DoubleSide });
      leafMats.push(lMat);
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.42 + Math.random() * 0.18, 0.16), lMat);
      leaf.rotation.y = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
      leaf.rotation.z = 0.22 + Math.random() * 0.14;
      leaf.position.y = h * (0.45 + Math.random() * 0.2);
      leaf.position.x = Math.sin(leaf.rotation.y) * 0.06;
      leaf.castShadow = true;
      g.add(leaf);
    }

    /* tassle */
    const tMat = new THREE.MeshLambertMaterial({ color: 0xd4a520 });
    const tass  = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.2, 6), tMat);
    tass.position.y = h + 0.10;
    tass.castShadow = true;
    g.add(tass);

    g.position.set(x, 0, z);
    g.userData = {
      h,
      swayOff:  Math.random() * Math.PI * 2,
      leafMats,
      stemMat,
      tMat,
      origColor: baseColor.clone(),
    };
    scene.add(g);
    return g;
  }

  /* ══════════════════════════════════════════════════════════
     SOLAR PANEL + EDGE-AI UNIT
  ══════════════════════════════════════════════════════════ */
  function _buildSolarUnit() {
    const g = new THREE.Group();

    /* pole */
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 4.5, 8),
      new THREE.MeshLambertMaterial({ color: C.pole })
    );
    pole.position.y = 2.25;
    pole.castShadow = true;
    g.add(pole);

    /* panel frame */
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x263238 })
    );
    frame.position.set(0, 4.6, -0.5);
    frame.rotation.x = 0.35;
    frame.castShadow = true;
    g.add(frame);

    /* solar cells */
    for (let ci = 0; ci < 3; ci++) {
      for (let ri = 0; ri < 2; ri++) {
        const cell = new THREE.Mesh(
          new THREE.BoxGeometry(0.76, 0.03, 0.60),
          new THREE.MeshLambertMaterial({ color: 0x1565c0 })
        );
        const cx = -0.80 + ci * 0.82;
        const cz = -0.38 + ri * 0.62;
        cell.position.set(cx, 4.65, cz - 0.5);
        cell.rotation.x = 0.35;
        g.add(cell);
      }
    }

    /* RPi box */
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.32, 0.28),
      new THREE.MeshLambertMaterial({ color: C.sensorBod })
    );
    box.position.set(0, 1.6, 0.1);
    box.castShadow = true;
    g.add(box);

    /* camera lens */
    const cam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.14, 12),
      new THREE.MeshLambertMaterial({ color: 0x1a1a2e })
    );
    cam.rotation.z = Math.PI / 2;
    cam.position.set(0.25, 1.6, 0.1);
    g.add(cam);

    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.042, 16),
      new THREE.MeshBasicMaterial({ color: 0x42a5f5 })
    );
    lens.rotation.y = -Math.PI / 2;
    lens.position.set(0.325, 1.6, 0.1);
    g.add(lens);

    /* LED */
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 8, 8),
      new THREE.MeshBasicMaterial({ color: C.sensorOk })
    );
    led.position.set(0.12, 1.76, 0.25);
    g.add(led);
    obj.led = led;

    /* antenna */
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
      new THREE.MeshLambertMaterial({ color: 0x9e9e9e })
    );
    ant.position.set(-0.12, 1.9, 0.1);
    g.add(ant);

    /* scan beam */
    const bPts = [new THREE.Vector3(0.325, 1.6, 0.1), new THREE.Vector3(8, 0.5, 0)];
    const bGeo  = new THREE.BufferGeometry().setFromPoints(bPts);
    const bMat  = new THREE.LineBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.55 });
    g.add(new THREE.Line(bGeo, bMat));
    obj.scanBeamMat = bMat;

    g.position.set(-16, 0, 0);
    scene.add(g);
  }

  /* ══════════════════════════════════════════════════════════
     SENSOR NODES — 6 field nodes
  ══════════════════════════════════════════════════════════ */
  function _buildSensorNodes() {
    const positions = [[-5, 9], [3, 9], [10, 9], [-5, -9], [3, -9], [10, -9]];

    positions.forEach((pos, idx) => {
      const g = new THREE.Group();

      /* stake */
      const stake = new THREE.Mesh(
        new THREE.CylinderGeometry(0.033, 0.044, 0.85, 6),
        new THREE.MeshLambertMaterial({ color: 0x607d8b })
      );
      stake.position.y = 0.425;
      stake.castShadow = true;
      g.add(stake);

      /* body */
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.17, 0.15),
        new THREE.MeshLambertMaterial({ color: C.sensorBod })
      );
      body.position.y = 0.95;
      body.castShadow = true;
      g.add(body);

      /* glow orb — each node gets its OWN material instance */
      const glowMat = new THREE.MeshBasicMaterial({
        color: C.sensorOk,
        transparent: true,
        opacity: 0.9,
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), glowMat);
      glow.position.y = 1.12;
      g.add(glow);

      /* ring — own material instance */
      const ringMat = new THREE.MeshBasicMaterial({ color: C.sensorOk });
      const ring    = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 24), ringMat);
      ring.position.y  = 1.12;
      ring.rotation.x  = Math.PI / 2;
      g.add(ring);

      /* probe */
      const probe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.008, 0.32, 6),
        new THREE.MeshLambertMaterial({ color: 0x9e9e9e })
      );
      probe.position.set(0.07, 0.16, 0);
      g.add(probe);

      /* antenna */
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.007, 0.18, 4),
        new THREE.MeshLambertMaterial({ color: 0xbdbdbd })
      );
      ant.position.set(-0.07, 1.06, 0);
      g.add(ant);

      g.position.set(pos[0], 0, pos[1]);
      g.userData = { glowMat, ringMat, id: idx };
      scene.add(g);
      sensorNodes.push(g);
    });
  }

  /* ══════════════════════════════════════════════════════════
     WATER CANAL
  ══════════════════════════════════════════════════════════ */
  function _buildWaterCanal() {
    /* bed */
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.35, 44),
      new THREE.MeshLambertMaterial({ color: 0x3e2723 })
    );
    bed.position.set(19, -0.15, 0);
    bed.receiveShadow = true;
    scene.add(bed);

    /* walls */
    [-1.2, 1.2].forEach(dx => {
      const w = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.45, 44),
        new THREE.MeshLambertMaterial({ color: 0x4e342e })
      );
      w.position.set(19 + dx, 0.12, 0);
      scene.add(w);
    });

    /* water surface */
    const wMat = new THREE.MeshLambertMaterial({ color: C.water, transparent: true, opacity: 0.72 });
    const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 44, 1, 30), wMat);
    wMesh.rotation.x = -Math.PI / 2;
    wMesh.position.set(19, 0.02, 0);
    scene.add(wMesh);
    obj.water    = wMesh;
    obj.waterMat = wMat;
  }

  /* ══════════════════════════════════════════════════════════
     DRONE
  ══════════════════════════════════════════════════════════ */
  function _buildDrone() {
    const dg   = new THREE.Group();
    const bMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    dg.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.32), bMat));

    [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.03, 0.055),
        new THREE.MeshLambertMaterial({ color: 0x374151 })
      );
      arm.rotation.y = d[0] === d[1] ? Math.PI / 4 : -Math.PI / 4;
      arm.position.set(d[0] * 0.19, 0, d[1] * 0.19);
      dg.add(arm);

      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.022, 16),
        new THREE.MeshLambertMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.55 })
      );
      rotor.position.set(d[0] * 0.27, 0.055, d[1] * 0.27);
      rotor.userData.isRotor = true;
      dg.add(rotor);
    });

    /* down-cam */
    const dcam = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x0a0a1a })
    );
    dcam.position.set(0, -0.09, 0);
    dg.add(dcam);

    /* nav LED */
    const navLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    navLed.position.set(0, 0.06, 0.16);
    dg.add(navLed);
    obj.droneNavLed = navLed;

    dg.position.set(-14, 6.5, 0);
    obj.drone  = dg;
    obj.droneT = 0;
    scene.add(dg);
  }

  /* ══════════════════════════════════════════════════════════
     CLOUDS
  ══════════════════════════════════════════════════════════ */
  function _buildClouds() {
    [[-30,18,-30],[-10,22,-35],[12,20,-40],[32,18,-28],
     [-28,16,30],[5,20,40],[25,17,25],[-15,21,20]].forEach(([x,y,z]) => {
      const cg = new THREE.Group();
      [0,1,2].forEach(i => {
        const r   = 1.8 + Math.random() * 1.4;
        const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
        const s   = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        s.position.set((i-1)*r*0.9, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.8);
        s.scale.y = 0.55;
        cg.add(s);
      });
      cg.position.set(x, y, z);
      cg.userData.speed = (Math.random() - 0.5) * 0.003;
      scene.add(cg);
      cloudMeshes.push(cg);
    });
  }

  /* ══════════════════════════════════════════════════════════
     PARTICLE SYSTEMS
  ══════════════════════════════════════════════════════════ */
  function _makeParticleSystem(N, spread, height, color, size) {
    const geo = new THREE.BufferGeometry();
    const v   = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      v[i*3  ] = (Math.random()-0.5)*spread;
      v[i*3+1] = Math.random()*height + 0.3;
      v[i*3+2] = (Math.random()-0.5)*spread*0.7;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return { pts, mat, verts: v };
  }

  function _buildRain()     { const s=_makeParticleSystem(800,50,13,C.rain,0.08);        obj.rain=s; }
  function _buildDust()     { const s=_makeParticleSystem(400,40, 5,C.dust,0.12);        obj.dust=s; }
  function _buildPests()    { const s=_makeParticleSystem(120,22, 2,C.pestOrange,0.15);  obj.pests=s; }
  function _buildHarvestSparkles(){ const s=_makeParticleSystem(200,26,3.5,0xffd54f,0.18); obj.harvest=s; }

  /* ══════════════════════════════════════════════════════════
     FLOOD PLANE
  ══════════════════════════════════════════════════════════ */
  function _buildFloodPlane() {
    const geo = new THREE.PlaneGeometry(64, 44, 30, 30);
    const mat = new THREE.MeshLambertMaterial({ color: C.waterDeep, transparent: true, opacity: 0 });
    const m   = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.05;
    scene.add(m);
    obj.floodPlane = m;
    obj.floodMat   = mat;
  }

  /* ══════════════════════════════════════════════════════════
     ORBIT CONTROLS
  ══════════════════════════════════════════════════════════ */
  function _setupOrbit(canvas) {
    canvas.addEventListener('mousedown',  e => { isDragging=true; prevMouse={x:e.clientX,y:e.clientY}; });
    canvas.addEventListener('mouseup',    ()  => isDragging=false);
    canvas.addEventListener('mouseleave', ()  => isDragging=false);
    canvas.addEventListener('mousemove',  e  => {
      if (!isDragging) return;
      sphTgt.theta -= (e.clientX-prevMouse.x)*0.005;
      sphTgt.phi    = Math.max(0.28, Math.min(1.38, sphTgt.phi+(e.clientY-prevMouse.y)*0.005));
      prevMouse = { x:e.clientX, y:e.clientY };
    });
    canvas.addEventListener('wheel', e => {
      sphTgt.r = Math.max(10, Math.min(55, sphTgt.r+e.deltaY*0.04));
      e.preventDefault();
    }, { passive: false });

    let lt = null;
    canvas.addEventListener('touchstart',  e => { if(e.touches.length===1){ isDragging=true; lt={x:e.touches[0].clientX,y:e.touches[0].clientY}; } });
    canvas.addEventListener('touchend',    ()  => isDragging=false);
    canvas.addEventListener('touchmove',   e  => {
      if (!isDragging||!lt) return;
      sphTgt.theta -= (e.touches[0].clientX-lt.x)*0.005;
      sphTgt.phi    = Math.max(0.28, Math.min(1.38, sphTgt.phi+(e.touches[0].clientY-lt.y)*0.005));
      lt = { x:e.touches[0].clientX, y:e.touches[0].clientY };
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
    const w = container.clientWidth  || container.offsetWidth  || 600;
    const h = container.clientHeight || container.offsetHeight || 400;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ══════════════════════════════════════════════════════════
     CAMERA UPDATE
  ══════════════════════════════════════════════════════════ */
  function _updateCam() {
    sph.theta += (sphTgt.theta - sph.theta) * 0.08;
    sph.phi   += (sphTgt.phi   - sph.phi  ) * 0.08;
    sph.r     += (sphTgt.r     - sph.r    ) * 0.08;
    camera.position.set(
      sph.r * Math.sin(sph.phi) * Math.cos(sph.theta),
      sph.r * Math.cos(sph.phi),
      sph.r * Math.sin(sph.phi) * Math.sin(sph.theta)
    );
    camera.lookAt(0, 1.5, 0);
  }

  /* ══════════════════════════════════════════════════════════
     ANIMATION LOOP
  ══════════════════════════════════════════════════════════ */
  function _loop() {
    requestAnimationFrame(_loop);
    const t = clock.getElapsedTime();

    _updateCam();
    _animCrops(t);
    _animSensors(t);
    _animDrone(t);
    _animClouds(t);
    _animWater(t);
    _animRain(t);
    _animDust(t);
    _animPests(t);
    _animFlood(t);
    _animHarvest(t);
    _animScanBeam(t);
    _animLed(t);

    renderer.render(scene, camera);
  }

  /* ── crop sway ────────────────────────────────────────── */
  function _animCrops(t) {
    cropMeshes.forEach(c => {
      c.rotation.z = Math.sin(t * 0.9 + c.userData.swayOff) * 0.04;
      c.rotation.x = Math.sin(t * 0.55 + c.userData.swayOff) * 0.025;
      if (harvestActive) {
        const tass = c.children[c.children.length - 1];
        if (tass) tass.position.y = c.userData.h + 0.10 + Math.sin(t*3+c.userData.swayOff)*0.06;
      }
    });
  }

  /* ── sensor glow ──────────────────────────────────────── */
  function _animSensors(t) {
    const col = (pestActive||diseaseActive) ? C.sensorDng
              : droughtActive               ? C.sensorWrn
              : floodActive                 ? 0x42a5f5
              : heatActive                  ? 0xff7043
              : C.sensorOk;

    sensorNodes.forEach((n, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.1);
      n.userData.glowMat.opacity = 0.45 + 0.5 * pulse;
      n.userData.glowMat.color.setHex(col);
      n.userData.ringMat.color.setHex(col);
      /* spin ring */
      const ring = n.children.find(c => c.geometry && c.geometry.type === 'TorusGeometry');
      if (ring) ring.rotation.z += 0.012;
    });
  }

  /* ── drone ────────────────────────────────────────────── */
  function _animDrone(t) {
    const dt = t * 0.28;
    obj.drone.position.set(
      Math.cos(dt) * 13,
      5.5 + Math.sin(t * 0.7) * 0.35,
      Math.sin(dt) * 9
    );
    obj.drone.rotation.y = -dt + Math.PI / 2;
    obj.drone.rotation.z = Math.sin(t * 0.7) * 0.06;
    obj.drone.children.forEach(c => { if (c.userData.isRotor) c.rotation.y += 0.5; });
    if (obj.droneNavLed) {
      obj.droneNavLed.material.color.setHex(Math.sin(t*8)>0 ? 0xff1744 : 0x880000);
    }
  }

  /* ── clouds ───────────────────────────────────────────── */
  function _animClouds(t) {
    cloudMeshes.forEach(c => {
      c.position.x += c.userData.speed * (droughtActive ? 2.5 : floodActive ? 2 : 1);
      if (Math.abs(c.position.x) > 65) c.position.x = -Math.sign(c.position.x) * 65;
      const col = floodActive ? 0x90a4ae : heatActive ? 0xfff8e1 : 0xffffff;
      c.children.forEach(ch => {
        ch.material.color.setHex(col);
        ch.material.opacity = floodActive ? 0.97 : 0.88;
      });
    });
  }

  /* ── water shimmer ────────────────────────────────────── */
  function _animWater(t) {
    if (!obj.waterMat) return;
    obj.waterMat.opacity = 0.55 + 0.18 * Math.sin(t * 1.4);
    obj.water.position.y = 0.02 + Math.sin(t * 0.7) * 0.025;
  }

  /* ── rain ─────────────────────────────────────────────── */
  function _animRain(t) {
    const s = obj.rain;
    const target = floodActive ? 0.75 : 0;
    s.mat.opacity += (target - s.mat.opacity) * 0.05;
    if (floodActive) {
      const v = s.verts;
      for (let i = 0; i < v.length/3; i++) {
        v[i*3+1] -= 0.3 + Math.random()*0.1;
        if (v[i*3+1] < 0) { v[i*3+1] = 13; v[i*3] = (Math.random()-0.5)*50; }
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ── dust ─────────────────────────────────────────────── */
  function _animDust(t) {
    const s = obj.dust;
    const target = droughtActive ? 0.65 : 0;
    s.mat.opacity += (target - s.mat.opacity) * 0.04;
    if (droughtActive) {
      const v = s.verts;
      for (let i = 0; i < v.length/3; i++) {
        v[i*3  ] += 0.04 + Math.sin(t + i)*0.02;
        v[i*3+1] += 0.006;
        if (v[i*3+1] > 5) { v[i*3+1] = 0.2; v[i*3] = (Math.random()-0.5)*40; }
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ── pests ────────────────────────────────────────────── */
  function _animPests(t) {
    const s = obj.pests;
    const target = pestActive ? 0.85 : 0;
    s.mat.opacity += (target - s.mat.opacity) * 0.05;
    if (pestActive) {
      const v = s.verts;
      for (let i = 0; i < v.length/3; i++) {
        v[i*3  ] += Math.sin(t*3 + i*0.7)*0.04;
        v[i*3+1] += Math.cos(t*2 + i*0.9)*0.03;
        v[i*3+2] += Math.sin(t*2.5 + i  )*0.04;
        if (Math.abs(v[i*3  ]) > 12) v[i*3  ] *= -1;
        if (v[i*3+1] < 0.2 || v[i*3+1] > 2.4) v[i*3+1] = 0.5 + Math.random()*1.5;
        if (Math.abs(v[i*3+2]) > 9)  v[i*3+2] *= -1;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ── flood plane wave ─────────────────────────────────── */
  function _animFlood(t) {
    const target = floodActive ? 0.55 : 0;
    obj.floodMat.opacity += (target - obj.floodMat.opacity) * 0.03;
    if (floodActive) {
      obj.floodPlane.position.y = 0.12 + Math.sin(t * 0.4) * 0.06;
      const pos = obj.floodPlane.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, Math.sin(x*0.3 + t*0.8)*0.07 + Math.cos(z*0.2 + t*0.6)*0.04);
      }
      pos.needsUpdate = true;
      obj.floodPlane.geometry.computeVertexNormals();
    }
  }

  /* ── harvest sparkles ─────────────────────────────────── */
  function _animHarvest(t) {
    const s = obj.harvest;
    const target = harvestActive ? 0.85 : 0;
    s.mat.opacity += (target - s.mat.opacity) * 0.04;
    if (harvestActive) {
      const v = s.verts;
      for (let i = 0; i < v.length/3; i++) {
        v[i*3+1] += 0.022 + Math.random()*0.01;
        if (v[i*3+1] > 3.5) {
          v[i*3+1] = 0.4;
          v[i*3  ] = (Math.random()-0.5)*25;
          v[i*3+2] = (Math.random()-0.5)*18;
        }
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ── scan beam flicker ────────────────────────────────── */
  function _animScanBeam(t) {
    if (obj.scanBeamMat) obj.scanBeamMat.opacity = 0.18 + 0.42*Math.abs(Math.sin(t*1.8));
  }

  /* ── LED blink ────────────────────────────────────────── */
  function _animLed(t) {
    if (!obj.led) return;
    const on = Math.sin(t * 3) > 0;
    const col = (pestActive||diseaseActive) ? (on?0xff1744:0x7f0000)
              : floodActive                 ? (on?0x2979ff:0x003c8f)
              : droughtActive               ? (on?0xff9100:0x6d3900)
              : heatActive                  ? (on?0xff3d00:0x6d1900)
              : (on?0x00e676:0x004d1f);
    obj.led.material.color.setHex(col);
  }

  /* ══════════════════════════════════════════════════════════
     LIVE BADGE OVERLAY — shown on injection
  ══════════════════════════════════════════════════════════ */
  const BADGE_INFO = {
    flood:   { icon:'🌊', label:'Flood Event Active',    sub:'LSTM · Rising water level',    bg:'#1565c0' },
    drought: { icon:'☀',  label:'Drought Stress Active',  sub:'XGBoost · Soil moisture drop', bg:'#e65100' },
    disease: { icon:'🦠', label:'Disease Spreading',     sub:'MobileNetV3 · Crop infection', bg:'#6a1b9a' },
    pest:    { icon:'🐛', label:'Pest Swarm Detected',   sub:'YOLOv8-nano · High density',   bg:'#bf360c' },
    heat:    { icon:'🔥', label:'Heat Wave Active',      sub:'43°C+ · Crop stress HIGH',     bg:'#b71c1c' },
    harvest: { icon:'🌾', label:'Harvest Window Open',   sub:'Regression · Ready now!',      bg:'#2e7d32' },
  };

  function _showBadge(show, type) {
    let badge = document.getElementById('injLiveBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'injLiveBadge';
      badge.style.cssText = `
        position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%);
        display:none; flex-direction:column; align-items:center; gap:8px;
        pointer-events:none; z-index:10;
        animation:badgeIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
      `;
      badge.innerHTML = `
        <style>@keyframes badgeIn{from{transform:translate(-50%,-50%) scale(0.5);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}</style>
        <div id="ilbIcon" style="width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;border:3px solid rgba(255,255,255,0.6);backdrop-filter:blur(4px);box-shadow:0 4px 24px rgba(0,0,0,0.2);animation:ilbP 1.2s infinite ease-in-out;"></div>
        <style>@keyframes ilbP{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}</style>
        <div id="ilbLabel" style="background:rgba(255,255,255,0.92);border-radius:20px;padding:5px 16px;font-weight:800;font-size:13px;color:#1b2e1c;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>
        <div id="ilbSub" style="font-size:10px;color:rgba(255,255,255,0.95);text-shadow:0 1px 4px rgba(0,0,0,0.5);font-weight:700;"></div>
      `;
      const c = document.getElementById('sceneContainer');
      if (c) c.appendChild(badge);
    }
    if (show) {
      const info = BADGE_INFO[type];
      if (!info) return;
      const el = document.getElementById('ilbIcon');
      const lb = document.getElementById('ilbLabel');
      const sb = document.getElementById('ilbSub');
      if (el) { el.textContent=info.icon; el.style.background=info.bg+'44'; el.style.borderColor=info.bg+'99'; }
      if (lb) lb.textContent = info.label;
      if (sb) sb.textContent = info.sub;
      badge.style.display = 'flex';
      clearTimeout(badge._t);
      badge._t = setTimeout(() => { badge.style.display='none'; }, 4500);
    } else {
      badge.style.display = 'none';
    }
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */
  function applyFlood(level) {
    floodActive = level > 0;
    if (floodActive) {
      obj.groundMat.color.setHex(0x1a4a1a);
      SKY.top.setHex(0x263238); SKY.mid.setHex(0x37474f);
      scene.fog.color.setHex(0x78909c);
    } else {
      obj.groundMat.color.setHex(C.ground);
      SKY.top.setHex(0x1565c0); SKY.mid.setHex(0x42a5f5);
      scene.fog.color.setHex(0xc8e6f5);
    }
    _showBadge(floodActive, 'flood');
  }

  function applyDrought(severity) {
    droughtActive = severity > 0;
    if (droughtActive) {
      const t = Math.min(severity / 100, 1);
      const gc = new THREE.Color(C.ground).lerp(new THREE.Color(C.groundDry), t);
      obj.groundMat.color.copy(gc);
      const lc = new THREE.Color(C.cropGreen).lerp(new THREE.Color(C.cropDry), t);
      const n  = Math.floor(cropMeshes.length * t);
      cropMeshes.forEach((c, i) => {
        c.userData.leafMats.forEach(m => m.color.copy(i < n ? lc : c.userData.origColor));
      });
      obj.sunLight.intensity = 2.7;
      obj.sunLight.color.setHex(0xffb300);
      SKY.top.setHex(0x0d47a1);
    } else {
      obj.groundMat.color.setHex(C.ground);
      cropMeshes.forEach(c => c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor)));
      obj.sunLight.intensity = 2.2;
      obj.sunLight.color.setHex(0xfffde7);
      SKY.top.setHex(0x1565c0);
    }
    _showBadge(droughtActive, 'drought');
  }

  function applyDisease(severity) {
    diseaseActive = severity > 0;
    const n = Math.floor(cropMeshes.length * (severity / 100));
    cropMeshes.forEach((c, i) => {
      const sick = diseaseActive && i < n;
      c.userData.leafMats.forEach(m => m.color.setHex(sick ? C.cropSick : c.userData.origColor.getHex()));
      if (c.userData.stemMat) c.userData.stemMat.color.setHex(sick ? 0x5d4037 : 0x4a7c2e);
    });
    _showBadge(diseaseActive, 'disease');
  }

  function applyPest(density) {
    pestActive = density > 0;
    if (pestActive) flashPestDetection();
    _showBadge(pestActive, 'pest');
  }

  function applyHeat(temp) {
    heatActive = temp > 0;
    if (heatActive) {
      obj.sunLight.intensity = 2.9;
      obj.sunLight.color.setHex(0xff8f00);
      scene.fog.color.setHex(0xffe0b2);
      cropMeshes.forEach(c => c.userData.leafMats.forEach(m => m.color.setHex(C.cropYellow)));
    } else {
      obj.sunLight.intensity = 2.2;
      obj.sunLight.color.setHex(0xfffde7);
      scene.fog.color.setHex(0xc8e6f5);
      cropMeshes.forEach(c => c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor)));
    }
    _showBadge(heatActive, 'heat');
  }

  function setHarvestMode(active) {
    harvestActive = active;
    _showBadge(active, 'harvest');
  }

  function resetScene() {
    floodActive = droughtActive = diseaseActive = pestActive = heatActive = harvestActive = false;
    obj.groundMat.color.setHex(C.ground);
    cropMeshes.forEach(c => {
      c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor));
      if (c.userData.stemMat) c.userData.stemMat.color.setHex(0x4a7c2e);
    });
    [obj.rain, obj.dust, obj.pests, obj.harvest].forEach(s => { if (s) s.mat.opacity = 0; });
    if (obj.floodMat) obj.floodMat.opacity = 0;
    obj.sunLight.intensity = 2.2;
    obj.sunLight.color.setHex(0xfffde7);
    SKY.top.setHex(0x1565c0); SKY.mid.setHex(0x42a5f5);
    scene.fog.color.setHex(0xc8e6f5);
    _showBadge(false, '');
  }

  function flashPestDetection() {
    cropMeshes.slice(0, 10).forEach((c, i) => {
      setTimeout(() => {
        c.userData.leafMats.forEach(m => m.color.setHex(C.pestOrange));
        setTimeout(() => {
          if (!diseaseActive) c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor));
        }, 900);
      }, i * 120);
    });
  }

  return {
    init,
    applyFlood, applyDrought, applyDisease, applyPest, applyHeat,
    setHarvestMode, resetScene, flashPestDetection,
  };
})();
