import { cfg, nextSaleDate, closeDate, ymd, heDate, money, fmtPhone, fetchSlotCounts, sendOrder } from './common.js';

const $ = (s, el = document) => el.querySelector(s);
const panel = $('#panel');
const P = cfg.showPrices;
const MAXT = cfg.maxToppings || 99;
const saleDate = nextSaleDate();
const saleKey = ymd(saleDate);
const close = closeDate(saleDate);

/* ---------- פרטי המכירה ---------- */
const hours = `${cfg.timeSlots[0]} עד ${cfg.timeSlots[cfg.timeSlots.length - 1]}`;
const closeTxt = `${heDate(close).replace(/ \d+\.\d+$/, '')} ${cfg.closeTime}`;
$('#factDay').textContent = heDate(saleDate);
$('#factHours').textContent = hours;
$('#factPrice').textContent = P ? `${money(cfg.bases[0].price)}${cfg.toppings.every((t) => !t.price) ? ', תוספות חינם' : ''}` : '—';
$('#factClose').textContent = closeTxt;
$('#howClose').textContent = `עד ${closeTxt}, למכירה של ${heDate(saleDate)}.`;
$('#slotDay').textContent = `· ${heDate(saleDate)}`;
$('#footDate').textContent = `המכירה הקרובה: ${heDate(saleDate)}`;
document.querySelectorAll('.pay .num').forEach((el) => { el.textContent = fmtPhone(cfg.payPhone); });
if (!cfg.ordersOpen) { $('#closedNote').hidden = false; $('#submitBtn').disabled = true; }

/* ---------- הסצנה ---------- */
let scene = null;
try {
  const { createPizzaScene } = await import('./scene.js');
  scene = createPizzaScene($('#pizzaCanvas'), { fadeEl: $('#fade') });
} catch (e) {
  console.error(e);
  caption('אפשר להזמין כרגיל');
}

/* ---------- מצב ---------- */
const cur = { base: cfg.bases[0].id, toppings: [] };
let cart = [];
try { cart = JSON.parse(sessionStorage.getItem('pizza.cart') || '[]'); } catch {}
const saveCart = () => { try { sessionStorage.setItem('pizza.cart', JSON.stringify(cart)); } catch {} };
const baseById = (id) => cfg.bases.find((b) => b.id === id);
const topById = (id) => cfg.toppings.find((t) => t.id === id);
const pizzaPrice = (p) => baseById(p.base).price + p.toppings.reduce((s, id) => s + (topById(id)?.price || 0), 0);
const pizzaDesc = (p) => (p.toppings.length ? p.toppings.map((id) => topById(id).name).join(' · ') : 'בלי תוספות');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- בסיס ---------- */
$('#bases').innerHTML = cfg.bases.map((b) => `
  <button type="button" class="opt" role="radio" data-id="${b.id}" aria-checked="${b.id === cur.base}">
    <span class="tick"></span>
    <span><span class="opt-name">${esc(b.name)}</span><span class="opt-desc">${esc(b.desc)}</span></span>
    <span class="opt-price"></span>
  </button>`).join('');
$('#bases').addEventListener('click', (e) => {
  const b = e.target.closest('.opt'); if (!b || busy) return;
  cur.base = b.dataset.id;
  document.querySelectorAll('#bases .opt').forEach((x) => x.setAttribute('aria-checked', x === b));
  scene?.setBase(cur.base);
  updatePrice();
});

/* ---------- תוספות (עד MAXT) ---------- */
$('#toppings').innerHTML = cfg.toppings.map((t) => `
  <button type="button" class="opt" data-id="${t.id}" aria-pressed="false">
    <span class="tick"></span>
    <span><span class="opt-name">${esc(t.name)}</span>${t.desc ? `<span class="opt-desc">${esc(t.desc)}</span>` : ''}</span>
    <span class="opt-price">${P && t.price ? `+${money(t.price)}` : ''}</span>
  </button>`).join('');
