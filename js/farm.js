/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   KRISHI DRISHTI ΓÇö 3D Farm Scene v4
   Key fixes:
   ┬╖ PlaneGeometry bumps use setY (not setZ) ΓÇö correct axis
   ┬╖ Crops are 1.8ΓÇô2.8 units tall ΓÇö clearly visible
   ┬╖ Camera angle lowered to phi=0.82 (35┬░) for side perspective
   ┬╖ SKY Colors created inside init() after THREE loads
   ┬╖ Resize uses window.innerWidth/Height
   ┬╖ All injection visuals: flood, drought, disease, pest, heat, harvest
ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */

const FarmScene = (() => {

  /* ΓöÇΓöÇ core ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  let renderer, scene, camera, clock;
  let SKY = null;

  /* ΓöÇΓöÇ collections ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  const obj         = {};
  const cropMeshes  = [];
  const sensorNodes = [];
  const clouds      = [];
  let sceneInitialized = false;  /* Track if WebGL context was created successfully */

  /* ΓöÇΓöÇ injection flags ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  let floodActive   = false;
  let droughtActive = false;
  let diseaseActive = false;
  let pestActive    = false;
  let heatActive    = false;
  let harvestActive = false;

  /* ΓöÇΓöÇ orbit ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  let drag = false, pm = { x: 0, y: 0 };
  /* phi=0.82 ΓåÆ ~35┬░ elevation so crops are clearly in view */
  let sph  = { t: -0.4, p: 0.82, r: 32 };
  let tgt  = { t: -0.4, p: 0.82, r: 32 };

  /* ΓöÇΓöÇ palette ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  const C = {
    groundGreen: 0x4a8a35,
    groundDry:   0xb07030,
    soilBrown:   0x3d2010,
    stemGreen:   0x3a7020,
    leafGreen:   0x2d8c3e,
    leafDry:     0xc8a040,
    leafSick:    0x7a6030,
    tassleGold:  0xd4a020,
    waterBlue:   0x29b6f6,
    waterDeep:   0x0277bd,
    sensorTeal:  0x546e7a,
    glowGreen:   0x00e676,
    glowOrange:  0xff9800,
    glowRed:     0xf44336,
    glowBlue:    0x42a5f5,
    pole:        0x78909c,
    pestOrange:  0xff5722,
    dustTan:     0xd4a762,
    rainBlue:    0x90caf9,
  };

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     PUBLIC: init
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function init() {
    const canvas = document.getElementById('farmCanvas');
    if (!canvas) { console.error('[FarmScene] canvas#farmCanvas not found'); return; }

    /* Renderer */
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    /* Scene */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog        = new THREE.FogExp2(0xc8e8f5, 0.009);

    /* Camera */
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    clock  = new THREE.Clock();

    /* SKY colours ΓÇö THREE guaranteed loaded here */
    SKY = {
      top:     new THREE.Color(0x1565c0),
      mid:     new THREE.Color(0x42a5f5),
      bot:     new THREE.Color(0x87ceeb),
      horizon: new THREE.Color(0xdceefb),
    };

    /* Build scene */
    _lighting();
    _skyDome();
    _sunDisc();
    _ground();
    _crops();        /* ΓåÉ the important one */
    _solarUnit();
    _sensorNodes();
    _waterCanal();
    _trees();
    _drone();
    _clouds();
    _particles();    /* rain, dust, pests, harvest sparkles */
    _floodPlane();

    /* Controls */
    _orbit(canvas);
    window.addEventListener('resize', _onResize);
    _onResize();

    sceneInitialized = true;  /* Scene initialized successfully */
    _loop();
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     LIGHTING
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _lighting() {
    scene.add(new THREE.AmbientLight(0xfff8e1, 1.2));

    const sun = new THREE.DirectionalLight(0xfffde7, 2.0);
    sun.position.set(20, 40, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
    sun.shadow.camera.right = sun.shadow.camera.top = 40;
    sun.shadow.camera.far  = 100;
    sun.shadow.bias = -0.002;
    scene.add(sun);
    obj.sunLight = sun;

    scene.add(new THREE.DirectionalLight(0xdceefb, 0.5).position.set(-10, 8, -8) && new THREE.DirectionalLight(0xdceefb, 0.5));
    scene.add(new THREE.HemisphereLight(0x9dc7e8, 0x4a8a35, 0.7));
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     SKY DOME
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _skyDome() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTop:    { value: SKY.top },
        uMid:    { value: SKY.mid },
        uBot:    { value: SKY.bot },
        uHz:     { value: SKY.horizon },
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        uniform vec3 uTop,uMid,uBot,uHz;
        varying vec3 vPos;
        void main(){
          float h=normalize(vPos).y;
          vec3 c = h>0.4 ? mix(uMid,uTop,(h-0.4)/0.6)
                 : h>0.0 ? mix(uHz,uMid,h/0.4)
                 :         mix(uBot,uHz,1.+h*3.);
          gl_FragColor=vec4(c,1.);
        }`
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 24, 12), mat));
    obj.skyMat = mat;
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     SUN
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _sunDisc() {
    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfffde7 })
    );
    disc.position.set(60, 80, -50);
    scene.add(disc);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe57f, transparent: true, opacity: 0.18 })
    );
    halo.position.copy(disc.position);
    scene.add(halo);
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     GROUND
     PlaneGeometry is in XY-plane ΓåÆ rotation.x=-PI/2 maps YΓåÆvertical.
     We MUST call setY() (not setZ()) to create bumps BEFORE rotation.
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _ground() {
    const geo = new THREE.PlaneGeometry(80, 60, 50, 50);

    /* Correct axis: Y is "up" for PlaneGeometry before rotation */
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      /* leave a flat strip in the centre for the crop rows */
      const x = pos.getX(i), y = pos.getY(i);
      const onField = Math.abs(x) < 24 && Math.abs(y) < 14;
      pos.setZ(i, onField ? 0 : (Math.random() - 0.5) * 0.3);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: C.groundGreen });
    const m   = new THREE.Mesh(geo, mat);
    m.rotation.x    = -Math.PI / 2;
    m.receiveShadow = true;
    scene.add(m);
    obj.ground    = m;
    obj.groundMat = mat;

    /* soil rows */
    const rowMat = new THREE.MeshLambertMaterial({ color: C.soilBrown });
    for (let r = -3; r <= 3; r++) {
      const row = new THREE.Mesh(new THREE.PlaneGeometry(25, 0.6), rowMat);
      row.rotation.x = -Math.PI / 2;
      row.position.set(-1, 0.015, r * 2.5);
      scene.add(row);
    }

    /* hedgerow borders */
    const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
    [[-22,0,0,0.6,0.6,48],[22,0,0,0.6,0.6,48]].forEach(([x,y,z,w,h,d]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), hedgeMat);
      b.position.set(x,0.3,z); b.castShadow=true; scene.add(b);
    });
    [[0,0,-16,48,0.6,0.6],[0,0,16,48,0.6,0.6]].forEach(([x,y,z,w,h,d]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), hedgeMat);
      b.position.set(x,0.3,z); b.castShadow=true; scene.add(b);
    });

    /* dirt path */
    const pathMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 52),
      new THREE.MeshLambertMaterial({ color: 0xb89060 })
    );
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(14, 0.02, 0);
    scene.add(pathMesh);
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     CROPS  ΓåÉ THE KEY FIX: much taller, simpler geometry, 
     clearly visible from any camera angle
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _crops() {
    const ROWS = 7, COLS = 11;
    /* Centre the grid ΓÇö COLS ├ù dx should be Γëñ 22 */
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = -11 + c * 2.0 + (Math.random() - 0.5) * 0.3;
        const z = -7.5 + r * 2.5 + (Math.random() - 0.5) * 0.3;
        cropMeshes.push(_makeCrop(x, z));
      }
    }
  }

  function _makeCrop(x, z) {
    const g = new THREE.Group();

    /* Height: 1.8 ΓÇô 2.6 units (much taller ΓåÆ easy to see) */
    const h = 1.8 + Math.random() * 0.8;

    /* ΓöÇΓöÇ STEM: thick cylinder ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
    const stemMat = new THREE.MeshLambertMaterial({ color: C.stemGreen });
    const stem    = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.10, h, 7),
      stemMat
    );
    stem.position.y = h * 0.5;
    stem.castShadow = true;
    g.add(stem);

    /* ΓöÇΓöÇ LEAVES: 3 large crossing planes ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
    const baseCol = new THREE.Color(C.leafGreen);
    baseCol.offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08);

    const leafMats = [];
    for (let i = 0; i < 3; i++) {
      const lMat = new THREE.MeshLambertMaterial({
        color: baseCol.clone(),
        side:  THREE.DoubleSide,
      });
      leafMats.push(lMat);

      /* Wide drooping leaf ΓÇö 1.2 wide, 0.35 tall */
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2 + Math.random() * 0.4, 0.35),
        lMat
      );
      leaf.rotation.y = (i / 3) * Math.PI * 2;
      leaf.rotation.z = 0.45 + Math.random() * 0.2;   /* droops outward */
      leaf.position.y = h * (0.4 + Math.random() * 0.25);
      leaf.castShadow = true;
      g.add(leaf);
    }

    /* ΓöÇΓöÇ TASSLE (grain head) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
    const tMat = new THREE.MeshLambertMaterial({ color: C.tassleGold });
    const tass  = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 7), tMat);
    tass.position.y = h + 0.22;
    tass.castShadow = true;
    g.add(tass);

    /* ΓöÇΓöÇ Position ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
    g.position.set(x, 0.02, z);  /* Raise crops above ground to prevent z-fighting */
    g.userData = {
      h, stemMat, leafMats, tMat,
      origColor: baseCol.clone(),
      swayOff:   Math.random() * Math.PI * 2,
    };
    scene.add(g);
    return g;
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     SOLAR PANEL + EDGE-AI UNIT
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _solarUnit() {
    const g = new THREE.Group();

    /* pole */
    g.add(_mesh(new THREE.CylinderGeometry(0.1, 0.13, 5, 8), C.pole, [0, 2.5, 0], true));

    /* panel */
    const pf = _mesh(new THREE.BoxGeometry(2.8, 0.08, 1.6), 0x263238, [0, 5.1, -0.5]);
    pf.rotation.x = 0.35;
    g.add(pf);

    /* solar cells */
    for (let ci = 0; ci < 3; ci++) for (let ri = 0; ri < 2; ri++) {
      const cell = _mesh(new THREE.BoxGeometry(0.82, 0.03, 0.66), 0x1565c0,
        [-0.9 + ci*0.9, 5.16, -0.88 + ri*0.7]);
      cell.rotation.x = 0.35;
      g.add(cell);
    }

    /* RPi box */
    g.add(_mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), C.sensorTeal, [0, 1.8, 0.1], true));

    /* camera */
    const cam = _mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12), 0x111122, [0.28, 1.8, 0.1]);
    cam.rotation.z = Math.PI / 2;
    g.add(cam);

    /* LED */
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: C.glowGreen })
    );
    led.position.set(0.15, 1.96, 0.26);
    g.add(led);
    obj.led = led;

    /* scan beam */
    const bMat = new THREE.LineBasicMaterial({ color: C.glowGreen, transparent: true, opacity: 0.5 });
    const bGeo  = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.28, 1.8, 0.1),
      new THREE.Vector3(10, 0.8, 0),
    ]);
    g.add(new THREE.Line(bGeo, bMat));
    obj.scanBeamMat = bMat;

    g.position.set(-18, 0, 0);
    scene.add(g);
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     SENSOR NODES  (6 nodes across the field)
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _sensorNodes() {
    [[-6, 9], [2, 9], [10, 9], [-6, -9], [2, -9], [10, -9]].forEach((pos, i) => {
      const g = new THREE.Group();

      /* stake */
      g.add(_mesh(new THREE.CylinderGeometry(0.04, 0.05, 1, 6), 0x607d8b, [0, 0.5, 0], true));

      /* body */
      g.add(_mesh(new THREE.BoxGeometry(0.26, 0.18, 0.16), C.sensorTeal, [0, 1.1, 0], true));

      /* glow orb ΓÇö own material per node */
      const glowMat = new THREE.MeshBasicMaterial({
        color: C.glowGreen, transparent: true, opacity: 0.9,
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), glowMat);
      glow.position.set(0, 1.28, 0);
      g.add(glow);

      /* ring ΓÇö own material per node */
      const ringMat = new THREE.MeshBasicMaterial({ color: C.glowGreen });
      const ring    = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 28), ringMat);
      ring.position.set(0, 1.28, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);

      /* probe */
      g.add(_mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.35, 6), 0x9e9e9e, [0.08, 0.17, 0]));

      g.position.set(pos[0], 0, pos[1]);
      g.userData = { glowMat, ringMat, id: i };
      scene.add(g);
      sensorNodes.push(g);
    });
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     WATER CANAL
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _waterCanal() {
    scene.add(_mesh(new THREE.BoxGeometry(2.4, 0.4, 52), 0x3e2723, [20, -0.18, 0]));
    [-1.3, 1.3].forEach(dx =>
      scene.add(_mesh(new THREE.BoxGeometry(0.24, 0.5, 52), 0x4e342e, [20+dx, 0.12, 0]))
    );

    const wMat = new THREE.MeshLambertMaterial({ color: C.waterBlue, transparent: true, opacity: 0.72 });
    const wMsh = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 52, 1, 30), wMat);
    wMsh.rotation.x = -Math.PI / 2;
    wMsh.position.set(20, 0.02, 0);
    scene.add(wMsh);
    obj.water = wMsh; obj.waterMat = wMat;
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     TREES (corner decoration)
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _trees() {
    [[-30, 0, -20], [-30, 0, 20], [30, 0, -20], [30, 0, 20],
     [-25, 0, 0], [25, 0, 0]].forEach(([x,y,z]) => {
      const g = new THREE.Group();
      g.add(_mesh(new THREE.CylinderGeometry(0.2, 0.35, 3, 7), 0x5d4037, [0, 1.5, 0], true));
      g.add(_mesh(new THREE.SphereGeometry(2.2+Math.random(), 10, 8), 0x2e7d32, [0, 4.5, 0], true));
      g.position.set(x, 0, z);
      scene.add(g);
    });
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     DRONE
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _drone() {
    const dg = new THREE.Group();
    dg.add(_mesh(new THREE.BoxGeometry(0.35, 0.11, 0.35), 0x1e293b, [0, 0, 0], true));

    [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d => {
      const arm = _mesh(new THREE.BoxGeometry(0.55, 0.03, 0.06), 0x374151,
        [d[0]*0.2, 0, d[1]*0.2]);
      arm.rotation.y = d[0]===d[1] ? Math.PI/4 : -Math.PI/4;
      dg.add(arm);

      const rot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.024, 16),
        new THREE.MeshLambertMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.55 })
      );
      rot.position.set(d[0]*0.29, 0.06, d[1]*0.29);
      rot.userData.isRotor = true;
      dg.add(rot);
    });

    const navLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    navLed.position.set(0, 0.07, 0.18);
    dg.add(navLed);
    obj.droneNavLed = navLed;

    dg.position.set(-15, 7, 0);
    obj.drone = dg;
    scene.add(dg);
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     CLOUDS
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _clouds() {
    [[-40,22,-35],[-15,25,-42],[10,22,-45],[38,20,-30],
     [-38,20,32],[8,24,44],[30,22,28],[-18,23,22]].forEach(([x,y,z]) => {
      const cg = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const r  = 2.2 + Math.random() * 1.6;
        const cm = new THREE.Mesh(
          new THREE.SphereGeometry(r, 10, 7),
          new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })
        );
        cm.position.set((i-1)*r*0.85, (Math.random()-0.5)*0.6, (Math.random()-0.5)*0.9);
        cm.scale.y = 0.55;
        cg.add(cm);
      }
      cg.position.set(x, y, z);
      cg.userData.spd = (Math.random()-0.5)*0.003;
      scene.add(cg);
      clouds.push(cg);
    });
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     PARTICLE SYSTEMS (rain, dust, pests, harvest)
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _particles() {
    obj.rain    = _makePS(900, 55, 14, C.rainBlue,  0.07);
    obj.dust    = _makePS(450, 45,  5, C.dustTan,   0.11);
    obj.pests   = _makePS(140, 24,  3, C.pestOrange,0.14);
    obj.harvest = _makePS(220, 28,  4, 0xffd54f,    0.17);
  }

  function _makePS(N, spread, maxH, color, size) {
    const v = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      v[i*3  ] = (Math.random()-0.5)*spread;
      v[i*3+1] = Math.random()*maxH + 0.5;
      v[i*3+2] = (Math.random()-0.5)*spread*0.7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return { pts, mat, v };
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     FLOOD PLANE
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _floodPlane() {
    const geo = new THREE.PlaneGeometry(80, 60, 30, 30);
    const mat = new THREE.MeshLambertMaterial({
      color: C.waterDeep, transparent: true, opacity: 0,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.1;
    scene.add(m);
    obj.floodPlane = m;
    obj.floodMat   = mat;
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     MESH HELPER
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _mesh(geo, color, pos, shadow = false) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    if (pos) m.position.set(...pos);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     ORBIT CONTROLS
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _orbit(canvas) {
    canvas.addEventListener('mousedown',  e => { drag=true; pm={x:e.clientX,y:e.clientY}; });
    canvas.addEventListener('mouseup',    () => drag=false);
    canvas.addEventListener('mouseleave', () => drag=false);
    canvas.addEventListener('mousemove',  e => {
      if (!drag) return;
      tgt.t -= (e.clientX - pm.x) * 0.005;
      tgt.p  = Math.max(0.22, Math.min(1.3, tgt.p + (e.clientY-pm.y)*0.005));
      pm = { x:e.clientX, y:e.clientY };
    });
    canvas.addEventListener('wheel', e => {
      tgt.r = Math.max(8, Math.min(60, tgt.r + e.deltaY*0.04));
      e.preventDefault();
    }, { passive: false });
    /* touch */
    let lt = null;
    canvas.addEventListener('touchstart',  e => { drag=true; lt={x:e.touches[0].clientX,y:e.touches[0].clientY}; });
    canvas.addEventListener('touchend',    () => drag=false);
    canvas.addEventListener('touchmove',   e => {
      if (!drag||!lt) return;
      tgt.t -= (e.touches[0].clientX-lt.x)*0.005;
      tgt.p  = Math.max(0.22, Math.min(1.3, tgt.p+(e.touches[0].clientY-lt.y)*0.005));
      lt = { x:e.touches[0].clientX, y:e.touches[0].clientY };
      e.preventDefault();
    }, { passive:false });
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     RESIZE ΓÇö always use window dimensions
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     CAMERA UPDATE
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _updateCam() {
    sph.t += (tgt.t - sph.t) * 0.07;
    sph.p += (tgt.p - sph.p) * 0.07;
    sph.r += (tgt.r - sph.r) * 0.07;
    camera.position.set(
      sph.r * Math.sin(sph.p) * Math.cos(sph.t),
      sph.r * Math.cos(sph.p),
      sph.r * Math.sin(sph.p) * Math.sin(sph.t)
    );
    camera.lookAt(0, 2, 0);  /* look slightly above ground so crops fill frame */
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     MAIN LOOP
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function _loop() {
    requestAnimationFrame(_loop);
    const t = clock.getElapsedTime();

    _updateCam();
    _aCrops(t);
    _aSensors(t);
    _aDrone(t);
    _aClouds(t);
    _aWater(t);
    _aRain(t);
    _aDust(t);
    _aPests(t);
    _aFlood(t);
    _aHarvest(t);
    _aScanBeam(t);
    _aLed(t);

    renderer.render(scene, camera);
  }

  /* ΓöÇΓöÇ Crop sway ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aCrops(t) {
    cropMeshes.forEach(c => {
      /* gentle wind sway */
      c.rotation.z = Math.sin(t*0.85 + c.userData.swayOff) * 0.05;
      c.rotation.x = Math.sin(t*0.5  + c.userData.swayOff) * 0.025;
      /* harvest: tassle bobs */
      if (harvestActive) {
        const tass = c.children[c.children.length - 1];
        if (tass) tass.position.y = c.userData.h + 0.22 + Math.sin(t*3+c.userData.swayOff)*0.08;
      }
    });
  }

  /* ΓöÇΓöÇ Sensor pulse ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aSensors(t) {
    const col = (pestActive||diseaseActive) ? C.glowRed
              :  droughtActive              ? C.glowOrange
              :  floodActive                ? C.glowBlue
              :  heatActive                 ? 0xff7043
              :  C.glowGreen;

    sensorNodes.forEach((n, i) => {
      const p = 0.5 + 0.5 * Math.sin(t*2.2 + i*1.1);
      n.userData.glowMat.opacity = 0.45 + 0.5*p;
      n.userData.glowMat.color.setHex(col);
      n.userData.ringMat.color.setHex(col);
      /* spin ring */
      const ring = n.children.find(ch => ch.geometry?.type === 'TorusGeometry');
      if (ring) ring.rotation.z += 0.014;
    });
  }

  /* ΓöÇΓöÇ Drone patrol ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aDrone(t) {
    const a = t * 0.26;
    obj.drone.position.set(Math.cos(a)*14, 6+Math.sin(t*0.65)*0.4, Math.sin(a)*10);
    obj.drone.rotation.y = -a + Math.PI/2;
    obj.drone.rotation.z =  Math.sin(t*0.65)*0.07;
    obj.drone.children.forEach(c => { if (c.userData.isRotor) c.rotation.y += 0.55; });
    if (obj.droneNavLed) obj.droneNavLed.material.color.setHex(Math.sin(t*8)>0?0xff1744:0x880000);
  }

  /* ΓöÇΓöÇ Clouds drift ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aClouds(t) {
    clouds.forEach(c => {
      c.position.x += c.userData.spd * (droughtActive?3:floodActive?2.5:1);
      if (Math.abs(c.position.x) > 70) c.position.x *= -1;
      c.children.forEach(ch => {
        ch.material.color.setHex(floodActive?0x90a4ae:heatActive?0xfff8e1:0xffffff);
        ch.material.opacity = floodActive?0.97:0.88;
      });
    });
  }

  /* ΓöÇΓöÇ Water ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aWater(t) {
    if (!obj.waterMat) return;
    obj.waterMat.opacity = 0.55 + 0.18*Math.sin(t*1.4);
    obj.water.position.y = 0.02 + Math.sin(t*0.7)*0.025;
  }

  /* ΓöÇΓöÇ Rain ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aRain(t) {
    const s = obj.rain;
    s.mat.opacity += ((floodActive?0.75:0) - s.mat.opacity)*0.05;
    if (floodActive) {
      for (let i = 0; i < s.v.length/3; i++) {
        s.v[i*3+1] -= 0.32+Math.random()*0.1;
        if (s.v[i*3+1]<0){ s.v[i*3+1]=14; s.v[i*3]=(Math.random()-0.5)*55; }
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ΓöÇΓöÇ Dust ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aDust(t) {
    const s = obj.dust;
    s.mat.opacity += ((droughtActive?0.6:0) - s.mat.opacity)*0.04;
    if (droughtActive) {
      for (let i = 0; i < s.v.length/3; i++) {
        s.v[i*3  ] += 0.05+Math.sin(t+i)*0.02;
        s.v[i*3+1] += 0.006;
        if (s.v[i*3+1]>5){ s.v[i*3+1]=0.3; s.v[i*3]=(Math.random()-0.5)*45; }
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ΓöÇΓöÇ Pests swarm ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aPests(t) {
    const s = obj.pests;
    s.mat.opacity += ((pestActive?0.88:0) - s.mat.opacity)*0.06;
    if (pestActive) {
      for (let i = 0; i < s.v.length/3; i++) {
        s.v[i*3  ] += Math.sin(t*3+i*0.7)*0.05;
        s.v[i*3+1] += Math.cos(t*2+i*0.9)*0.04;
        s.v[i*3+2] += Math.sin(t*2.5+i  )*0.05;
        if (Math.abs(s.v[i*3  ])>13) s.v[i*3  ]*=-1;
        if (s.v[i*3+1]<0.3||s.v[i*3+1]>3) s.v[i*3+1]=0.6+Math.random()*2;
        if (Math.abs(s.v[i*3+2])>10) s.v[i*3+2]*=-1;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ΓöÇΓöÇ Flood wave ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aFlood(t) {
    obj.floodMat.opacity += ((floodActive?0.55:0) - obj.floodMat.opacity)*0.03;
    if (floodActive) {
      obj.floodPlane.position.y = 0.12 + Math.sin(t*0.4)*0.06;
      const pos = obj.floodPlane.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, Math.sin(pos.getX(i)*0.3+t*0.8)*0.08 + Math.cos(pos.getZ(i)*0.2+t*0.6)*0.05);
      }
      pos.needsUpdate = true;
      obj.floodPlane.geometry.computeVertexNormals();
    }
  }

  /* ΓöÇΓöÇ Harvest sparkles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aHarvest(t) {
    const s = obj.harvest;
    s.mat.opacity += ((harvestActive?0.85:0) - s.mat.opacity)*0.04;
    if (harvestActive) {
      for (let i = 0; i < s.v.length/3; i++) {
        s.v[i*3+1] += 0.025+Math.random()*0.01;
        if (s.v[i*3+1]>4){ s.v[i*3+1]=0.4; s.v[i*3]=(Math.random()-0.5)*28; s.v[i*3+2]=(Math.random()-0.5)*20; }
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  }

  /* ΓöÇΓöÇ Scan beam ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aScanBeam(t) {
    if (obj.scanBeamMat) obj.scanBeamMat.opacity = 0.2+0.45*Math.abs(Math.sin(t*1.8));
  }

  /* ΓöÇΓöÇ LED blink ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
  function _aLed(t) {
    if (!obj.led) return;
    const on = Math.sin(t*3) > 0;
    obj.led.material.color.setHex(
      (pestActive||diseaseActive) ? (on?0xff1744:0x7f0000)
      : floodActive               ? (on?0x2979ff:0x003c8f)
      : droughtActive             ? (on?0xff9100:0x6d3900)
      : heatActive                ? (on?0xff3d00:0x6d1900)
      : (on ? 0x00e676 : 0x004d1f)
    );
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     LIVE BADGE
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  const BADGE = {
    flood:   { icon:'≡ƒîè', label:'Flood Event Active',    sub:'LSTM ┬╖ Rising water level',    bg:'#1565c0' },
    drought: { icon:'ΓÿÇ∩╕Å',  label:'Drought Stress',        sub:'XGBoost ┬╖ Soil moisture drop', bg:'#e65100' },
    disease: { icon:'≡ƒªá', label:'Disease Spreading',     sub:'MobileNetV3 ┬╖ Crop infection', bg:'#6a1b9a' },
    pest:    { icon:'≡ƒÉ¢', label:'Pest Swarm Detected',   sub:'YOLOv8-nano ┬╖ High density',   bg:'#bf360c' },
    heat:    { icon:'≡ƒöÑ', label:'Heat Wave Active',      sub:'43┬░C+ ┬╖ Crop stress HIGH',     bg:'#b71c1c' },
    harvest: { icon:'≡ƒî╛', label:'Harvest Window Open',   sub:'Regression ┬╖ Ready now!',      bg:'#2e7d32' },
  };

  function _badge(show, type) {
    let b = document.getElementById('_farmBadge');
    if (!b) {
      b = document.createElement('div');
      b.id = '_farmBadge';
      b.style.cssText = [
        'position:absolute','top:50%','left:50%',
        'transform:translate(-50%,-50%)',
        'pointer-events:none','z-index:10',
        'display:none','flex-direction:column','align-items:center','gap:8px',
      ].join(';');
      b.innerHTML = `
        <div id="_bi" style="width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;border:3px solid rgba(255,255,255,0.5);backdrop-filter:blur(4px);box-shadow:0 4px 24px rgba(0,0,0,0.25);"></div>
        <div id="_bl" style="background:rgba(255,255,255,0.92);border-radius:22px;padding:6px 18px;font-weight:800;font-size:14px;color:#1b2e1c;box-shadow:0 2px 10px rgba(0,0,0,0.15);"></div>
        <div id="_bs" style="font-size:11px;color:rgba(255,255,255,0.95);text-shadow:0 1px 4px rgba(0,0,0,0.6);font-weight:700;"></div>
      `;
      document.getElementById('sceneContainer')?.appendChild(b);
    }
    if (show && BADGE[type]) {
      const info = BADGE[type];
      const ei = document.getElementById('_bi');
      const el = document.getElementById('_bl');
      const es = document.getElementById('_bs');
      if (ei) { ei.textContent=info.icon; ei.style.background=info.bg+'44'; ei.style.borderColor=info.bg+'aa'; }
      if (el) el.textContent = info.label;
      if (es) es.textContent = info.sub;
      b.style.display = 'flex';
      clearTimeout(b._t);
      b._t = setTimeout(() => { b.style.display='none'; }, 4500);
    } else {
      b.style.display = 'none';
    }
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     PUBLIC API
  ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  function applyFlood(level) {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    floodActive = level > 0;
    obj.groundMat.color.setHex(floodActive ? 0x1a4a1a : C.groundGreen);
    if (SKY) {
      SKY.top.setHex(floodActive ? 0x263238 : 0x1565c0);
      SKY.mid.setHex(floodActive ? 0x37474f : 0x42a5f5);
    }
    scene.fog.color.setHex(floodActive ? 0x78909c : 0xc8e8f5);
    _badge(floodActive, 'flood');
  }

  function applyDrought(severity) {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    droughtActive = severity > 0;
    if (droughtActive) {
      const t = Math.min(severity/100, 1);
      obj.groundMat.color.set(
        new THREE.Color(C.groundGreen).lerp(new THREE.Color(C.groundDry), t)
      );
      const lc = new THREE.Color(C.leafGreen).lerp(new THREE.Color(C.leafDry), t);
      const n  = Math.floor(cropMeshes.length * t);
      cropMeshes.forEach((c, i) =>
        c.userData.leafMats.forEach(m => m.color.copy(i<n ? lc : c.userData.origColor))
      );
      obj.sunLight.intensity = 2.7;
      obj.sunLight.color.setHex(0xffb300);
      if (SKY) SKY.top.setHex(0x0d47a1);
    } else {
      obj.groundMat.color.setHex(C.groundGreen);
      cropMeshes.forEach(c => c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor)));
      obj.sunLight.intensity = 2.0;
      obj.sunLight.color.setHex(0xfffde7);
      if (SKY) SKY.top.setHex(0x1565c0);
    }
    _badge(droughtActive, 'drought');
  }

  function applyDisease(severity) {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    diseaseActive = severity > 0;
    const n = Math.floor(cropMeshes.length * (severity/100));
    cropMeshes.forEach((c, i) => {
      const sick = diseaseActive && i < n;
      c.userData.leafMats.forEach(m => m.color.setHex(sick ? C.leafSick : c.userData.origColor.getHex()));
      c.userData.stemMat.color.setHex(sick ? 0x5d4037 : C.stemGreen);
    });
    _badge(diseaseActive, 'disease');
  }

  function applyPest(density) {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    pestActive = density > 0;
    if (pestActive) flashPestDetection();
    _badge(pestActive, 'pest');
  }

  function applyHeat(temp) {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    heatActive = temp > 0;
    if (heatActive) {
      obj.sunLight.intensity = 2.9;
      obj.sunLight.color.setHex(0xff8f00);
      scene.fog.color.setHex(0xffe0b2);
      cropMeshes.forEach(c => c.userData.leafMats.forEach(m => m.color.setHex(C.leafDry)));
    } else {
      obj.sunLight.intensity = 2.0;
      obj.sunLight.color.setHex(0xfffde7);
      scene.fog.color.setHex(0xc8e8f5);
      cropMeshes.forEach(c => c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor)));
    }
    _badge(heatActive, 'heat');
  }

  function setHarvestMode(active) {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    harvestActive = active;
    if (active) cropMeshes.forEach(c => c.userData.tMat.color.setHex(0xffd54f));
    _badge(active, 'harvest');
  }

  function resetScene() {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    floodActive = droughtActive = diseaseActive = pestActive = heatActive = harvestActive = false;
    obj.groundMat.color.setHex(C.groundGreen);
    cropMeshes.forEach(c => {
      c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor));
      c.userData.stemMat.color.setHex(C.stemGreen);
      c.userData.tMat.color.setHex(C.tassleGold);
    });
    [obj.rain, obj.dust, obj.pests, obj.harvest].forEach(s => { if(s) s.mat.opacity=0; });
    if (obj.floodMat) obj.floodMat.opacity = 0;
    obj.sunLight.intensity = 2.0;
    obj.sunLight.color.setHex(0xfffde7);
    if (SKY) { SKY.top.setHex(0x1565c0); SKY.mid.setHex(0x42a5f5); }
    scene.fog.color.setHex(0xc8e8f5);
    _badge(false, '');
  }

  function flashPestDetection() {
    if (!sceneInitialized) return;  /* Guard: scene not initialized */
    cropMeshes.slice(0, 12).forEach((c, i) => {
      setTimeout(() => {
        c.userData.leafMats.forEach(m => m.color.setHex(C.pestOrange));
        setTimeout(() => {
          if (!diseaseActive) c.userData.leafMats.forEach(m => m.color.copy(c.userData.origColor));
        }, 900);
      }, i * 100);
    });
  }

  return {
    init,
    applyFlood, applyDrought, applyDisease, applyPest, applyHeat,
    setHarvestMode, resetScene, flashPestDetection,
  };
})();
