/* =========================================================
   הסצנה התלת־ממדית: לוח עץ, פיצה, תוספות נופלות וטאבון
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = REDUCED ? 0.35 : 1;

/* ---------- עזרים ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry32(20261115);
const rnd = (a, b) => a + R() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
function speckle(ctx, w, h, n, colors, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * rnd(0.3, 1);
    ctx.fillStyle = colors[(R() * colors.length) | 0];
    ctx.beginPath(); ctx.arc(R() * w, R() * h, rnd(rMin, rMax), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function softSpot(ctx, x, y, rx, ry, color, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color); g.addColorStop(0.55, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---------- טקסטורות ---------- */
function woodCanvas() {
  const c = canvas(1024, 1024), x = c.getContext('2d');
  x.fillStyle = '#c99659'; x.fillRect(0, 0, 1024, 1024);
  // רצועות במבוק
  for (let s = 0; s < 1024; s += rnd(50, 90)) {
    x.globalAlpha = 0.12; x.fillStyle = R() > 0.5 ? '#e0b07a' : '#a87240';
    x.fillRect(s, 0, rnd(40, 90), 1024);
  }
  for (let i = 0; i < 900; i++) {
    const px = R() * 1024;
    x.globalAlpha = rnd(0.04, 0.16);
    x.strokeStyle = R() > 0.4 ? '#7a4d25' : '#f0c890';
    x.lineWidth = rnd(0.6, 2.2);
    x.beginPath(); x.moveTo(px, 0);
    x.bezierCurveTo(px + rnd(-6, 6), 340, px + rnd(-6, 6), 680, px + rnd(-4, 4), 1024);
    x.stroke();
  }
  speckle(x, 1024, 1024, 500, ['#6b4220'], 0.5, 1.6, 0.25);
  // סימני חיתוך עדינים
  for (let i = 0; i < 40; i++) {
    x.globalAlpha = 0.07; x.strokeStyle = '#5a3a1e'; x.lineWidth = 1;
    const a = R() * Math.PI, cx = R() * 1024, cy = R() * 1024, l = rnd(60, 220);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); x.stroke();
  }
  x.globalAlpha = 1;
  return c;
}
function concreteCanvas() {
  const c = canvas(1024, 1024), x = c.getContext('2d');
  x.fillStyle = '#7d7975'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) softSpot(x, R() * 1024, R() * 1024, rnd(40, 160), rnd(40, 160), R() > 0.5 ? '#9a9692' : '#625e5a', 0.12);
  speckle(x, 1024, 1024, 9000, ['#5a5653', '#a5a19c', '#47423f'], 0.4, 1.4, 0.5);
  // דהייה בשוליים (שולחן מתמזג ברקע)
  const g = x.createRadialGradient(512, 512, 220, 512, 512, 512);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  return c;
}
function clayCanvas(soot) {
  const c = canvas(1024, 512), x = c.getContext('2d');
  x.fillStyle = '#b48558'; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 220; i++) softSpot(x, R() * 1024, R() * 512, rnd(20, 90), rnd(20, 90), R() > 0.5 ? '#c99a6a' : '#94653d', 0.22);
  speckle(x, 1024, 512, 7000, ['#7b5232', '#d6ad7e', '#5e3d24'], 0.4, 1.6, 0.45);
  // סדקים
  x.strokeStyle = '#5a3a22'; x.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) {
    let px = R() * 1024, py = R() * 512; x.globalAlpha = rnd(0.2, 0.45);
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 6; k++) { px += rnd(-28, 28); py += rnd(-20, 20); x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1;
  if (soot) {
    const g = x.createRadialGradient(512, 512, 30, 512, 512, 420);
    g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.45, 'rgba(30,18,10,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  }
  return c;
}
function stoneCanvas() {
  const c = canvas(1024, 512), x = c.getContext('2d');
  x.fillStyle = '#6f6862'; x.fillRect(0, 0, 1024, 512);
  const rowH = 85;
  for (let row = 0; row < 7; row++) {
    let px = row % 2 ? -60 : 0;
    while (px < 1024) {
      const w = rnd(110, 190);
      const shade = rnd(-18, 18);
      x.fillStyle = `rgb(${120 + shade},${112 + shade},${104 + shade})`;
      x.beginPath(); x.roundRect(px + 4, row * rowH + 4, w - 8, rowH - 8, 10); x.fill();
      px += w;
    }
  }
  speckle(x, 1024, 512, 5000, ['#4d4743', '#9d958e'], 0.4, 1.4, 0.45);
  return c;
}
function crustCanvases() {
  const W = 1024, H = 256;
  const raw = canvas(W, H), rx = raw.getContext('2d');
  rx.fillStyle = '#e0c08c'; rx.fillRect(0, 0, W, H);
  speckle(rx, W, H, 2500, ['#c9a46c', '#efdcb6'], 0.6, 2, 0.4);
  // קמח על החלק העליון (v≈0.1–0.4 → y = (1-v)*H)
  for (let i = 0; i < 1600; i++) {
    rx.globalAlpha = rnd(0.15, 0.5); rx.fillStyle = '#fffaf0';
    rx.beginPath(); rx.arc(R() * W, (1 - rnd(0.08, 0.42)) * H, rnd(0.6, 2.2), 0, 7); rx.fill();
  }
  rx.globalAlpha = 1;

  const baked = canvas(W, H), bx = baked.getContext('2d');
  const g = bx.createLinearGradient(0, H, 0, 0); // v=0 בתחתית הקנבס
  g.addColorStop(0.0, '#b9773b');
  g.addColorStop(0.18, '#d29550');
  g.addColorStop(0.3, '#ddaa63');
  g.addColorStop(0.45, '#e6bd7f');
  g.addColorStop(0.6, '#c99256');
  g.addColorStop(0.8, '#8f5a2c');
  g.addColorStop(1.0, '#b9773b');
  bx.fillStyle = g; bx.fillRect(0, 0, W, H);
  speckle(bx, W, H, 2600, ['#a86a33', '#ecc58a'], 0.6, 2.2, 0.35);
  // נקודות "לאופרד" חרוכות
  for (let i = 0; i < 300; i++) {
    const v = Math.min(0.46, Math.max(0.04, 0.24 + (R() + R() + R() - 1.5) * 0.18));
    const r = R() < 0.12 ? rnd(9, 18) : rnd(2.5, 8);
    const px = R() * W, py = (1 - v) * H;
    softSpot(bx, px, py, r * 1.25, r * 2.3, '#8a5428', 0.35); // הילה
    softSpot(bx, px, py, r, r * 2.1, '#1d110a', rnd(0.75, 1));
  }
  const mixed = canvas(W, H);
  return { raw, baked, mixed };
}
function sauceCanvas(kind) {
  const c = canvas(512, 512), x = c.getContext('2d');
  if (kind === 'red') {
    x.fillStyle = '#b5301b'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) softSpot(x, R() * 512, R() * 512, rnd(10, 46), rnd(10, 46), R() > 0.5 ? '#d44a2a' : '#86200f', 0.35);
    speckle(x, 512, 512, 220, ['#3c4a1e', '#2a3214'], 0.6, 1.6, 0.8); // אורגנו
  } else {
    x.fillStyle = '#f2e7cd'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) softSpot(x, R() * 512, R() * 512, rnd(12, 50), rnd(12, 50), '#e3bf5f', 0.28); // שמן זית
    speckle(x, 512, 512, 260, ['#2b2622', '#5b4f42'], 0.5, 1.3, 0.75); // פלפל שחור
  }
  return c;
}
function tomatoFaceCanvas() {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#c8261a'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 126);
  g.addColorStop(0, '#f08a5c'); g.addColorStop(0.7, '#e2492c'); g.addColorStop(0.88, '#c8261a'); g.addColorStop(1, '#a51a10');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094 + 0.4, cx = 128 + Math.cos(a) * 52, cy = 128 + Math.sin(a) * 52;
    x.fillStyle = 'rgba(250,190,120,0.75)';
    x.beginPath(); x.ellipse(cx, cy, 34, 22, a, 0, 7); x.fill();
    for (let s = 0; s < 6; s++) {
      x.fillStyle = '#f7e2a3';
      x.beginPath(); x.ellipse(cx + rnd(-16, 16), cy + rnd(-10, 10), 5, 3, a + rnd(-1, 1), 0, 7); x.fill();
    }
  }
  x.fillStyle = '#f6b08a'; x.beginPath(); x.arc(128, 128, 16, 0, 7); x.fill();
  return c;
}
function jalapenoFaceCanvas() {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#2f6b1f'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#a9d47a'; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.fill();
  x.fillStyle = '#e8f3cf'; x.beginPath(); x.arc(128, 128, 62, 0, 7); x.fill();
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094;
    x.strokeStyle = '#cfe6a8'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); x.stroke();
  }
  for (let s = 0; s < 14; s++) {
    const a = R() * 7, d = rnd(15, 55);
    x.fillStyle = '#fff6dc'; x.beginPath(); x.ellipse(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 7, 5, a, 0, 7); x.fill();
  }
  return c;
}
function flameCanvas() {
  const c = canvas(128, 256), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 190, 4, 64, 170, 120);
  g.addColorStop(0, 'rgba(255,250,210,1)');
  g.addColorStop(0.25, 'rgba(255,200,90,0.95)');
  g.addColorStop(0.55, 'rgba(255,110,30,0.6)');
  g.addColorStop(1, 'rgba(160,30,0,0)');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(64, 6);
  x.bezierCurveTo(100, 90, 126, 150, 112, 210);
  x.bezierCurveTo(100, 250, 28, 250, 16, 210);
  x.bezierCurveTo(2, 150, 28, 90, 64, 6); x.fill();
  return c;
}
function dotCanvas(inner, outer) {
  const c = canvas(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return c;
}

/* ---------- גאומטריה ---------- */
function noisyDisc(radius, wobble, seed, segs = 96) {
  const r = mulberry32(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  const s = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const k = radius * (1 + wobble * (Math.sin(a * 3 + ph[0]) * 0.5 + Math.sin(a * 7 + ph[1]) * 0.3 + Math.sin(a * 13 + ph[2]) * 0.2));
    const px = Math.cos(a) * k, py = Math.sin(a) * k;
    i ? s.lineTo(px, py) : s.moveTo(px, py);
  }
  const geo = new THREE.ShapeGeometry(s, 1);
  // UV לפי מיקום
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (radius * 2.4) + 0.5, pos.getY(i) / (radius * 2.4) + 0.5);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/* =========================================================
   יצירת הסצנה
   ========================================================= */
export function createPizzaScene(canvasEl) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.Fog(0x16100c, 11, 22);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const BASE_BUILD = { pos: new THREE.Vector3(0, 3.9, 4.3), target: new THREE.Vector3(0, -0.05, -0.3) };
  const BASE_OVEN = { pos: new THREE.Vector3(1.6, 2.1, 0.9), target: new THREE.Vector3(-0.1, 0.75, -5.4) };
  let distK = 1;
  const fit = (v) => ({ pos: v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(distK)), target: v.target.clone() });
  const VIEW_BUILD = { get pos() { return fit(BASE_BUILD).pos; }, get target() { return BASE_BUILD.target; } };
  const VIEW_OVEN = { get pos() { return fit(BASE_OVEN).pos; }, get target() { return BASE_OVEN.target; } };
  camera.position.copy(VIEW_BUILD.pos);

  const controls = new OrbitControls(camera, canvasEl);
  controls.target.copy(VIEW_BUILD.target);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.15;
  controls.minAzimuthAngle = -0.75; controls.maxAzimuthAngle = 0.75;
  controls.rotateSpeed = 0.55;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  controls.enabled = !isTouch;

  /* תאורה */
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x3a2a20, 0.55));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.9);
  key.position.set(3.2, 7, 4.2); key.castShadow = true;
  key.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  key.shadow.bias = -0.0006; key.shadow.radius = 4;
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xffc89a, 0.6);
  rimLight.position.set(-4, 3, -3); scene.add(rimLight);

  /* שולחן ולוח */
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshStandardMaterial({ map: tex(concreteCanvas()), transparent: true, roughness: 0.92 })
  );
  table.rotation.x = -Math.PI / 2; table.position.y = -0.1; table.receiveShadow = true;
  scene.add(table);

  const woodT = tex(woodCanvas());
  const woodTop = new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.62 });
  const woodSide = new THREE.MeshStandardMaterial({ color: 0xb98348, roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.1, 96), [woodSide, woodTop, woodSide]);
  board.position.y = -0.05; board.castShadow = true; board.receiveShadow = true;
  scene.add(board);

  /* ---------- הטאבון ---------- */
  const oven = new THREE.Group(); oven.position.set(0, 0, -1.6); scene.add(oven);
  const OR = 2.3, BASE_Y = 0.45, FACADE_Z = -2.95, GAP = 0.78;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.55, 6.2),
    new THREE.MeshStandardMaterial({ map: tex(stoneCanvas()), roughness: 0.95 }));
  plinth.position.set(0, 0.175, -4.9); plinth.receiveShadow = true; plinth.castShadow = true;
  oven.add(plinth);
  const ovenFloor = new THREE.Mesh(new THREE.CircleGeometry(OR - 0.05, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 }));
  ovenFloor.rotation.x = -Math.PI / 2; ovenFloor.position.set(0, BASE_Y + 0.003, FACADE_Z - 2.08);
  oven.add(ovenFloor);

  const clayMat = new THREE.MeshStandardMaterial({ map: tex(clayCanvas(false)), roughness: 0.95, side: THREE.DoubleSide });
  const domeZ = FACADE_Z - OR * Math.cos(GAP / 2) + 0.08;
  const capTheta = Math.acos(1.62 / OR);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(OR, 64, 20, 0, Math.PI * 2, 0, capTheta), clayMat);
  const lower = new THREE.Mesh(new THREE.SphereGeometry(OR, 64, 20, Math.PI / 2 + GAP / 2, Math.PI * 2 - GAP, capTheta, Math.PI / 2 - capTheta), clayMat);
  for (const m of [cap, lower]) { m.position.set(0, BASE_Y, domeZ); m.castShadow = true; m.receiveShadow = true; oven.add(m); }

  // חזית עם פתח קשתי
  const HOLE_W = 1.9, HOLE_RECT = 0.5;
  const fShape = new THREE.Shape();
  fShape.moveTo(-OR - 0.08, 0); fShape.absarc(0, 0, OR + 0.08, Math.PI, 0, true); fShape.lineTo(-OR - 0.08, 0);
  const hole = new THREE.Path();
  hole.moveTo(-HOLE_W / 2, 0); hole.lineTo(-HOLE_W / 2, HOLE_RECT);
  hole.absarc(0, HOLE_RECT, HOLE_W / 2, Math.PI, 0, true); hole.lineTo(HOLE_W / 2, 0); hole.lineTo(-HOLE_W / 2, 0);
  fShape.holes.push(hole);
  const facadeGeo = new THREE.ExtrudeGeometry(fShape, { depth: 0.32, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 48 });
  // UV פשוט לפי x/y כדי שהפיח יישב סביב הפתח
  { const p = facadeGeo.attributes.position, uv = facadeGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4.8 + 0.5, p.getY(i) / 4.8 + 0.25 - 0.06); }
  const facade = new THREE.Mesh(facadeGeo, new THREE.MeshStandardMaterial({ map: tex(clayCanvas(true)), roughness: 0.92 }));
  facade.position.set(0, BASE_Y, FACADE_Z); facade.castShadow = true; facade.receiveShadow = true;
  oven.add(facade);
  // קשת לבנים סביב הפתח
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x8e4a2c, roughness: 0.85 });
  const brickGeo = new THREE.BoxGeometry(0.2, 0.13, 0.36);
  const nBr = 13;
  for (let i = 0; i < nBr; i++) {
    const a = Math.PI - (i / (nBr - 1)) * Math.PI;
    const b = new THREE.Mesh(brickGeo, brickMat);
    b.position.set(Math.cos(a) * (HOLE_W / 2 + 0.11), BASE_Y + HOLE_RECT + Math.sin(a) * (HOLE_W / 2 + 0.11), FACADE_Z + 0.2);
    b.rotation.z = a - Math.PI / 2; b.castShadow = true;
    b.material = brickMat.clone(); b.material.color.offsetHSL(0, 0, rnd(-0.05, 0.05));
    oven.add(b);
  }
  // בולי עץ
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4b3424, roughness: 1 });
  const endMat = new THREE.MeshStandardMaterial({ color: 0xc19563, roughness: 0.9 });
  [[2.75, 0.03, -2.35, 0.2], [3.05, 0.03, -2.05, -0.15], [2.9, 0.26, -2.2, 0.05]].forEach(([x, y, z, ry]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 1.2, 14), [barkMat, endMat, endMat]);
    l.rotation.set(0, ry, Math.PI / 2); l.position.set(x, y + 0.04, z); l.castShadow = true; scene.add(l);
  });

  // אש
  const fireLight = new THREE.PointLight(0xff7a2e, 22, 0, 2);
  fireLight.position.set(0, 1.05, FACADE_Z - 1.9); oven.add(fireLight);
  const flameTex = tex(flameCanvas());
  const flames = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
    const bx = rnd(-0.75, 0.75);
    s.userData = { bx, by: BASE_Y + 0.32, h: rnd(0.55, 0.95), ph: R() * 10, sp: rnd(6, 11) };
    s.position.set(bx, BASE_Y + 0.3, FACADE_Z - 3.25 + rnd(-0.2, 0.25));
    oven.add(s); flames.push(s);
  }
  // גחלים
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x220c04, emissive: 0xff4a10, emissiveIntensity: 1.2, roughness: 1 });
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.06, 0.12), 0), coalMat);
    c.position.set(rnd(-0.9, 0.9), BASE_Y + 0.05, FACADE_Z - 3.3 + rnd(-0.25, 0.3)); c.rotation.set(R() * 3, R() * 3, R() * 3);
    oven.add(c);
  }
  // ניצוצות
  const EMB = 70;
  const embGeo = new THREE.BufferGeometry();
  const embPos = new Float32Array(EMB * 3), embData = [];
  for (let i = 0; i < EMB; i++) embData.push({ t: R(), x: rnd(-0.6, 0.6), z: rnd(-0.2, 0.3), sp: rnd(0.25, 0.6), sw: rnd(0.5, 2) });
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({
    size: 0.05, map: tex(dotCanvas('rgba(255,220,140,1)', 'rgba(255,90,0,0)')), color: 0xffb060,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  oven.add(embers);
  let fireBoost = 0;

  /* ---------- חומרי הפיצה ---------- */
  const crust = crustCanvases();
  const crustTex = tex(crust.mixed);
  const crustMat = new THREE.MeshStandardMaterial({ map: crustTex, roughness: 0.78 });
  const doughRaw = new THREE.Color('#e0c08c'), doughBaked = new THREE.Color('#d6a05e');
  const baseMat = new THREE.MeshStandardMaterial({ color: doughRaw.clone(), roughness: 0.85 });
  const sauceTex = { red: tex(sauceCanvas('red')), white: tex(sauceCanvas('white')) };
  const sauceMat = new THREE.MeshStandardMaterial({ map: sauceTex.red, roughness: 0.38 });
  const cheeseA = new THREE.MeshStandardMaterial({ color: 0xf7ecd2, roughness: 0.48 });
  const cheeseB = new THREE.MeshStandardMaterial({ color: 0xf3e3c0, roughness: 0.48 });
  const brownSpotMat = new THREE.MeshStandardMaterial({ color: 0xa8632a, roughness: 0.6, transparent: true, opacity: 0 });
  const C = (hex) => new THREE.Color(hex);
  const CHEESE = { a0: C('#f7ecd2'), a1: C('#f6dfa4'), b0: C('#f3e3c0'), b1: C('#eec47a') };

  function paintBake(t) {
    const x = crust.mixed.getContext('2d');
    x.globalAlpha = 1; x.drawImage(crust.raw, 0, 0);
    x.globalAlpha = t; x.drawImage(crust.baked, 0, 0); x.globalAlpha = 1;
    crustTex.needsUpdate = true;
    baseMat.color.copy(doughRaw).lerp(doughBaked, t);
    cheeseA.color.copy(CHEESE.a0).lerp(CHEESE.a1, t);
    cheeseB.color.copy(CHEESE.b0).lerp(CHEESE.b1, t);
    brownSpotMat.opacity = t * 0.85;
    sauceMat.color.setScalar(1 - 0.12 * t);
    if (pizza) pizza.userData.cheese.children.forEach((b) => {
      const s = b.userData.s; if (!s) return;
      b.scale.set(s.x * (1 + 0.32 * t), s.y * (1 - 0.35 * t), s.z * (1 + 0.32 * t));
    });
  }

  /* ---------- תוספות: צורות ---------- */
  const G = {}, M = {};
  function shared() {
    if (G.ready) return; G.ready = true;
    M.tomatoSide = new THREE.MeshStandardMaterial({ color: 0xc0261a, roughness: 0.25 });
    M.tomatoFace = new THREE.MeshStandardMaterial({ map: tex(tomatoFaceCanvas()), roughness: 0.3 });
    G.tomato = new THREE.CylinderGeometry(0.12, 0.105, 0.055, 30);
    M.greenOlive = new THREE.MeshStandardMaterial({ color: 0x7d8a2c, roughness: 0.32 });
    M.pimento = new THREE.MeshStandardMaterial({ color: 0xb73b1c, roughness: 0.4 });
    M.blackOlive = new THREE.MeshStandardMaterial({ color: 0x241c1f, roughness: 0.22 });
    G.olive = new THREE.TorusGeometry(0.058, 0.032, 14, 28);
    G.pimento = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12);
    M.jalSide = new THREE.MeshStandardMaterial({ color: 0x2f6a1d, roughness: 0.3 });
    M.jalFace = new THREE.MeshStandardMaterial({ map: tex(jalapenoFaceCanvas()), roughness: 0.35 });
    G.jal = new THREE.CylinderGeometry(0.075, 0.075, 0.024, 26);
    M.garlic = new THREE.MeshStandardMaterial({ color: 0xe5bb6d, roughness: 0.4 });
    G.garlic = new THREE.SphereGeometry(0.07, 18, 12);
    M.tuna = new THREE.MeshStandardMaterial({ color: 0xcdb197, roughness: 0.85, flatShading: true });
    M.tuna2 = new THREE.MeshStandardMaterial({ color: 0xb5917a, roughness: 0.85, flatShading: true });
    G.tuna = new THREE.DodecahedronGeometry(0.062, 0);
    M.onion = new THREE.MeshStandardMaterial({ color: 0x8e3a72, roughness: 0.3 });
    M.onionIn = new THREE.MeshStandardMaterial({ color: 0xe6c3d9, roughness: 0.3 });
    G.onion1 = new THREE.TorusGeometry(0.11, 0.013, 8, 30, Math.PI * 0.95);
    G.onion2 = new THREE.TorusGeometry(0.083, 0.012, 8, 26, Math.PI * 0.9);
    // פטרייה פרוסה
    const ms = new THREE.Shape();
    ms.moveTo(-0.03, -0.08); ms.lineTo(-0.035, -0.01);
    ms.bezierCurveTo(-0.11, -0.02, -0.13, 0.05, -0.1, 0.08);
    ms.bezierCurveTo(-0.06, 0.12, 0.06, 0.12, 0.1, 0.08);
    ms.bezierCurveTo(0.13, 0.05, 0.11, -0.02, 0.035, -0.01);
    ms.lineTo(0.03, -0.08); ms.lineTo(-0.03, -0.08);
    G.mushroom = new THREE.ExtrudeGeometry(ms, { depth: 0.02, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
    G.mushroom.rotateX(-Math.PI / 2);
    M.mushroom = new THREE.MeshStandardMaterial({ color: 0xd7bb92, roughness: 0.6 });
    M.corn = new THREE.MeshStandardMaterial({ color: 0xf2c12c, roughness: 0.28 });
    G.corn = new THREE.SphereGeometry(0.032, 12, 8);
    const ls = new THREE.Shape();
    ls.moveTo(0, -0.11); ls.bezierCurveTo(0.08, -0.06, 0.08, 0.05, 0, 0.12); ls.bezierCurveTo(-0.08, 0.05, -0.08, -0.06, 0, -0.11);
    G.basil = new THREE.ExtrudeGeometry(ls, { depth: 0.006, bevelEnabled: false, curveSegments: 16 });
    G.basil.rotateX(-Math.PI / 2);
    { const p = G.basil.attributes.position; // קיפול קל של העלה
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.abs(p.getX(i)) * 0.35); }
    G.basil.computeVertexNormals();
    M.basil = new THREE.MeshStandardMaterial({ color: 0x2e7a26, roughness: 0.3, side: THREE.DoubleSide });
    M.feta = new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 0.75 });
    G.feta = new THREE.BoxGeometry(0.075, 0.06, 0.075);
  }
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };

  const TOPPING_COUNT = { tomato: 9, greenOlive: 13, blackOlive: 13, jalapeno: 12, garlic: 10, tuna: 10, onion: 9, mushroom: 10, corn: 12, basil: 7, feta: 12 };
  function makePiece(id) {
    shared();
    const g = new THREE.Group();
    switch (id) {
      case 'tomato': { const m = mesh(G.tomato, [M.tomatoSide, M.tomatoFace, M.tomatoSide]); m.position.y = 0.028; m.rotation.y = R() * 6; g.add(m); break; }
      case 'greenOlive': case 'blackOlive': {
        const m = mesh(G.olive, id === 'greenOlive' ? M.greenOlive : M.blackOlive);
        m.rotation.x = -Math.PI / 2; m.scale.set(1, rnd(0.85, 1.1), 0.75); m.position.y = 0.024; g.add(m);
        if (id === 'greenOlive' && R() < 0.5) { const p = mesh(G.pimento, M.pimento); p.position.y = 0.02; g.add(p); }
        break;
      }
      case 'jalapeno': { const m = mesh(G.jal, [M.jalSide, M.jalFace, M.jalSide]); m.position.y = 0.013; m.rotation.y = R() * 6; g.add(m); break; }
      case 'garlic': { const m = mesh(G.garlic, M.garlic); m.scale.set(1.25, 0.6, 0.78); m.position.y = 0.035; m.rotation.y = R() * 6; g.add(m); break; }
      case 'tuna': {
        const n = 2 + ((R() * 2) | 0);
        for (let i = 0; i < n; i++) { const m = mesh(G.tuna, R() > 0.5 ? M.tuna : M.tuna2); m.scale.set(rnd(0.8, 1.2), rnd(0.4, 0.6), rnd(0.7, 1)); m.position.set(rnd(-0.05, 0.05), 0.025, rnd(-0.05, 0.05)); m.rotation.set(R() * 6, R() * 6, R() * 6); g.add(m); }
        break;
      }
      case 'onion': {
        const a = mesh(G.onion1, M.onion), b = mesh(G.onion2, M.onionIn);
        for (const m of [a, b]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.014; g.add(m); }
        g.rotation.y = R() * 6; break;
      }
      case 'mushroom': { const m = mesh(G.mushroom, M.mushroom); m.position.y = 0.006; m.rotation.y = R() * 6; g.add(m); break; }
      case 'corn': {
        for (let i = 0; i < 3; i++) { const m = mesh(G.corn, M.corn); m.scale.set(1, 0.75, 0.85); m.position.set(rnd(-0.045, 0.045), 0.024, rnd(-0.045, 0.045)); g.add(m); }
        break;
      }
      case 'basil': { const m = mesh(G.basil, M.basil); m.position.y = 0.02; m.rotation.y = R() * 6; m.scale.setScalar(rnd(0.9, 1.25)); g.add(m); break; }
      case 'feta': {
        const n = 1 + ((R() * 2) | 0);
        for (let i = 0; i < n; i++) { const m = mesh(G.feta, M.feta); m.scale.set(rnd(0.7, 1.2), rnd(0.7, 1), rnd(0.7, 1.2)); m.position.set(rnd(-0.04, 0.04), 0.03, rnd(-0.04, 0.04)); m.rotation.set(rnd(-0.3, 0.3), R() * 6, rnd(-0.3, 0.3)); g.add(m); }
        break;
      }
      default: { const m = mesh(new THREE.SphereGeometry(0.05), M.corn); m.position.y = 0.04; g.add(m); }
    }
    return g;
  }

  /* ---------- בניית פיצה ---------- */
  let pizza = null, baseKind = 'red';
  const TOP_Y = 0.085;

  function buildPizza() {
    const p = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(1.42, 1.38, 0.06, 80), baseMat); base.position.y = 0.03;
    const rim = mesh(new THREE.TorusGeometry(1.43, 0.17, 28, 128), crustMat);
    rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 1, 0.74); rim.position.y = 0.1;
    // חוסר סימטריה עדין בשוליים
    { const pa = rim.geometry.attributes.position; const rr = mulberry32(7);
      const ph = [rr() * 6, rr() * 6];
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), a = Math.atan2(y, x);
        const k = 1 + 0.025 * Math.sin(a * 5 + ph[0]) + 0.015 * Math.sin(a * 11 + ph[1]);
        pa.setXYZ(i, x * k, y * k, pa.getZ(i) * (1 + 0.12 * Math.sin(a * 7 + ph[1])));
      }
      rim.geometry.computeVertexNormals(); }
    const sauce = mesh(noisyDisc(1.27, 0.035, 11), sauceMat); sauce.position.y = 0.062; sauce.castShadow = false;
    const cheese = new THREE.Group(); cheese.position.y = 0.066;
    const toppings = new THREE.Group(); toppings.position.y = TOP_Y;
    p.add(base, rim, sauce, cheese, toppings);
    p.userData = { base, rim, sauce, cheese, toppings, pieces: {} };
    return p;
  }
  function addCheese(animated) {
    const ch = pizza.userData.cheese;
    ch.clear();
    const n = baseKind === 'white' ? 62 : 44;
    const pts = scatter(n, 1.12, [], 0.1);
    const geo = new THREE.IcosahedronGeometry(0.16, 3);
    { const pa = geo.attributes.position; // גושים לא סימטריים
      for (let k = 0; k < pa.count; k++) { const x = pa.getX(k), z = pa.getZ(k); const w = 1 + 0.18 * Math.sin(x * 40) * Math.cos(z * 37); pa.setXYZ(k, x * w, pa.getY(k), z * w); }
      geo.computeVertexNormals(); }
    pts.forEach((pt, i) => {
      const b = mesh(geo, R() > 0.5 ? cheeseA : cheeseB);
      const big = R() < 0.35 ? rnd(1.2, 1.6) : rnd(0.55, 1.05);
      const s = new THREE.Vector3(big * rnd(0.85, 1.25), rnd(0.13, 0.2), big * rnd(0.8, 1.15));
      b.scale.copy(s); b.userData.s = s.clone();
      b.position.set(pt.x, 0, pt.z); b.rotation.y = R() * 6;
      ch.add(b);
      if (R() < 0.45) { // נקודות שחומות שמופיעות באפייה
        const sp = mesh(geo, brownSpotMat); sp.scale.set(s.x * 0.28, 0.06, s.z * 0.28);
        sp.position.set(rnd(-0.06, 0.06), s.y * 0.15, rnd(-0.06, 0.06)); sp.castShadow = false; b.add(sp);
        sp.scale.divide(s); sp.position.divide(s);
      }
      if (animated) drop(b, i * 28, 1.4);
    });
  }

  function scatter(n, radius, existing, minD) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let best = null, bestD = -1;
      for (let k = 0; k < 28; k++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R()) * radius;
        const c = { x: Math.cos(a) * r, z: Math.sin(a) * r };
        let d = 9;
        for (const e of existing) d = Math.min(d, Math.hypot(e.x - c.x, e.z - c.z));
        for (const e of out) d = Math.min(d, Math.hypot(e.x - c.x, e.z - c.z));
        if (d > bestD) { bestD = d; best = c; }
        if (d > minD * 2.2) break;
      }
      out.push(best);
    }
    return out;
  }

  /* ---------- מערכת נפילה ---------- */
  const drops = [];
  let now = 0;
  function drop(obj, delayMs = 0, height = 2.6) {
    const rest = obj.position.clone();
    const restQ = obj.quaternion.clone();
    const startQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-2.5, 2.5), rnd(-3, 3), rnd(-2.5, 2.5))).multiply(restQ);
    const off = new THREE.Vector3(rnd(-0.35, 0.35), 0, rnd(-0.35, 0.35));
    const baseScale = obj.scale.clone();
    obj.visible = false;
    drops.push({ obj, rest, restQ, startQ, off, baseScale, start: now + delayMs / 1000, dur: (0.95 + rnd(0, 0.25)) / SPEED, h: height + rnd(0, 0.8) });
  }
  function updateDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      const p = (now - d.start) / d.dur;
      if (p < 0) continue;
      d.obj.visible = true;
      const q = clamp01(p);
      let y, squash = 0;
      if (q < 0.5) { const f = q / 0.5; y = d.h * (1 - f * f); }
      else if (q < 0.75) { const f = (q - 0.5) / 0.25; y = d.h * 0.06 * 4 * f * (1 - f); squash = Math.max(0, 1 - f * 5); }
      else if (q < 0.9) { const f = (q - 0.75) / 0.15; y = d.h * 0.015 * 4 * f * (1 - f); squash = Math.max(0, 1 - f * 5) * 0.5; }
      else { y = 0; squash = Math.max(0, 1 - (q - 0.9) * 20) * 0.25; }
      const fall = clamp01(q / 0.5);
      d.obj.position.set(d.rest.x + d.off.x * (1 - fall), d.rest.y + y, d.rest.z + d.off.z * (1 - fall));
      d.obj.quaternion.copy(d.startQ).slerp(d.restQ, easeOut(clamp01(q / 0.55)));
      d.obj.scale.set(d.baseScale.x * (1 + squash * 0.22), d.baseScale.y * (1 - squash * 0.3), d.baseScale.z * (1 + squash * 0.22));
      if (p >= 1) { d.obj.position.copy(d.rest); d.obj.quaternion.copy(d.restQ); d.obj.scale.copy(d.baseScale); drops.splice(i, 1); }
    }
  }

  /* ---------- טוויני אנימציה ---------- */
  const tweens = [];
  function tween(seconds, fn, ease = easeInOut) {
    return new Promise((res) => tweens.push({ t0: null, dur: Math.max(0.01, seconds / SPEED), fn, ease, res }));
  }
  const wait = (s) => tween(s, () => {});
  function updateTweens() {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      if (t.t0 === null) t.t0 = now;
      const p = clamp01((now - t.t0) / t.dur);
      t.fn(t.ease(p), p);
      if (p >= 1) { tweens.splice(i, 1); t.res(); }
    }
  }

  /* ---------- חלקיקי קמח ואדים ---------- */
  const puffTex = tex(dotCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
  const puffs = [];
  function flourPuff(center, count = 40, spread = 1.4) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), vel = [];
    for (let i = 0; i < count; i++) {
      const a = R() * 6.28, r = rnd(0.2, spread);
      pos.set([center.x + Math.cos(a) * r * 0.5, center.y + 0.05, center.z + Math.sin(a) * r * 0.5], i * 3);
      vel.push(new THREE.Vector3(Math.cos(a) * rnd(0.3, 1.1), rnd(0.4, 1.3), Math.sin(a) * rnd(0.3, 1.1)));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.07, map: puffTex, transparent: true, depthWrite: false, opacity: 0.85, color: 0xfffaf0 });
    const pts = new THREE.Points(geo, mat); scene.add(pts);
    puffs.push({ pts, vel, born: now, life: 1.3 });
  }
  const steamTex = tex(dotCanvas('rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'));
  const steams = [];
  function steam() {
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.position.set(rnd(-0.8, 0.8), 0.3, rnd(-0.8, 0.8)); s.scale.setScalar(0.4);
      scene.add(s); steams.push({ s, born: now + i * 0.18, life: 2.6, sx: s.position.x, sw: rnd(0, 6) });
    }
  }
  function updateParticles(dt) {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i], age = now - p.born, a = p.pts.geometry.attributes.position;
      for (let k = 0; k < p.vel.length; k++) {
        const v = p.vel[k]; v.y -= dt * 1.2; v.multiplyScalar(1 - dt * 1.6);
        a.setXYZ(k, a.getX(k) + v.x * dt, Math.max(0.02, a.getY(k) + v.y * dt), a.getZ(k) + v.z * dt);
      }
      a.needsUpdate = true; p.pts.material.opacity = 0.85 * (1 - age / p.life);
      if (age > p.life) { scene.remove(p.pts); p.pts.geometry.dispose(); p.pts.material.dispose(); puffs.splice(i, 1); }
    }
    for (let i = steams.length - 1; i >= 0; i--) {
      const st = steams[i], age = now - st.born;
      if (age < 0) continue;
      const f = age / st.life;
      st.s.position.y = 0.3 + f * 1.8; st.s.position.x = st.sx + Math.sin(age * 2 + st.sw) * 0.15;
      st.s.scale.setScalar(0.4 + f * 1.1);
      st.s.material.opacity = Math.sin(Math.PI * f) * 0.45;
      if (f >= 1) { scene.remove(st.s); st.s.material.dispose(); steams.splice(i, 1); }
    }
    // ניצוצות
    const ea = embGeo.attributes.position;
    for (let i = 0; i < EMB; i++) {
      const e = embData[i]; e.t += dt * e.sp * (1 + fireBoost);
      if (e.t > 1) { e.t = 0; e.x = rnd(-0.6, 0.6); }
      ea.setXYZ(i, e.x + Math.sin(e.t * 6 + e.sw) * 0.12, BASE_Y + 0.5 + e.t * 2.6, FACADE_Z + 0.35 + e.z + e.t * 0.6);
    }
    ea.needsUpdate = true;
    embers.material.opacity = 0.55 + fireBoost * 0.45;
  }

  /* ---------- מצב התחלתי: כדור בצק ---------- */
  const doughBall = mesh(new THREE.SphereGeometry(0.55, 48, 32), new THREE.MeshStandardMaterial({ color: 0xf0dcb4, roughness: 0.7 }));
  doughBall.scale.set(1, 0.78, 1); doughBall.position.y = 0.42;
  scene.add(doughBall);

  pizza = buildPizza(); pizza.visible = false; scene.add(pizza);
  paintBake(0);

  /* ---------- הפיצה: פעולות ---------- */
  let state = 'dough'; // dough | intro | build | oven
  let spin = 0;

  async function playIntro(onStep = () => {}) {
    if (state !== 'dough') return;
    state = 'intro';
    onStep('dough');
    doughBall.position.y = 3;
    await tween(0.7, (t) => { doughBall.position.y = lerp(3, 0.42, t * t); }, (t) => t);
    flourPuff(new THREE.Vector3(0, 0, 0), 50, 1.2);
    await tween(0.25, (t) => { doughBall.scale.set(1 + 0.18 * Math.sin(t * Math.PI), 0.78 - 0.18 * Math.sin(t * Math.PI), 1 + 0.18 * Math.sin(t * Math.PI)); });
    onStep('stretch');
    // לישה: שתי לחיצות
    for (let k = 0; k < 2; k++) {
      await tween(0.32, (t) => { const s = Math.sin(t * Math.PI); doughBall.scale.set(1 + 0.35 * s, 0.78 - 0.32 * s, 1 + 0.35 * s); doughBall.rotation.y += 0.04; });
    }
    // פתיחה לעיגול
    pizza.visible = true; pizza.scale.setScalar(0.001);
    const { sauce, cheese } = pizza.userData;
    sauce.visible = false; cheese.visible = false;
    await tween(1.25, (t) => {
      doughBall.scale.set(1 + 1.6 * t, 0.78 * (1 - t) + 0.08, 1 + 1.6 * t);
      doughBall.position.y = lerp(0.42, 0.05, t);
      doughBall.rotation.y += 0.05;
      const s = clamp01((t - 0.45) / 0.55);
      pizza.scale.setScalar(Math.max(0.001, easeOutBack(s)));
      if (t > 0.85) doughBall.visible = false;
    });
    doughBall.visible = false;
    flourPuff(new THREE.Vector3(0, 0, 0), 60, 2.2);
    onStep('sauce');
    await spreadSauce();
    onStep('cheese');
    cheese.visible = true; addCheese(true);
    await wait(1.5);
    state = 'build';
    onStep('ready');
  }
  async function spreadSauce() {
    const sauce = pizza.userData.sauce;
    sauce.visible = true; sauce.scale.setScalar(0.001);
    await tween(1.1, (t) => { sauce.scale.setScalar(Math.max(0.001, t)); sauce.rotation.y = (1 - t) * 4; }, easeOut);
  }
  function skipIntro() {
    if (state !== 'dough') return;
    doughBall.visible = false; pizza.visible = true; pizza.scale.setScalar(1);
    pizza.userData.sauce.visible = true; pizza.userData.cheese.visible = true;
    addCheese(false); state = 'build';
  }

  async function setBase(kind) {
    if (kind === baseKind) return;
    baseKind = kind;
    if (state === 'dough') { sauceMat.map = sauceTex[kind]; sauceMat.needsUpdate = true; return; }
    const sauce = pizza.userData.sauce;
    await tween(0.35, (t) => sauce.scale.setScalar(Math.max(0.001, 1 - t)));
    sauceMat.map = sauceTex[kind]; sauceMat.needsUpdate = true;
    await tween(0.8, (t) => { sauce.scale.setScalar(Math.max(0.001, t)); sauce.rotation.y = (1 - t) * 3; }, easeOut);
    addCheese(true);
  }

  function addTopping(id) {
    const ud = pizza.userData;
    if (ud.pieces[id]) return;
    const existing = [];
    Object.values(ud.pieces).forEach((arr) => arr.forEach((o) => existing.push({ x: o.position.x, z: o.position.z })));
    const n = TOPPING_COUNT[id] || 10;
    const pts = scatter(n, 1.1, existing, 0.17);
    const arr = [];
    pts.forEach((pt, i) => {
      const o = makePiece(id);
      o.position.set(pt.x, 0, pt.z);
      ud.toppings.add(o); arr.push(o);
      drop(o, i * 55 + rnd(0, 40));
    });
    ud.pieces[id] = arr;
  }
  function removeTopping(id) {
    const ud = pizza.userData, arr = ud.pieces[id];
    if (!arr) return;
    delete ud.pieces[id];
    arr.forEach((o, i) => {
      const y0 = o.position.y, s0 = o.scale.clone(), x0 = o.position.x, z0 = o.position.z;
      for (let k = drops.length - 1; k >= 0; k--) if (drops[k].obj === o) drops.splice(k, 1);
      setTimeout(() => tween(0.42, (t) => {
        o.position.set(x0 * (1 + t * 0.4), y0 + Math.sin(t * Math.PI) * 0.5 + t * 0.2, z0 * (1 + t * 0.4));
        o.scale.copy(s0).multiplyScalar(Math.max(0.001, 1 - t));
        o.rotation.x += 0.15;
      }, (t) => t).then(() => ud.toppings.remove(o)), i * 25);
    });
  }
  function setToppings(ids) {
    if (state !== 'build') return;
    const cur = Object.keys(pizza.userData.pieces);
    cur.filter((id) => !ids.includes(id)).forEach(removeTopping);
    ids.filter((id) => !cur.includes(id)).forEach(addTopping);
  }

  /* ---------- כף (מרדה) ---------- */
  const peel = new THREE.Group();
  {
    const pm = new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.6 });
    const blade = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.03, 48), pm);
    const neck = mesh(new THREE.BoxGeometry(0.5, 0.03, 0.5), pm); neck.position.set(0, 0, 0.95);
    const handle = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12), pm);
    handle.rotation.x = Math.PI / 2; handle.position.set(0, 0, 2.3);
    peel.add(blade, neck, handle);
  }
  peel.visible = false; scene.add(peel);

  function lookTween(from, to, sec) {
    const p0 = from.pos.clone(), t0 = from.target.clone();
    return tween(sec, (t) => { camera.position.lerpVectors(p0, to.pos, t); controls.target.lerpVectors(t0, to.target, t); });
  }
  function currentView() { return { pos: camera.position.clone(), target: controls.target.clone() }; }

  async function bake(onStage = () => {}) {
    if (state !== 'build') return;
    state = 'oven';
    controls.enabled = false;
    while (drops.length) await wait(0.1);
    const ovenFloorWorld = new THREE.Vector3(0, BASE_Y + 0.01, FACADE_Z - 1.5 + oven.position.z);
    const mouthWorld = new THREE.Vector3(0, BASE_Y + 0.25, FACADE_Z + 1.2 + oven.position.z);
    const homeRot = pizza.rotation.y;
    onStage('peel');
    // הכף נכנסת מתחת לפיצה
    peel.visible = true; peel.scale.setScalar(1); peel.position.set(0, 0.03, 4.5); peel.rotation.y = 0;
    await Promise.all([
      lookTween(currentView(), VIEW_OVEN, 1.6),
      (async () => {
        await tween(0.5, (t) => { pizza.position.y = 0.1 * t; });
        await tween(0.7, (t) => { peel.position.z = lerp(4.5, 0, t); }, easeOut);
        // נוסעים לפתח
        const p0 = pizza.position.clone();
        await tween(1.1, (t) => {
          const s = lerp(1, 0.52, t);
          pizza.scale.setScalar(s); peel.scale.setScalar(s);
          pizza.position.lerpVectors(p0, mouthWorld, t); pizza.position.y += Math.sin(t * Math.PI) * 0.6;
          peel.position.set(pizza.position.x, pizza.position.y - 0.03 * s, pizza.position.z);
        });
      })()
    ]);
    onStage('in');
    // לתוך הטאבון
    const m0 = pizza.position.clone();
    await tween(0.9, (t) => {
      pizza.position.lerpVectors(m0, ovenFloorWorld, t);
      peel.position.set(pizza.position.x, pizza.position.y - 0.02, pizza.position.z);
    });
    // הכף יוצאת
    await tween(0.5, (t) => { peel.position.z = lerp(ovenFloorWorld.z, mouthWorld.z + 2, t); peel.position.y = ovenFloorWorld.y - 0.03 + t * 0.05; });
    peel.visible = false;
    onStage('baking');
    // אפייה + סיבוב
    await tween(3.4, (t, raw) => {
      paintBake(raw);
      fireBoost = Math.sin(raw * Math.PI);
      pizza.rotation.y = homeRot + raw * Math.PI;
      onStage('bakeProgress', raw);
    }, (t) => t);
    fireBoost = 0;
    onStage('out');
    peel.visible = true; peel.position.set(ovenFloorWorld.x, ovenFloorWorld.y - 0.03, mouthWorld.z + 2);
    await tween(0.5, (t) => { peel.position.z = lerp(mouthWorld.z + 2, ovenFloorWorld.z, t); });
    const f0 = pizza.position.clone();
    await tween(0.8, (t) => { pizza.position.lerpVectors(f0, mouthWorld, t); peel.position.set(pizza.position.x, pizza.position.y - 0.02, pizza.position.z); });
    const back0 = pizza.position.clone();
    await Promise.all([
      lookTween(currentView(), VIEW_BUILD, 1.5),
      tween(1.3, (t) => {
        const s = lerp(0.52, 1, t);
        pizza.scale.setScalar(s); peel.scale.setScalar(s);
        pizza.position.lerpVectors(back0, new THREE.Vector3(0, 0.1, 0), t); pizza.position.y += Math.sin(t * Math.PI) * 0.6;
        peel.position.set(pizza.position.x, pizza.position.y - 0.03 * s, pizza.position.z);
      })
    ]);
    await tween(0.6, (t) => { peel.position.z = lerp(0, 4.5, t); }, easeInOut);
    peel.visible = false;
    await tween(0.3, (t) => { pizza.position.y = 0.1 * (1 - t); });
    steam();
    spin = pizza.rotation.y;
    controls.enabled = !isTouch;
    state = 'baked';
    onStage('done');
  }

  function snapshot(size = 320) {
    renderer.render(scene, camera);
    const src = renderer.domElement;
    const c = canvas(size, size), x = c.getContext('2d');
    const s = Math.min(src.width, src.height) * 0.78;
    const cy = src.height * 0.56;
    x.drawImage(src, (src.width - s) / 2, cy - s / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.82);
  }

  // פיצה חדשה אחרי שהקודמת נכנסה להזמנה
  async function newPizza() {
    const old = pizza;
    state = 'intro';
    await tween(0.8, (t) => { old.position.x = lerp(0, -7, t); old.position.y = Math.sin(t * Math.PI) * 0.8; old.rotation.y -= 0.05; }, (t) => t * t);
    scene.remove(old);
    pizza = buildPizza(); paintBake(0);
    pizza.position.x = 7; scene.add(pizza);
    pizza.userData.sauce.visible = false;
    await tween(0.8, (t) => { pizza.position.x = lerp(7, 0, t); }, easeOut);
    flourPuff(new THREE.Vector3(0, 0, 0), 40, 2);
    await spreadSauce();
    addCheese(true);
    await wait(0.9);
    state = 'build';
  }

  /* ---------- אייקונים תלת־ממדיים לתוספות ---------- */
  function makeIcons(ids) {
    const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r2.setSize(160, 160); r2.toneMapping = THREE.ACESFilmicToneMapping;
    const s2 = new THREE.Scene();
    s2.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    s2.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.2));
    const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(2, 4, 3); s2.add(dl);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 10); cam.position.set(0, 0.62, 0.5); cam.lookAt(0, 0.02, 0);
    const out = {};
    for (const id of ids) {
      const grp = new THREE.Group();
      const spots = [[-0.07, -0.04], [0.08, -0.03], [0, 0.08]];
      spots.forEach(([x, z]) => { const p = makePiece(id); p.position.set(x, 0, z); p.rotation.y += R() * 2; grp.add(p); });
      s2.add(grp); r2.render(s2, cam); out[id] = r2.domElement.toDataURL('image/png'); s2.remove(grp);
    }
    r2.dispose();
    return out;
  }

  /* ---------- לולאה ---------- */
  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvasEl);
  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // מסך צר — מתרחקים כדי שכל הפיצה תיכנס
    distK = Math.min(2, Math.max(1, 1.2 / camera.aspect));
    camera.fov = 36;
    camera.updateProjectionMatrix();
    if (state !== 'oven') { camera.position.copy(VIEW_BUILD.pos); controls.target.copy(VIEW_BUILD.target); }
  }
  new ResizeObserver(resize).observe(canvasEl); resize();

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    now += dt;
    if (!visible) return;
    updateTweens(); updateDrops(); updateParticles(dt);
    if (state === 'build' || state === 'baked' || state === 'dough') {
      spin += dt * 0.12 * SPEED;
      if (pizza) pizza.rotation.y = spin;
      doughBall.rotation.y = spin;
    }
    // הבהוב האש
    const f = 1 + fireBoost * 1.6;
    fireLight.intensity = 22 * f * (0.85 + 0.15 * Math.sin(now * 13) * Math.sin(now * 7.3));
    flames.forEach((s) => {
      const u = s.userData, fl = 0.8 + 0.2 * Math.sin(now * u.sp + u.ph) + 0.1 * Math.sin(now * u.sp * 2.3);
      const h = u.h * fl * (1 + fireBoost * 0.5);
      s.scale.set(h * 0.5, h, 1); s.position.y = u.by + h * 0.4;
      s.material.opacity = 0.75 + fireBoost * 0.25;
    });
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    playIntro, skipIntro, setBase, setToppings, bake, newPizza, snapshot, makeIcons,
    get state() { return state; },
    resetBaked() { state = 'build'; }
  };
}