$('#toppings').addEventListener('click', (e) => {
  const b = e.target.closest('.opt'); if (!b || busy) return;
  const id = b.dataset.id, on = !cur.toppings.includes(id);
  if (on && cur.toppings.length >= MAXT) { toast(`עד ${MAXT} תוספות למגש`); return; }
  cur.toppings = on ? [...cur.toppings, id] : cur.toppings.filter((x) => x !== id);
  syncToppings();
  scene?.setToppings(cur.toppings);
  updatePrice();
});
function syncToppings() {
  const full = cur.toppings.length >= MAXT;
  document.querySelectorAll('#toppings .opt').forEach((b) => {
    const on = cur.toppings.includes(b.dataset.id);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-disabled', full && !on);
  });
  const c = $('#topCount');
  c.textContent = `${cur.toppings.length} מתוך ${MAXT}`;
  c.classList.toggle('full', full);
}
function updatePrice() { $('#priceNow').innerHTML = P ? `<b>${money(pizzaPrice(cur))}</b> למגש` : ''; }
syncToppings(); updatePrice();

/* ---------- כיתוב על הבמה ---------- */
var capTimer;
function caption(text, ms) {
  const c = $('#caption'); c.textContent = text; c.classList.add('show');
  clearTimeout(capTimer); if (ms) capTimer = setTimeout(() => c.classList.remove('show'), ms);
}

