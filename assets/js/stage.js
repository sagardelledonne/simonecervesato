/* Simone Cervesato · panca piana 3D che si scompone con lo scroll
   Ogni gruppo di pezzi = un pilastro del metodo (vedi i capitoli in index.html) */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const canvas = document.getElementById('bench');
const stageEl = document.getElementById('stage');
const hotspot = document.getElementById('hotspot');
const hotTag = hotspot.querySelector('span');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = () => innerWidth <= 760;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  root.classList.add('no-webgl');
  throw err;
}
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.62;

const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

/* ---------- luci ---------- */
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.2, 5, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 14 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 1.3);
rim.position.set(-2.2, 2.6, -3);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xaec3ff, 0.45);
fill.position.set(-2.5, 1.2, 3);
scene.add(fill);

/* ---------- pavimento: pozza di luce + ombra ---------- */
function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const floor = new THREE.Group();
const glow = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 5).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(255,255,255,0.16)'], [0.45, 'rgba(255,255,255,0.05)'], [1, 'rgba(255,255,255,0)']]),
    transparent: true, depthWrite: false
  })
);
glow.renderOrder = 0;
const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2),
  new THREE.ShadowMaterial({ opacity: 0.6, depthWrite: false })
);
shadowCatcher.position.y = 0.001;
shadowCatcher.receiveShadow = true;
shadowCatcher.renderOrder = 1;
floor.add(glow, shadowCatcher);
scene.add(floor);

/* ---------- polvere di magnesite nella luce ---------- */
const dustCount = 220;
const dustPos = new Float32Array(dustCount * 3);
const dustSeed = new Float32Array(dustCount);
for (let i = 0; i < dustCount; i++) {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 2.2;
  dustPos.set([Math.cos(a) * r, Math.random() * 2.6, Math.sin(a) * r], i * 3);
  dustSeed[i] = Math.random() * 100;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  size: 0.014, map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
  transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
}));
scene.add(dust);

/* ---------- materiali (uno per gruppo, per poterli "spegnere") ---------- */
const GROUPS = ['telaio', 'imbottitura', 'bilanciere', 'dischi', 'supporti', 'bulloni'];
const LABELS = ['Il telaio', 'L’imbottitura', 'Il bilanciere', 'I dischi', 'Montanti e ganci', 'I bulloni'];
const groupMats = Object.fromEntries(GROUPS.map(g => [g, []]));
const matCache = {};
const MAKE = {
  steel: () => new THREE.MeshPhysicalMaterial({ color: 0x1a1a1d, metalness: 0.55, roughness: 0.36, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: 0x0c0c0d, metalness: 0, roughness: 0.9 }),
  chrome: () => new THREE.MeshStandardMaterial({ color: 0xf4f4f7, metalness: 1, roughness: 0.12 }),
  knurl: () => new THREE.MeshStandardMaterial({ color: 0xb4b4ba, metalness: 1, roughness: 0.45 }),
  red: () => new THREE.MeshStandardMaterial({ color: 0xd61f2b, metalness: 0.05, roughness: 0.45 }),
  leather: () => new THREE.MeshPhysicalMaterial({ color: 0x151517, metalness: 0, roughness: 0.52, clearcoat: 0.3, clearcoatRoughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0x60606a), sheenRoughness: 0.45 }),
  board: () => new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: 0.35, roughness: 0.62 }),
  plateRed: () => new THREE.MeshPhysicalMaterial({ color: 0xc4121c, metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }),
  plateWhite: () => new THREE.MeshPhysicalMaterial({ color: 0xededf0, metalness: 0.05, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1 }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x060606, metalness: 0.2, roughness: 0.6 }),
  zinc: () => new THREE.MeshStandardMaterial({ color: 0xdadade, metalness: 1, roughness: 0.26 })
};
function mat(group, kind) {
  const id = group + ':' + kind;
  if (!matCache[id]) {
    const m = MAKE[kind]();
    m.userData.base = 1;
    groupMats[group].push(m);
    matCache[id] = m;
  }
  return matCache[id];
}
function decalMat(group, map, opacity = 1) {
  const m = new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 0.5, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -4, opacity
  });
  m.userData.base = opacity;
  m.userData.alwaysT = true;
  groupMats[group].push(m);
  return m;
}

