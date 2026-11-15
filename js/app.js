import { cfg, nextSaleDate, ymd, heDate, money, fmtPhone, fetchSlotCounts, sendOrder } from './common.js';

const $ = (s, el = document) => el.querySelector(s);
const panel = $('#panel');
const P = cfg.showPrices;
const saleDate = nextSaleDate();
const saleKey = ymd(saleDate);

/* ---------- כותרת המכירה ---------- */
const slotsRange = `${cfg.timeSlots[0]}–${cfg.timeSlots[cfg.timeSlots.length - 1]}`;
$('#salePill').textContent = `${heDate(saleDate)} · ${slotsRange}`;
$('#footDate').textContent = `המכירה הקרובה: ${heDate(saleDate)}`;
document.querySelectorAll('.pay .num').forEach((el) => { el.textContent = fmtPhone(cfg.payPhone); });
if (!cfg.ordersOpen) { $('#closedNote').hidden = false; $('#submitBtn').disabled = true; }

/* ---------- הסצנה ---------- */
let scene = null;
try {
  const { createPizzaScene } = await import('./scene.js');
  scene = createPizzaScene($('#pizzaCanvas'));
} catch (e) {
  console.error(e);
  $('#stage').classList.add('no3d');
  $('#caption').textContent = 'הדפדפן לא תומך בתלת־ממד — אפשר להזמין כרגיל';
  $('#caption').classList.add('show');
}

/* ---------- מצב הפיצה הנוכחית ---------- */
const cur = { base: cfg.bases[0].id, toppings: [] };
let cart = [];
try { cart = JSON.parse(sessionStorage.getItem('pizza.cart') || '[]'); } catch {}
const saveCart = () => { try { sessionStorage.setItem('pizza.cart', JSON.stringify(cart)); } catch {} };

const baseById = (id) => cfg.bases.find((b) => b.id === id);
const topById = (id) => cfg.toppings.find((t) => t.id === id);
const pizzaPrice = (p) => baseById(p.base).price + p.toppings.reduce((s, id) => s + (topById(id)?.price || 0), 0);
const pizzaDesc = (p) => (p.toppings.length ? p.toppings.map((id) => topById(id).name).join(', ') : 'בלי תוספות');

/* ---------- כרטיסי בסיס ---------- */
$('#bases').innerHTML = cfg.bases.map((b) => `
  <button type="button" class="base" role="radio" data-id="${b.id}" aria-checked="${b.id === cur.base}">
    <span class="base-swatch ${b.id}"></span>
    <span><b>${b.name}${P ? ` · ${money(b.price)}` : ''}</b><i>${b.desc}</i></span>
  </button>`).join('');
$('#bases').addEventListener('click', (e) => {
  const b = e.target.closest('.base'); if (!b || busy) return;
  cur.base = b.dataset.id;
  document.querySelectorAll('.base').forEach((x) => x.setAttribute('aria-checked', x === b));
  scene?.setBase(cur.base);
  if (scene?.state === 'build') caption(cur.base === 'red' ? 'רוטב עגבניות' : 'שמן זית ושום', 1600);
  updatePrice();
});

/* ---------- כרטיסי תוספות (עם אייקון תלת־ממדי) ---------- */
let icons = {};
try { icons = scene ? scene.makeIcons(cfg.toppings.map((t) => t.id)) : {}; } catch (e) { console.warn(e); }
$('#toppings').innerHTML = cfg.toppings.map((t) => `
  <button type="button" class="top" data-id="${t.id}" aria-pressed="false">
    ${icons[t.id] ? `<img src="${icons[t.id]}" alt="">` : '<span class="ph">🍕</span>'}
    <b>${t.name}</b>${P ? `<small>+${money(t.price)}</small>` : ''}
  </button>`).join('');
$('#toppings').addEventListener('click', (e) => {
  const b = e.target.closest('.top'); if (!b || busy) return;
  const id = b.dataset.id, on = !cur.toppings.includes(id);
  cur.toppings = on ? [...cur.toppings, id] : cur.toppings.filter((x) => x !== id);
  b.setAttribute('aria-pressed', on);
  scene?.setToppings(cur.toppings);
  if (on) caption(topById(id).name, 1200);
  updatePrice();
});
function syncToppingButtons() {
  document.querySelectorAll('.top').forEach((b) => b.setAttribute('aria-pressed', cur.toppings.includes(b.dataset.id)));
}
function updatePrice() {
  $('#topCount').textContent = cur.toppings.length ? `${cur.toppings.length} נבחרו` : '';
  $('#priceNow').innerHTML = P ? `<b>${money(pizzaPrice(cur))}</b> לפיצה` : '';
}
updatePrice();

