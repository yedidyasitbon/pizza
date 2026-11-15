/* =========================================================
   סצנה תלת־ממדית ריאליסטית: שולחן עץ חרוך, פיצה, תוספות,
   ופנים הטאבון עם אש אמיתית (שיידר)
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = REDUCED ? 0.4 : 1;

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
const easeIn = (t) => t * t * t;

function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
           l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;

function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function speckle(x, w, h, n, colors, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = alpha * rnd(0.3, 1); x.fillStyle = colors[(R() * colors.length) | 0];
    x.beginPath(); x.arc(R() * w, R() * h, rnd(rMin, rMax), 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}
function spot(x, px, py, rx, ry, color, alpha, hard = 0.55) {
  x.save(); x.translate(px, py); x.scale(1, ry / rx);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color); g.addColorStop(hard, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalAlpha = alpha; x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, 7); x.fill();
  x.restore(); x.globalAlpha = 1;
}
function noiseCanvas(size, scale, lo, hi) {
  const c = cnv(size, size), x = c.getContext('2d'), img = x.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const n = fbm(i / scale, j / scale, 3.7);
    const v = lo + (hi - lo) * n + (R() - 0.5) * 18;
    const k = (j * size + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}
function std(p) { const m = new THREE.MeshStandardMaterial(p); m.envMapIntensity = p.envMapIntensity ?? 0.35; return m; }

/* ---------- טקסטורות ---------- */
function burntWoodCanvas() {
  const W = 1024, c = cnv(W, W), x = c.getContext('2d');
  x.fillStyle = '#1f1510'; x.fillRect(0, 0, W, W);
  const planks = 5, ph = W / planks;
  for (let p = 0; p < planks; p++) {
    const y0 = p * ph, tone = rnd(-10, 10);
    x.fillStyle = `rgb(${46 + tone},${32 + tone},${23 + tone})`; x.fillRect(0, y0, W, ph);
    for (let i = 0; i < 160; i++) {
      x.globalAlpha = rnd(0.05, 0.22); x.strokeStyle = R() > 0.5 ? '#120b07' : '#5c4130'; x.lineWidth = rnd(0.6, 2.4);
      const yy = y0 + R() * ph; x.beginPath(); x.moveTo(0, yy);
      for (let k = 1; k <= 8; k++) x.lineTo((k / 8) * W, yy + Math.sin(k * 1.3 + i) * rnd(1, 5));
      x.stroke();
    }
    x.globalAlpha = 1;
    for (let k = 0; k < 18; k++) spot(x, R() * W, y0 + R() * ph, rnd(30, 120), rnd(10, 30), '#0d0805', 0.35);
    for (let k = 0; k < 3; k++) {
      const kx = R() * W, ky = y0 + rnd(20, ph - 20);
      for (let r = 26; r > 2; r -= 4) { x.globalAlpha = 0.18; x.strokeStyle = '#0c0705'; x.beginPath(); x.ellipse(kx, ky, r * 1.8, r * 0.6, 0, 0, 7); x.stroke(); }
    }
    x.globalAlpha = 1; x.fillStyle = '#070403'; x.fillRect(0, y0, W, 3);
  }
  speckle(x, W, W, 3000, ['#0a0604', '#6a4c38'], 0.4, 1.3, 0.4);
  return c;
}
function flourCanvas() {
  const W = 1024, c = cnv(W, W), x = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const a = R() * 7, d = Math.pow(R(), 0.6) * 470;
    spot(x, 512 + Math.cos(a) * d, 512 + Math.sin(a) * d, rnd(20, 90), rnd(20, 90), 'rgba(245,238,225,1)', rnd(0.02, 0.06), 0.05);
  }
  for (let i = 0; i < 9000; i++) {
    const a = R() * 7, d = Math.pow(R(), 0.7) * 500;
    x.globalAlpha = rnd(0.15, 0.7) * (1 - d / 520); x.fillStyle = '#f4eee2';
    x.beginPath(); x.arc(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, rnd(0.4, 1.6), 0, 7); x.fill();
  }
  x.globalAlpha = 1; return c;
}
function crustCanvases() {
  const W = 2048, H = 512;
  const raw = cnv(W, H), rx = raw.getContext('2d');
  rx.fillStyle = '#dcc39a'; rx.fillRect(0, 0, W, H);
  for (let i = 0; i < 300; i++) spot(rx, R() * W, R() * H, rnd(20, 80), rnd(20, 80), R() > 0.5 ? '#e8d4b0' : '#cdb085', 0.3, 0.2);
  for (let i = 0; i < 4000; i++) {
    rx.globalAlpha = rnd(0.15, 0.55); rx.fillStyle = '#f8f3e8';
    rx.beginPath(); rx.arc(R() * W, (1 - rnd(0.05, 0.45)) * H, rnd(0.6, 2.6), 0, 7); rx.fill();
  }
  rx.globalAlpha = 1;

  const baked = cnv(W, H), bx = baked.getContext('2d');
  const g = bx.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0.0, '#a8662f'); g.addColorStop(0.15, '#c98a45'); g.addColorStop(0.28, '#d9a35c');
  g.addColorStop(0.42, '#e3b877'); g.addColorStop(0.55, '#c7945a'); g.addColorStop(0.75, '#7a4a24'); g.addColorStop(1, '#a8662f');
  bx.fillStyle = g; bx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) spot(bx, R() * W, R() * H, rnd(20, 90), rnd(20, 70), R() > 0.5 ? '#e9c07f' : '#b5733a', 0.28, 0.2);
  for (let i = 0; i < 520; i++) {
    const v = Math.min(0.47, Math.max(0.03, 0.22 + (R() + R() + R() - 1.5) * 0.2));
    const big = R() < 0.07;
    const r = big ? rnd(18, 40) : rnd(3, 13);
    const px = R() * W, py = (1 - v) * H;
    spot(bx, px, py, r * 1.9, r * 3.4, '#6e3d1a', 0.45, 0.2);
    spot(bx, px, py, r, r * 1.9, big ? '#120905' : '#1f110a', rnd(0.75, 1), 0.5);
  }
  speckle(bx, W, H, 1600, ['#2a170c'], 0.6, 1.8, 0.5);
  return { raw, baked, mixed: cnv(W, H) };
}
function sauceCanvas(kind) {
  const S = 1024, c = cnv(S, S), x = c.getContext('2d');
  if (kind === 'red') {
    x.fillStyle = '#962515'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 400; i++) spot(x, R() * S, R() * S, rnd(10, 60), rnd(10, 60), R() > 0.5 ? '#b8381d' : '#6e170b', 0.3, 0.2);
    for (let i = 0; i < 80; i++) spot(x, R() * S, R() * S, rnd(6, 20), rnd(6, 20), '#d8642e', 0.25, 0.3);
    speckle(x, S, S, 700, ['#2f3916', '#43501c'], 0.8, 2.2, 0.85);
    speckle(x, S, S, 400, ['#c9561f'], 1, 3, 0.35);
  } else {
    x.fillStyle = '#efe2c4'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 200; i++) spot(x, R() * S, R() * S, rnd(12, 70), rnd(12, 70), R() > 0.4 ? '#dcb862' : '#f7efdc', 0.3, 0.2);
    speckle(x, S, S, 700, ['#2a2420', '#4e4236'], 0.6, 1.7, 0.8);
  }
  return c;
}
function cheeseCanvases() {
  const S = 512;
  const raw = cnv(S, S), rx = raw.getContext('2d');
  rx.fillStyle = '#e4d8bf'; rx.fillRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) spot(rx, R() * S, R() * S, rnd(10, 50), rnd(10, 50), R() > 0.5 ? '#efe6d2' : '#d6c8aa', 0.4, 0.2);
  const baked = cnv(S, S), bx = baked.getContext('2d');
  bx.fillStyle = '#f0dba6'; bx.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) spot(bx, R() * S, R() * S, rnd(12, 60), rnd(12, 60), R() > 0.5 ? '#f8ebc6' : '#e3b862', 0.45, 0.2);
  for (let i = 0; i < 26; i++) { const r = rnd(4, 16); spot(bx, R() * S, R() * S, r * 1.8, r * 1.8, '#b06a24', 0.5, 0.2); spot(bx, R() * S, R() * S, r, r, '#7a3f14', 0.7, 0.4); }
  return { raw, baked, mixed: cnv(S, S) };
}
function tomatoFaceCanvas() {
  const c = cnv(256, 256), x = c.getContext('2d');
  x.fillStyle = '#9e1a10'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 126);
  g.addColorStop(0, '#e98a5f'); g.addColorStop(0.6, '#d4442a'); g.addColorStop(0.86, '#b8231a'); g.addColorStop(1, '#8c150d');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094 + 0.5, cx = 128 + Math.cos(a) * 54, cy = 128 + Math.sin(a) * 54;
    spot(x, cx, cy, 40, 26, 'rgba(240,160,100,0.9)', 0.85, 0.5);
    for (let s = 0; s < 7; s++) { x.fillStyle = '#efd99a'; x.beginPath(); x.ellipse(cx + rnd(-18, 18), cy + rnd(-10, 10), 5, 3, a + rnd(-1, 1), 0, 7); x.fill(); }
  }
  spot(x, 128, 128, 22, 22, '#f2b391', 0.9, 0.5);
  return c;
}
function emberCanvas() {
  const c = cnv(512, 256), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 60; i++) {
    x.strokeStyle = `rgba(255,${(rnd(60, 150)) | 0},20,${rnd(0.5, 1)})`; x.lineWidth = rnd(1, 4);
    let px = R() * 512, py = R() * 256; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 5; k++) { px += rnd(-30, 30); py += rnd(-10, 10); x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}