/* ---------- geometrie di base ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rbox = (w, h, d, m, r = 0.008) =>
  new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), m);
const cylZ = (r, len, m, seg = 48) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2), m);

const model = new THREE.Group();
scene.add(model);
const parts = [];
function add(obj, group, pos, off, opts = {}) {
  obj.position.copy(pos);
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  model.add(obj);
  parts.push({
    obj, group,
    home: pos.clone(),
    off: off.clone(),
    delay: opts.delay ?? Math.random() * 0.22,
    spin: opts.spin || 0,
    q0: obj.quaternion.clone()
  });
  return obj;
}

/* ---------- TELAIO ---------- */
{
  const s = mat('telaio', 'steel'), rb = mat('telaio', 'rubber');
  const beam = add(rbox(1.02, 0.08, 0.065, s), 'telaio', V(0.06, 0.30, 0), V(0, 0, 0), { delay: 0 });
  beam.name = 'beam';
  add(rbox(0.06, 0.20, 0.06, s), 'telaio', V(0.50, 0.16, 0), V(0.16, -0.10, 0));
  add(rbox(0.07, 0.06, 0.52, s), 'telaio', V(0.50, 0.03, 0), V(0.32, -0.22, 0));
  for (const z of [-1, 1]) add(rbox(0.078, 0.066, 0.03, rb, 0.006), 'telaio', V(0.50, 0.033, z * 0.272), V(0.32, -0.22, z * 0.16));
  add(rbox(0.06, 0.20, 0.06, s), 'telaio', V(-0.40, 0.16, 0), V(-0.06, -0.10, 0));
  add(rbox(0.24, 0.06, 0.07, s), 'telaio', V(-0.53, 0.03, 0), V(-0.14, -0.22, 0));
  add(rbox(0.08, 0.065, 1.05, s), 'telaio', V(-0.66, 0.0325, 0), V(-0.42, -0.24, 0));
  for (const z of [-1, 1]) {
    add(rbox(0.56, 0.06, 0.075, s), 'telaio', V(-0.67, 0.03, z * 0.56), V(-0.30, -0.18, z * 0.30));
    for (const x of [-1, 1]) add(rbox(0.03, 0.066, 0.082, rb, 0.006), 'telaio', V(-0.67 + x * 0.292, 0.033, z * 0.56), V(-0.30 + x * 0.14, -0.18, z * 0.30));
  }
}

/* ---------- SUPPORTI (montanti + ganci a J) ---------- */
const hooks = [];
{
  const s = mat('supporti', 'steel'), red = mat('supporti', 'red'), chr = mat('supporti', 'chrome');
  for (const z of [-1, 1]) {
    add(rbox(0.065, 1.14, 0.065, s), 'supporti', V(-0.66, 0.63, z * 0.56), V(-0.2, 0.1, z * 0.24));
    add(rbox(0.075, 0.014, 0.075, chr, 0.004), 'supporti', V(-0.66, 1.207, z * 0.56), V(-0.2, 0.3, z * 0.24));
    const hook = new THREE.Group();
    const plate = rbox(0.018, 0.13, 0.075, s, 0.004);
    const arm = rbox(0.1, 0.018, 0.075, s, 0.004); arm.position.set(0.05, -0.056, 0);
    const lip = rbox(0.018, 0.06, 0.075, s, 0.004); lip.position.set(0.1, -0.035, 0);
    const liner = rbox(0.085, 0.008, 0.07, red, 0.003); liner.position.set(0.05, -0.043, 0);
    hook.add(plate, arm, lip, liner);
    hooks.push(add(hook, 'supporti', V(-0.6185, 1.0, z * 0.56), V(0.14, 0.34, z * 0.08)));
  }
}