/* ---------- כיתוב על הבמה ---------- */
let capTimer;
function caption(text, ms) {
  const c = $('#caption');
  c.textContent = text; c.classList.add('show');
  clearTimeout(capTimer);
  if (ms) capTimer = setTimeout(() => c.classList.remove('show'), ms);
}

/* ---------- פתיחה ---------- */
let busy = false;
const INTRO = { dough: 'כדור בצק שתפח לאט', stretch: 'פותחים ביד', sauce: '', cheese: 'מוצרלה', ready: 'עכשיו — התוספות שלכם' };
$('#startBtn').addEventListener('click', async () => {
  setMode('build'); busy = true;
  if (scene) {
    await scene.playIntro((s) => {
      caption(s === 'sauce' ? (cur.base === 'red' ? 'רוטב עגבניות' : 'שמן זית ושום') : INTRO[s], s === 'ready' ? 2200 : 0);
    });
  }
  busy = false;
});
$('#skipBtn').addEventListener('click', () => { scene?.skipIntro(); setMode('build'); });
function setMode(m) {
  panel.dataset.mode = m;
  if (matchMedia('(max-width: 860px)').matches && m !== 'build') panel.scrollIntoView({ block: 'nearest' });
}

/* ---------- לטאבון ---------- */
const STAGES = ['peel', 'in', 'baking', 'out'];
const OVEN_TITLES = { peel: 'על המרדה', in: 'פנימה, אל האש', baking: 'נאפית בטאבון', out: 'יוצאת חמה!' };
$('#bakeBtn').addEventListener('click', async () => {
  if (busy) return;
  if (!cfg.ordersOpen) return toast('ההזמנות סגורות השבוע');
  busy = true;
  const pizza = { base: cur.base, toppings: [...cur.toppings] };
  setMode('oven');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const steps = [...document.querySelectorAll('#ovenSteps li')];
  const meter = $('#ovenMeter');
  const mark = (s) => {
    const i = STAGES.indexOf(s);
    steps.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('ok', k < i); });
    $('#ovenTitle').textContent = OVEN_TITLES[s];
  };
  let img = null;
  if (scene) {
    await scene.bake((s, p) => {
      if (STAGES.includes(s)) mark(s);
      if (s === 'baking') meter.hidden = false;
      if (s === 'bakeProgress') { $('#ovenSec').textContent = Math.round(90 * (1 - p)); $('#ovenBar').style.width = `${p * 100}%`; }
      if (s === 'out') meter.hidden = true;
    });
    img = scene.snapshot(240);
  }
  meter.hidden = true;
  steps.forEach((li) => { li.classList.remove('on'); li.classList.add('ok'); });
  // אם אותה פיצה כבר בעגלה — מגדילים כמות
  const same = cart.find((c) => c.base === pizza.base && c.toppings.join() === [...pizza.toppings].sort().join() && c.toppings.length === pizza.toppings.length);
  pizza.toppings.sort();
  if (same) { same.qty++; if (img) same.img = img; }
  else cart.push({ ...pizza, qty: 1, img, uid: Date.now() });
  saveCart(); renderCart();
  $('#doneCard').innerHTML = `${img ? `<img src="${img}" alt="">` : ''}
    <div><b>${baseById(pizza.base).name}</b><div class="c-desc">${pizzaDesc(pizza)}</div>${P ? `<b>${money(pizzaPrice(pizza))}</b>` : ''}</div>`;
  caption('בתיאבון!', 2200);
  setMode('done');
  busy = false;
});
$('#moreBtn').addEventListener('click', async () => {
  if (busy) return; busy = true;
  cur.toppings = []; syncToppingButtons(); updatePrice();
  setMode('build');
  caption('פיצה חדשה בדרך', 1800);
  await scene?.newPizza();
  busy = false;
});

