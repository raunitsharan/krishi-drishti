/* ═══════════════════════════════════════════════════════════════
   KRISHI DRISHTI — 3D Farm Scene v2 (Light / Daytime)
   Full live animations: sunny terrain, crops, solar unit, sensor
   nodes, water canal, drone, clouds, rain, flood, drought dust,
   heat shimmer, disease spread, pest swarm, harvest sparkle.
═══════════════════════════════════════════════════════════════ */

const FarmScene = (() => {

  /* ── renderer / scene / camera ──────────────────────────── */
  let renderer, scene, camera, clock;
  let animFrameId;

  /* ── scene objects ──────────────────────────────────────── */
  const obj = {};
  const cropMeshes   = [];
  const sensorNodes  = [];
  const cloudMeshes  = [];
  const rainDrops    = [];
  const dustParticles= [];
  const pestMeshes   = [];
  const scanLines    = [];

  /* ── injection state ────────────────────────────────────── */
  let floodActive    = false;
  let droughtActive  = false;
  let diseaseActive  = false;
  let pestActive     = false;
  let heatActive     = false;
  let harvestActive  = false;
  let floodHeight    = 0;
  let droughtSev     = 0;
  let diseaseSev     = 0;
  let pestDensity    = 0;

  /* ── orbit ──────────────────────────────────────────────── */
  let isDragging = false, prevMouse = {x:0,y:0};
  let sph    = {theta: -0.45, phi: 1.05, r: 30};
  let sphTgt = {theta: -0.45, phi: 1.05, r: 30};

  /* ── colours ─────────────────────────────────────────────── */
  const C = {
    skyTop:    0x87ceeb,
    skyMid:    0xb8e4f9,
    ground:    0x5a8a3c,
    groundDry: 0xb5813a,
    groundWet: 0x2d5a1e,
    soilLine:  0x4a2e1a,
    cropGreen: 0x2d8c3e,
    cropYellow:0xc8a82a,
    cropSick:  0x8b7040,
    cropDry:   0xc9a24a,
    stem:      0x3d6b22,
    water:     0x4fc3f7,
    waterDeep: 0x0288d1,
    solar:     0x1565c0,
    sensorBod: 0x546e7a,
    sensorGlow:0x00e676,
    sensorWarn:0xff9800,
    sensorDang:0xf44336,
    pole:      0x78909c,
    cloud:     0xffffff,
    sunColor:  0xffd54f,
    rain:      0x90caf9,
    dust:      0xd4a762,
    pestCol:   0x4caf50,
    pestAlert: 0xff5722,
  };

  /* ══════════════════════════════════════════════════════════
     PUBLIC: init
  ══════════════════════════════════════════════════════════ */
  function init() {
    const canvas    = document.getElementById('farmCanvas');
    const container = document.getElementById('sceneContainer');

    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.skyTop);
    scene.fog        = new THREE.FogExp2(0xc8e6f5, 0.012);

    camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
    clock  = new THREE.Clock();

    _buildLighting();
    _buildSkyDome();
    _buildSun();
    _buildGround();
    _buildCrops();
    _buildSolarUnit();
    _buildSensorNodes();
    _buildWaterCanal();
    _buildDrone();
    _buildClouds();
    _buildRainSystem();
    _buildDustSystem();
    _buildPestSwarm();
    _buildFloodPlane();
    _buildHarvestParticles();

    _setupOrbit(canvas);
    _setupResize(container);
    _resize(container);
    _updateCamera();
    _loop();
  }

  /* ══════════════════════════════════════════════════════════
     LIGHTING — bright daylight
  ══════════════════════════════════════════════════════════ */
  function _buildLighting() {
    scene.add(new THREE.AmbientLight(0xfff8e1, 1.0));

    const sun = new THREE.DirectionalLight(0xfffde7, 2.2);
    sun.position.set(25, 45, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35; sun.shadow.camera.right  =  35;
    sun.shadow.camera.top  =  35; sun.shadow.camera.bottom = -35;
    sun.shadow.camera.far  =  100;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    obj.sun = sun;

    const fill = new THREE.DirectionalLight(0xdceefb, 0.6);
    fill.position.set(-15, 10, -10);
    scene.add(fill);

    scene.add(new THREE.HemisphereLight(0x9dc7e8, 0x5a8a3c, 0.7));
  }

  /* ══════════════════════════════════════════════════════════
     SKY DOME
  ══════════════════════════════════════════════════════════ */
  function _buildSkyDome() {
    const geo = new THREE.SphereGeometry(120, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor:    {value: new THREE.Color(0x1565c0)},
        midColor:    {value: new THREE.Color(0x42a5f5)},
        botColor:    {value: new THREE.Color(0x87ceeb)},
        horizon:     {value: new THREE.Color(0xdceefb)},
      },
      vertexShader:`
        varying vec3 vP;
        void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader:`
        uniform vec3 topColor,midColor,botColor,horizon;
        varying vec3 vP;
        void main(){
          float h=normalize(vP).y;
          vec3 col = h>0.5 ? mix(midColor,topColor,(h-0.5)*2.) : mix(horizon,midColor,h*2.);
          col = mix(col,botColor,max(-h*2.,0.));
          gl_FragColor=vec4(col,1.);
        }`
    });
    scene.add(new THREE.Mesh(geo, mat));
    obj.skyMat = mat;
  }

  /* ══════════════════════════════════════════════════════════
     SUN DISC
  ══════════════════════════════════════════════════════════ */
  function _buildSun() {
    const geo = new THREE.SphereGeometry(2.5, 20, 20);
    const mat = new THREE.MeshBasicMaterial({color: 0xfffde7});
    const sun = new THREE.Mesh(geo, mat);
    sun.position.set(55, 75, -40);
    scene.add(sun);
    obj.sunDisc = sun;

    /* Sun glow halo */
    const haloGeo = new THREE.SphereGeometry(4.5, 20, 20);
    const haloMat = new THREE.MeshBasicMaterial({color: 0xffe57f, transparent:true, opacity:0.25});
    const halo    = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(sun.position);
    scene.add(halo);
    obj.sunHalo = halo;
  }

  /* ══════════════════════════════════════════════════════════
     GROUND + SOIL ROWS
  ══════════════════════════════════════════════════════════ */
  function _buildGround() {
    /* Main field */
    const geo = new THREE.PlaneGeometry(60, 42, 48, 48);
    /* Micro terrain bumps */
    const pos = geo.attributes.position;
    for(let i=0; i<pos.count; i++){
      if(Math.abs(pos.getX(i))<28) pos.setY(i,(Math.random()-0.5)*0.18);
    }
    geo.computeVertexNormals();
    const mat  = new THREE.MeshLambertMaterial({color: C.ground});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI/2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obj.ground = mesh;
    obj.groundMat = mat;

    /* Soil planting rows */
    for(let r=-3; r<=3; r++){
      const rGeo = new THREE.PlaneGeometry(23, 0.55);
      const rMat = new THREE.MeshLambertMaterial({color: C.soilLine});
      const rM   = new THREE.Mesh(rGeo, rMat);
      rM.rotation.x = -Math.PI/2;
      rM.position.set(-1.5, 0.01, r*2.4);
      scene.add(rM);
    }

    /* Field edge borders (green hedgerow) */
    const hedgeMat = new THREE.MeshLambertMaterial({color: 0x1b5e20});
    [-21.5, 21.5].forEach(x=>{
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,44), hedgeMat);
      b.position.set(x,0.25,0); b.castShadow=true; scene.add(b);
    });
    [-15.5,15.5].forEach(z=>{
      const b = new THREE.Mesh(new THREE.BoxGeometry(44,0.5,0.5), hedgeMat);
      b.position.set(0,0.25,z); b.castShadow=true; scene.add(b);
    });

    /* Dirt path running through the field */
    const pathGeo = new THREE.PlaneGeometry(1.2, 42);
    const pathMat = new THREE.MeshLambertMaterial({color: 0xb8976a});
    const path    = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI/2;
    path.position.set(12.5, 0.02, 0);
    scene.add(path);
  }

  /* ══════════════════════════════════════════════════════════
     CROPS — dense realistic wheat/rice plants
  ══════════════════════════════════════════════════════════ */
  function _buildCrops() {
    const rows=7, cols=11;
    const sx=-10.5, sz=-7.2, dx=2.1, dz=2.4;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x = sx + c*dx + (Math.random()-0.5)*0.25;
        const z = sz + r*dz + (Math.random()-0.5)*0.25;
        cropMeshes.push(_makeCrop(x,z));
      }
    }
  }

  function _makeCrop(x,z){
    const g    = new THREE.Group();
    const h    = 0.75 + Math.random()*0.55;
    const col  = new THREE.Color(C.cropGreen);
    col.offsetHSL(0, (Math.random()-0.5)*0.08, (Math.random()-0.5)*0.1);

    /* Stem */
    const stemGeo = new THREE.CylinderGeometry(0.035,0.055,h,6);
    const stemMat = new THREE.MeshLambertMaterial({color:0x4a7c2e});
    const stem    = new THREE.Mesh(stemGeo,stemMat);
    stem.position.y = h/2;
    stem.castShadow = true;
    g.add(stem);

    /* 4 leaf blades */
    const leafMats = [];
    for(let i=0;i<4;i++){
      const lMat = new THREE.MeshLambertMaterial({color:col.clone(), side:THREE.DoubleSide});
      leafMats.push(lMat);
      const lGeo = new THREE.PlaneGeometry(0.45+Math.random()*0.2, 0.18);
      const leaf = new THREE.Mesh(lGeo, lMat);
      leaf.rotation.y = (i/4)*Math.PI*2 + Math.random()*0.3;
      leaf.rotation.z = 0.25 + Math.random()*0.15;
      leaf.position.y = h*(0.45 + Math.random()*0.2);
      leaf.position.x = Math.sin(leaf.rotation.y)*0.06;
      leaf.castShadow = true;
      g.add(leaf);
    }

    /* Grain head (tassle) */
    const tGeo = new THREE.ConeGeometry(0.07, 0.22, 6);
    const tMat = new THREE.MeshLambertMaterial({color:0xd4a520});
    const tass = new THREE.Mesh(tGeo,tMat);
    tass.position.y = h+0.11;
    tass.castShadow = true;
    g.add(tass);

    g.position.set(x, 0, z);
    g.userData = {
      h, swayOff:Math.random()*Math.PI*2,
      leafMats, stemMat, tMat,
      healthy:true, origColor:col.clone()
    };
    scene.add(g);
    return g;
  }

  /* ══════════════════════════════════════════════════════════
     SOLAR PANEL + RPi EDGE-AI UNIT
  ══════════════════════════════════════════════════════════ */
  function _buildSolarUnit(){
    const g = new THREE.Group();

    /* Pole */
    const pMat = new THREE.MeshLambertMaterial({color:C.pole});
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,4.5,8), pMat);
    pole.position.y=2.25; pole.castShadow=true; g.add(pole);

    /* Panel frame */
    const panelGroup = new THREE.Group();
    const frameMat   = new THREE.MeshLambertMaterial({color:0x263238});
    panelGroup.add(new THREE.Mesh(new THREE.BoxGeometry(2.6,0.08,1.5),frameMat));

    /* Solar cells 3×2 grid */
    for(let ci=0;ci<3;ci++) for(let ri=0;ri<2;ri++){
      const cGeo = new THREE.BoxGeometry(0.78,0.03,0.62);
      const cMat = new THREE.MeshLambertMaterial({color:0x1565c0});
      const cell = new THREE.Mesh(cGeo,cMat);
      cell.position.set(-0.82+ci*0.84,0.055,-0.4+ri*0.65);
      panelGroup.add(cell);
      /* Cell glint */
      const gMat = new THREE.MeshBasicMaterial({color:0x90caf9,transparent:true,opacity:0.25});
      const gln  = new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.59),gMat);
      gln.position.set(cell.position.x,0.07,cell.position.z);
      panelGroup.add(gln);
    }
    panelGroup.position.set(0,4.6,-0.5);
    panelGroup.rotation.x = 0.35;
    g.add(panelGroup);
    obj.solarPanel = panelGroup;

    /* RPi enclosure */
    const boxMat = new THREE.MeshLambertMaterial({color:C.sensorBod});
    const box    = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.32,0.28),boxMat);
    box.position.set(0,1.6,0.1); box.castShadow=true; g.add(box);

    /* Camera lens */
    const camGeo = new THREE.CylinderGeometry(0.055,0.055,0.14,12);
    const cam    = new THREE.Mesh(camGeo,new THREE.MeshLambertMaterial({color:0x1a1a2e}));
    cam.rotation.z=Math.PI/2; cam.position.set(0.24,1.6,0.1); g.add(cam);
    const lens   = new THREE.Mesh(new THREE.CircleGeometry(0.045,16),new THREE.MeshBasicMaterial({color:0x42a5f5}));
    lens.rotation.y=-Math.PI/2; lens.position.set(0.31,1.6,0.1); g.add(lens);
    obj.cameraLens = lens;

    /* LED */
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025,8,8),new THREE.MeshBasicMaterial({color:0x00e676}));
    led.position.set(0.13,1.76,0.24); g.add(led);
    obj.led = led;

    /* LoRa antenna */
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.22,4),new THREE.MeshLambertMaterial({color:0x9e9e9e}));
    ant.position.set(-0.12,1.9,0.1); g.add(ant);

    /* Scan beam (green laser to crops) */
    const pts = [new THREE.Vector3(0.31,1.6,0.1), new THREE.Vector3(9,0.4,0)];
    const bGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const bMat = new THREE.LineBasicMaterial({color:0x00e676,transparent:true,opacity:0.5});
    const beam = new THREE.Line(bGeo,bMat);
    g.add(beam);
    obj.scanBeam = {line:beam, mat:bMat};

    g.position.set(-16,0,0);
    scene.add(g);
    obj.solarUnit = g;
  }

  /* ══════════════════════════════════════════════════════════
     SENSOR NODES (6 field nodes)
  ══════════════════════════════════════════════════════════ */
  function _buildSensorNodes(){
    const positions = [[-5,9],[3,9],[10,9],[-5,-9],[3,-9],[10,-9]];
    positions.forEach((pos,idx)=>{
      const g = new THREE.Group();

      /* Stake */
      const sMat = new THREE.MeshLambertMaterial({color:0x607d8b});
      g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,0.85,6),sMat),{position:{x:0,y:0.425,z:0}}));

      /* Body */
      const bMat = new THREE.MeshLambertMaterial({color:C.sensorBod});
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.17,0.15),bMat);
      body.position.y=0.95; body.castShadow=true; g.add(body);

      /* Glow orb */
      const glowGeo = new THREE.SphereGeometry(0.075,10,10);
      const glowMat = new THREE.MeshBasicMaterial({color:C.sensorGlow,transparent:true,opacity:0.9});
      const glow    = new THREE.Mesh(glowGeo,glowMat);
      glow.position.y=1.12; g.add(glow);

      /* Soil probe */
      const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.008,0.32,6),new THREE.MeshLambertMaterial({color:0x9e9e9e}));
      probe.position.set(0.06,0.16,0); g.add(probe);

      /* Antenna */
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.18,4),new THREE.MeshLambertMaterial({color:0xbdbdbd}));
      ant.position.set(-0.07,1.06,0); g.add(ant);

      /* Label ring */
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.09,0.012,8,24),
        new THREE.MeshBasicMaterial({color:C.sensorGlow})
      );
      ring.position.y=1.12; ring.rotation.x=Math.PI/2; g.add(ring);

      g.position.set(pos[0],0,pos[1]);
      g.userData = {glowMat,glowMesh:glow,ringMesh:ring,id:idx};
      scene.add(g);
      sensorNodes.push(g);
    });
  }

  /* ══════════════════════════════════════════════════════════
     WATER CANAL
  ══════════════════════════════════════════════════════════ */
  function _buildWaterCanal(){
    /* Bed */
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.35,44),new THREE.MeshLambertMaterial({color:0x3e2723}));
    bed.position.set(19,-0.15,0); bed.receiveShadow=true; scene.add(bed);

    /* Walls */
    [-1.2,1.2].forEach(dx=>{
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.45,44),new THREE.MeshLambertMaterial({color:0x4e342e}));
      w.position.set(19+dx,0.12,0); scene.add(w);
    });

    /* Water */
    const wGeo = new THREE.PlaneGeometry(1.7,44,1,60);
    const wMat = new THREE.MeshLambertMaterial({color:C.water,transparent:true,opacity:0.72});
    const wMesh= new THREE.Mesh(wGeo,wMat);
    wMesh.rotation.x=-Math.PI/2; wMesh.position.set(19,0.02,0);
    scene.add(wMesh);
    obj.water=wMesh; obj.waterMat=wMat;

    /* Water shimmer lines */
    for(let i=0;i<6;i++){
      const lGeo=new THREE.PlaneGeometry(1.5,0.05);
      const lMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.3});
      const line=new THREE.Mesh(lGeo,lMat);
      line.rotation.x=-Math.PI/2;
      line.position.set(19,0.04,-15+i*6);
      line.userData.shimmerOff=Math.random()*Math.PI*2;
      scene.add(line);
      obj[`waterShimmer${i}`]=line;
    }
  }

  /* ══════════════════════════════════════════════════════════
     DRONE
  ══════════════════════════════════════════════════════════ */
  function _buildDrone(){
    const dg = new THREE.Group();
    const bMat= new THREE.MeshLambertMaterial({color:0x1e293b});
    dg.add(new THREE.Mesh(new THREE.BoxGeometry(0.32,0.10,0.32),bMat));

    const armDirs=[[1,1],[-1,1],[1,-1],[-1,-1]];
    armDirs.forEach(d=>{
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.03,0.055),new THREE.MeshLambertMaterial({color:0x374151}));
      arm.rotation.y = d[0]===d[1] ? Math.PI/4 : -Math.PI/4;
      arm.position.set(d[0]*0.19,0,d[1]*0.19);
      dg.add(arm);

      const rotor= new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.022,16),new THREE.MeshLambertMaterial({color:0x9ca3af,transparent:true,opacity:0.55}));
      rotor.position.set(d[0]*0.27,0.06,d[1]*0.27);
      rotor.userData.isRotor=true;
      dg.add(rotor);
    });

    /* Down-camera */
    dg.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.055,8,8),new THREE.MeshBasicMaterial({color:0x0a0a1a})),{position:{x:0,y:-0.09,z:0}}));

    /* Nav LED */
    const navLed = new THREE.Mesh(new THREE.SphereGeometry(0.022,6,6),new THREE.MeshBasicMaterial({color:0xff1744}));
    navLed.position.set(0,0.06,0.16);
    dg.add(navLed);
    obj.droneNavLed = navLed;

    dg.position.set(-14,6,0);
    obj.drone = dg;
    obj.droneT= 0;
    scene.add(dg);
  }

  /* ══════════════════════════════════════════════════════════
     CLOUDS — 8 fluffy white clouds
  ══════════════════════════════════════════════════════════ */
  function _buildClouds(){
    const cMat=new THREE.MeshLambertMaterial({color:C.cloud,transparent:true,opacity:0.88});
    const positions = [
      [-30,18,-30],[-10,22,-35],[12,20,-40],[32,18,-28],
      [-28,16,30],[5,20,40],[25,17,25],[-15,21,20]
    ];
    positions.forEach(([x,y,z])=>{
      const cg=new THREE.Group();
      [0,1,2].forEach(i=>{
        const r = 1.8+Math.random()*1.4;
        const s = new THREE.Mesh(new THREE.SphereGeometry(r,10,8),cMat.clone());
        s.position.set((i-1)*r*0.9,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.8);
        s.scale.y=0.55;
        cg.add(s);
      });
      cg.position.set(x,y,z);
      cg.userData.speed=(Math.random()-0.5)*0.002;
      cg.userData.baseX=x;
      scene.add(cg);
      cloudMeshes.push(cg);
    });
  }

  /* ══════════════════════════════════════════════════════════
     RAIN SYSTEM
  ══════════════════════════════════════════════════════════ */
  function _buildRainSystem(){
    const N=800;
    const geo=new THREE.BufferGeometry();
    const verts=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      verts[i*3  ]=(Math.random()-0.5)*50;
      verts[i*3+1]=Math.random()*12+1;
      verts[i*3+2]=(Math.random()-0.5)*35;
    }
    geo.setAttribute('position',new THREE.BufferAttribute(verts,3));
    const mat=new THREE.PointsMaterial({color:C.rain,size:0.08,transparent:true,opacity:0});
    const pts=new THREE.Points(geo,mat);
    scene.add(pts);
    obj.rain=pts; obj.rainMat=mat; obj.rainVerts=verts;
  }

  /* ══════════════════════════════════════════════════════════
     DUST SYSTEM (drought)
  ══════════════════════════════════════════════════════════ */
  function _buildDustSystem(){
    const N=400;
    const geo=new THREE.BufferGeometry();
    const v=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      v[i*3  ]=(Math.random()-0.5)*40;
      v[i*3+1]=Math.random()*4+0.2;
      v[i*3+2]=(Math.random()-0.5)*28;
    }
    geo.setAttribute('position',new THREE.BufferAttribute(v,3));
    const mat=new THREE.PointsMaterial({color:C.dust,size:0.12,transparent:true,opacity:0});
    const pts=new THREE.Points(geo,mat);
    scene.add(pts);
    obj.dust=pts; obj.dustMat=mat; obj.dustVerts=v;
  }

  /* ══════════════════════════════════════════════════════════
     PEST SWARM
  ══════════════════════════════════════════════════════════ */
  function _buildPestSwarm(){
    const N=120;
    const geo=new THREE.BufferGeometry();
    const v=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      v[i*3  ]=(Math.random()-0.5)*22;
      v[i*3+1]=0.3+Math.random()*1.8;
      v[i*3+2]=(Math.random()-0.5)*15;
    }
    geo.setAttribute('position',new THREE.BufferAttribute(v,3));
    const mat=new THREE.PointsMaterial({color:C.pestAlert,size:0.14,transparent:true,opacity:0});
    const pts=new THREE.Points(geo,mat);
    scene.add(pts);
    obj.pests=pts; obj.pestMat=mat; obj.pestVerts=v;
  }

  /* ══════════════════════════════════════════════════════════
     FLOOD PLANE
  ══════════════════════════════════════════════════════════ */
  function _buildFloodPlane(){
    const geo=new THREE.PlaneGeometry(62,44,30,30);
    const mat=new THREE.MeshLambertMaterial({color:C.waterDeep,transparent:true,opacity:0});
    const mesh=new THREE.Mesh(geo,mat);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.y=0.05;
    scene.add(mesh);
    obj.flood=mesh; obj.floodMat=mat;
  }

  /* ══════════════════════════════════════════════════════════
     HARVEST SPARKLE PARTICLES
  ══════════════════════════════════════════════════════════ */
  function _buildHarvestParticles(){
    const N=200;
    const geo=new THREE.BufferGeometry();
    const v=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      v[i*3  ]=(Math.random()-0.5)*25;
      v[i*3+1]=0.5+Math.random()*2.5;
      v[i*3+2]=(Math.random()-0.5)*18;
    }
    geo.setAttribute('position',new THREE.BufferAttribute(v,3));
    const mat=new THREE.PointsMaterial({color:0xffd54f,size:0.18,transparent:true,opacity:0});
    const pts=new THREE.Points(geo,mat);
    scene.add(pts);
    obj.harvest=pts; obj.harvestMat=mat; obj.harvestVerts=v;
  }

  /* ══════════════════════════════════════════════════════════
     ORBIT CONTROLS
  ══════════════════════════════════════════════════════════ */
  function _setupOrbit(canvas){
    canvas.addEventListener('mousedown', e=>{isDragging=true;prevMouse={x:e.clientX,y:e.clientY};});
    canvas.addEventListener('mouseup',   ()=>isDragging=false);
    canvas.addEventListener('mouseleave',()=>isDragging=false);
    canvas.addEventListener('mousemove', e=>{
      if(!isDragging) return;
      sphTgt.theta -= (e.clientX-prevMouse.x)*0.005;
      sphTgt.phi    = Math.max(0.28,Math.min(1.38,sphTgt.phi+(e.clientY-prevMouse.y)*0.005));
      prevMouse={x:e.clientX,y:e.clientY};
    });
    canvas.addEventListener('wheel', e=>{
      sphTgt.r = Math.max(10,Math.min(55,sphTgt.r+e.deltaY*0.04));
      e.preventDefault();
    },{passive:false});
    let lt=null;
    canvas.addEventListener('touchstart',e=>{if(e.touches.length===1){isDragging=true;lt={x:e.touches[0].clientX,y:e.touches[0].clientY};}});
    canvas.addEventListener('touchend',  ()=>isDragging=false);
    canvas.addEventListener('touchmove', e=>{
      if(!isDragging||!lt) return;
      sphTgt.theta-=(e.touches[0].clientX-lt.x)*0.005;
      sphTgt.phi=Math.max(0.28,Math.min(1.38,sphTgt.phi+(e.touches[0].clientY-lt.y)*0.005));
      lt={x:e.touches[0].clientX,y:e.touches[0].clientY};
      e.preventDefault();
    },{passive:false});
  }

  /* ── resize ─────────────────────────────────────────────── */
  function _setupResize(container){
    new ResizeObserver(()=>_resize(container)).observe(container);
  }
  function _resize(container){
    const w=container.clientWidth, h=container.clientHeight;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  /* ── camera smooth lerp ─────────────────────────────────── */
  function _updateCamera(){
    sph.theta += (sphTgt.theta-sph.theta)*0.08;
    sph.phi   += (sphTgt.phi  -sph.phi  )*0.08;
    sph.r     += (sphTgt.r    -sph.r    )*0.08;
    camera.position.set(
      sph.r*Math.sin(sph.phi)*Math.cos(sph.theta),
      sph.r*Math.cos(sph.phi),
      sph.r*Math.sin(sph.phi)*Math.sin(sph.theta)
    );
    camera.lookAt(0,1.5,0);
  }

  /* ══════════════════════════════════════════════════════════
     ANIMATION LOOP
  ══════════════════════════════════════════════════════════ */
  function _loop(){
    animFrameId = requestAnimationFrame(_loop);
    const t = clock.getElapsedTime();
    _updateCamera();
    _animCrops(t);
    _animSensorNodes(t);
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
    renderer.render(scene,camera);
  }

  /* ── Crop sway (wind) ───────────────────────────────────── */
  function _animCrops(t){
    cropMeshes.forEach(c=>{
      const sw = Math.sin(t*0.9+c.userData.swayOff)*0.04;
      c.rotation.z = sw;
      c.rotation.x = Math.sin(t*0.55+c.userData.swayOff)*0.025;
      /* Harvest sparkle: tassle bobs more */
      if(harvestActive){
        const tass = c.children[c.children.length-1];
        if(tass) tass.position.y = c.userData.h+0.11 + Math.sin(t*3+c.userData.swayOff)*0.06;
      }
    });
  }

  /* ── Sensor node glow ───────────────────────────────────── */
  function _animSensorNodes(t){
    sensorNodes.forEach((n,i)=>{
      const pulse = 0.5+0.5*Math.sin(t*2.2+i*1.1);
      const gm = n.userData.glowMat;
      gm.opacity = 0.5+0.45*pulse;
      const col = pestActive||diseaseActive ? C.sensorDang
                : droughtActive            ? C.sensorWarn
                : floodActive              ? 0x42a5f5
                : heatActive               ? 0xff7043
                : C.sensorGlow;
      gm.color.setHex(col);
      n.userData.ringMesh.material.color.setHex(col);
      n.userData.ringMesh.rotation.z += 0.01;
    });
  }

  /* ── Drone patrol ───────────────────────────────────────── */
  function _animDrone(t){
    obj.droneT = t*0.28;
    obj.drone.position.set(
      Math.cos(obj.droneT)*13,
      5.5+Math.sin(t*0.7)*0.35,
      Math.sin(obj.droneT)*9
    );
    obj.drone.rotation.y = -obj.droneT+Math.PI/2;
    obj.drone.rotation.z =  Math.sin(t*0.7)*0.06;
    obj.drone.children.forEach(c=>{ if(c.userData.isRotor) c.rotation.y+=0.5; });
    /* Nav LED blink */
    if(obj.droneNavLed) obj.droneNavLed.material.color.setHex(Math.sin(t*8)>0?0xff1744:0x880000);
  }

  /* ── Clouds drift ───────────────────────────────────────── */
  function _animClouds(t){
    cloudMeshes.forEach(c=>{
      c.position.x += c.userData.speed*(droughtActive?2.5:floodActive?2:1);
      if(Math.abs(c.position.x)>65) c.position.x=-Math.sign(c.position.x)*65;
      /* Darken when flood active */
      c.children.forEach(ch=>{
        const targetCol = floodActive ? 0x90a4ae : heatActive ? 0xfff8e1 : 0xffffff;
        ch.material.color.setHex(targetCol);
        ch.material.opacity = floodActive ? 0.98 : 0.88;
      });
    });
  }

  /* ── Water shimmer ──────────────────────────────────────── */
  function _animWater(t){
    if(!obj.waterMat) return;
    obj.waterMat.opacity = 0.55+0.18*Math.sin(t*1.4);
    obj.water.position.y = 0.02+Math.sin(t*0.7)*0.025;
    for(let i=0;i<6;i++){
      const s=obj[`waterShimmer${i}`];
      if(s) s.material.opacity=0.15+0.2*Math.abs(Math.sin(t*2+s.userData.shimmerOff));
    }
  }

  /* ── Rain ───────────────────────────────────────────────── */
  function _animRain(t){
    const v=obj.rainVerts;
    const targetOpacity = floodActive ? 0.75 : 0;
    obj.rainMat.opacity += (targetOpacity-obj.rainMat.opacity)*0.04;
    if(floodActive){
      for(let i=0;i<v.length/3;i++){
        v[i*3+1] -= 0.28+Math.random()*0.12;
        if(v[i*3+1]<0){ v[i*3+1]=13; v[i*3]=(Math.random()-0.5)*50; }
      }
      obj.rain.geometry.attributes.position.needsUpdate=true;
    }
  }

  /* ── Dust ───────────────────────────────────────────────── */
  function _animDust(t){
    const v=obj.dustVerts;
    const targetOpacity = droughtActive ? 0.65 : 0;
    obj.dustMat.opacity += (targetOpacity-obj.dustMat.opacity)*0.03;
    if(droughtActive){
      for(let i=0;i<v.length/3;i++){
        v[i*3  ] += 0.04+Math.sin(t+i)*0.02;
        v[i*3+1] += 0.005;
        if(v[i*3+1]>5){ v[i*3+1]=0.2; v[i*3]=(Math.random()-0.5)*40; }
      }
      obj.dust.geometry.attributes.position.needsUpdate=true;
    }
  }

  /* ── Pests ──────────────────────────────────────────────── */
  function _animPests(t){
    const v=obj.pestVerts;
    const targetOpacity = pestActive ? 0.85 : 0;
    obj.pestMat.opacity += (targetOpacity-obj.pestMat.opacity)*0.05;
    if(pestActive){
      for(let i=0;i<v.length/3;i++){
        v[i*3  ] += Math.sin(t*3+i*0.7)*0.04;
        v[i*3+1] += Math.cos(t*2+i*0.9)*0.03;
        v[i*3+2] += Math.sin(t*2.5+i)*0.04;
        /* keep within bounds */
        if(Math.abs(v[i*3])>12)  v[i*3  ]*=-1;
        if(v[i*3+1]<0.2||v[i*3+1]>2.2) v[i*3+1]=0.5+Math.random()*1.5;
        if(Math.abs(v[i*3+2])>9) v[i*3+2]*=-1;
      }
      obj.pest.geometry.attributes.position.needsUpdate=true;
    }
  }

  /* ── Flood plane rise ───────────────────────────────────── */
  function _animFlood(t){
    const targetOp = floodActive ? 0.55 : 0;
    obj.floodMat.opacity += (targetOp-obj.floodMat.opacity)*0.025;
    if(floodActive){
      obj.flood.position.y=0.12+Math.sin(t*0.4)*0.06;
      /* Wave the flood plane vertices */
      const pos=obj.flood.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i), z=pos.getZ(i);
        pos.setY(i,Math.sin(x*0.3+t*0.8)*0.06+Math.cos(z*0.2+t*0.6)*0.04);
      }
      pos.needsUpdate=true;
      obj.flood.geometry.computeVertexNormals();
    }
  }

  /* ── Harvest sparkles ───────────────────────────────────── */
  function _animHarvest(t){
    const v=obj.harvestVerts;
    const targetOp = harvestActive ? 0.85 : 0;
    obj.harvestMat.opacity += (targetOp-obj.harvestMat.opacity)*0.04;
    if(harvestActive){
      for(let i=0;i<v.length/3;i++){
        v[i*3+1] += 0.025+Math.random()*0.01;
        if(v[i*3+1]>3.5){ v[i*3+1]=0.4; v[i*3]=(Math.random()-0.5)*25; v[i*3+2]=(Math.random()-0.5)*18; }
      }
      obj.harvest.geometry.attributes.position.needsUpdate=true;
    }
  }

  /* ── Scan beam flicker ──────────────────────────────────── */
  function _animScanBeam(t){
    if(obj.scanBeam) obj.scanBeam.mat.opacity=0.2+0.4*Math.abs(Math.sin(t*1.8));
  }

  /* ── LED ────────────────────────────────────────────────── */
  function _animLed(t){
    if(!obj.led) return;
    const on=Math.sin(t*3)>0;
    obj.led.material.color.setHex(
      (pestActive||diseaseActive) ? (on?0xff1744:0x7f0000)
      : floodActive               ? (on?0x2979ff:0x003c8f)
      : droughtActive             ? (on?0xff9100:0x6d3900)
      : heatActive                ? (on?0xff3d00:0x6d1900)
      : (on?0x00e676:0x004d1f)
    );
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */

  function applyFlood(level){
    floodActive = level>0;
    if(floodActive){
      obj.groundMat.color.setHex(0x1a4a1a);
      /* Darken sky */
      obj.skyMat.uniforms.topColor.value.setHex(0x263238);
      obj.skyMat.uniforms.midColor.value.setHex(0x37474f);
      scene.fog.color.setHex(0x78909c);
      scene.fog.density=0.022;
    } else {
      obj.groundMat.color.setHex(C.ground);
      obj.skyMat.uniforms.topColor.value.setHex(0x1565c0);
      obj.skyMat.uniforms.midColor.value.setHex(0x42a5f5);
      scene.fog.color.setHex(0xc8e6f5);
      scene.fog.density=0.012;
    }
    _showLiveBadge(floodActive,'flood');
  }

  function applyDrought(severity){
    droughtActive = severity>0;
    droughtSev    = severity;
    const t = severity/100;
    const groundCol = new THREE.Color(C.ground).lerp(new THREE.Color(C.groundDry), t);
    obj.groundMat.color.copy(groundCol);
    const leafCol   = new THREE.Color(C.cropGreen).lerp(new THREE.Color(C.cropDry), t);
    const affected  = Math.floor(cropMeshes.length*(severity/100));
    cropMeshes.forEach((c,i)=>{
      const tgt = i<affected ? leafCol : new THREE.Color(C.cropGreen);
      c.userData.leafMats.forEach(m=>m.color.copy(tgt));
    });
    if(droughtActive){
      obj.sun.intensity=2.6; obj.sun.color.setHex(0xffb300);
      obj.skyMat.uniforms.topColor.value.setHex(0x0d47a1);
      obj.skyMat.uniforms.botColor.value.setHex(0xfff8e1);
    } else {
      obj.sun.intensity=2.2; obj.sun.color.setHex(0xfffde7);
      obj.skyMat.uniforms.topColor.value.setHex(0x1565c0);
      obj.skyMat.uniforms.botColor.value.setHex(0x87ceeb);
    }
    _showLiveBadge(droughtActive,'drought');
  }

  function applyDisease(severity){
    diseaseActive = severity>0;
    diseaseSev    = severity;
    const affected = Math.floor(cropMeshes.length*(severity/100));
    cropMeshes.forEach((c,i)=>{
      const sick = diseaseActive && i<affected;
      c.userData.leafMats.forEach(m=>{
        if(sick) m.color.setHex(C.cropSick);
        else m.color.copy(c.userData.origColor);
      });
      if(c.userData.stemMat) c.userData.stemMat.color.setHex(sick?0x5d4037:0x4a7c2e);
    });
    _showLiveBadge(diseaseActive,'disease');
  }

  function applyPest(density){
    pestActive  = density>0;
    pestDensity = density;
    _showLiveBadge(pestActive,'pest');
    if(pestActive) flashPestDetection();
  }

  function applyHeat(temp){
    heatActive = temp>0;
    if(heatActive){
      obj.sun.intensity=2.8; obj.sun.color.setHex(0xff8f00);
      scene.fog.color.setHex(0xffe0b2); scene.fog.density=0.018;
      /* Wilt crops slightly */
      cropMeshes.forEach(c=>{ c.userData.leafMats.forEach(m=>m.color.setHex(C.cropYellow)); });
    } else {
      obj.sun.intensity=2.2; obj.sun.color.setHex(0xfffde7);
      scene.fog.color.setHex(0xc8e6f5); scene.fog.density=0.012;
      cropMeshes.forEach(c=>{ c.userData.leafMats.forEach(m=>m.color.copy(c.userData.origColor)); });
    }
    _showLiveBadge(heatActive,'heat');
  }

  function setHarvestMode(active){
    harvestActive = active;
    if(active){
      cropMeshes.forEach(c=>{
        c.userData.tMat && c.userData.tMat.color.setHex(0xffd54f);
      });
    }
    _showLiveBadge(active,'harvest');
  }

  function resetScene(){
    floodActive=droughtActive=diseaseActive=pestActive=heatActive=harvestActive=false;
    obj.groundMat.color.setHex(C.ground);
    cropMeshes.forEach(c=>{
      c.userData.leafMats.forEach(m=>m.color.copy(c.userData.origColor));
      if(c.userData.stemMat) c.userData.stemMat.color.setHex(0x4a7c2e);
      const tass=c.children[c.children.length-1];
      if(tass) tass.position.y=c.userData.h+0.11;
    });
    if(obj.floodMat)   obj.floodMat.opacity=0;
    if(obj.rainMat)    obj.rainMat.opacity=0;
    if(obj.dustMat)    obj.dustMat.opacity=0;
    if(obj.pestMat)    obj.pestMat.opacity=0;
    if(obj.harvestMat) obj.harvestMat.opacity=0;
    obj.sun.intensity=2.2; obj.sun.color.setHex(0xfffde7);
    obj.skyMat.uniforms.topColor.value.setHex(0x1565c0);
    obj.skyMat.uniforms.midColor.value.setHex(0x42a5f5);
    obj.skyMat.uniforms.botColor.value.setHex(0x87ceeb);
    scene.fog.color.setHex(0xc8e6f5); scene.fog.density=0.012;
    _hideLiveBadge();
  }

  function flashPestDetection(){
    cropMeshes.slice(0,8).forEach((c,i)=>{
      setTimeout(()=>{
        c.userData.leafMats.forEach(m=>m.color.setHex(C.pestAlert));
        setTimeout(()=>c.userData.leafMats.forEach(m=>{
          if(!diseaseActive) m.color.copy(c.userData.origColor);
        }), 1000);
      }, i*150);
    });
  }

  /* ── Live 3D badge overlay ──────────────────────────────── */
  const BADGE_INFO = {
    flood:   { icon:'🌊', label:'Flood Event Active',   sub:'LSTM · Rising water level',   bg:'#1565c0' },
    drought: { icon:'☀',  label:'Drought Stress Active', sub:'XGBoost · Soil moisture drop', bg:'#e65100' },
    disease: { icon:'🦠', label:'Disease Spreading',    sub:'MobileNetV3 · Crop infection', bg:'#6a1b9a' },
    pest:    { icon:'🐛', label:'Pest Swarm Detected',  sub:'YOLOv8-nano · High density',   bg:'#bf360c' },
    heat:    { icon:'🔥', label:'Heat Wave Active',     sub:'43°C+ · Crop stress HIGH',     bg:'#b71c1c' },
    harvest: { icon:'🌾', label:'Harvest Window Open',  sub:'Regression · Ready now!',      bg:'#2e7d32' },
  };

  function _showLiveBadge(show, type){
    let badge = document.getElementById('injectionLiveBadge');
    if(!badge){
      badge = document.createElement('div');
      badge.id = 'injectionLiveBadge';
      badge.className = 'injection-live-badge';
      badge.innerHTML = `<div class="ilb-icon" id="ilbIcon"></div>
        <div class="ilb-label" id="ilbLabel"></div>
        <div class="ilb-sub" id="ilbSub"></div>`;
      document.getElementById('sceneContainer')?.appendChild(badge);
    }
    if(show){
      const info = BADGE_INFO[type];
      const iconEl  = document.getElementById('ilbIcon');
      const labelEl = document.getElementById('ilbLabel');
      const subEl   = document.getElementById('ilbSub');
      if(iconEl)  { iconEl.textContent=info.icon; iconEl.style.background=info.bg+'33'; iconEl.style.border=`3px solid ${info.bg}88`; }
      if(labelEl) { labelEl.textContent=info.label; }
      if(subEl)   { subEl.textContent=info.sub; }
      badge.style.display='flex';
      /* Auto-hide after 4s */
      clearTimeout(badge._hideTimer);
      badge._hideTimer=setTimeout(()=>badge.style.display='none', 4000);
    } else {
      badge.style.display='none';
    }
  }

  function _hideLiveBadge(){
    const b=document.getElementById('injectionLiveBadge');
    if(b) b.style.display='none';
  }

  return {
    init,
    applyFlood, applyDrought, applyDisease, applyPest, applyHeat,
    setHarvestMode, resetScene, flashPestDetection
  };
})();