/* ---------- IMBOTTITURA (+ logo SC sul fianco) ---------- */
let padGroup;
{
  const leather = mat('imbottitura', 'leather'), board = mat('imbottitura', 'board'), red = mat('imbottitura', 'red');
  padGroup = new THREE.Group();
  padGroup.add(new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.075, 0.30, 5, 0.032), leather));
  // cucitura rossa lungo il bordo superiore
  const inset = 0.0088, hw = 0.59 - inset, hd = 0.15 - inset, cr = 0.0232, py = 0.0275;
  const sh = new THREE.Shape();
  sh.moveTo(-hw + cr, -hd);
  sh.lineTo(hw - cr, -hd); sh.absarc(hw - cr, -hd + cr, cr, -Math.PI / 2, 0, false);
  sh.lineTo(hw, hd - cr); sh.absarc(hw - cr, hd - cr, cr, 0, Math.PI / 2, false);
  sh.lineTo(-hw + cr, hd); sh.absarc(-hw + cr, hd - cr, cr, Math.PI / 2, Math.PI, false);
  sh.lineTo(-hw, -hd + cr); sh.absarc(-hw + cr, -hd + cr, cr, Math.PI, Math.PI * 1.5, false);
  const pts = sh.getSpacedPoints(260).slice(0, -1).map(p => V(p.x, py, p.y));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1);
  padGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 520, 0.0036, 8, true), red));
  // logo sui due fianchi
  new THREE.TextureLoader().load('assets/img/logo-scritta.png', tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const m = decalMat('imbottitura', tex, 0.92);
    for (const z of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34 * 41 / 330), m);
      d.position.set(0.2, 0.001, z * 0.1506);
      if (z < 0) d.rotation.y = Math.PI;
      padGroup.add(d);
    }
    applyAll(true);
  });
  add(padGroup, 'imbottitura', V(0.06, 0.4025, 0), V(0, 0.52, 0), { delay: 0.04 });
  add(rbox(1.12, 0.02, 0.26, board, 0.004), 'imbottitura', V(0.06, 0.355, 0), V(0, 0.27, 0), { delay: 0.02 });
}

/* ---------- BILANCIERE ---------- */
const BX = -0.568, BY = 0.975;
let barGroup;
{
  const chr = mat('bilanciere', 'chrome'), kn = mat('bilanciere', 'knurl');
  barGroup = new THREE.Group();
  barGroup.add(cylZ(0.014, 0.42, chr));
  for (const z of [-1, 1]) {
    const k = cylZ(0.0142, 0.445, kn); k.position.z = z * 0.4325;
    const c = cylZ(0.029, 0.03, chr); c.position.z = z * 0.67;
    const sl = cylZ(0.025, 0.415, chr, 64); sl.position.z = z * 0.8925;
    const cap = cylZ(0.021, 0.006, chr); cap.position.z = z * 1.103;
    barGroup.add(k, c, sl, cap);
  }
  add(barGroup, 'bilanciere', V(BX, BY, 0), V(0, 0.8, 0), { delay: 0.12 });
}

/* ---------- DISCHI: 3×25 kg + 5 kg + fermo per lato = 185 kg in totale ---------- */
function plateTexture(label) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 74px -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  g.fillText(label, 256, 62);
  g.font = '700 46px -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  g.fillText('KG', 256, 452);
  g.fillRect(40, 250, 34, 12);
  g.fillRect(438, 250, 34, 12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let anchorPlate;
{
  const red = mat('dischi', 'plateRed'), white = mat('dischi', 'plateWhite'),
    chr = mat('dischi', 'chrome'), dark = mat('dischi', 'dark'), redK = mat('dischi', 'red');
  const deco25 = decalMat('dischi', plateTexture('25'));
  const makePlate = (R, T, m, hubR, decal) => {
    const g = new THREE.Group();
    const bodyR = R - T / 2;
    g.add(cylZ(bodyR, T - 0.008, m, 96));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(bodyR, T / 2, 18, 120), m));
    g.add(cylZ(hubR, T + 0.004, chr, 64));
    g.add(cylZ(0.0256, T + 0.005, dark, 32));
    if (decal) {
      for (const z of [-1, 1]) {
        const d = new THREE.Mesh(new THREE.RingGeometry(hubR + 0.012, R - 0.03, 96), decal);
        d.position.z = z * ((T - 0.008) / 2 + 0.0006);
        if (z < 0) d.rotation.y = Math.PI;
        g.add(d);
      }
    }
    return g;
  };
  const makeCollar = () => {
    const g = new THREE.Group();
    g.add(cylZ(0.048, 0.07, chr, 64));
    for (const z of [-1, 1]) { const r = cylZ(0.0486, 0.005, dark, 64); r.position.z = z * 0.02; g.add(r); }
    const lever = rbox(0.012, 0.05, 0.012, chr, 0.004); lever.position.set(0, 0.07, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.013, 24, 16), redK); knob.position.set(0, 0.098, 0);
    g.add(lever, knob);
    return g;
  };
  for (const z of [-1, 1]) {
    let at = 0.685;
    const stack = [
      { R: 0.225, T: 0.027, m: red, hub: 0.06, decal: deco25 },
      { R: 0.225, T: 0.027, m: red, hub: 0.06, decal: deco25 },
      { R: 0.225, T: 0.027, m: red, hub: 0.06, decal: deco25 },
      { R: 0.114, T: 0.022, m: white, hub: 0.045 }
    ];
    stack.forEach((p, i) => {
      const c = at + p.T / 2; at += p.T;
      const obj = makePlate(p.R, p.T, p.m, p.hub, p.decal);
      if (z < 0) obj.rotation.y = Math.PI;
      add(obj, 'dischi', V(BX, BY, z * c), V(0, 0.8, z * (0.14 + i * 0.12)), { delay: 0.14 + i * 0.035, spin: (1.4 + i * 0.35) * z });
      if (z > 0 && i === 2) anchorPlate = obj;
    });
    const col = makeCollar();
    add(col, 'dischi', V(BX, BY, z * (at + 0.036)), V(0, 0.8, z * 0.62), { delay: 0.28 });
  }
}