/* ---------- פתיחה: תהליך ההכנה ---------- */
let busy = false;
const INTRO = { dough: 'כדור בצק שתפח לאט', stretch: 'פותחים ביד', cheese: 'גבינה צהובה, הרבה', ready: 'התוספות שלכם' };
$('#startBtn').addEventListener('click', async () => {
  setMode('build'); busy = true;
  if (scene) await scene.playIntro((s) => caption(s === 'sauce' ? (cur.base === 'red' ? 'רוטב עגבניות' : 'שמן זית ושום') : INTRO[s], s === 'ready' ? 2200 : 0));
  busy = false;
  scene?.setToppings(cur.toppings);
});
function setMode(m) {
  panel.dataset.mode = m;
  if (matchMedia('(max-width: 860px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- שעון אפייה דרמטי ---------- */
const TICKS = 18;
let lastTick = -1;
function timerStart() {
  const m = $('#ovenMeter'), g = $('#ovenTicks');
  if (!g.children.length) {
    for (let i = 0; i < TICKS; i++) {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
      l.setAttribute('x1', 60 + Math.cos(a) * 46); l.setAttribute('y1', 60 + Math.sin(a) * 46);
      l.setAttribute('x2', 60 + Math.cos(a) * 54); l.setAttribute('y2', 60 + Math.sin(a) * 54);
      g.appendChild(l);
    }
  }
  [...g.children].forEach((l) => l.classList.remove('lit'));
  lastTick = -1; $('#ovenSec').textContent = '90';
  $('#ovenRing').style.strokeDashoffset = 0;
  m.classList.remove('end'); m.hidden = false;
}
function timerTick(p) {
  const k = Math.min(TICKS, Math.floor(p * TICKS + 0.001));
  $('#ovenRing').style.strokeDashoffset = (p * 339.3).toFixed(1);
  if (k === lastTick) return;
  lastTick = k;
  [...$('#ovenTicks').children].forEach((l, i) => l.classList.toggle('lit', i < k));
  const num = $('#ovenSec');
  num.textContent = String(90 - k * 5);
  const m = $('#ovenMeter');
  m.classList.remove('tick'); void m.offsetWidth; m.classList.add('tick');
  if (k >= TICKS - 3) m.classList.add('hot');
}
function timerEnd() {
  const m = $('#ovenMeter');
  m.classList.add('end'); $('#ovenSec').textContent = '0';
  setTimeout(() => { m.hidden = true; m.classList.remove('end', 'hot', 'tick'); }, 1300);
}

/* ---------- לטאבון ---------- */
const STAGES = ['oil', 'peel', 'in', 'baking', 'out'];
const TITLES = { oil: 'שמן זית בסיבוב', peel: 'על המרדה', in: 'פנימה, אל האש', baking: 'נאפית מול האש', out: 'יוצאת מהטאבון' };
$('#bakeBtn').addEventListener('click', async () => {
  if (busy) return;
  if (!cfg.ordersOpen) return toast('ההזמנות סגורות כרגע');
  busy = true;
  const pizza = { base: cur.base, toppings: [...cur.toppings].sort() };
  setMode('oven');
  const steps = [...document.querySelectorAll('#ovenSteps li')], meter = $('#ovenMeter');
  const mark = (s) => { const i = STAGES.indexOf(s); steps.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('ok', k < i); }); $('#ovenTitle').textContent = TITLES[s]; };
  let img = null;
  if (scene) {
    await scene.bake((s, p) => {
      if (STAGES.includes(s)) mark(s);
      if (s === 'oil') caption('שמן זית');
      if (s === 'peel') caption('', 1);
      if (s === 'baking') { timerStart(); caption('דקה וחצי, 450 מעלות'); }
      if (s === 'bakeProgress') timerTick(p);
      if (s === 'out') { timerEnd(); caption('מוכנה!', 1800); }
    });
    img = scene.snapshot(240);
  }
  const same = cart.find((c) => c.base === pizza.base && c.toppings.join() === pizza.toppings.join());
  if (same) { same.qty++; if (img) same.img = img; } else cart.push({ ...pizza, qty: 1, img, uid: Date.now() });
  saveCart(); renderCart();
  $('#doneCard').innerHTML = `${img ? `<img src="${img}" alt="">` : ''}<div><b>מגש ${esc(baseById(pizza.base).name)}</b><div class="c-desc">${esc(pizzaDesc(pizza))}</div></div>`;
  caption('בתיאבון', 2200);
  setMode('done');
  busy = false;
});
$('#moreBtn').addEventListener('click', async () => {
  if (busy) return; busy = true;
  cur.toppings = []; syncToppings(); updatePrice();
  setMode('build');
  await scene?.newPizza();
  busy = false;
});

/* ---------- עגלה ---------- */
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#c99050"/><circle cx="32" cy="32" r="23" fill="#962515"/></svg>')}`;
const count = () => cart.reduce((s, c) => s + c.qty, 0);
function renderCart() {
  $('#cart').innerHTML = cart.map((c, i) => `
    <li data-i="${i}">
      <img src="${c.img || PLACEHOLDER}" alt="">
      <div><div class="c-name">מגש ${esc(baseById(c.base).name)}</div><div class="c-desc">${esc(pizzaDesc(c))}</div></div>
      <div class="c-side">
        <div class="qty"><button type="button" data-a="plus" aria-label="עוד אחד">+</button><span>${c.qty}</span><button type="button" data-a="minus" aria-label="אחד פחות">−</button></div>
        <button type="button" class="c-del" data-a="del">הסרה</button>
      </div>
    </li>`).join('');
  const n = count(), total = cart.reduce((s, c) => s + c.qty * pizzaPrice(c), 0);
  $('#cartEmpty').hidden = n > 0;
  $('#cartTotal').hidden = !n;
  $('#cartTotal').innerHTML = `<span>${n} ${n === 1 ? 'מגש' : 'מגשים'}</span>${P ? `<b>${money(total)}</b>` : ''}`;
  $('#cartBadge').hidden = !n; $('#cartBadge').textContent = n;
  renderSlots();
}
$('#cart').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const i = +b.closest('li').dataset.i, c = cart[i];
  if (b.dataset.a === 'plus') c.qty++;
  if (b.dataset.a === 'minus') c.qty = Math.max(1, c.qty - 1);
  if (b.dataset.a === 'del') cart.splice(i, 1);
  saveCart(); renderCart();
});

/* ---------- שעות ---------- */
let slotCounts = {};
async function loadSlots() {
  try { slotCounts = await fetchSlotCounts(saleKey); } catch (e) { console.warn('slots', e); slotCounts = {}; }
  renderSlots();
}
function renderSlots() {
  const max = cfg.maxPizzasPerSlot, need = Math.max(1, count());
  const chosen = $('#slots input:checked')?.value;
  $('#slots').innerHTML = cfg.timeSlots.map((t) => {
    const left = max ? max - (slotCounts[t] || 0) : Infinity;
    const full = left < need;
    const note = !max ? '' : left <= 0 ? 'מלא' : left <= 3 || full ? `נשארו ${left}` : 'פנוי';
    return `<label class="slot"><input type="radio" name="slot" value="${t}" ${full ? 'disabled' : ''} ${chosen === t && !full ? 'checked' : ''}><span>${t}<i>${note}</i></span></label>`;
  }).join('');
}
loadSlots(); renderCart();

