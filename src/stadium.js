import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PITCH } from './data.js';

const TEX_W = 1024;
const TEX_H = 1536;
const PPM = TEX_W / PITCH.width;

const px = (x) => (x + PITCH.halfWidth) * PPM;
const py = (z) => (z + PITCH.halfLength) * (TEX_H / PITCH.length);

function makePitchTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1b6f38';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const bands = 16;
  const bandH = TEX_H / bands;
  for (let i = 0; i < bands; i += 1) {
    const light = i % 2 === 0;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, i * bandH, TEX_W, bandH + 1);
  }

  for (let i = 0; i < 26000; i += 1) {
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    const h = 1 + Math.random() * 3;
    ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${0.02 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y - h);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(TEX_W / 2, TEX_H / 2, TEX_H * 0.25, TEX_W / 2, TEX_H / 2, TEX_H * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const line = '#f4f8f4';
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(2, 0.12 * PPM);
  ctx.lineCap = 'butt';

  const rect = (x0, z0, x1, z1) => {
    ctx.beginPath();
    ctx.rect(px(x0), py(z0), px(x1) - px(x0), py(z1) - py(z0));
    ctx.stroke();
  };

  const circle = (x, z, r, from = 0, to = Math.PI * 2) => {
    ctx.beginPath();
    ctx.arc(px(x), py(z), r * PPM, from, to);
    ctx.stroke();
  };

  const L = PITCH.halfLength;
  const W = PITCH.halfWidth;

  rect(-W, -L, W, L);

  ctx.beginPath();
  ctx.moveTo(px(-W), py(0));
  ctx.lineTo(px(W), py(0));
  ctx.stroke();

  circle(0, 0, 9.15);
  ctx.fillStyle = line;
  ctx.beginPath();
  ctx.arc(px(0), py(0), 3 * PPM, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    const goalLine = side * L;
    const penDepth = goalLine - side * 16.5;
    rect(-20.16, Math.min(goalLine, penDepth), 20.16, Math.max(goalLine, penDepth));
    rect(-9.16, Math.min(goalLine, side * (L - 5.5)), 9.16, Math.max(goalLine, side * (L - 5.5)));

    const spotZ = side * (L - 11);
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.arc(px(0), py(spotZ), 3 * PPM, 0, Math.PI * 2);
    ctx.fill();

    const alpha = Math.asin(5.5 / 9.15);
    ctx.beginPath();
    ctx.arc(px(0), py(spotZ), 9.15 * PPM, side === 1 ? Math.PI + alpha : alpha, side === 1 ? Math.PI * 2 - alpha : Math.PI - alpha);
    ctx.stroke();

    for (const cornerX of [-W, W]) {
      let from = 0;
      if (cornerX < 0 && side === 1) from = -Math.PI / 2;
      else if (cornerX > 0 && side === 1) from = Math.PI;
      else if (cornerX < 0) from = Math.PI / 2;
      ctx.beginPath();
      ctx.arc(px(cornerX), py(goalLine), 1 * PPM, from, from + Math.PI / 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeNetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(128, i + 0.5);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seatPalette() {
  const base = ['#20303a', '#2a3b46', '#182630', '#33454f', '#101c24'];
  const accent = ['#b6ff3c', '#22d3ee', '#f472b6', '#f59e0b'];
  return { base, accent };
}

export function createStadium({ canvas, stage, safeTop = () => 72, safeBottom = () => 150 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05080b');
  scene.fog = new THREE.Fog('#05080b', 230, 640);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
  camera.position.set(0, 118, 120);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.6;
  controls.panSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 70;
  controls.maxDistance = 420;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.38;
  controls.update();

  /* A phone is a tall, narrow window and the pitch is a tall, narrow rectangle,
     so a steeper, nearly top-down camera uses the screen far better than the
     tilted broadcast angle (which squashes the far half and shrinks every card).
     The same direction is used on first load and by the reset button. */
  const isPhone = () => window.matchMedia('(max-width: 900px)').matches;
  const homeFor = () => (isPhone() ? new THREE.Vector3(0, 170, 52) : new THREE.Vector3(0, 118, 120)).normalize();
  const homeDirection = homeFor();
  camera.position.copy(controls.target).addScaledVector(homeDirection, 168);
  controls.update();
  const fitPoints = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const y of [0, 7]) {
        fitPoints.push(new THREE.Vector3(sx * (PITCH.halfWidth + 2), y, sz * (PITCH.halfLength + 2)));
      }
    }
  }
  const fitVector = new THREE.Vector3();
  const fitDir = new THREE.Vector3();
  const clamp = THREE.MathUtils.clamp;

  function fitCamera() {
    fitDir.copy(camera.position).sub(controls.target);
    if (fitDir.lengthSq() < 1e-6) fitDir.copy(homeDirection);
    fitDir.normalize();
    let dist = camera.position.distanceTo(controls.target) || 160;

    // Must be the play area, not the stage: the renderer and the slot overlay
    // both live in there, and fitting to a different box squeezes the formation
    // into a strip of the viewport.
    const play = document.getElementById('stagePlay') || stage;
    const w = play.clientWidth || 1;
    const h = play.clientHeight || 1;
    const cx = w / 2;
    const cy = h / 2;
    const limX = Math.max(24, cx - Math.max(20, w * 0.02));
    // The floating toolbar and bench are only outside the play area on a
    // phone, where CSS insets them away. Guarding for them again here would
    // zoom out a second time and collapse the formation.
    const playRect = play.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const insetTop = playRect.top - stageRect.top;
    const insetBottom = stageRect.bottom - playRect.bottom;
    const topGuard = insetTop > 1 ? 10 : Math.min(safeTop(), h * 0.22);
    const bottomGuard = insetBottom > 1 ? 10 : Math.min(safeBottom(), h * 0.42);
    const limTop = Math.max(24, cy - topGuard);
    const limBottom = Math.max(24, cy - bottomGuard);

    for (let iter = 0; iter < 10; iter += 1) {
      camera.position.copy(controls.target).addScaledVector(fitDir, dist);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      let factor = 0.05;
      for (const point of fitPoints) {
        fitVector.copy(point).project(camera);
        const sx = (fitVector.x * 0.5 + 0.5) * w - cx;
        const sy = cy - (-fitVector.y * 0.5 + 0.5) * h;
        factor = Math.max(factor, Math.abs(sx) / limX, sy / limTop, -sy / limBottom);
      }
      if (Math.abs(factor - 1) < 0.006) break;
      dist *= factor;
    }

    dist = clamp(dist, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).addScaledVector(fitDir, dist);
    controls.update();
  }

  scene.add(new THREE.HemisphereLight('#9fc4ff', '#0b2a17', 0.85));

  const key = new THREE.DirectionalLight('#ffffff', 1.35);
  key.position.set(-70, 120, 60);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.4;
  const shadowCam = key.shadow.camera;
  shadowCam.left = -90;
  shadowCam.right = 90;
  shadowCam.top = 110;
  shadowCam.bottom = -110;
  shadowCam.near = 20;
  shadowCam.far = 320;
  shadowCam.updateProjectionMatrix();
  scene.add(key);

  const rim = new THREE.DirectionalLight('#7fb2ff', 0.35);
  rim.position.set(90, 60, -80);
  scene.add(rim);

  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.width + 34, PITCH.length + 34),
    new THREE.MeshStandardMaterial({ color: '#123524', roughness: 0.95 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.02;
  apron.receiveShadow = true;
  scene.add(apron);

  const pitchTexture = makePitchTexture();
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.width, PITCH.length),
    new THREE.MeshStandardMaterial({ map: pitchTexture, roughness: 0.92, metalness: 0 }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: '#080d11', roughness: 1 }),
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.3;
  scene.add(outerGround);

  const netTex = makeNetTexture();
  const netMaterial = new THREE.MeshStandardMaterial({
    map: netTex,
    color: '#dfe9ef',
    transparent: true,
    opacity: 0.5,
    roughness: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  netTex.repeat.set(9, 3);

  const goalFrameMaterial = new THREE.MeshStandardMaterial({ color: '#f7fbfd', roughness: 0.35, metalness: 0.15 });
  const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.6, 12);
  const barGeo = new THREE.CylinderGeometry(0.07, 0.07, 7.6, 12);

  for (const side of [-1, 1]) {
    const goal = new THREE.Group();
    const z = side * (PITCH.halfLength + 0.35);
    for (const x of [-3.66, 3.66]) {
      const post = new THREE.Mesh(postGeo, goalFrameMaterial);
      post.position.set(x, 1.3, z);
      post.castShadow = true;
      goal.add(post);
    }
    const crossbar = new THREE.Mesh(barGeo, goalFrameMaterial);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.6, z);
    crossbar.castShadow = true;
    goal.add(crossbar);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.05), netMaterial);
    back.position.set(0, 1.3, z + side * 1.9);
    back.rotation.y = side > 0 ? 0 : Math.PI;
    goal.add(back);

    for (const x of [-3.66, 3.66]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.05), netMaterial);
      panel.position.set(x, 1.3, z + side * 0.95);
      panel.rotation.y = Math.PI / 2;
      goal.add(panel);
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 1.9), netMaterial);
    top.position.set(0, 2.35, z + side * 0.95);
    top.rotation.x = -Math.PI / 2;
    goal.add(top);

    scene.add(goal);
  }

  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
  const flagGeo = new THREE.PlaneGeometry(0.42, 0.3);
  const flagMat = new THREE.MeshStandardMaterial({ color: '#f2f7fa', side: THREE.DoubleSide, roughness: 0.8 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#e8eef2', roughness: 0.6 }));
      pole.position.set(sx * PITCH.halfWidth, 0.75, sz * PITCH.halfLength);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(sx * PITCH.halfWidth + 0.21, 1.35, sz * PITCH.halfLength);
      scene.add(pole, flag);
    }
  }

  const crowd = seatPalette();
  const ribbonMaterials = [];

  function buildStand(length, accent) {
    const group = new THREE.Group();
    const rows = 13;
    const rowRise = 1.05;
    const rowDepth = 1.25;
    const concrete = new THREE.MeshStandardMaterial({ color: '#1b242b', roughness: 0.94 });
    const seatMat = new THREE.MeshStandardMaterial({ color: '#26343d', roughness: 0.85 });

    for (let r = 0; r < rows; r += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(length, rowRise, rowDepth), concrete);
      step.position.set(0, (r + 1) * rowRise * 0.5, -r * rowDepth);
      step.receiveShadow = true;
      group.add(step);

      const riser = new THREE.Mesh(new THREE.BoxGeometry(length, 0.18, 0.12), seatMat);
      riser.position.set(0, (r + 1) * rowRise + 0.09, -r * rowDepth + rowDepth * 0.42);
      group.add(riser);
    }

    const totalDepth = rows * rowDepth;
    const topY = rows * rowRise;

    const roofDepth = totalDepth + 3.2;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(length + 1.5, 0.55, roofDepth),
      new THREE.MeshStandardMaterial({ color: '#141c22', roughness: 0.7, metalness: 0.35 }),
    );
    roof.position.set(0, topY + 6.4, -totalDepth / 2 - 0.6);
    roof.rotation.x = 0.09;
    group.add(roof);

    for (let i = 0; i < rows; i += 1) {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 6.4, 8),
        new THREE.MeshStandardMaterial({ color: '#202a31', roughness: 0.6, metalness: 0.4 }),
      );
      support.position.set((i % 2 === 0 ? -1 : 1) * (length / 2 - 0.6), topY / 2 + 3.2, -totalDepth + 0.4);
      group.add(support);
    }

    const ribbonMat = new THREE.MeshBasicMaterial({ color: accent });
    ribbonMaterials.push(ribbonMat);
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(length, 1.1), ribbonMat);
    ribbon.position.set(0, topY + 4.7, 0.35);
    group.add(ribbon);

    const spacing = 0.72;
    const perRow = Math.floor(length / spacing);
    const total = perRow * rows;
    const seats = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.78, 0.5),
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      total,
    );
    seats.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let s = 0; s < perRow; s += 1) {
        if (Math.random() < 0.12) {
          dummy.position.set(0, -999, 0);
          dummy.updateMatrix();
          seats.setMatrixAt(idx, dummy.matrix);
          idx += 1;
          continue;
        }
        dummy.position.set(
          -length / 2 + s * spacing + spacing / 2 + (Math.random() - 0.5) * 0.12,
          (r + 1) * rowRise + 0.55 + Math.random() * 0.06,
          -r * rowDepth + rowDepth * 0.2 + Math.random() * 0.12,
        );
        dummy.rotation.set(0, (Math.random() - 0.5) * 0.5, 0);
        dummy.updateMatrix();
        seats.setMatrixAt(idx, dummy.matrix);
        const palette = Math.random() < 0.14 ? crowd.accent : crowd.base;
        color.set(palette[Math.floor(Math.random() * palette.length)]);
        seats.setColorAt(idx, color);
        idx += 1;
      }
    }
    seats.count = idx;
    seats.instanceMatrix.needsUpdate = true;
    if (seats.instanceColor) seats.instanceColor.needsUpdate = true;
    group.add(seats);

    return group;
  }

  const standGapX = PITCH.halfWidth + 13;
  const standGapZ = PITCH.halfLength + 13;

  const north = buildStand(PITCH.width + 24, '#b6ff3c');
  north.position.set(0, 0, -standGapZ);
  scene.add(north);

  const south = buildStand(PITCH.width + 24, '#b6ff3c');
  south.position.set(0, 0, standGapZ);
  south.rotation.y = Math.PI;
  scene.add(south);

  const east = buildStand(PITCH.length + 24, '#b6ff3c');
  east.position.set(standGapX, 0, 0);
  east.rotation.y = -Math.PI / 2;
  scene.add(east);

  const west = buildStand(PITCH.length + 24, '#b6ff3c');
  west.position.set(-standGapX, 0, 0);
  west.rotation.y = Math.PI / 2;
  scene.add(west);

  const glow = glowTexture();
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#fdfdff' });
  const pylonMat = new THREE.MeshStandardMaterial({ color: '#171f25', roughness: 0.6, metalness: 0.4 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (PITCH.halfWidth + 30);
      const z = sz * (PITCH.halfLength + 30);
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 26, 10), pylonMat);
      pylon.position.set(x, 13, z);
      scene.add(pylon);

      const head = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 0.7), bulbMat);
      head.position.set(x, 26.6, z);
      head.lookAt(0, 0, 0);
      scene.add(head);

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glow, color: '#eaf4ff', transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      sprite.scale.set(20, 20, 1);
      sprite.position.set(x, 26.6, z);
      scene.add(sprite);

      const light = new THREE.PointLight('#dceaff', 260, 190, 2);
      light.position.set(x, 26, z);
      scene.add(light);
    }
  }

  const steel = new THREE.MeshStandardMaterial({ color: '#39454e', roughness: 0.42, metalness: 0.65 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#1c242a', roughness: 0.5, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#8fc7e8',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.24,
  });

  function buildDugout(x) {
    const group = new THREE.Group();
    const width = 11;
    const depth = 3.1;
    const height = 2.6;

    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.22, depth + 0.5), darkSteel);
    base.position.set(0, 0.11, 0);
    base.receiveShadow = true;
    group.add(base);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.3, depth + 0.8), darkSteel);
    roof.position.set(0, height + 0.15, -0.1);
    roof.castShadow = true;
    group.add(roof);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.34, 0.16), steel);
    fascia.position.set(0, height - 0.1, depth / 2 + 0.24);
    group.add(fascia);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height - 0.3), glass);
    back.position.set(0, (height - 0.3) / 2 + 0.2, -depth / 2);
    group.add(back);

    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(depth, height - 0.3), glass);
      side.position.set((sx * width) / 2, (height - 0.3) / 2 + 0.2, 0);
      side.rotation.y = Math.PI / 2;
      group.add(side);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, height, 0.22), steel);
      post.position.set((sx * (width + 0.4)) / 2, height / 2, depth / 2 - 0.1);
      post.castShadow = true;
      group.add(post);
    }

    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, 0.2), steel);
      post.position.set((sx * (width + 0.4)) / 2, height / 2, -depth / 2 + 0.1);
      group.add(post);
    }

    const seat = new THREE.Mesh(new THREE.BoxGeometry(width - 1.4, 0.18, 0.7), steel);
    seat.position.set(0, 0.55, -depth / 2 + 0.62);
    group.add(seat);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.5), darkSteel);
      leg.position.set((sx * (width - 2.2)) / 2, 0.28, -depth / 2 + 0.62);
      group.add(leg);
    }

    group.position.set(x, 0, PITCH.halfLength + 7.4);
    return group;
  }

  scene.add(buildDugout(-17));
  scene.add(buildDugout(17));

  const markerGroup = new THREE.Group();
  markerGroup.rotation.x = -Math.PI / 2;
  scene.add(markerGroup);

  const markerGeo = new THREE.RingGeometry(2.5, 3.05, 48);
  const markerMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fillGeo = new THREE.CircleGeometry(2.45, 48);
  const fillMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, depthWrite: false });

  const markers = new Map();
  let selectionRing = null;

  function setSlots(slots) {
    const keep = new Set(slots.map((s) => s.id));
    for (const [id, group] of markers) {
      if (!keep.has(id)) {
        markerGroup.remove(group);
        markers.delete(id);
      }
    }
    for (const slot of slots) {
      let group = markers.get(slot.id);
      if (!group) {
        group = new THREE.Group();
        group.add(new THREE.Mesh(markerGeo, markerMat.clone()));
        group.add(new THREE.Mesh(fillGeo, fillMat.clone()));
        markerGroup.add(group);
        markers.set(slot.id, group);
      }
      // markerGroup is rotated -90deg about X, so its local axes are not the
      // world's: local (x, y, z) lands at world (x, z, -y). Placing the ring at
      // (slot.x, 0.03, slot.z) put it slot.z units *up in the air* instead of on
      // the grass, which is where the stray floating circles came from.
      group.position.set(slot.x, -slot.z, 0.03);
      const filled = Boolean(slot.playerId);
      const [ring, disc] = group.children;
      ring.material.opacity = filled ? 0.62 : 0.26;
      disc.material.opacity = filled ? 0.12 : 0.04;
    }
  }

  function setSelected(slotId) {
    if (selectionRing) {
      markerGroup.remove(selectionRing);
      selectionRing.geometry.dispose();
      selectionRing.material.dispose();
      selectionRing = null;
    }
    const group = slotId ? markers.get(slotId) : null;
    if (!group) return;
    selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 3.9, 48),
      new THREE.MeshBasicMaterial({ color: '#b6ff3c', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    selectionRing.position.copy(group.position);
    selectionRing.position.z = 0.05; // local z is world up (see setSlots)
    markerGroup.add(selectionRing);
  }

  const MAX_SHAPE_POINTS = 6;
  const shapePositions = new Float32Array(MAX_SHAPE_POINTS * 3);
  const shapeGeometry = new THREE.BufferGeometry();
  shapeGeometry.setAttribute('position', new THREE.BufferAttribute(shapePositions, 3));
  const shapeMaterial = new THREE.LineBasicMaterial({ color: '#b6ff3c', transparent: true, opacity: 0.55 });
  const shapeLine = new THREE.LineLoop(shapeGeometry, shapeMaterial);
  shapeLine.visible = false;
  shapeLine.frustumCulled = false;
  scene.add(shapeLine);

  const shapeHaloGeometry = new THREE.BufferGeometry();
  shapeHaloGeometry.setAttribute('position', new THREE.BufferAttribute(shapePositions, 3));
  const shapeHalo = new THREE.LineLoop(
    shapeHaloGeometry,
    new THREE.LineBasicMaterial({ color: '#0b1206', transparent: true, opacity: 0.35 }),
  );
  shapeHalo.visible = false;
  shapeHalo.frustumCulled = false;
  scene.add(shapeHalo);

  function setShape(rawPoints) {
    if (rawPoints.length < 3) {
      shapeLine.visible = false;
      shapeHalo.visible = false;
      return;
    }
    // Slots come in formation order (GK, defence, midfield, attack), which is not
    // an order you can walk round the outline in: joining them as listed drew
    // zig-zag lines straight across the pitch. Sorting by angle around the
    // centroid gives a clean closed shape.
    const cx = rawPoints.reduce((sum, pt) => sum + pt.x, 0) / rawPoints.length;
    const cz = rawPoints.reduce((sum, pt) => sum + pt.z, 0) / rawPoints.length;
    const points = [...rawPoints].sort((a, b) => Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx));
    for (let i = 0; i < points.length; i += 1) {
      shapePositions[i * 3] = points[i].x;
      shapePositions[i * 3 + 1] = 0.14;
      shapePositions[i * 3 + 2] = points[i].z;
    }
    shapeGeometry.setDrawRange(0, points.length);
    shapeHaloGeometry.setDrawRange(0, points.length);
    shapeGeometry.attributes.position.needsUpdate = true;
    shapeHaloGeometry.attributes.position.needsUpdate = true;
    shapeLine.visible = true;
    shapeHalo.visible = true;
  }

  function setTeamColor(color) {
    for (const mat of ribbonMaterials) mat.color.set(color);
    shapeMaterial.color.set(color);
  }

  const frames = new Set();

  function onFrame(fn) {
    frames.add(fn);
  }

  function resize() {
    const play = document.getElementById('stagePlay') || stage;
    const width = play.clientWidth || 1;
    const height = play.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    fitCamera();
  }

  function zoom(factor) {
    const dir = camera.position.clone().sub(controls.target);
    const dist = THREE.MathUtils.clamp(dir.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(dir.normalize().multiplyScalar(dist));
    controls.update();
  }

  function resetView() {
    controls.target.set(0, 0, 0);
    homeDirection.copy(homeFor());
    camera.position.copy(controls.target).addScaledVector(homeDirection, 170);
    fitCamera();
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(document.getElementById('stagePlay') || stage);

  let running = true;
  const clock = new THREE.Clock();

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = clock.getDelta();
    controls.update();
    camera.updateMatrixWorld(true);
    if (selectionRing) {
      selectionRing.rotation.z += dt * 0.6;
      selectionRing.material.opacity = 0.65 + Math.sin(clock.elapsedTime * 4) * 0.2;
    }
    for (const fn of frames) fn(dt);
    renderer.render(scene, camera);
  }
  tick();

  return {
    camera,
    controls,
    renderer,
    scene,
    onFrame,
    setSlots,
    setSelected,
    setShape,
    setTeamColor,
    zoom,
    resetView,
    resize,
    dispose() {
      running = false;
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}