/* ---------- BULLONI ---------- */
let anchorBolt;
{
  const zn = mat('bulloni', 'zinc');
  const up = V(0, 1, 0);
  const bolt = len => {
    const g = new THREE.Group();
    g.scale.setScalar(1.35);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.008, 6), zn); head.position.y = len / 2 + 0.004;
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.002, 24), zn); washer.position.y = len / 2 - 0.001;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, len, 16), zn);
    g.add(head, washer, shaft);
    return g;
  };
  const place = (pos, dir, len, dist, extra = V(0, 0, 0)) => {
    const b = bolt(len);
    b.quaternion.setFromUnitVectors(up, dir);
    const center = pos.clone().addScaledVector(dir, -(len / 2 - 0.002) * 1.35);
    return add(b, 'bulloni', center, dir.clone().multiplyScalar(dist).add(extra), { delay: 0.05 + Math.random() * 0.2 });
  };
  // telaio: attraversano la trave dove si innestano le gambe
  for (const y of [0.285, 0.315]) {
    const b = place(V(0.50, y, 0.0325), V(0, 0, 1), 0.09, 0.26);
    if (y === 0.315) anchorBolt = b;
    place(V(-0.40, y, -0.0325), V(0, 0, -1), 0.09, 0.26);
  }
  // supporto imbottitura: da sotto verso l'alto
  for (const x of [-0.42, 0.54]) for (const z of [-0.09, 0.09]) place(V(0.06 + x, 0.345, z), V(0, -1, 0), 0.05, 0.02, V(0, 0.12, 0));
  // montanti: fissati ai piedi
  for (const z of [-1, 1]) for (const y of [0.085, 0.115]) place(V(-0.6925, y, z * 0.56), V(-1, 0, 0), 0.09, 0.2, V(-0.2, 0.1, z * 0.24));
}

/* ---------- ancore per il cartellino ---------- */
const beamMesh = model.getObjectByName('beam');
const ANCHORS = [
  { obj: beamMesh, local: V(-0.16, 0.04, 0.033) },
  { obj: padGroup, local: V(0.28, 0.0375, 0.15) },
  { obj: barGroup, local: V(0, 0.014, 0.33) },
  { obj: anchorPlate, local: V(0, 0.19, 0) },
  { obj: hooks[1], local: V(0.1, 0, 0.0375) },
  { obj: anchorBolt, local: V(0, 0.05, 0) }
];

/* ---------- trasparenze per evidenziare un gruppo ---------- */
const groupOpacity = Object.fromEntries(GROUPS.map(g => [g, 1]));
function applyGroup(g, o, force) {
  for (const m of groupMats[g]) {
    const faded = o < 0.995;
    const wantT = faded || !!m.userData.alwaysT;
    if (m.transparent !== wantT || force) { m.transparent = wantT; m.needsUpdate = true; }
    if (!m.userData.alwaysT) m.depthWrite = o > 0.6;
    m.opacity = m.userData.base * o;
  }
}
function applyAll(force) { GROUPS.forEach(g => applyGroup(g, groupOpacity[g], force)); }
// prepara subito anche le versioni trasparenti dei materiali (servono quando un gruppo si "spegne"),
// così il primo capitolo non blocca lo scroll per compilare gli shader
GROUPS.forEach(g => applyGroup(g, 0.5, true));
renderer.compile(scene, cam);
applyAll(true);