/* ---------- שליחה ---------- */
const form = $('#orderForm');
form.addEventListener('input', (e) => { e.target.classList?.remove('bad'); });
form.addEventListener('change', (e) => { e.target.closest('.slots,.pays')?.classList.remove('bad'); });
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#formError'); err.textContent = '';
  const v = Object.fromEntries(new FormData(form).entries());
  const phone = (v.phone || '').replace(/\D/g, '');
  const problems = [];
  if (!cart.length) problems.push(cur.toppings.length ? 'המגש עוד לא נכנס לטאבון — לחצו "לטאבון" למעלה' : 'עוד אין מגשים בהזמנה');
  if (!v.firstName?.trim()) { problems.push('חסר שם פרטי'); form.firstName.classList.add('bad'); }
  if (!v.lastName?.trim()) { problems.push('חסר שם משפחה'); form.lastName.classList.add('bad'); }
  if (!/^05\d{8}$/.test(phone)) { problems.push('מספר נייד לא תקין'); form.phone.classList.add('bad'); }
  if (!v.slot) { problems.push('בחרו שעת איסוף'); $('#slots').classList.add('bad'); }
  if (!v.payment) { problems.push('בחרו צורת תשלום'); $('.pays').classList.add('bad'); }
  if (problems.length) { err.textContent = problems[0]; return; }

  const btn = $('#submitBtn'); btn.disabled = true; btn.textContent = 'שולחים…';
  const order = {
    saleDate: saleKey, slot: v.slot,
    firstName: v.firstName.trim(), lastName: v.lastName.trim(), phone,
    payment: v.payment, notes: (v.notes || '').trim(),
    pizzaCount: count(), total: P ? cart.reduce((s, c) => s + c.qty * pizzaPrice(c), 0) : '',
    items: cart.map((c) => ({ base: baseById(c.base).name, toppings: c.toppings.map((id) => topById(id).name), qty: c.qty, price: pizzaPrice(c) })),
    itemsText: cart.map((c) => `${c.qty}× ${baseById(c.base).name}${c.toppings.length ? ': ' + c.toppings.map((id) => topById(id).name).join(', ') : ''}`).join('\n'),
    createdAt: new Date().toISOString()
  };
  try {
    const res = await sendOrder(order);
    if (!res?.ok) throw new Error(res?.error || 'שגיאה');
    showDone(order, res.orderNo);
    cart = []; saveCart(); renderCart(); form.reset(); loadSlots();
  } catch (e2) {
    console.error(e2);
    err.textContent = e2.message === 'FULL' ? 'השעה הזו התמלאה הרגע — בחרו שעה אחרת' : 'משהו השתבש בשליחה. נסו שוב בעוד רגע.';
    if (e2.message === 'FULL') loadSlots();
  } finally {
    btn.disabled = !cfg.ordersOpen; btn.textContent = 'שליחת ההזמנה';
  }
});

function showDone(o, no) {
  $('#ddNo').textContent = `הזמנה מס׳ ${no} · ${heDate(saleDate)} בשעה ${o.slot}`;
  const amount = P ? ` ${money(o.total)}` : '';
  $('#ddBody').innerHTML = o.payment === 'מזומן'
    ? `<p>נתראה ב-${o.slot}. התשלום${amount} במזומן באיסוף.</p>`
    : `<div class="dd-pay"><div>להעביר${amount} ב${o.payment} למספר:</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="big">${fmtPhone(cfg.payPhone)}</span><button type="button" class="copy" id="copyNum">העתקה</button></div>
        <div class="c-desc">כדאי לרשום בהעברה את השם.</div></div>`;
  $('#copyNum')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(cfg.payPhone); toast('המספר הועתק'); } catch { toast(cfg.payPhone); } });
  $('#doneDialog').showModal();
}
$('#ddClose').addEventListener('click', () => $('#doneDialog').close());

let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
