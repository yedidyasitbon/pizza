/* =========================================================
   סצנה תלת־ממדית: שולחן עץ חרוך, הכנת הפיצה (מצקת, גבינה,
   תוספות, שמן זית), וטאבון עצים עם אש אמיתית
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
const R = mulberry32(20261116);
const rnd = (a, b) => a + R() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

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
    const v = lo + (hi - lo) * fbm(i / scale, j / scale, 3.7) + (R() - 0.5) * 18;
    const k = (j * size + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}
function std(p) { const m = new THREE.MeshStandardMaterial(p); m.envMapIntensity = p.envMapIntensity ?? 0.35; return m; }
function ringShape(ro, ri, wob = 0, seed = 0) {
  const s = new THREE.Shape(), h = new THREE.Path(), n = 40;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, k = 1 + wob * Math.sin(a * 3 + seed) + wob * 0.5 * Math.sin(a * 5 + seed * 2);
    const x = Math.cos(a) * ro * k, y = Math.sin(a) * ro * k;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  for (let i = 0; i <= n; i++) {
    const a = -(i / n) * Math.PI * 2, k = 1 + wob * Math.sin(a * 2 + seed);
    const x = Math.cos(a) * ri * k, y = Math.sin(a) * ri * k;
    i ? h.lineTo(x, y) : h.moveTo(x, y);
  }
  s.holes.push(h); return s;
}

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
    x.fillStyle = '#070403'; x.fillRect(0, y0, W, 3);
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
    const big = R() < 0.07, r = big ? rnd(18, 40) : rnd(3, 13);
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
  } else {
    x.fillStyle = '#efe2c4'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 200; i++) spot(x, R() * S, R() * S, rnd(12, 70), rnd(12, 70), R() > 0.4 ? '#dcb862' : '#f7efdc', 0.3, 0.2);
    speckle(x, S, S, 700, ['#2a2420', '#4e4236'], 0.6, 1.7, 0.8);
  }
  return c;
}
function meltCanvas() {
  const S = 1024, c = cnv(S, S), x = c.getContext('2d');
  x.fillStyle = '#efc767'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 380; i++) spot(x, R() * S, R() * S, rnd(14, 70), rnd(14, 70), R() > 0.5 ? '#f7dc8e' : '#e2a744', 0.4, 0.2);
  for (let i = 0; i < 140; i++) { const r = rnd(5, 22), px = R() * S, py = R() * S; spot(x, px, py, r * 1.8, r * 1.8, '#c07a2a', 0.5, 0.2); spot(x, px, py, r, r, '#8a4a18', 0.65, 0.45); }
  // שוליים שקופים — הגבינה נגמרת לפני הקרום
  const g = x.createRadialGradient(512, 512, 330, 512, 512, 512);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = g; x.fillRect(0, 0, S, S);
  return c;
}
function tomatoFaceCanvas() {
  const S = 256, c = cnv(S, S), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, '#f4a07a'); g.addColorStop(0.35, '#ee6a44'); g.addColorStop(0.8, '#e2472b'); g.addColorStop(0.93, '#d23a22'); g.addColorStop(1, '#b52815');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const n = 3 + ((R() * 2) | 0);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.3, cx = 128 + Math.cos(a) * 56, cy = 128 + Math.sin(a) * 56;
    spot(x, cx, cy, 44, 28, 'rgba(246,150,90,0.95)', 0.9, 0.55);           // ג'ל
    for (let s = 0; s < 9; s++) {                                           // גרעינים צהובים
      x.fillStyle = '#f2d36b'; x.beginPath();
      x.ellipse(cx + rnd(-24, 24) * Math.abs(Math.sin(a + 1.57)) + rnd(-8, 8), cy + rnd(-12, 12), 4.5, 3, a + rnd(-0.6, 0.6), 0, 7); x.fill();
    }
  }
  x.strokeStyle = 'rgba(255,235,215,0.75)'; x.lineWidth = 3.5;                // קווי הכוכב הלבנים
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.3 + Math.PI / n;
    x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); x.stroke();
  }
  spot(x, 128, 128, 18, 18, 'rgba(255,225,200,0.9)', 0.9, 0.5);
  return c;
}
function garlicCanvas() {
  const c = cnv(256, 128), x = c.getContext('2d');
  x.fillStyle = '#f1dcb6'; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 22; i++) spot(x, R() * 256, R() * 128, rnd(14, 46), rnd(10, 30), R() > 0.4 ? '#b8783a' : '#8f5424', rnd(0.35, 0.7), 0.25);
  for (let i = 0; i < 20; i++) spot(x, R() * 256, R() * 128, rnd(6, 16), rnd(6, 16), '#fff6e2', 0.35, 0.3);
  return c;
}
function kalaFaceCanvas() {
  const c = cnv(256, 128), x = c.getContext('2d');
  x.fillStyle = '#6f3b31'; x.fillRect(0, 0, 256, 128);
  spot(x, 128, 64, 120, 54, '#86503f', 0.8, 0.4);
  x.fillStyle = '#2e1310'; x.beginPath(); x.ellipse(128, 64, 70, 13, 0, 0, 7); x.fill();
  return c;
}
function tunaCanvas() {
  const c = cnv(256, 256), x = c.getContext('2d');
  x.fillStyle = '#efd9c9'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = R() > 0.5 ? 'rgba(200,155,135,0.4)' : 'rgba(255,240,230,0.55)'; x.lineWidth = rnd(1, 3);
    const y = R() * 256; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + rnd(-10, 10), 170, y + rnd(-10, 10), 256, y + rnd(-6, 6)); x.stroke();
  }
  return c;
}
function emberCanvas() {
  const c = cnv(512, 256), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = `rgba(255,${(rnd(60, 140)) | 0},20,${rnd(0.4, 0.9)})`; x.lineWidth = rnd(0.8, 2.2);
    let px = R() * 512, py = R() * 256; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 4; k++) { px += rnd(-30, 30); py += rnd(-8, 8); x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}
function brickCanvas(colors, mortar, bw = 128, bh = 52, w = 1024, h = 512) {
  const c = cnv(w, h), x = c.getContext('2d');
  x.fillStyle = mortar; x.fillRect(0, 0, w, h);
  for (let r = 0; r * bh < h; r++) for (let q = -1; q * bw < w + bw; q++) {
    const ox = (r % 2) * bw / 2, col = colors[(R() * colors.length) | 0];
    x.fillStyle = col; x.fillRect(q * bw + ox + 4, r * bh + 4, bw - 8, bh - 8);
    spot(x, q * bw + ox + bw / 2, r * bh + bh / 2, bw * 0.45, bh * 0.4, 'rgba(0,0,0,1)', 0.08, 0.2);
  }
  speckle(x, w, h, 4000, ['rgba(0,0,0,0.6)', 'rgba(255,255,255,0.4)'], 0.4, 1.3, 0.25);
  return c;
}
function plasterCanvas() {
  const c = cnv(1024, 512), x = c.getContext('2d');
  x.fillStyle = '#e7e4de'; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 200; i++) spot(x, R() * 1024, R() * 512, rnd(20, 90), rnd(20, 90), R() > 0.5 ? '#f3f1ec' : '#d6d1c8', 0.35, 0.2);
  speckle(x, 1024, 512, 5000, ['#c9c3b8', '#ffffff'], 0.4, 1.2, 0.4);
  return c;
}
function firebrickCanvas() {
  const S = 1024, c = cnv(S, S), x = c.getContext('2d');
  x.fillStyle = '#2b1f19'; x.fillRect(0, 0, S, S);
  const bw = 170, bh = 85;
  for (let r = 0; r < S / bh; r++) for (let q = -1; q < S / bw + 1; q++) {
    const ox = (r % 2) * bw / 2, t = rnd(-12, 12);
    x.fillStyle = `rgb(${110 + t},${78 + t},${58 + t})`;
    x.fillRect(q * bw + ox + 3, r * bh + 3, bw - 6, bh - 6);
  }
  for (let i = 0; i < 160; i++) spot(x, R() * S, R() * S, rnd(30, 140), rnd(30, 140), '#0e0907', 0.3, 0.1);
  for (let i = 0; i < 40; i++) spot(x, R() * S, R() * S, rnd(10, 40), rnd(10, 40), '#bfb3a6', 0.18, 0.2);
  speckle(x, S, S, 5000, ['#150d09', '#8a7768'], 0.5, 1.6, 0.5);
  return c;
}
function sootCanvas() {
  const c = cnv(1024, 512), x = c.getContext('2d');
  x.fillStyle = '#3a2a22'; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 300; i++) spot(x, R() * 1024, R() * 512, rnd(20, 90), rnd(20, 90), R() > 0.5 ? '#5a4234' : '#120b08', 0.4, 0.2);
  speckle(x, 1024, 512, 6000, ['#0b0705', '#6d5444'], 0.4, 1.5, 0.5);
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
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0806);
  scene.fog = new THREE.Fog(0x0b0806, 6.5, 13);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 120);
  const OV = V(60, 0, 0);                 // מיקום הטאבון בעולם
  const ov = (x, y, z) => OV.clone().add(V(x, y, z));
  let distK = 1;
  const mkView = (pos, target, kMax = 2.1) => ({
    get pos() { const t = target.clone(); return t.add(pos.clone().sub(target).multiplyScalar(Math.min(kMax, distK))); },
    get target() { return target.clone(); }
  });
  const VIEW_BUILD = mkView(V(0.15, 4.5, 2.7), V(0, -0.05, 0.08));
  const VIEW_OVEN_WIDE = mkView(ov(3.2, 4.6, 14), ov(0, 1.4, -1.5), 1.5);
  const VIEW_OVEN_IN = mkView(ov(0.35, 1.6, 4.6), ov(0, 0.75, -4.4), 1.6);
  const VIEW_OVEN_CLOSE = mkView(ov(0.15, 1.45, 3.2), ov(0, 0.6, -4.4), 1.6);
  const VIEW_OVEN_OUT = mkView(ov(3.6, 4.6, 15.5), ov(0, 0.9, 2.6), 1.5);
  const VIEW_OIL = mkView(V(1.6, 3.2, 3.6), V(0, 0.05, 0));
  const VIEW_AWAY = mkView(V(0.6, 2.4, 2.2), V(0, 0.1, -3.5));
  const VIEW_BOX = mkView(V(1.3, 5.6, 6.6), V(0, 0.45, -0.7));
  const VIEW_BOX_FAR = mkView(V(2.6, 8.2, 9.8), V(0, 0.5, -0.7));
  let viewNow = VIEW_BUILD;
  camera.position.copy(VIEW_BUILD.pos);

  const controls = new OrbitControls(camera, canvasEl);
  controls.target.copy(VIEW_BUILD.target);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
  controls.minPolarAngle = 0.3; controls.maxPolarAngle = 0.95;
  controls.minAzimuthAngle = -0.6; controls.maxAzimuthAngle = 0.6; controls.rotateSpeed = 0.45;
  const limits = (on) => Object.assign(controls, on
    ? { minPolarAngle: 0.3, maxPolarAngle: 0.95, minAzimuthAngle: -0.6, maxAzimuthAngle: 0.6 }
    : { minPolarAngle: 0, maxPolarAngle: Math.PI, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity });
  const isTouch = matchMedia('(pointer: coarse)').matches;
  controls.enabled = true;
  // בטלפון: גרירה לצדדים מסובבת את הפיצה, גרירה למעלה/למטה עדיין גוללת את הדף
  if (isTouch) { canvasEl.style.touchAction = 'pan-y'; controls.rotateSpeed = 0.8; }

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
  const crustMat = std({ map: crustTex, roughness: 0.82, bumpMap: tex(noiseCanvas(256, 9, 40, 220), { srgb: false, repeat: [6, 1] }), bumpScale: 1.4 });
  const doughRaw = new THREE.Color('#dcc39a'), doughBaked = new THREE.Color('#c99050');
  const baseMat = std({ color: doughRaw.clone(), roughness: 0.9 });
  const sauceTex = { red: tex(sauceCanvas('red')), white: tex(sauceCanvas('white')) };
  const sauceMat = std({ map: sauceTex.red, roughness: 0.5, bumpMap: tex(noiseCanvas(256, 12, 80, 190), { srgb: false, repeat: [3, 3] }), bumpScale: 0.8 });
  // גבינה צהובה מגוררת + שכבה נמסה
  const SHRED_RAW = new THREE.Color('#ffffff'), SHRED_BAKED = new THREE.Color('#f2c565');
  const shredMat = std({ color: SHRED_RAW.clone(), roughness: 0.55 });
  const shredGeo = new THREE.CapsuleGeometry(0.012, 0.09, 2, 6); shredGeo.scale(1, 1, 0.6);
  const meltBump = tex(noiseCanvas(256, 7, 60, 210), { srgb: false, repeat: [2, 2] });
  const meltMat = std({ map: tex(meltCanvas()), bumpMap: meltBump, bumpScale: 1.2, transparent: true, opacity: 0, roughness: 0.32, envMapIntensity: 0.7, depthWrite: false });

  function paintBake(t) {
    const x = crust.mixed.getContext('2d');
    x.globalAlpha = 1; x.drawImage(crust.raw, 0, 0); x.globalAlpha = t; x.drawImage(crust.baked, 0, 0); x.globalAlpha = 1;
    crustTex.needsUpdate = true;
    baseMat.color.copy(doughRaw).lerp(doughBaked, t);
    sauceMat.color.setScalar(1 - 0.18 * t);
    crustMat.bumpScale = 1.4 + t * 1.2;
    shredMat.color.copy(SHRED_RAW).lerp(SHRED_BAKED, t);
    meltMat.opacity = Math.min(0.97, t * 1.3);
    if (pizza) { pizza.userData.cheese.scale.y = 1 - 0.7 * t; pizza.userData.toppings.scale.y = 1 - 0.18 * t; }
    if (G.ready) for (const [m, to, r] of bakeList()) {
      if (!m.userData.c0) m.userData.c0 = m.color.clone(), m.userData.r0 = m.roughness;
      m.color.copy(m.userData.c0).lerp(to, t);
      if (r !== undefined) m.roughness = lerp(m.userData.r0, r, t);
    }
  }
  let _bl = null;
  function bakeList() {
    if (_bl) return _bl;
    const C = (h) => new THREE.Color(h);
    _bl = [
      [M.tomSkin, C('#7e1a0e'), 0.3], ...M.tomFace.map((m) => [m, C('#c9806a'), 0.3]),
      ...M.olive.map((m) => [m, m.color.clone().multiplyScalar(0.72).lerp(C('#6b5a1e'), 0.3)]),
      ...M.kala.map((m) => [m, m.color.clone().multiplyScalar(0.8)]),
      ...M.tuna.map((m) => [m, C('#d6a07a'), 0.6]),
      [M.onionSkin, C('#4f1d3c')], [M.onionFlesh, C('#d9a57a')],
      ...M.chili.map((m) => [m, C('#4c7d26'), 0.35]),
      [M.feta, C('#f0d7a4'), 0.5],
      ...M.garlic.map((m) => [m, C('#b9783a')])
    ];
    return _bl;
  }

  /* ---------- גאומטריות פיצה ---------- */
  function noisyShape(r, wob, seed, segs = 64) {
    const s = new THREE.Shape(), ph = [seed * 1.3, seed * 2.7, seed * 0.9];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const k = r * (1 + wob * (Math.sin(a * 2 + ph[0]) * 0.45 + Math.sin(a * 5 + ph[1]) * 0.35 + Math.sin(a * 9 + ph[2]) * 0.2));
      i ? s.lineTo(Math.cos(a) * k, Math.sin(a) * k) : s.moveTo(Math.cos(a) * k, Math.sin(a) * k);
    }
    return s;
  }
  function discGeo(r, wob, seed) {
    const g = new THREE.ShapeGeometry(noisyShape(r, wob, seed, 128), 1);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (r * 2.1) + 0.5, p.getY(i) / (r * 2.1) + 0.5);
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

  /* ---------- תוספות — לפי התמונות ---------- */
  const G = {}, M = {};
  function initToppings() {
    if (G.ready) return; G.ready = true;
    // עגבניות שרי חצויות: כיפה אדומה מבריקה + פנים עם גרעינים
    M.tomSkin = std({ color: 0xc8261a, roughness: 0.16, envMapIntensity: 0.9 });
    M.tomFace = [0, 1, 2].map(() => std({ map: tex(tomatoFaceCanvas()), roughness: 0.22, envMapIntensity: 0.8 }));
    G.tomDome = new THREE.SphereGeometry(0.11, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    G.tomFace = new THREE.CircleGeometry(0.108, 32); G.tomFace.rotateX(-Math.PI / 2);
    // זיתים ירוקים: טבעות עבות בצבע ירוק־צהבהב
    M.olive = [std({ color: 0xa59b35, roughness: 0.38, envMapIntensity: 0.6 }), std({ color: 0x9a8f2c, roughness: 0.38, envMapIntensity: 0.6 }), std({ color: 0xb0a443, roughness: 0.4, envMapIntensity: 0.6 })];
    G.olive = [0, 1, 2].map((k) => { const g = new THREE.ExtrudeGeometry(ringShape(0.058, 0.026, 0.04, k * 2), { depth: 0.032, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3, curveSegments: 24 }); g.rotateX(-Math.PI / 2); return g; });
    // קלמטה: חצי זית מוארך, חום־בורדו מבריק
    M.kala = [std({ color: 0x5a2622, roughness: 0.16, envMapIntensity: 1 }), std({ color: 0x4a1d20, roughness: 0.18, envMapIntensity: 1 }), std({ color: 0x6a332b, roughness: 0.17, envMapIntensity: 1 })];
    M.kalaFace = std({ map: tex(kalaFaceCanvas()), roughness: 0.4 });
    G.kala = new THREE.SphereGeometry(0.06, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    G.kalaFace = new THREE.CircleGeometry(0.06, 28); G.kalaFace.rotateX(-Math.PI / 2);
    // טונה: פתיתים שכבתיים ורודים־בז'
    const tunaTex = tex(tunaCanvas());
    M.tuna = ['#f3ddcf', '#ead0be', '#f7e6da'].map((c) => std({ color: c, map: tunaTex, roughness: 0.82 }));
    G.tuna = [0, 1, 2, 3].map((k) => { const g = new THREE.ExtrudeGeometry(noisyShape(rnd(0.035, 0.055), 0.4, k * 3 + 1, 18), { depth: 0.008, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.004, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.scale(1.4, 1, 0.8); return g; });
    // בצל סגול: טבעות שלמות, קליפה סגולה ובשר לבן
    M.onionSkin = std({ color: 0x8a2f6c, roughness: 0.3, envMapIntensity: 0.6 });
    M.onionFlesh = std({ color: 0xefe3ec, roughness: 0.3, envMapIntensity: 0.6, transparent: true, opacity: 0.92 });
    // פלפל חריף: טבעות דקות ירוקות בהירות עם גרעינים
    M.chili = [std({ color: 0x74bd3c, roughness: 0.24, envMapIntensity: 0.8 }), std({ color: 0x62ab2e, roughness: 0.24, envMapIntensity: 0.8 })];
    M.seed = std({ color: 0xf2ecd2, roughness: 0.5 });
    G.chili = [0, 1, 2].map((k) => { const g = new THREE.ExtrudeGeometry(ringShape(0.048, 0.038, 0.06, k * 5), { depth: 0.022, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 20 }); g.rotateX(-Math.PI / 2); return g; });
    G.seed = new THREE.CircleGeometry(0.009, 10); G.seed.rotateX(-Math.PI / 2);
    // בולגרית: קוביות לבנות חלקות
    M.feta = std({ color: 0xf7f5ef, roughness: 0.6 });
    { const s = new THREE.Shape(); const a = 0.034, r = 0.008;
      s.moveTo(-a + r, -a); s.lineTo(a - r, -a); s.quadraticCurveTo(a, -a, a, -a + r); s.lineTo(a, a - r); s.quadraticCurveTo(a, a, a - r, a);
      s.lineTo(-a + r, a); s.quadraticCurveTo(-a, a, -a, a - r); s.lineTo(-a, -a + r); s.quadraticCurveTo(-a, -a, -a + r, -a);
      G.feta = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
      G.feta.translate(0, 0, -0.025); }
    // שום קונפי: שיניים שלמות, שמנתי־זהוב ומבריק משמן
    const gTex = [0, 1, 2].map(() => tex(garlicCanvas()));
    M.garlic = ['#c98a45', '#bd7c3a', '#d39a55'].map((c, i) => { const m = new THREE.MeshPhysicalMaterial({ color: c, map: gTex[i], roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }); m.envMapIntensity = 1.1; return m; });
    G.garlic = (() => {
      const g = new THREE.SphereGeometry(0.05, 26, 16); g.scale(1.75, 0.72, 0.95);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), u = x / 0.0875;                       // -1..1 לאורך
        const taper = u > 0 ? 1 - u * u * 0.55 : 1 - u * u * 0.15;   // קצה מחודד
        p.setY(i, p.getY(i) * taper); p.setZ(i, p.getZ(i) * taper + u * u * 0.03); // קימור
      }
      g.computeVertexNormals(); return g;
    })();
  }
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
  const pick = (a) => a[(R() * a.length) | 0];

  const TOPPING_COUNT = { greenOlive: 16, kalamata: 12, tuna: 26, onion: 11, tomato: 11, chili: 22, feta: 16, garlic: 12 };
  function makePiece(id) {
    initToppings();
    const g = new THREE.Group();
    switch (id) {
      case 'tomato': {
        const d = mesh(G.tomDome, M.tomSkin); d.scale.y = 0.42; const f = mesh(G.tomFace, pick(M.tomFace));
        const s = rnd(0.85, 1.15); g.add(d, f); g.scale.setScalar(s); g.position.y = 0.045; g.rotation.y = R() * 6; break;
      }
      case 'greenOlive': { const m = mesh(pick(G.olive), pick(M.olive)); m.position.y = 0.008; m.rotation.y = R() * 6; m.scale.setScalar(rnd(0.9, 1.1)); g.add(m); break; }
      case 'kalamata': {
        if (R() < 0.55) { const m = mesh(G.kala, pick(M.kala)); m.scale.set(1.65, 0.62, 1); g.add(m); }
        else { const m = mesh(G.kala, pick(M.kala)); m.scale.set(1.65, -0.25, 1); m.position.y = 0.02; const f = mesh(G.kalaFace, M.kalaFace); f.scale.set(1.65, 1, 1); f.position.y = 0.021; g.add(m, f); }
        g.rotation.y = R() * 6; break;
      }
      case 'tuna': {
        const n = 4 + ((R() * 4) | 0);
        for (let i = 0; i < n; i++) {
          const m = mesh(pick(G.tuna), pick(M.tuna));
          m.position.set(rnd(-0.06, 0.06), 0.008 + i * 0.009, rnd(-0.06, 0.06));
          m.rotation.set(rnd(-0.35, 0.35), R() * 6, rnd(-0.35, 0.35)); m.scale.setScalar(rnd(0.8, 1.25)); g.add(m);
        }
        break;
      }
      case 'onion': {
        const rings = 1 + ((R() * 2.2) | 0); let r = rnd(0.07, 0.12);
        for (let k = 0; k < rings; k++) {
          const arc = R() < 0.75 ? Math.PI * 2 : rnd(Math.PI * 1.1, Math.PI * 1.8);
          const skin = mesh(new THREE.TorusGeometry(r, 0.006, 6, 48, arc), M.onionSkin);
          const flesh = mesh(new THREE.TorusGeometry(r - 0.011, 0.009, 6, 48, arc), M.onionFlesh);
          for (const m of [skin, flesh]) { m.rotation.x = -Math.PI / 2; m.scale.z = 1.4; m.position.y = 0.012; g.add(m); }
          r -= 0.03; if (r < 0.04) break;
        }
        g.rotation.y = R() * 6; break;
      }
      case 'chili': {
        const m = mesh(pick(G.chili), pick(M.chili)); m.position.y = 0.004; g.add(m);
        for (let i = 0; i < (R() * 3) | 0; i++) { const s = mesh(G.seed, M.seed); s.scale.set(1.3, 1, 1); s.position.set(rnd(-0.018, 0.018), 0.012, rnd(-0.018, 0.018)); g.add(s); }
        g.rotation.y = R() * 6; g.scale.setScalar(rnd(0.85, 1.15)); break;
      }
      case 'feta': {
        const m = mesh(G.feta, M.feta); m.rotation.set(rnd(-0.15, 0.15), R() * 6, rnd(-0.15, 0.15)); m.position.y = 0.036;
        m.scale.setScalar(rnd(0.9, 1.15)); g.add(m); break;
      }
      case 'garlic': { const m = mesh(G.garlic, pick(M.garlic)); m.position.y = 0.032; m.rotation.set(0, R() * 6, rnd(-0.15, 0.15)); m.scale.setScalar(rnd(0.9, 1.2)); g.add(m); break; }
      default: { const m = mesh(new THREE.SphereGeometry(0.04), M.seed); m.position.y = 0.03; g.add(m); }
    }
    const outer = new THREE.Group(); outer.add(g); outer.scale.setScalar(1.3);
    return outer;
  }

  /* ---------- בניית פיצה ---------- */
  let pizza = null, baseKind = 'red';
  const TOP_Y = 0.105;
  function buildPizza() {
    const p = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(1.36, 1.3, 0.04, 96), baseMat); base.position.y = 0.02;
    const rim = mesh(rimGeo(R() * 10), crustMat); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.075;
    const sauce = mesh(discGeo(1.21, 0.025, R() * 9), sauceMat); sauce.position.y = 0.042; sauce.castShadow = false;
    const cheese = new THREE.Group(); cheese.position.y = 0.046;
    const melt = new THREE.Mesh(discGeo(1.2, 0.03, R() * 9), meltMat); melt.position.y = 0.07; melt.receiveShadow = true;
    const toppings = new THREE.Group(); toppings.position.y = TOP_Y;
    const oil = new THREE.Group(); oil.position.y = TOP_Y + 0.02;
    p.add(base, rim, sauce, cheese, melt, toppings, oil);
    p.userData = { base, rim, sauce, cheese, melt, toppings, oil, pieces: {} };
    return p;
  }

  /* גבינה צהובה מגוררת שנופלת כגשם — המון */
  let rain = null;
  function addCheese(animated) {
    const ud = pizza.userData;
    ud.cheese.clear();
    const N = baseKind === 'white' ? 2600 : 2200;
    const im = new THREE.InstancedMesh(shredGeo, shredMat, N);
    im.castShadow = true; im.receiveShadow = true;
    const data = [];
    for (let i = 0; i < N; i++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 1.16;
      data.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: rnd(0.005, 0.045), ry: R() * 6, rz: Math.PI / 2 + rnd(-0.25, 0.25), s: rnd(0.75, 1.3), d: R() * 1.1, h: rnd(1.2, 2.2) });
    }
    const sc = ['#f6d77e', '#f2cc68', '#f8de92', '#eec25c', '#f9e3a0'].map((h) => new THREE.Color(h));
    for (let i = 0; i < N; i++) im.setColorAt(i, sc[(R() * sc.length) | 0]);
    ud.cheese.add(im);
    rain = { im, data, start: now, done: !animated };
    writeRain(animated ? 0 : 99);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  function writeRain(t) {
    const { im, data } = rain; let all = true;
    for (let i = 0; i < data.length; i++) {
      const d = data[i], f = clamp01((t - d.d) / 0.55 * SPEED);
      if (f < 1) all = false;
      const y = d.y + d.h * (1 - f * f);
      _e.set(0, d.ry + (1 - f) * 3, d.rz + (1 - f) * 2); _q.setFromEuler(_e);
      _s.setScalar(f <= 0 ? 0.0001 : d.s);
      _p.set(d.x, y, d.z); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true;
    if (all) rain.done = true;
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

  /* ---------- נפילה טבעית ---------- */
  const drops = [];
  let now = 0;
  function drop(obj, delayMs = 0, height = 1.6) {
    const rest = obj.position.clone(), restQ = obj.quaternion.clone();
    const startQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-1.8, 1.8), rnd(-2, 2), rnd(-1.8, 1.8))).multiply(restQ);
    const off = V(rnd(-0.25, 0.25), 0, rnd(-0.25, 0.25));
    obj.visible = false;
    drops.push({ obj, rest, restQ, startQ, off, baseScale: obj.scale.clone(), start: now + delayMs / 1000, dur: (0.7 + rnd(0, 0.2)) / SPEED, h: height + rnd(0, 0.6) });
  }
  function updateDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], p = (now - d.start) / d.dur;
      if (p < 0) continue;
      d.obj.visible = true;
      const q = clamp01(p);
      let y, sq = 0;
      if (q < 0.62) { const f = q / 0.62; y = d.h * (1 - f * f); }
      else if (q < 0.82) { const f = (q - 0.62) / 0.2; y = d.h * 0.018 * 4 * f * (1 - f); sq = Math.max(0, 1 - f * 4); }
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
  let FF = false;   // דילוג על הפתיחה
  const tween = (sec, fn, ease = easeInOut) => new Promise((res) => {
    if (FF) { fn(1, 1); res(); return; }
    tweens.push({ t0: null, dur: Math.max(0.01, sec / SPEED), fn, ease, res });
  });
  const wait = (s) => tween(s, () => {});
  function updateTweens() {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i]; if (t.t0 === null) t.t0 = now;
      const p = FF ? 1 : clamp01((now - t.t0) / t.dur); t.fn(t.ease(p), p);
      if (p >= 1) { tweens.splice(i, 1); t.res(); }
    }
  }
  function fade(to, sec) {
    if (!fadeEl) return wait(sec);
    fadeEl.style.transition = `opacity ${sec / SPEED}s ease`; fadeEl.style.opacity = to;
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
      vel.push(V(Math.cos(a) * rnd(0.2, 0.8), rnd(0.3, 0.9), Math.sin(a) * rnd(0.2, 0.8)));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: puffTex, transparent: true, depthWrite: false, opacity: 0.6, color: 0xf7f0e2 }));
    scene.add(pts); puffs.push({ pts, vel, born: now, life: 1.5 });
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
     מצקת רוטב
     ========================================================= */
  const metal = std({ color: 0xc9c6c0, metalness: 0.95, roughness: 0.28, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const ladle = new THREE.Group();
  {
    const bowl = mesh(new THREE.SphereGeometry(0.2, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), metal); bowl.position.y = 0.2;
    const rimT = mesh(new THREE.TorusGeometry(0.2, 0.01, 8, 40), metal); rimT.rotation.x = Math.PI / 2; rimT.position.y = 0.2;
    const sauceIn = mesh(new THREE.CircleGeometry(0.185, 32), std({ color: 0x8e2314, roughness: 0.4 })); sauceIn.rotation.x = -Math.PI / 2; sauceIn.position.y = 0.17;
    const handle = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 10), metal);
    handle.position.set(0.95, 0.75, 0); handle.rotation.z = -1.0;
    ladle.add(bowl, rimT, sauceIn, handle);
    ladle.userData.sauceIn = sauceIn;
  }
  ladle.scale.setScalar(1.55);
  ladle.visible = false; scene.add(ladle);

  /* =========================================================
     בקבוק שמן זית
     ========================================================= */
  const bottle = new THREE.Group();
  {
    const prof = [[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.7], [0.2, 0.82], [0.1, 0.95], [0.065, 1.05], [0.065, 1.24], [0.075, 1.26], [0.075, 1.3]].map(([x, y]) => new THREE.Vector2(x, y));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({ color: 0x23361a, roughness: 0.12, metalness: 0, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.08 }));
    glass.castShadow = true;
    const oilProf = [[0, 0.02], [0.195, 0.02], [0.205, 0.05], [0.205, 0.6], [0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y));
    const oilIn = new THREE.Mesh(new THREE.LatheGeometry(oilProf, 32), std({ color: 0xa88a1c, roughness: 0.2, transparent: true, opacity: 0.85 }));
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.04, 0.16, 16), metal); spout.position.y = 1.36;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.224, 0.224, 0.3, 40, 1, true), std({ color: 0xe8dcc0, roughness: 0.8 })); label.position.y = 0.38;
    const inner = new THREE.Group(); inner.add(glass, spout, label);
    inner.scale.set(1, 0.68, 1); inner.position.y = -1.44 * 0.68;                          // פתח הפיה בראשית הקבוצה
    bottle.add(inner);
  }
  bottle.visible = false; scene.add(bottle);
  const oilStreamMat = std({ color: 0xd9b23a, roughness: 0.05, transparent: true, opacity: 0.8, emissive: 0x3a2a00, envMapIntensity: 1.4 });
  const oilStream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 10), oilStreamMat);
  oilStream.visible = false; scene.add(oilStream);
  const oilDropGeo = new THREE.SphereGeometry(0.04, 12, 8);
  const oilDropMat = std({ color: 0xcfa62a, roughness: 0.04, transparent: true, opacity: 0.55, envMapIntensity: 1.6 });

  /* =========================================================
     הטאבון — בסגנון התמונה: כיפה לבנה, קשת לבנים, בסיס שחור,
     מעמד לבנים כתומות וארובה
     ========================================================= */
  const oven = new THREE.Group(); oven.position.copy(OV); scene.add(oven);
  const MW = 3.9, MRECT = 0.45, DR = 4.7, IR = 4.4, GAP = 1.0;
  const zc = -(DR * Math.cos(GAP / 2)) - 0.05;
  const plaster = std({ map: tex(plasterCanvas()), roughness: 0.9 });
  const sootMat = std({ map: tex(sootCanvas()), roughness: 1, side: THREE.BackSide });
  const capO = Math.acos(2.95 / DR), capI = Math.acos(2.95 / IR);
  const domeParts = [
    [new THREE.SphereGeometry(DR, 72, 24, 0, Math.PI * 2, 0, capO), plaster],
    [new THREE.SphereGeometry(DR, 72, 24, Math.PI / 2 + GAP / 2, Math.PI * 2 - GAP, capO, Math.PI / 2 - capO), plaster],
    [new THREE.SphereGeometry(IR, 72, 24, 0, Math.PI * 2, 0, capI), sootMat],
    [new THREE.SphereGeometry(IR, 72, 24, Math.PI / 2 + GAP / 2, Math.PI * 2 - GAP, capI, Math.PI / 2 - capI), sootMat]
  ];
  domeParts.forEach(([g, m]) => { const d = new THREE.Mesh(g, m); d.position.z = zc; d.castShadow = m === plaster; oven.add(d); });
  // חזית לבנה עם פתח קשתי
  const fShape = new THREE.Shape();
  fShape.moveTo(-DR - 0.1, 0); fShape.absarc(0, 0, DR + 0.1, Math.PI, 0, true); fShape.lineTo(-DR - 0.1, 0);
  const hole = new THREE.Path();
  hole.moveTo(-MW / 2, 0); hole.lineTo(-MW / 2, MRECT); hole.absarc(0, MRECT, MW / 2, Math.PI, 0, true); hole.lineTo(MW / 2, 0); hole.lineTo(-MW / 2, 0);
  fShape.holes.push(hole);
  const facade = new THREE.Mesh(new THREE.ExtrudeGeometry(fShape, { depth: 0.5, bevelEnabled: false, curveSegments: 64 }), plaster);
  facade.position.z = -0.5; oven.add(facade);
  // קשת לבנים: כתום ואפור כהה לסירוגין
  const brickO = std({ color: 0xd8742c, roughness: 0.85 }), brickG = std({ color: 0x4d4b4a, roughness: 0.85 });
  const brickGeo = new THREE.BoxGeometry(0.32, 0.46, 0.4);
  const placeBrick = (x, y, rotZ, i) => { const b = mesh(brickGeo, i % 2 ? brickO : brickG); b.position.set(x, y, 0.06); b.rotation.z = rotZ; oven.add(b); };
  const ar = MW / 2 + 0.27, nArch = 19;
  for (let i = 0; i < nArch; i++) { const a = Math.PI - (i / (nArch - 1)) * Math.PI; placeBrick(Math.cos(a) * ar, MRECT + Math.sin(a) * ar, a - Math.PI / 2, i); }
  [0.12, 0.42].forEach((y, k) => { placeBrick(-ar, y, 0, k + 1); placeBrick(ar, y, 0, k + 1); });
  // מדחום
  const thermo = new THREE.Group();
  thermo.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 32), metal));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), std({ color: 0xf4f1ea, roughness: 0.5 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.03; thermo.add(face);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.01, 0.012), std({ color: 0xb01d10 })); needle.position.set(0.04, 0.04, 0); thermo.add(needle);
  thermo.rotation.x = Math.PI / 2; thermo.position.set(-1.25, MRECT + MW / 2 + 0.85, 0.05); oven.add(thermo);
  // רצפה, בסיס שחור, מעמד לבנים, ארובה
  const floorM = new THREE.Mesh(new THREE.CircleGeometry(IR, 64), std({ map: tex(firebrickCanvas()), roughness: 0.95 }));
  floorM.rotation.x = -Math.PI / 2; floorM.position.set(0, 0.003, zc); floorM.receiveShadow = true; oven.add(floorM);
  const slab = mesh(new THREE.BoxGeometry(2 * DR + 0.9, 0.45, 2 * DR + 1.4), std({ color: 0x1c1b1a, roughness: 0.6, metalness: 0.2 }));
  slab.position.set(0, -0.225, zc + 0.35); oven.add(slab);
  const orangeBricks = tex(brickCanvas(['#d87a35', '#e08640', '#c96a28', '#d9773a'], '#6e5a48'), { repeat: [2, 2] });
  const stand = mesh(new THREE.BoxGeometry(2 * DR + 0.4, 4.2, 2 * DR), std({ map: orangeBricks, roughness: 0.9 }));
  stand.position.set(0, -2.55, zc); oven.add(stand);
  const greyBricks = tex(brickCanvas(['#4a4a4c', '#3d3d3f', '#56555a'], '#2a2a2a', 128, 52, 512, 512));
  const chimney = mesh(new THREE.BoxGeometry(1.2, 2.6, 1.2), std({ map: greyBricks, roughness: 0.9 }));
  chimney.position.set(0, 4.2, -1.3); oven.add(chimney);
  const chimCap = mesh(new THREE.BoxGeometry(1.55, 0.22, 1.55), std({ color: 0xe9e6df, roughness: 0.8 })); chimCap.position.set(0, 5.6, -1.3); oven.add(chimCap);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std({ color: 0x15110e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -4.65; ground.receiveShadow = true; oven.add(ground);
  // אש פנימית
  const charMat = std({ color: 0x120a07, roughness: 1, emissive: 0xff5a14, emissiveMap: tex(emberCanvas()), emissiveIntensity: 0.8 });
  const FZ = zc - 2.6;
  [[-1.0, 0.3, 0.4], [0.3, -0.1, -0.3], [1.2, 0.2, 0.15], [-0.2, 0.25, 1.4]].forEach(([x, dz, ry], i) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 1.9, 16), charMat);
    l.rotation.set(0, ry, Math.PI / 2); l.position.set(x, i === 3 ? 0.42 : 0.22, FZ + dz); oven.add(l);
  });
  const coalMat = std({ color: 0x1a0a04, emissive: 0xff4a10, emissiveIntensity: 2, roughness: 1 });
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.07, 0.16), 0), coalMat);
    c.position.set(rnd(-1.8, 1.8), 0.05, FZ + rnd(-0.6, 0.7)); c.rotation.set(R() * 3, R() * 3, R() * 3); oven.add(c);
  }
  const flames = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.ShaderMaterial({ vertexShader: fireVert, fragmentShader: fireFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uSeed: { value: R() * 10 }, uPower: { value: 1 } } });
    const w = rnd(1.4, 2.4), h = rnd(2.0, 3.2);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    f.position.set(rnd(-1.7, 1.7), h / 2 - 0.05, FZ + rnd(-0.4, 0.5)); oven.add(f); flames.push(f);
  }
  const fireLight = new THREE.PointLight(0xff7424, 110, 0, 2); fireLight.position.set(0, 1.4, FZ + 0.9); oven.add(fireLight);
  const fireLight2 = new THREE.PointLight(0xffa050, 18, 0, 2); fireLight2.position.set(0, 2.6, zc + 1.8); oven.add(fireLight2);
  const mouthGlow = new THREE.PointLight(0xff8a3a, 14, 0, 2); mouthGlow.position.set(0, 1.4, 1.6); oven.add(mouthGlow);
  const EMB = 120, embGeo = new THREE.BufferGeometry(), embPos = new Float32Array(EMB * 3), embData = [];
  for (let i = 0; i < EMB; i++) embData.push({ t: R(), x: rnd(-1.8, 1.8), z: FZ + rnd(-0.4, 0.6), sp: rnd(0.2, 0.5), sw: rnd(0, 6) });
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  oven.add(new THREE.Points(embGeo, new THREE.PointsMaterial({ size: 0.05, map: tex(dotCanvas('rgba(255,220,150,1)', 'rgba(255,80,0,0)')), color: 0xffa050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const PIZZA_IN = ov(0, 0.01, zc + 1.0), PIZZA_MOUTH = ov(0, 0.05, 3.6), PIZZA_OUT = ov(0, 0.6, 5.6);

  /* ---------- מרדה: להב אלומיניום גדול מהפיצה, ידית עץ ---------- */
  const peel = new THREE.Group();
  {
    const s = new THREE.Shape(); const w = 3.5, h = 3.4, r = 1.1;
    s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2);
    const blade = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), std({ color: 0xbab7b2, metalness: 0.9, roughness: 0.36, envMapIntensity: 1 }));
    blade.rotation.x = Math.PI / 2; blade.position.y = 0.012;
    const neck = mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 16), std({ color: 0xa8a6a2, metalness: 0.9, roughness: 0.35, envMapIntensity: 1 }));
    neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.0, 2.05);
    const handle = mesh(new THREE.CylinderGeometry(0.075, 0.08, 2.6, 18), std({ color: 0xb98a55, roughness: 0.6 }));
    handle.rotation.x = Math.PI / 2; handle.position.set(0, 0.0, 3.7);
    peel.add(blade, neck, handle);
  }
  const peelMats = [];
  peel.traverse((o) => { if (o.material) { o.material.transparent = true; peelMats.push(o.material); } });
  const peelAlpha = (a) => { peelMats.forEach((m) => { m.opacity = a; m.depthWrite = a > 0.98; }); };
  peel.visible = false; scene.add(peel);

  /* ---------- מגש קרטון ---------- */
  const BOX_FLOOR = 0.03;
  const pizzaBox = new THREE.Group();
  {
    const kraft = (light) => {
      const c = cnv(512, 512), x = c.getContext('2d');
      x.fillStyle = light ? '#c9a274' : '#b48a5c'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 120; i++) spot(x, R() * 512, R() * 512, rnd(20, 80), rnd(20, 80), R() > 0.5 ? '#d2ad80' : '#a87d50', 0.18, 0.2);
      for (let i = 0; i < 900; i++) { x.globalAlpha = rnd(0.05, 0.2); x.strokeStyle = R() > 0.5 ? '#8a6238' : '#e0c09a'; x.lineWidth = rnd(0.5, 1.4);
        const px = R() * 512, py = R() * 512; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rnd(-8, 8), py + rnd(-8, 8)); x.stroke(); }
      x.globalAlpha = 1; return c;
    };
    const inM = std({ map: tex(kraft(true)), roughness: 0.95 }), outM = std({ map: tex(kraft(false)), roughness: 0.95 });
    const W = 3.45, Hh = 0.32, T = 0.025;
    const add = (g, m, x, y, z, parent = pizzaBox) => { const o = mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
    add(new THREE.BoxGeometry(W, T, W), inM, 0, T / 2, 0);
    add(new THREE.BoxGeometry(W, Hh, T), inM, 0, Hh / 2, W / 2);
    add(new THREE.BoxGeometry(W, Hh, T), inM, 0, Hh / 2, -W / 2);
    add(new THREE.BoxGeometry(T, Hh, W), inM, W / 2, Hh / 2, 0);
    add(new THREE.BoxGeometry(T, Hh, W), inM, -W / 2, Hh / 2, 0);
    const lid = new THREE.Group(); lid.position.set(0, Hh, -W / 2); pizzaBox.add(lid);
    add(new THREE.BoxGeometry(W + 0.04, T, W + 0.04), outM, 0, 0, W / 2 + 0.02, lid);
    add(new THREE.BoxGeometry(W + 0.04, Hh * 0.8, T), outM, 0, -Hh * 0.4, W + 0.04, lid);
    add(new THREE.BoxGeometry(T, Hh * 0.6, W * 0.9), outM, W / 2 + 0.02, -Hh * 0.3, W / 2, lid);
    add(new THREE.BoxGeometry(T, Hh * 0.6, W * 0.9), outM, -W / 2 - 0.02, -Hh * 0.3, W / 2, lid);
    pizzaBox.userData.lid = lid;
  }
  pizzaBox.visible = false; scene.add(pizzaBox);
  // הלהב מתחת לפיצה — לא חודר לתוכה
  const peelUnder = () => { peel.position.set(pizza.position.x, pizza.position.y - 0.016, pizza.position.z + 0.2); };

  /* ---------- כדור בצק ---------- */
  const doughBall = mesh(new THREE.SphereGeometry(0.52, 64, 40), std({ color: 0xe6d2ae, roughness: 0.75, bumpMap: tex(noiseCanvas(256, 16, 90, 180), { srgb: false }), bumpScale: 0.8 }));
  doughBall.scale.set(1, 0.72, 1); doughBall.position.y = 0.36; scene.add(doughBall);
  pizza = buildPizza(); pizza.visible = false; scene.add(pizza);
  paintBake(0);

  let state = 'dough';
  let spin = 0;

  function setView(v) {
    if (v === VIEW_BUILD || v === VIEW_BOX) viewNow = v;
    camera.position.copy(v.pos); controls.target.copy(v.target); controls.update();
    const far = v.target.x > 30; scene.fog.near = far ? 18 : 6.5; scene.fog.far = far ? 48 : 13;
  }
  function lookTween(from, to, sec, ease = easeInOut) {
    const p0 = from.pos.clone(), t0 = from.target.clone(), p1 = to.pos.clone(), t1 = to.target.clone();
    return tween(sec, (t) => { camera.position.lerpVectors(p0, p1, t); controls.target.lerpVectors(t0, t1, t); }, ease);
  }
  const curView = () => ({ pos: camera.position.clone(), target: controls.target.clone() });

  /* ---------- פתיחה ---------- */
  async function playIntro(onStep = () => {}) {
    if (state !== 'dough') return;
    state = 'intro';
    onStep('dough');
    await tween(0.65, (t) => { doughBall.position.y = lerp(2.4, 0.36, t * t); }, (t) => t);
    flourPuff(V(0, 0, 0), 60, 1.2);
    onStep('stretch');
    for (let k = 0; k < 2; k++) await tween(0.36, (t) => { const s = Math.sin(t * Math.PI); doughBall.scale.set(1 + 0.3 * s, 0.72 - 0.26 * s, 1 + 0.3 * s); doughBall.rotation.y += 0.05; });
    pizza.visible = true; pizza.scale.setScalar(0.001);
    const ud = pizza.userData; ud.sauce.visible = false; ud.cheese.visible = false;
    await tween(1.3, (t) => {
      doughBall.scale.set(1 + 1.6 * t, 0.72 * (1 - t) + 0.06, 1 + 1.6 * t);
      doughBall.position.y = lerp(0.36, 0.03, t); doughBall.rotation.y += 0.04;
      pizza.scale.setScalar(Math.max(0.001, easeOut(clamp01((t - 0.4) / 0.6))));
      if (t > 0.86) doughBall.visible = false;
    });
    doughBall.visible = false;
    flourPuff(V(0, 0, 0), 70, 2.2);
    onStep('sauce'); await spreadSauce();
    onStep('cheese'); ud.cheese.visible = true; addCheese(!FF);
    await wait(1.8);
    state = 'build'; FF = false; onStep('ready');
  }

  /* מצקת: נשפכת במרכז ומורחת בספירלה עם כיוון השעון עד הקצוות */
  async function spreadSauce() {
    const sauce = pizza.userData.sauce;
    sauce.visible = true; sauce.scale.setScalar(0.001);
    const center = pizza.position.clone();
    ladle.visible = true; ladle.userData.sauceIn.scale.setScalar(1);
    ladle.position.set(center.x, 1.6, center.z); ladle.rotation.set(0, 0, 0);
    await tween(0.5, (t) => { ladle.position.y = lerp(1.6, 0.07, t); }, easeOut);
    const TURNS = 2.6, RMAX = 1.12;
    await tween(2.6, (t) => {
      const r = RMAX * Math.pow(t, 0.8), th = t * TURNS * Math.PI * 2;   // זווית עולה = עם כיוון השעון במבט מלמעלה
      ladle.position.set(center.x + Math.cos(th) * r, 0.07 + Math.sin(t * 40) * 0.006, center.z + Math.sin(th) * r);
      ladle.rotation.y = -th;
      sauce.scale.setScalar(Math.max(0.02, r / 1.21 + 0.1 * (1 - t)));
      sauce.rotation.y = -th * 0.15;
      ladle.userData.sauceIn.scale.setScalar(Math.max(0.05, 1 - t));
    }, (t) => t);
    sauce.scale.setScalar(1);
    await tween(0.5, (t) => { ladle.position.y = lerp(0.07, 1.8, t); ladle.position.x += 0.04; }, easeIn);
    ladle.visible = false;
  }

  function fastForward() { if (state === 'intro') FF = true; }
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
    state = 'intro';
    const ud = pizza.userData;
    await tween(0.35, (t) => { ud.sauce.scale.setScalar(Math.max(0.001, 1 - t)); ud.cheese.scale.setScalar(Math.max(0.001, 1 - t)); });
    ud.cheese.clear(); ud.cheese.scale.setScalar(1);
    sauceMat.map = sauceTex[kind]; sauceMat.needsUpdate = true;
    await spreadSauce();
    addCheese(true);
    await wait(1.2);
    state = 'build';
  }

  function addTopping(id) {
    const ud = pizza.userData; if (ud.pieces[id]) return;
    const existing = [];
    Object.values(ud.pieces).forEach((arr) => arr.forEach((o) => existing.push({ x: o.position.x, z: o.position.z })));
    const pts = scatter(TOPPING_COUNT[id] || 10, 1.06, existing, 0.15);
    const arr = [];
    pts.forEach((pt, i) => {
      const o = makePiece(id); o.position.set(pt.x, 0, pt.z);
      ud.toppings.add(o); arr.push(o); drop(o, i * 35 + rnd(0, 50));
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
      }, (t) => t).then(() => ud.toppings.remove(o)), i * 15);
    });
  }
  let pendingToppings = null;
  function setToppings(ids) {
    if (state !== 'build') { pendingToppings = ids; return; }
    pendingToppings = null;
    const cur = Object.keys(pizza.userData.pieces);
    cur.filter((id) => !ids.includes(id)).forEach(removeTopping);
    ids.filter((id) => !cur.includes(id)).forEach(addTopping);
  }

  /* ---------- שמן זית בסיבוב ---------- */
  async function pourOil() {
    const ud = pizza.userData;
    const MAXD = 150;
    const drip = new THREE.InstancedMesh(oilDropGeo, oilDropMat, MAXD); drip.count = 0; ud.oil.add(drip);
    const placeBottle = (x, y, z, th, tilt) => {
      const qz = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), tilt);
      const qy = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -th);
      bottle.quaternion.copy(qy.multiply(qz)); bottle.position.set(x, y, z);
    };
    const H = 0.85, c = pizza.position, R0 = 1.0, R1 = 0.5;
    bottle.visible = true;
    await tween(0.45, (t) => placeBottle(c.x + lerp(2.6, R0, t), lerp(2.4, H, t), c.z, 0, lerp(0.4, 2.4, t)), easeOut);
    oilStream.visible = true;
    const TURNS = 1.25;
    let last = 0;
    await tween(1.8, (t) => {
      const r = lerp(R0, R1, t), th = t * TURNS * Math.PI * 2;
      const x = c.x + Math.cos(th) * r, z = c.z + Math.sin(th) * r;
      placeBottle(x, H, z, th, 2.4);
      const flow = Math.min(1, t * 8, (1 - t) * 8);
      const yTop = H - 0.02, yBot = c.y + TOP_Y + 0.04;
      oilStream.position.set(x, (yTop + yBot) / 2, z); oilStream.scale.set(flow, yTop - yBot, flow);
      const n = Math.floor(t * MAXD);
      for (let i = last; i < n && i < MAXD; i++) {
        const tt = i / MAXD, rr = lerp(R0, R1, tt) + rnd(-0.03, 0.03), a = tt * TURNS * Math.PI * 2 + rnd(-0.03, 0.03);
        const local = pizza.worldToLocal(V(c.x + Math.cos(a) * rr, c.y + TOP_Y + 0.02, c.z + Math.sin(a) * rr)).sub(ud.oil.position);
        _p.copy(local); _e.set(0, R() * 6, 0); _q.setFromEuler(_e); _s.set(rnd(0.6, 1.1), 0.12, rnd(0.45, 0.75));
        _m.compose(_p, _q, _s); drip.setMatrixAt(i, _m);
      }
      if (n > last) { drip.count = Math.min(n, MAXD); drip.instanceMatrix.needsUpdate = true; last = n; }
    }, (t) => t);
    oilStream.visible = false;
    await tween(0.4, (t) => placeBottle(c.x + lerp(R1, 2.8, t), lerp(H, 2.6, t), c.z, 0, lerp(2.4, 0.3, t)), easeIn);
    bottle.visible = false;
  }

  /* מרדה שנכנסת/יוצאת בהתפוגגות — בלי לעבור דרך המצלמה */
  async function peelIn(fromZ, toZ, sec = 0.35) {
    peel.visible = true; peelAlpha(0);
    await tween(sec, (t) => { peel.position.z = lerp(fromZ, toZ, t); peelAlpha(t); }, easeOut);
    peelAlpha(1);
  }
  async function peelOut(fromZ, toZ, sec = 0.35) {
    await tween(sec, (t) => { peel.position.z = lerp(fromZ, toZ, t); peelAlpha(1 - t); }, easeIn);
    peel.visible = false; peelAlpha(1);
  }

  /* ---------- אפייה: שמן, מרדה, טאבון, ואז לקופסת קרטון ---------- */
  async function bake(onStage = () => {}) {
    if (state !== 'build') return;
    state = 'oven'; controls.enabled = false; limits(false);
    while (drops.length || (rain && !rain.done)) await wait(0.1);
    const homeRot = pizza.rotation.y;
    onStage('oil');
    // המצלמה יורדת לזווית צד בזמן השמן
    await Promise.all([lookTween(curView(), VIEW_OIL, 0.7), pourOil()]);
    onStage('peel');
    await tween(0.2, (t) => { pizza.position.y = 0.05 * t; });
    peel.rotation.y = 0; peel.position.set(0, 0.034, 2.2);
    await peelIn(2.2, 0.2, 0.45);
    onStage('in');
    const p0 = pizza.position.clone();
    const away = tween(0.8, (t) => { pizza.position.set(p0.x, p0.y + Math.sin(t * Math.PI) * 0.2, lerp(p0.z, -5, t)); peelUnder(); }, easeIn);
    lookTween(VIEW_OIL, VIEW_AWAY, 0.8, easeIn);
    await wait(0.4); await fade(1, 0.35); await away;
    // מול הטאבון
    pizza.position.copy(PIZZA_MOUTH); peelUnder();
    setView(VIEW_OVEN_WIDE);
    await fade(0, 0.3);
    await Promise.all([
      lookTween(VIEW_OVEN_WIDE, VIEW_OVEN_IN, 1.1),
      tween(1.0, (t) => { pizza.position.lerpVectors(PIZZA_MOUTH, PIZZA_IN, t); peelUnder(); }, easeInOut)
    ]);
    const pz = peel.position.z;
    peelOut(pz, pz + 1.2, 0.35);
    onStage('baking');
    // אפייה: המצלמה מתקרבת בקשת סביב הפתח
    const a0 = VIEW_OVEN_IN.pos, b0 = VIEW_OVEN_CLOSE.pos, ta = VIEW_OVEN_IN.target, tb = VIEW_OVEN_CLOSE.target;
    await tween(3, (t, raw) => {
      paintBake(raw);
      const e = easeInOut(raw);
      camera.position.lerpVectors(a0, b0, e); camera.position.x += Math.sin(raw * Math.PI) * 0.9;
      controls.target.lerpVectors(ta, tb, e);
      pizza.rotation.y = homeRot + easeInOut(clamp01((raw - 0.45) / 0.15)) * Math.PI * 0.5;
      onStage('bakeProgress', raw);
    }, (t) => t);
    onStage('out');
    await peelIn(PIZZA_IN.z + 1.4, PIZZA_IN.z + 0.2, 0.3);
    // יוצאת מהטאבון — המצלמה מתרחקת יחד איתה
    await Promise.all([
      lookTween(curView(), VIEW_OVEN_OUT, 1.5),
      tween(1.4, (t) => { pizza.position.lerpVectors(PIZZA_IN, PIZZA_OUT, t); pizza.position.y = PIZZA_IN.y + (PIZZA_OUT.y - PIZZA_IN.y) * Math.max(0, t * 1.5 - 0.5); peelUnder(); }, easeInOut)
    ]);
    await fade(1, 0.3);
    // לקופסת הקרטון
    peel.visible = false; limits(true);
    pizzaBox.visible = true; pizzaBox.position.set(0, 0, 0); pizzaBox.userData.lid.rotation.x = -1.85;
    pizza.position.set(0, 1.5, 0);
    setView(VIEW_BOX_FAR);
    await fade(0, 0.3);
    await Promise.all([
      lookTween(VIEW_BOX_FAR, VIEW_BOX, 1.1),
      tween(0.55, (t) => { pizza.position.y = lerp(1.5, BOX_FLOOR, t); }, easeIn)
    ]);
    viewNow = VIEW_BOX;
    steam();
    controls.enabled = true;
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
    const bx = pizzaBox.visible;
    await Promise.all([
      lookTween(curView(), VIEW_BUILD, 0.8),
      tween(0.8, (t) => { old.position.x = lerp(0, -7, t); if (bx) pizzaBox.position.x = lerp(0, -7, t); }, easeIn)
    ]);
    viewNow = VIEW_BUILD;
    scene.remove(old); pizzaBox.visible = false; pizzaBox.position.x = 0;
    pizza = buildPizza(); paintBake(0);
    pizza.position.x = 6; scene.add(pizza);
    pizza.userData.sauce.visible = false;
    await tween(0.7, (t) => { pizza.position.x = lerp(6, 0, t); }, easeOut);
    flourPuff(V(0, 0, 0), 50, 2);
    await spreadSauce(); addCheese(!FF);
    await wait(1.0); state = 'build';
    if (pendingToppings) setToppings(pendingToppings);
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
    if (state !== 'oven') setView(viewNow);
  }
  new ResizeObserver(resize).observe(canvasEl); resize();

  const tmp = new THREE.Vector3(), fp = new THREE.Vector3();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    now += dt;
    if (!visible) return;
    updateTweens(); updateDrops();
    if (rain && !rain.done) writeRain(now - rain.start);
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
    if (controls.target.x > 30) {
      const ea = embGeo.attributes.position;
      for (let i = 0; i < EMB; i++) {
        const e = embData[i]; e.t += dt * e.sp; if (e.t > 1) { e.t = 0; e.x = rnd(-1.8, 1.8); }
        ea.setXYZ(i, e.x + Math.sin(e.t * 5 + e.sw) * 0.2, 0.15 + e.t * 3.6, e.z + e.t * 1.2);
      }
      ea.needsUpdate = true;
      camera.getWorldPosition(tmp);
      flames.forEach((f) => { f.material.uniforms.uTime.value = now; f.getWorldPosition(fp); f.lookAt(tmp.x, fp.y, tmp.z); });
      const fl = 0.8 + 0.2 * Math.sin(now * 11) * Math.sin(now * 6.7) + 0.1 * Math.sin(now * 23);
      fireLight.intensity = 110 * fl; mouthGlow.intensity = 14 * fl;
    }
    if (state === 'build' || state === 'dough') {
      spin += dt * 0.08 * SPEED;
      if (pizza) pizza.rotation.y = spin;
    }
    glow.intensity = 26 * (0.85 + 0.1 * Math.sin(now * 3.1) + 0.05 * Math.sin(now * 11.3));
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    playIntro, skipIntro, fastForward, setBase, setToppings, bake, newPizza, snapshot,
    get state() { return state; }
  };
}