/* ---------- camera ---------- */
const CH = {
  yaw: [0.5, 0.3, 1.02, 1.22, 0.92, 0.62],
  pitch: [0.2, 0.46, 0.26, 0.2, 0.3, 0.22],
  focus: [V(-0.15, 0.2, 0), V(0.1, 0.85, 0), V(-0.55, 1.55, 0.1), V(-0.55, 1.6, 0.55), V(-0.62, 0.95, 0.3), V(0.05, 0.45, 0)]
};
const cur = { yaw: 0.75, pitch: 0.22, dist: 6, tx: -0.1, ty: 0.7, tz: 0, ox: 0, oy: -0.17 };
const want = { ...cur };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function fitDist(radius) {
  const halfV = THREE.MathUtils.degToRad(cam.fov / 2);
  const halfH = Math.atan(Math.tan(halfV) * cam.aspect);
  return radius / Math.sin(Math.min(halfV, halfH));
}

let mouseX = 0, mouseY = 0, mX = 0, mY = 0;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  mouseX = e.clientX / innerWidth * 2 - 1;
  mouseY = e.clientY / innerHeight * 2 - 1;
}, { passive: true });

function computeWant(S, t) {
  const mob = small();
  // pesi delle inquadrature: hero → titolo → capitoli → finale
  const wH = 1 - ss(0.02, 0.11, S.p);
  const wO = ss(0.83, 0.93, S.p);
  const wC = ss(0.195, 0.235, S.p) * (1 - wO);
  const wT = clamp(1 - wH - wC - wO);
  const wM = wC;

  const fitA = fitDist(1.22) * (mob ? 0.86 : 0.9);
  const fitE = fitDist(1.7) * (mob ? 0.9 : 0.86);

  // capitoli: interpolazione morbida tra un pezzo e il successivo
  const { C0, SPAN, N } = S.chapters;
  const cf = clamp((S.p - C0) / SPAN - 0.5, 0, N - 1);
  const i0 = Math.floor(cf), i1 = Math.min(N - 1, i0 + 1), f = ss(0.25, 0.75, cf - i0);
  const cYaw = lerp(CH.yaw[i0], CH.yaw[i1], f);
  const cPitch = lerp(CH.pitch[i0], CH.pitch[i1], f);
  const fx = lerp(CH.focus[i0].x, CH.focus[i1].x, f);
  const fy = lerp(CH.focus[i0].y, CH.focus[i1].y, f);
  const fz = lerp(CH.focus[i0].z, CH.focus[i1].z, f);
  const focusAmt = 0.55 * S.h;
  const boltZoom = S.h * (1 - Math.min(1, Math.abs(cf - 5)));

  const idle = reduceMotion ? 0 : Math.sin(t * 0.32) * 0.32;
  const heroYaw = 0.78 + idle;
  const outroYaw = 0.9 + (reduceMotion ? 0 : Math.sin(t * 0.25) * 0.2);

  const titleYaw = lerp(0.78, CH.yaw[0], ss(0.1, 0.21, S.p)) + idle * 0.3;

  want.yaw = heroYaw * wH + titleYaw * wT + cYaw * wM + outroYaw * wO;
  want.pitch = 0.2 * wH + 0.24 * wT + cPitch * wM + 0.18 * wO;
  const heroK = mob ? 1.22 : 1.3;
  want.dist = fitA * heroK * wH + fitE * (mob ? 1.12 : 1.4) * wT + fitE * (mob ? 1.02 : 1.08) * (1 - 0.16 * boltZoom) * wM + fitA * (mob ? 1.1 : 1.2) * wO;
  const cx = -0.12, cy = 0.62, cyE = 0.85;
  want.tx = cx * (wH + wT + wO) + lerp(cx, fx, focusAmt) * wM;
  want.ty = cy * (wH + wO) + cyE * wT + lerp(cyE, fy, focusAmt) * wM;
  want.tz = lerp(0, fz, focusAmt) * wM;
  if (mob) {
    want.ox = 0;
    want.oy = -0.24 * wH - 0.16 * wT + 0.13 * wM - 0.2 * wO;
  } else {
    want.ox = -0.16 * wM;
    want.oy = -0.27 * wH - 0.33 * wT - 0.02 * wM - 0.22 * wO;
  }
  // parallasse del mouse
  mX += (mouseX - mX) * 0.05; mY += (mouseY - mY) * 0.05;
  want.yaw += mX * 0.12;
  want.pitch += mY * 0.05;
}