function firebrickCanvas() {
  const S = 1024, c = cnv(S, S), x = c.getContext('2d');
  x.fillStyle = '#2b1f19'; x.fillRect(0, 0, S, S);
  const bw = 170, bh = 85;
  for (let r = 0; r < S / bh; r++) for (let q = -1; q < S / bw + 1; q++) {
    const ox = (r % 2) * bw / 2, t = rnd(-12, 12);
    x.fillStyle = `rgb(${92 + t},${66 + t},${50 + t})`;
    x.fillRect(q * bw + ox + 3, r * bh + 3, bw - 6, bh - 6);
  }
  for (let i = 0; i < 160; i++) spot(x, R() * S, R() * S, rnd(30, 140), rnd(30, 140), '#0e0907', 0.35, 0.1);
  for (let i = 0; i < 40; i++) spot(x, R() * S, R() * S, rnd(10, 40), rnd(10, 40), '#bfb3a6', 0.18, 0.2);
  speckle(x, S, S, 5000, ['#150d09', '#8a7768'], 0.5, 1.6, 0.5);
  return c;
}
function domeCanvas() {
  const c = cnv(1024, 512), x = c.getContext('2d');
  x.fillStyle = '#2a1d16'; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 300; i++) spot(x, R() * 1024, R() * 512, rnd(20, 90), rnd(20, 90), R() > 0.5 ? '#45302a' : '#0d0806', 0.4, 0.2);
  speckle(x, 1024, 512, 6000, ['#0b0705', '#5d4436'], 0.4, 1.5, 0.5);
  return c;
}
function dotCanvas(inner, outer) {
  const c = cnv(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
}

/* ---------- שיידר אש ---------- */
const fireVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const fireFrag = `
uniform float uTime; uniform float uSeed; uniform float uPower; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
void main(){
  vec2 uv = vUv; float t = uTime * 1.6 + uSeed * 10.;
  vec2 q = vec2(uv.x * 3.0, uv.y * 2.2 - t);
  float d = fbm(q + fbm(q * 1.7 + vec2(0., -t * .5)) * 1.2);
  float shape = smoothstep(0.5, 0.0, abs(uv.x - .5) * (1.3 + uv.y * 1.6));
  float f = shape * (1.15 - uv.y) * d * 2.3 * uPower;
  f = smoothstep(0.18, 1.0, f);
  vec3 col = mix(vec3(.55,.06,0.), vec3(1.,.42,.05), smoothstep(.0,.45,f));
  col = mix(col, vec3(1.,.86,.5), smoothstep(.55,.95,f));
  gl_FragColor = vec4(col * f * 1.6, f);
}`;

/* =========================================================
   יצירת הסצנה
   ========================================================= */
export function createPizzaScene(canvasEl, { fadeEl } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0806);
  scene.fog = new THREE.Fog(0x0b0806, 6.5, 13);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  const BASE_BUILD = { pos: new THREE.Vector3(0.15, 4.5, 2.7), target: new THREE.Vector3(0, -0.05, 0.08) };
  const OV = new THREE.Vector3(40, 0, 0);
  const OVEN_T = OV.clone().add(new THREE.Vector3(0, 0.25, -0.75));
  const OVEN_D = new THREE.Vector3(0.15, 1.75, 3.0);
  const VIEW_OVEN = { get pos() { return OVEN_T.clone().add(OVEN_D.clone().multiplyScalar(Math.min(1.5, distK))); }, get target() { return OVEN_T.clone(); } };
  let distK = 1;
  const VIEW_BUILD = {
    get pos() { return BASE_BUILD.target.clone().add(BASE_BUILD.pos.clone().sub(BASE_BUILD.target).multiplyScalar(distK)); },
    get target() { return BASE_BUILD.target.clone(); }
  };
  camera.position.copy(VIEW_BUILD.pos);

  const controls = new OrbitControls(camera, canvasEl);
  controls.target.copy(VIEW_BUILD.target);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.minPolarAngle = 0.3; controls.maxPolarAngle = 0.95;
  controls.minAzimuthAngle = -0.6; controls.maxAzimuthAngle = 0.6; controls.rotateSpeed = 0.45;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  controls.enabled = !isTouch;

  /* ---------- תאורה ---------- */
  scene.add(new THREE.HemisphereLight(0xffe7cc, 0x140b07, 0.32));
  const key = new THREE.DirectionalLight(0xffe2bf, 2.6);
  key.position.set(-2.6, 5.2, 1.6); key.castShadow = true;
  key.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 14 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const glow = new THREE.PointLight(0xff6a20, 26, 0, 2);
  glow.position.set(2.8, 0.9, -1.8); scene.add(glow);

  /* ---------- שולחן ---------- */
  const table = new THREE.Mesh(new THREE.PlaneGeometry(16, 16),
    std({ map: tex(burntWoodCanvas(), { repeat: [2.2, 2.2] }), roughness: 0.85, bumpMap: tex(noiseCanvas(256, 22, 60, 200), { repeat: [6, 6], srgb: false }), bumpScale: 0.6 }));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
  const flour = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4),
    new THREE.MeshStandardMaterial({ map: tex(flourCanvas()), transparent: true, depthWrite: false, roughness: 1 }));
  flour.rotation.x = -Math.PI / 2; flour.position.y = 0.002; flour.receiveShadow = true; scene.add(flour);

  /* ---------- חומרי הפיצה ---------- */
  const crust = crustCanvases();
  const crustTex = tex(crust.mixed);
  const doughBump = tex(noiseCanvas(256, 9, 40, 220), { srgb: false, repeat: [6, 1] });
  const crustMat = std({ map: crustTex, roughness: 0.82, bumpMap: doughBump, bumpScale: 1.4 });
  const doughRaw = new THREE.Color('#dcc39a'), doughBaked = new THREE.Color('#c99050');
  const baseMat = std({ color: doughRaw.clone(), roughness: 0.9 });
  const sauceTex = { red: tex(sauceCanvas('red')), white: tex(sauceCanvas('white')) };
  const sauceBump = tex(noiseCanvas(256, 12, 80, 190), { srgb: false, repeat: [3, 3] });
  const sauceMat = std({ map: sauceTex.red, roughness: 0.5, bumpMap: sauceBump, bumpScale: 0.8 });
  const cheese = cheeseCanvases();
  const cheeseTex = tex(cheese.mixed, { repeat: [1.4, 1.4] });
  const cheeseMat = std({ map: cheeseTex, roughness: 0.55, bumpMap: tex(noiseCanvas(128, 10, 90, 180), { srgb: false, repeat: [2, 2] }), bumpScale: 0.5 });

  function paintBake(t) {
    let x = crust.mixed.getContext('2d');
    x.globalAlpha = 1; x.drawImage(crust.raw, 0, 0); x.globalAlpha = t; x.drawImage(crust.baked, 0, 0); x.globalAlpha = 1;
    crustTex.needsUpdate = true;
    x = cheese.mixed.getContext('2d');
    x.globalAlpha = 1; x.drawImage(cheese.raw, 0, 0); x.globalAlpha = t; x.drawImage(cheese.baked, 0, 0); x.globalAlpha = 1;
    cheeseTex.needsUpdate = true;
    baseMat.color.copy(doughRaw).lerp(doughBaked, t);
    sauceMat.color.setScalar(1 - 0.18 * t);
    crustMat.bumpScale = 1.4 + t * 1.2;
    if (pizza) pizza.userData.cheese.children.forEach((b) => {
      const s = b.userData.s; if (!s) return;
      b.scale.set(s.x * (1 + 0.3 * t), s.y * (1 - 0.5 * t), s.z * (1 + 0.3 * t));
    });
  }

  /* ---------- גאומטריות פיצה ---------- */
  function noisyShape(r, wob, seed, ox = 0, oy = 0, segs = 64) {
    const s = new THREE.Shape(), ph = [seed * 1.3, seed * 2.7, seed * 0.9];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const k = r * (1 + wob * (Math.sin(a * 2 + ph[0]) * 0.45 + Math.sin(a * 5 + ph[1]) * 0.35 + Math.sin(a * 9 + ph[2]) * 0.2));
      i ? s.lineTo(ox + Math.cos(a) * k, oy + Math.sin(a) * k) : s.moveTo(ox + Math.cos(a) * k, oy + Math.sin(a) * k);
    }
    return s;
  }
  function discGeo(r, wob, seed) {
    const g = new THREE.ShapeGeometry(noisyShape(r, wob, seed, 0, 0, 128), 1);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (r * 2.4) + 0.5, p.getY(i) / (r * 2.4) + 0.5);
    g.rotateX(-Math.PI / 2); return g;
  }
  function rimGeo(seed) {
    const RR = 1.36, r = 0.2;
    const g = new THREE.TorusGeometry(RR, r, 44, 240);
    const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.y, v.x);
      c.set(Math.cos(a) * RR, Math.sin(a) * RR, 0);
      const off = v.clone().sub(c);
      const big = (fbm(Math.cos(a) * 2.2 + seed, Math.sin(a) * 2.2, 0.5) - 0.5) * 0.85;
      const bub = (fbm(v.x * 7, v.y * 7, v.z * 7 + seed) - 0.5) * 0.35;
      off.multiplyScalar(1 + big + bub);
      if (off.z < 0) off.z *= 0.3;
      off.z *= 0.85;
      const wob = 1 + (fbm(Math.cos(a) * 3, Math.sin(a) * 3, seed + 9) - 0.5) * 0.05;
      p.setXYZ(i, c.x * wob + off.x, c.y * wob + off.y, off.z);
    }
    g.computeVertexNormals(); return g;
  }

  /* ---------- תוספות ---------- */
  const G = {}, M = {};
  function jitter(geo, amt) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + rnd(-amt, amt), p.getY(i) + rnd(-amt, amt), p.getZ(i) + rnd(-amt, amt));
    geo.computeVertexNormals(); return geo;
  }
  function initToppings() {
    if (G.ready) return; G.ready = true;
    M.olive = [std({ color: 0x6b7524, roughness: 0.33, envMapIntensity: 0.6 }), std({ color: 0x5c6a1f, roughness: 0.3, envMapIntensity: 0.6 })];
    G.olive = new THREE.TorusGeometry(0.05, 0.025, 14, 30);
    M.kalamata = [std({ color: 0x2f1520, roughness: 0.22, envMapIntensity: 0.8 }), std({ color: 0x3d1d27, roughness: 0.25, envMapIntensity: 0.8 })];
    M.kalaFace = std({ color: 0x6a3b3f, roughness: 0.45 });
    G.kalamata = new THREE.SphereGeometry(0.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    G.kalaFace = new THREE.CircleGeometry(0.06, 24); G.kalaFace.rotateX(-Math.PI / 2);
    M.tuna = [std({ color: 0xc4a68a, roughness: 0.9 }), std({ color: 0xa88468, roughness: 0.9 }), std({ color: 0xd2b9a0, roughness: 0.9 })];
    G.tuna = [0, 1, 2].map(() => jitter(new THREE.IcosahedronGeometry(0.05, 1), 0.012));
    M.onion = std({ color: 0x74284f, roughness: 0.35 });
    M.onionIn = std({ color: 0xd8b4c7, roughness: 0.3, transparent: true, opacity: 0.9 });
    M.tomSide = std({ color: 0xa8170e, roughness: 0.2, envMapIntensity: 0.7 });
    M.tomFace = std({ map: tex(tomatoFaceCanvas()), roughness: 0.28, envMapIntensity: 0.7 });
    G.tomato = new THREE.CylinderGeometry(0.105, 0.095, 0.045, 30);
    M.chili = std({ color: 0x2f6d1b, roughness: 0.28, envMapIntensity: 0.7 });
    M.chiliIn = std({ color: 0x9cc469, roughness: 0.4 });
    M.seed = std({ color: 0xf1e6bf, roughness: 0.5 });
    G.chili = new THREE.TorusGeometry(0.04, 0.011, 10, 26);
    G.chiliIn = new THREE.TorusGeometry(0.03, 0.005, 6, 22);
    G.seed = new THREE.SphereGeometry(0.008, 8, 6);
    M.feta = std({ color: 0xf3f0e7, roughness: 0.95 });
    G.feta = [0, 1, 2].map(() => jitter(new THREE.BoxGeometry(0.075, 0.06, 0.075, 3, 3, 3), 0.007));
    M.garlic = [std({ color: 0xd59a47, roughness: 0.45 }), std({ color: 0xc4843a, roughness: 0.45 })];
    G.garlic = (() => {
      const g = new THREE.SphereGeometry(0.045, 20, 12); g.scale(1.6, 0.75, 0.9);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + Math.pow(p.getX(i) / 0.07, 2) * 0.025);
      g.computeVertexNormals(); return g;
    })();
  }
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
  const pick = (a) => a[(R() * a.length) | 0];

  const TOPPING_COUNT = { greenOlive: 14, kalamata: 10, tuna: 9, onion: 8, tomato: 9, chili: 16, feta: 12, garlic: 9 };
  function makePiece(id) {
    initToppings();
    const g = new THREE.Group();
    switch (id) {
      case 'greenOlive': {
        const m = mesh(G.olive, pick(M.olive)); m.rotation.x = -Math.PI / 2; m.scale.set(rnd(0.9, 1.1), rnd(0.85, 1.05), 0.75); m.position.y = 0.019; g.add(m); break;
      }
      case 'kalamata': {
        if (R() < 0.6) { const m = mesh(G.kalamata, pick(M.kalamata)); m.scale.set(1.55, 0.55, 1); m.position.y = 0.002; g.add(m); }
        else { const m = mesh(G.kalaFace, M.kalaFace); m.scale.set(1.55, 1, 1); m.position.y = 0.012; g.add(m); }
        g.rotation.y = R() * 6; break;
      }
      case 'tuna': {
        const n = 2 + ((R() * 3) | 0);
        for (let i = 0; i < n; i++) { const m = mesh(pick(G.tuna), pick(M.tuna)); m.scale.set(rnd(0.7, 1.2), rnd(0.35, 0.55), rnd(0.6, 1)); m.position.set(rnd(-0.05, 0.05), 0.018, rnd(-0.05, 0.05)); m.rotation.set(rnd(-0.3, 0.3), R() * 6, rnd(-0.3, 0.3)); g.add(m); }
        break;
      }
      case 'onion': {
        const r = rnd(0.07, 0.11), arc = rnd(Math.PI * 1.1, Math.PI * 2);
        const a = mesh(new THREE.TorusGeometry(r, 0.009, 6, 40, arc), M.onion);
        const b = mesh(new THREE.TorusGeometry(r - 0.018, 0.007, 6, 36, arc * rnd(0.6, 1)), M.onionIn);
        for (const m of [a, b]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.01; g.add(m); }
        g.rotation.y = R() * 6; break;
      }
      case 'tomato': { const m = mesh(G.tomato, [M.tomSide, M.tomFace, M.tomSide]); m.position.y = 0.022; m.rotation.y = R() * 6; m.scale.setScalar(rnd(0.85, 1.1)); g.add(m); break; }
      case 'chili': {
        const a = mesh(G.chili, M.chili), b = mesh(G.chiliIn, M.chiliIn);
        for (const m of [a, b]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.scale.set(1, rnd(0.85, 1.1), 0.9); g.add(m); }
        for (let i = 0; i < 2 + ((R() * 3) | 0); i++) { const s = mesh(G.seed, M.seed); s.scale.set(1.3, 0.5, 1); s.position.set(rnd(-0.015, 0.015), 0.006, rnd(-0.015, 0.015)); g.add(s); }
        break;
      }
      case 'feta': {
        const n = 1 + ((R() * 2) | 0);
        for (let i = 0; i < n; i++) { const m = mesh(pick(G.feta), M.feta); m.scale.set(rnd(0.7, 1.1), rnd(0.7, 1), rnd(0.7, 1.1)); m.position.set(rnd(-0.04, 0.04), 0.025, rnd(-0.04, 0.04)); m.rotation.set(rnd(-0.25, 0.25), R() * 6, rnd(-0.25, 0.25)); g.add(m); }
        break;
      }
      case 'garlic': { const m = mesh(G.garlic, pick(M.garlic)); m.position.y = 0.026; m.rotation.y = R() * 6; m.scale.setScalar(rnd(0.85, 1.15)); g.add(m); break; }
      default: { const m = mesh(new THREE.SphereGeometry(0.04), M.seed); m.position.y = 0.03; g.add(m); }
    }
    g.scale.multiplyScalar(1.35);
    return g;
  }

  /* ---------- בניית פיצה ---------- */
  let pizza = null, baseKind = 'red';
  const TOP_Y = 0.07;
  function buildPizza() {
    const p = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(1.36, 1.3, 0.04, 96), baseMat); base.position.y = 0.02;
    const rim = mesh(rimGeo(R() * 10), crustMat); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.075;
    const sauce = mesh(discGeo(1.21, 0.025, R() * 9), sauceMat); sauce.position.y = 0.042; sauce.castShadow = false;
    const ch = new THREE.Group(); ch.position.y = 0.044;
    const toppings = new THREE.Group(); toppings.position.y = TOP_Y;
    p.add(base, rim, sauce, ch, toppings);
    p.userData = { base, rim, sauce, cheese: ch, toppings, pieces: {} };
    return p;
  }
  function addCheese(animated) {
    const ch = pizza.userData.cheese; ch.clear();
    const white = baseKind === 'white';
    const n = white ? 24 : 13;
    const pts = scatter(n, white ? 1.0 : 0.98, [], white ? 0.2 : 0.3);
    pts.forEach((pt, i) => {
      const r = white ? rnd(0.2, 0.32) : rnd(0.16, 0.28);
      const ox = rnd(-2, 2), oy = rnd(-2, 2);
      const geo = new THREE.ExtrudeGeometry(noisyShape(r, 0.18, R() * 20, ox, oy, 40),
        { depth: 0.01, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 5, curveSegments: 40 });
      geo.translate(-ox, -oy, 0); geo.rotateX(-Math.PI / 2);
      const b = mesh(geo, cheeseMat);
      const s = new THREE.Vector3(rnd(0.8, 0.95), rnd(0.6, 0.85), rnd(0.8, 0.95));
      b.scale.copy(s); b.userData.s = s.clone();
      b.position.set(pt.x, 0, pt.z); b.rotation.y = R() * 6;
      ch.add(b);
      if (animated) drop(b, i * 60, 1.1, 0.4);
    });
  }
  function scatter(n, radius, existing, minD) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let best = null, bestD = -1;
      for (let k = 0; k < 30; k++) {
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

  /* ---------- נפילה טבעית (פיזור ביד) ---------- */
  const drops = [];
  let now = 0;
  function drop(obj, delayMs = 0, height = 1.6, bounce = 1) {
    const rest = obj.position.clone(), restQ = obj.quaternion.clone();
    const startQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-1.8, 1.8), rnd(-2, 2), rnd(-1.8, 1.8))).multiply(restQ);
    const off = new THREE.Vector3(rnd(-0.25, 0.25), 0, rnd(-0.25, 0.25));
    obj.visible = false;
    drops.push({ obj, rest, restQ, startQ, off, baseScale: obj.scale.clone(), start: now + delayMs / 1000, dur: (0.7 + rnd(0, 0.2)) / SPEED, h: height + rnd(0, 0.6), bounce });
  }
  function updateDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], p = (now - d.start) / d.dur;
      if (p < 0) continue;
      d.obj.visible = true;
      const q = clamp01(p);
      let y, sq = 0;
      if (q < 0.62) { const f = q / 0.62; y = d.h * (1 - f * f); }
      else if (q < 0.82) { const f = (q - 0.62) / 0.2; y = d.h * 0.018 * d.bounce * 4 * f * (1 - f); sq = Math.max(0, 1 - f * 4); }
      else { y = 0; sq = Math.max(0, 1 - (q - 0.82) * 8) * 0.3; }
      const fall = clamp01(q / 0.62);
      d.obj.position.set(d.rest.x + d.off.x * (1 - fall), d.rest.y + y, d.rest.z + d.off.z * (1 - fall));
      d.obj.quaternion.copy(d.startQ).slerp(d.restQ, easeOut(clamp01(q / 0.7)));
      d.obj.scale.set(d.baseScale.x * (1 + sq * 0.1), d.baseScale.y * (1 - sq * 0.15), d.baseScale.z * (1 + sq * 0.1));
      if (p >= 1) { d.obj.position.copy(d.rest); d.obj.quaternion.copy(d.restQ); d.obj.scale.copy(d.baseScale); drops.splice(i, 1); }
    }
  }

  /* ---------- טוויני אנימציה ---------- */
  const tweens = [];
  const tween = (sec, fn, ease = easeInOut) => new Promise((res) => tweens.push({ t0: null, dur: Math.max(0.01, sec / SPEED), fn, ease, res }));
  const wait = (s) => tween(s, () => {});
  function updateTweens() {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i]; if (t.t0 === null) t.t0 = now;
      const p = clamp01((now - t.t0) / t.dur); t.fn(t.ease(p), p);
      if (p >= 1) { tweens.splice(i, 1); t.res(); }
    }
  }
  function fade(to, sec) {
    if (!fadeEl) return wait(sec);
    fadeEl.style.transition = `opacity ${sec / SPEED}s ease`;
    fadeEl.style.opacity = to;
    return wait(sec);
  }

  /* ---------- קמח ואדים ---------- */
  const puffTex = tex(dotCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
  const puffs = [];
  function flourPuff(center, count = 50, spread = 1.4) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), vel = [];
    for (let i = 0; i < count; i++) {
      const a = R() * 6.28, r = rnd(0.2, spread);
      pos.set([center.x + Math.cos(a) * r * 0.5, center.y + 0.05, center.z + Math.sin(a) * r * 0.5], i * 3);
      vel.push(new THREE.Vector3(Math.cos(a) * rnd(0.2, 0.8), rnd(0.3, 0.9), Math.sin(a) * rnd(0.2, 0.8)));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.05, map: puffTex, transparent: true, depthWrite: false, opacity: 0.6, color: 0xf7f0e2 });
    const pts = new THREE.Points(geo, mat); scene.add(pts);
    puffs.push({ pts, vel, born: now, life: 1.5 });
  }
  const steamTex = tex(dotCanvas('rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'));
  const steams = [];
  function steam() {
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.position.set(rnd(-0.8, 0.8), 0.2, rnd(-0.8, 0.8)); s.scale.setScalar(0.4);
      scene.add(s); steams.push({ s, born: now + i * 0.16, life: 2.8, sx: s.position.x, sw: rnd(0, 6) });
    }
  }

  /* =========================================================
     פנים הטאבון
     ========================================================= */
  const oven = new THREE.Group(); oven.position.copy(OV); scene.add(oven);
  const ovenR = 2.7;
  const floorM = new THREE.Mesh(new THREE.CircleGeometry(ovenR, 64), std({ map: tex(firebrickCanvas()), roughness: 0.95, bumpMap: tex(noiseCanvas(256, 14, 60, 200), { srgb: false, repeat: [3, 3] }), bumpScale: 1 }));
  floorM.rotation.x = -Math.PI / 2; floorM.receiveShadow = true; oven.add(floorM);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(ovenR, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), std({ map: tex(domeCanvas()), roughness: 1, side: THREE.BackSide }));
  oven.add(dome);
  const charMat = std({ color: 0x120a07, roughness: 1, emissive: 0xff5a14, emissiveMap: tex(emberCanvas()), emissiveIntensity: 0.75 });
  [[-0.5, -1.7, 0.4], [0.2, -1.85, -0.3], [0.75, -1.6, 0.15], [-0.1, -1.55, 1.2]].forEach(([x, z, ry], i) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.3, 16), charMat);
    l.rotation.set(0, ry, Math.PI / 2); l.position.set(x, i === 3 ? 0.3 : 0.15, z); oven.add(l);
  });
  const coalMat = std({ color: 0x1a0a04, emissive: 0xff4a10, emissiveIntensity: 2, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.05, 0.11), 0), coalMat);
    c.position.set(rnd(-1.1, 1.1), 0.04, rnd(-2.1, -1.3)); c.rotation.set(R() * 3, R() * 3, R() * 3); oven.add(c);
  }
  const flames = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.ShaderMaterial({
      vertexShader: fireVert, fragmentShader: fireFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSeed: { value: R() * 10 }, uPower: { value: 1 } }
    });
    const w = rnd(0.9, 1.5), h = rnd(1.3, 2.1);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    f.position.set(rnd(-1.0, 1.0), h / 2 - 0.05, rnd(-1.95, -1.45));
    oven.add(f); flames.push(f);
  }
  const fireLight = new THREE.PointLight(0xff7424, 40, 0, 2); fireLight.position.set(0, 0.8, -1.3); oven.add(fireLight);
  const fireLight2 = new THREE.PointLight(0xffa050, 8, 0, 2); fireLight2.position.set(0, 1.8, 0.3); oven.add(fireLight2);
  const EMB = 90, embGeo = new THREE.BufferGeometry(), embPos = new Float32Array(EMB * 3), embData = [];
  for (let i = 0; i < EMB; i++) embData.push({ t: R(), x: rnd(-1, 1), z: rnd(-1.9, -1.2), sp: rnd(0.2, 0.5), sw: rnd(0, 6) });
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  oven.add(new THREE.Points(embGeo, new THREE.PointsMaterial({ size: 0.035, map: tex(dotCanvas('rgba(255,220,150,1)', 'rgba(255,80,0,0)')), color: 0xffa050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

  /* ---------- מרדה מאלומיניום עם ידית עץ ---------- */
  const peel = new THREE.Group();
  {
    const s = new THREE.Shape(); const w = 1.75, h = 1.75, r = 0.5;
    s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2);
    const blade = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), std({ color: 0xb9b6b1, metalness: 0.9, roughness: 0.38, envMapIntensity: 1 }));
    blade.rotation.x = Math.PI / 2; blade.position.y = 0.006;
    const neck = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 16), std({ color: 0xa8a6a2, metalness: 0.9, roughness: 0.35, envMapIntensity: 1 }));
    neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.03, 1.15);
    const handle = mesh(new THREE.CylinderGeometry(0.06, 0.065, 2.0, 18), std({ color: 0xb98a55, roughness: 0.6 }));
    handle.rotation.x = Math.PI / 2; handle.position.set(0, 0.03, 2.4);
    peel.add(blade, neck, handle);
  }
  peel.visible = false; scene.add(peel);

  /* ---------- מצב התחלתי: כדור בצק ---------- */
  const doughBall = mesh(new THREE.SphereGeometry(0.52, 64, 40), std({ color: 0xe6d2ae, roughness: 0.75, bumpMap: tex(noiseCanvas(256, 16, 90, 180), { srgb: false }), bumpScale: 0.8 }));
  doughBall.scale.set(1, 0.72, 1); doughBall.position.y = 0.36; scene.add(doughBall);
  pizza = buildPizza(); pizza.visible = false; scene.add(pizza);
  paintBake(0);

  let state = 'dough';
  let spin = 0;

  async function playIntro(onStep = () => {}) {
    if (state !== 'dough') return;
    state = 'intro';
    onStep('dough');
    await tween(0.65, (t) => { doughBall.position.y = lerp(2.4, 0.36, t * t); }, (t) => t);
    flourPuff(new THREE.Vector3(0, 0, 0), 60, 1.2);
    onStep('stretch');
    for (let k = 0; k < 2; k++) await tween(0.36, (t) => { const s = Math.sin(t * Math.PI); doughBall.scale.set(1 + 0.3 * s, 0.72 - 0.26 * s, 1 + 0.3 * s); doughBall.rotation.y += 0.05; });
    pizza.visible = true; pizza.scale.setScalar(0.001);
    const { sauce, cheese: ch } = pizza.userData; sauce.visible = false; ch.visible = false;
    await tween(1.3, (t) => {
      doughBall.scale.set(1 + 1.6 * t, 0.72 * (1 - t) + 0.06, 1 + 1.6 * t);
      doughBall.position.y = lerp(0.36, 0.03, t); doughBall.rotation.y += 0.04;
      pizza.scale.setScalar(Math.max(0.001, easeOut(clamp01((t - 0.4) / 0.6))));
      if (t > 0.86) doughBall.visible = false;
    });
    doughBall.visible = false;
    flourPuff(new THREE.Vector3(0, 0, 0), 70, 2.2);
    onStep('sauce'); await spreadSauce();
    onStep('cheese'); ch.visible = true; addCheese(true);
    await wait(1.3);
    state = 'build'; onStep('ready');
  }
  async function spreadSauce() {
    const sauce = pizza.userData.sauce; sauce.visible = true; sauce.scale.setScalar(0.001);
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
    if (state === 'dough' || state === 'intro') { sauceMat.map = sauceTex[kind]; sauceMat.needsUpdate = true; return; }
    const sauce = pizza.userData.sauce, ch = pizza.userData.cheese;
    await tween(0.35, (t) => { sauce.scale.setScalar(Math.max(0.001, 1 - t)); ch.scale.setScalar(Math.max(0.001, 1 - t)); });
    sauceMat.map = sauceTex[kind]; sauceMat.needsUpdate = true; ch.scale.setScalar(1);
    await tween(0.8, (t) => { sauce.scale.setScalar(Math.max(0.001, t)); sauce.rotation.y = (1 - t) * 3; }, easeOut);
    addCheese(true);
  }

  function addTopping(id) {
    const ud = pizza.userData; if (ud.pieces[id]) return;
    const existing = [];
    Object.values(ud.pieces).forEach((arr) => arr.forEach((o) => existing.push({ x: o.position.x, z: o.position.z })));
    const pts = scatter(TOPPING_COUNT[id] || 10, 1.06, existing, 0.16);
    const arr = [];
    pts.forEach((pt, i) => {
      const o = makePiece(id); o.position.set(pt.x, 0, pt.z);
      ud.toppings.add(o); arr.push(o); drop(o, i * 40 + rnd(0, 50));
    });
    ud.pieces[id] = arr;
  }
  function removeTopping(id) {
    const ud = pizza.userData, arr = ud.pieces[id]; if (!arr) return;
    delete ud.pieces[id];
    arr.forEach((o, i) => {
      for (let k = drops.length - 1; k >= 0; k--) if (drops[k].obj === o) drops.splice(k, 1);
      const y0 = o.position.y, s0 = o.scale.clone(), x0 = o.position.x, z0 = o.position.z;
      setTimeout(() => tween(0.35, (t) => {
        o.position.set(x0, y0 + Math.sin(t * Math.PI) * 0.35 + t * 0.15, z0);
        o.scale.copy(s0).multiplyScalar(Math.max(0.001, 1 - t)); o.rotation.x += 0.1;
      }, (t) => t).then(() => ud.toppings.remove(o)), i * 18);
    });
  }
  function setToppings(ids) {
    if (state !== 'build') return;
    const cur = Object.keys(pizza.userData.pieces);
    cur.filter((id) => !ids.includes(id)).forEach(removeTopping);
    ids.filter((id) => !cur.includes(id)).forEach(addTopping);
  }

  function setView(v) { camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); }
  const peelUnder = () => { peel.position.set(pizza.position.x, pizza.position.y - 0.012, pizza.position.z); };

  async function bake(onStage = () => {}) {
    if (state !== 'build') return;
    state = 'oven'; controls.enabled = false;
    while (drops.length) await wait(0.1);
    const homeRot = pizza.rotation.y;
    onStage('peel');
    peel.visible = true; peel.rotation.y = 0; peel.position.set(0, 0.006, 5);
    await tween(0.5, (t) => { pizza.position.y = 0.02 * t; });
    await tween(0.8, (t) => { peel.position.z = lerp(5, 0, t); }, easeOut);
    onStage('in');
    const p0 = pizza.position.clone();
    const away = tween(1.3, (t) => {
      pizza.position.set(p0.x, p0.y + Math.sin(t * Math.PI) * 0.25, lerp(p0.z, -5.5, t)); peelUnder();
    }, easeIn);
    await wait(0.6); await fade(1, 0.6); await away;
    peel.visible = false;
    pizza.position.copy(OV).add(new THREE.Vector3(0, 0.005, 0.15));
    setView(VIEW_OVEN);
    onStage('baking');
    await fade(0, 0.6);
    await tween(4.2, (t, raw) => {
      paintBake(raw);
      pizza.rotation.y = homeRot + easeInOut(clamp01((raw - 0.45) / 0.2)) * Math.PI * 0.5;
      onStage('bakeProgress', raw);
    }, (t) => t);
    onStage('out');
    await fade(1, 0.5);
    setView(VIEW_BUILD);
    pizza.position.set(0, 0.25, -5.5); peel.visible = true; peelUnder();
    await fade(0, 0.5);
    await tween(1.2, (t) => { pizza.position.set(0, lerp(0.25, 0.02, t), lerp(-5.5, 0, t)); peelUnder(); }, easeOut);
    await tween(0.7, (t) => { peel.position.z = lerp(0, 5, t); }, easeIn);
    peel.visible = false;
    await tween(0.25, (t) => { pizza.position.y = 0.02 * (1 - t); });
    steam();
    spin = pizza.rotation.y;
    controls.enabled = !isTouch;
    state = 'baked'; onStage('done');
  }

  function snapshot(size = 320) {
    renderer.render(scene, camera);
    const src = renderer.domElement, c = cnv(size, size), x = c.getContext('2d');
    const s = Math.min(src.width, src.height) * 0.86;
    x.drawImage(src, (src.width - s) / 2, src.height * 0.5 - s / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.85);
  }

  async function newPizza() {
    const old = pizza; state = 'intro';
    await tween(0.8, (t) => { old.position.x = lerp(0, -6, t); }, easeIn);
    scene.remove(old);
    pizza = buildPizza(); paintBake(0);
    pizza.position.x = 6; scene.add(pizza);
    pizza.userData.sauce.visible = false;
    await tween(0.8, (t) => { pizza.position.x = lerp(6, 0, t); }, easeOut);
    flourPuff(new THREE.Vector3(0, 0, 0), 50, 2);
    await spreadSauce(); addCheese(true);
    await wait(1); state = 'build';
  }

  /* ---------- לולאה ---------- */
  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvasEl);
  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    distK = Math.min(2.1, Math.max(1, 1.1 / camera.aspect));
    camera.updateProjectionMatrix();
    if (state !== 'oven') setView(VIEW_BUILD);
  }
  new ResizeObserver(resize).observe(canvasEl); resize();

  const tmp = new THREE.Vector3(), fp = new THREE.Vector3();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    now += dt;
    if (!visible) return;
    updateTweens(); updateDrops();
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i], age = now - p.born, a = p.pts.geometry.attributes.position;
      for (let k = 0; k < p.vel.length; k++) {
        const v = p.vel[k]; v.y -= dt * 1.0; v.multiplyScalar(1 - dt * 1.8);
        a.setXYZ(k, a.getX(k) + v.x * dt, Math.max(0.01, a.getY(k) + v.y * dt), a.getZ(k) + v.z * dt);
      }
      a.needsUpdate = true; p.pts.material.opacity = 0.6 * (1 - age / p.life);
      if (age > p.life) { scene.remove(p.pts); p.pts.geometry.dispose(); p.pts.material.dispose(); puffs.splice(i, 1); }
    }
    for (let i = steams.length - 1; i >= 0; i--) {
      const st = steams[i], age = now - st.born; if (age < 0) continue;
      const f = age / st.life;
      st.s.position.y = 0.2 + f * 1.6; st.s.position.x = st.sx + Math.sin(age * 2 + st.sw) * 0.12;
      st.s.scale.setScalar(0.4 + f * 1.2); st.s.material.opacity = Math.sin(Math.PI * f) * 0.35;
      if (f >= 1) { scene.remove(st.s); st.s.material.dispose(); steams.splice(i, 1); }
    }
    if (state === 'oven') {
      const ea = embGeo.attributes.position;
      for (let i = 0; i < EMB; i++) {
        const e = embData[i]; e.t += dt * e.sp; if (e.t > 1) { e.t = 0; e.x = rnd(-1, 1); }
        ea.setXYZ(i, e.x + Math.sin(e.t * 5 + e.sw) * 0.15, 0.1 + e.t * 2.4, e.z + e.t * 0.8);
      }
      ea.needsUpdate = true;
      camera.getWorldPosition(tmp);
      flames.forEach((f) => { f.material.uniforms.uTime.value = now; f.getWorldPosition(fp); f.lookAt(tmp.x, fp.y, tmp.z); });
      fireLight.intensity = 40 * (0.8 + 0.2 * Math.sin(now * 11) * Math.sin(now * 6.7) + 0.1 * Math.sin(now * 23));
    }
    if (state === 'build' || state === 'baked' || state === 'dough') {
      spin += dt * 0.08 * SPEED;
      if (pizza) pizza.rotation.y = spin;
    }
    glow.intensity = 26 * (0.85 + 0.1 * Math.sin(now * 3.1) + 0.05 * Math.sin(now * 11.3));
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    playIntro, skipIntro, setBase, setToppings, bake, newPizza, snapshot,
    get state() { return state; }
  };
}