/* ---------- עגלה ---------- */
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#d9a35f"/><circle cx="32" cy="32" r="23" fill="#b8321c"/></svg>')}`;
function renderCart() {
  const ul = $('#cart');
  ul.innerHTML = cart.map((c, i) => `
    <li data-i="${i}">
      <img src="${c.img || PLACEHOLDER}" alt="">
      <div><div class="c-name">פיצה ${baseById(c.base).name}</div><div class="c-desc">${pizzaDesc(c)}</div></div>
      <div class="c-side">
        <div class="qty"><button type="button" data-a="plus" aria-label="עוד אחת">+</button><span>${c.qty}</span><button type="button" data-a="minus" aria-label="פחות אחת">−</button></div>
        <button type="button" class="c-del" data-a="del">הסרה</button>
      </div>
    </li>`).join('');
  $('#cartEmpty').hidden = cart.length > 0;
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.qty * pizzaPrice(c), 0);
  $('#cartTotal').hidden = !cart.length;
  $('#cartTotal').innerHTML = `<span>${count} ${count === 1 ? 'פיצה' : 'פיצות'}</span>${P ? `<span>${money(total)}</span>` : ''}`;
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
  const max = cfg.maxPizzasPerSlot;
  const need = Math.max(1, cart.reduce((s, c) => s + c.qty, 0));
  const chosen = $('#slots input:checked')?.value;
  $('#slots').innerHTML = cfg.timeSlots.map((t) => {
    const left = max ? max - (slotCounts[t] || 0) : Infinity;
    const full = left < need;
    const note = !max ? '' : left <= 0 ? 'מלא' : full ? `נשארו ${left}` : left <= 3 ? `נשארו ${left}` : 'פנוי';
    return `<label class="slot"><input type="radio" name="slot" value="${t}" ${full ? 'disabled' : ''} ${chosen === t && !full ? 'checked' : ''}><span>${t}<i>${note}</i></span></label>`;
  }).join('');
}
loadSlots();
renderCart();

/* ---------- שליחה ---------- */
const form = $('#orderForm');
form.addEventListener('input', (e) => { e.target.classList?.remove('bad'); e.target.closest('.slots,.pays')?.classList.remove('bad'); });
form.addEventListener('change', (e) => { e.target.closest('.slots,.pays')?.classList.remove('bad'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#formError'); err.textContent = '';
  const fd = new FormData(form);
  const v = Object.fromEntries(fd.entries());
  const phone = (v.phone || '').replace(/\D/g, '');
  const problems = [];
  if (!cart.length) problems.push(cur.toppings.length ? 'הפיצה עוד לא נכנסה לטאבון — לחצו "לטאבון!" למעלה' : 'עוד אין פיצות בהזמנה');
  if (!v.firstName?.trim()) { problems.push('חסר שם פרטי'); form.firstName.classList.add('bad'); }
  if (!v.lastName?.trim()) { problems.push('חסר שם משפחה'); form.lastName.classList.add('bad'); }
  if (!/^05\d{8}$/.test(phone)) { problems.push('מספר נייד לא תקין'); form.phone.classList.add('bad'); }
  if (!v.slot) { problems.push('בחרו שעת איסוף'); $('#slots').classList.add('bad'); }
  if (!v.payment) { problems.push('בחרו צורת תשלום'); $('.pays').classList.add('bad'); }
  if (problems.length) { err.textContent = problems[0]; return; }

  const btn = $('#submitBtn'); btn.disabled = true; btn.textContent = 'שולחים…';
  const pizzaCount = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.qty * pizzaPrice(c), 0);
  const order = {
    saleDate: saleKey, slot: v.slot,
    firstName: v.firstName.trim(), lastName: v.lastName.trim(), phone,
    payment: v.payment, notes: (v.notes || '').trim(),
    pizzaCount, total: P ? total : '',
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
    ? `<p>מחכים לך ב-${o.slot} עם פיצה חמה.<br>התשלום${amount} במזומן באיסוף.</p>`
    : `<div class="dd-pay"><div>להעביר${amount} ב${o.payment} למספר:</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="big">${fmtPhone(cfg.payPhone)}</span><button type="button" class="copy" id="copyNum">העתקה</button></div>
        <div class="c-desc">כדאי לרשום בהערה את השם, שנדע שזה ממך.</div></div>`;
  $('#copyNum')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cfg.payPhone); toast('המספר הועתק'); } catch { toast(cfg.payPhone); }
  });
  $('#doneDialog').showModal();
}
$('#ddClose').addEventListener('click', () => $('#doneDialog').close());

let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