/* ---------- resize ---------- */
let W = 0, H = 0;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w === W && h === H) return;
  W = w; H = h;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small() ? 1.5 : 2));
  renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}

/* ---------- rendering solo quando la sezione è visibile ---------- */
let visible = true;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '200px' }).observe(stageEl);

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const zAxis = V(0, 0, 1);
let last = performance.now(), time = 0, first = true;

function frame(now) {
  requestAnimationFrame(frame);
  if (!visible && !first) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  resize();

  const S = window.STAGE || { p: 0, e: 0, k: -1, h: 0, local: 0, chapters: { C0: 0.22, SPAN: 0.0967, N: 6 } };

  // esplosione
  const e = S.e;
  for (const p of parts) {
    const t = easeIO(clamp((e - p.delay) / (1 - 0.32)));
    p.obj.position.copy(p.home).addScaledVector(p.off, t);
    if (p.spin) {
      tmpQ.setFromAxisAngle(zAxis, p.spin * t);
      p.obj.quaternion.copy(p.q0).multiply(tmpQ);
    }
  }
  floor.position.y = -0.34 * easeIO(clamp(e * 1.2));

  // evidenziazione del gruppo del capitolo
  const k = S.k;
  const kt = 1 - Math.exp(-dt * 7);
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    const target = k >= 0 && S.h > 0.01 ? (i === k ? 1 : 1 - 0.86 * S.h) : 1;
    const nv = groupOpacity[g] + (target - groupOpacity[g]) * kt;
    if (Math.abs(nv - groupOpacity[g]) > 0.0005 || first) { groupOpacity[g] = nv; applyGroup(g, nv); }
  }

  // i bulloni sono piccoli: quando tocca a loro si accendono un po'
  const zinc = matCache['bulloni:zinc'];
  zinc.emissive.setScalar(k === 5 ? 0.35 * S.h : 0);

  // polvere
  if (!reduceMotion) {
    const pos = dustGeo.attributes.position;
    for (let i = 0; i < dustCount; i++) {
      let y = pos.getY(i) + dt * 0.035;
      if (y > 2.6) y = 0;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(time * 0.4 + dustSeed[i]) * dt * 0.01);
    }
    pos.needsUpdate = true;
  }

  // camera
  computeWant(S, time);
  const ct = first ? 1 : 1 - Math.exp(-dt * 5);
  for (const n in want) cur[n] += (want[n] - cur[n]) * ct;
  const cp = Math.cos(cur.pitch);
  cam.position.set(
    cur.tx + cur.dist * Math.sin(cur.yaw) * cp,
    cur.ty + cur.dist * Math.sin(cur.pitch),
    cur.tz + cur.dist * Math.cos(cur.yaw) * cp
  );
  cam.lookAt(cur.tx, cur.ty, cur.tz);
  cam.setViewOffset(W, H, cur.ox * W, cur.oy * H, W, H);

  renderer.render(scene, cam);

  // cartellino sul pezzo evidenziato
  if (k >= 0 && S.h > 0.3) {
    const a = ANCHORS[k];
    a.obj.updateWorldMatrix(true, false);
    tmpV.copy(a.local);
    a.obj.localToWorld(tmpV);
    tmpV.project(cam);
    const x = (tmpV.x + 1) / 2 * W, y = (1 - tmpV.y) / 2 * H;
    const o = ss(0.12, 0.3, S.local) * (1 - ss(0.78, 0.94, S.local)) * S.h;
    hotspot.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    hotspot.style.opacity = o.toFixed(3);
    if (hotTag.textContent !== LABELS[k]) hotTag.textContent = LABELS[k];
  } else {
    hotspot.style.opacity = '0';
  }

  if (first) {
    first = false;
    root.classList.add('webgl-ready');
    root.classList.remove('no-webgl');
  }
}
requestAnimationFrame(frame);
