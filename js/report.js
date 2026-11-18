import { cfg, nextSaleDate, ymd, fromYmd, heDate, fmtPhone, isLocal, fetchOrders, fetchWeeks, adminEdit, closeDate, heDay, fetchStatus, applyStatus, saveStatus, thisWeekSale, regularClose, OPEN_UNTIL } from './common.js?v=25';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

$('#date').value = ymd(nextSaleDate());
// קישור אישי: report.html#k=הסיסמה — נכנסים בלי להקליד
const hk = new URLSearchParams(location.hash.slice(1)).get('k');
if (hk) store.set('pizza.adminKey', hk);
$('#key').value = hk || store.get('pizza.adminKey') || '';
if (isLocal()) $('#key').style.display = 'none';

let orders = [];

async function load(quiet = false) {
  const date = $('#date').value;
  $('#title').textContent = `דוח הזמנות · ${heDate(fromYmd(date))}`;
  if (!quiet) $('#out').innerHTML = '<p class="empty">טוען…</p>';
  try {
    const key = $('#key').value.trim();
    const res = await fetchOrders(date, key);
    if (!res.ok) throw new Error(res.error === 'KEY' ? 'סיסמה שגויה' : res.error);
    store.set('pizza.adminKey', key);
    orders = res.orders.sort((a, b) => a.slot.localeCompare(b.slot) || a.orderNo - b.orderNo);
    render(date);
    loadWeeks(key);
  } catch (e) {
    if (quiet) return;
    $('#out').innerHTML = `<p class="empty">לא הצלחתי לטעון: ${esc(e.message)}</p>`;
  }
}

function render(date) {
  const doneKey = `pizza.done.${date}`;
  const done = new Set(JSON.parse(store.get(doneKey) || '[]'));
  const pizzas = orders.reduce((s, o) => s + Number(o.pizzaCount), 0);
  const money = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const byPay = {};
  orders.forEach((o) => { byPay[o.payment] = (byPay[o.payment] || 0) + (Number(o.total) || 0); });

  // מה צריך להכין: בסיסים ותוספות (לפי כמות)
  const prep = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    prep[it.base] = (prep[it.base] || 0) + it.qty;
    it.toppings.forEach((t) => { prep[t] = (prep[t] || 0) + it.qty; });
  }));

  let html = '';
  if (isLocal()) html += '<div class="note">מצב ניסיון: מוצגות רק הזמנות שנשמרו בדפדפן הזה. אחרי חיבור לגוגל שיטס יופיעו כאן כל ההזמנות.</div>';
  html += `<div class="tiles">
    <div class="tile"><b>${orders.length}</b><span>הזמנות</span></div>
    <div class="tile"><b>${pizzas}</b><span>פיצות</span></div>
    <div class="tile"><b>${money ? money + ' ₪' : '—'}</b><span>סה״כ</span></div>
    <div class="tile"><b style="font-size:16px;line-height:1.4">${Object.entries(byPay).map(([k, v]) => `${esc(k)}: ${v} ₪`).join('<br>') || '—'}</b><span>לפי תשלום</span></div>
  </div>`;
  if (!orders.length) { $('#out').innerHTML = html + '<p class="empty">אין עדיין הזמנות לתאריך הזה.</p>'; return; }

  html += `<h2>מה להכין</h2><div class="prep">${Object.entries(prep).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span>${esc(k)}<b>${v}</b></span>`).join('')}</div>`;
  html += '<h2>לפי שעות הכנה</h2>';
  const slots = [...new Set([...cfg.timeSlots, ...orders.map((o) => o.slot)])].sort();
  for (const s of slots) {
    const list = orders.filter((o) => o.slot === s);
    if (!list.length) continue;
    const n = list.reduce((a, o) => a + Number(o.pizzaCount), 0);
    html += `<section class="slot"><div class="slot-h"><span class="t">${esc(s)}</span><span class="c">${n} פיצות · ${list.length} הזמנות</span></div>`;
    for (const o of list) {
      const items = (o.items && o.items.length)
        ? o.items.map((it) => `<li><b>${it.qty}×</b> ${esc(it.base)}${it.toppings.length ? ' — ' + esc(it.toppings.join(', ')) : ''}</li>`).join('')
        : esc(o.itemsText).split('\n').map((l) => `<li>${l}</li>`).join('');
      html += `<div class="ord ${done.has(o.orderNo) ? 'done' : ''}" data-no="${o.orderNo}">
        <input type="checkbox" ${done.has(o.orderNo) ? 'checked' : ''} aria-label="הוכן">
        <div class="no">#${o.orderNo}</div>
        <div><div class="who">${esc(o.firstName)} ${esc(o.lastName)}<a href="tel:${esc(o.phone)}">${esc(fmtPhone(o.phone))}</a></div>
          <ul class="items">${items}</ul>${o.notes ? `<div class="notes">${esc(o.notes)}</div>` : ''}</div>
        <div class="pay"><b>${o.total ? esc(o.total) + ' ₪' : ''}</b>${esc(o.payment)}
          <div class="acts"><a class="wa" href="${waLink(o)}" target="_blank" rel="noopener">וואטסאפ: מוכנה</a><button type="button" data-act="edit">עריכה</button><button type="button" class="del" data-act="del">מחיקה</button></div></div>
      </div>`;
    }
    html += '</section>';
  }
  $('#out').innerHTML = html;
  $('#out').querySelectorAll('.ord input').forEach((cb) => cb.addEventListener('change', () => {
    const el = cb.closest('.ord'), no = Number(el.dataset.no);
    cb.checked ? done.add(no) : done.delete(no);
    el.classList.toggle('done', cb.checked);
    store.set(doneKey, JSON.stringify([...done]));
  }));
}

function csv() {
  const head = ['שעה', 'מס׳ הזמנה', 'שם', 'טלפון', 'פיצות', 'כמות', 'סכום', 'תשלום', 'הערות'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = orders.map((o) => [o.slot, o.orderNo, `${o.firstName} ${o.lastName}`, fmtPhone(o.phone), o.itemsText, o.pizzaCount, o.total, o.payment, o.notes]);
  const text = '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `הזמנות-פיצה-${$('#date').value}.csv`;
  a.click();
}

/* הודעת וואטסאפ ללקוח שההזמנה מוכנה */
function waLink(o) {
  const p = String(o.phone).replace(/\D/g, '').replace(/^0/, '972');
  const lines = String(o.itemsText || '').split('\n').filter(Boolean);
  const text = [`היי ${o.firstName}, הפיצה שלך מוכנה!`, ...lines, o.total ? `סה״כ ${o.total} ₪ (${o.payment})` : '', 'אפשר לבוא לאסוף'].filter(Boolean).join('\n');
  return `https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(text)}`;
}

/* ---------- שבועות ---------- */
async function loadWeeks(key) {
  try {
    const res = await fetchWeeks(key);
    if (!res.ok) return;
    const list = res.weeks.slice();
    const cur = $('#date').value;
    for (const d of [ymd(nextSaleDate()), cur]) if (d && !list.some((w) => w.date === d)) list.push({ date: d, orders: 0, pizzas: 0 });
    list.sort((a, b) => b.date.localeCompare(a.date));
    $('#weeks').innerHTML = list.map((w) => `<button type="button" data-d="${w.date}" class="${w.date === cur ? 'on' : ''}"><b>${esc(heDate(fromYmd(w.date)))}</b><span>${w.orders} הזמנות · ${w.pizzas} פיצות</span></button>`).join('');
  } catch {}
}
$('#weeks').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]'); if (!b) return;
  $('#date').value = b.dataset.d; load();
});

/* ---------- מחיקה ועריכה ---------- */
const FREE = cfg.freeToppings ?? 3, EXTRA = cfg.extraToppingPrice ?? 3;
const basePrice = (name) => (cfg.bases.find((b) => b.name === name) || cfg.bases[0]).price;
const itemPrice = (it) => basePrice(it.base) + Math.max(0, it.toppings.length - FREE) * EXTRA;
let editing = null;

$('#out').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const no = Number(b.closest('.ord').dataset.no);
  const o = orders.find((x) => Number(x.orderNo) === no); if (!o) return;
  if (b.dataset.act === 'del') {
    if (!confirm(`למחוק את הזמנה #${no} של ${o.firstName} ${o.lastName}?`)) return;
    b.disabled = true; b.textContent = 'מוחק…';
    const res = await adminEdit('delete', o.saleDate || $('#date').value, no, $('#key').value.trim());
    if (!res.ok) { alert('המחיקה נכשלה: ' + (res.error || '')); b.disabled = false; b.textContent = 'מחיקה'; return; }
    load(true);
  } else openEdit(o);
});

function openEdit(o) {
  editing = {
    o, items: (o.items && o.items.length ? o.items : [{ base: cfg.bases[0].name, toppings: [], qty: Number(o.pizzaCount) || 1 }])
      // כל מגש בשורה משלו, כדי שאפשר יהיה לערוך כל פיצה בנפרד
      .flatMap((it) => Array.from({ length: Math.max(1, Number(it.qty) || 1) }, () => ({ base: it.base, toppings: [...(it.toppings || [])], qty: 1 })))
  };
  drawEdit();
  $('#editDlg').showModal();
}
function drawEdit() {
  const { o, items } = editing, f = $('#editForm');
  const keep = f.querySelector('[name=firstName]') ? Object.fromEntries(['firstName', 'lastName', 'phone', 'slot', 'payment', 'notes'].map((k) => [k, f.elements[k].value])) : o;
  const opt = (arr, v) => arr.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const slots = [...new Set([...cfg.timeSlots, keep.slot])];
  const pays = [...new Set(['מזומן', 'ביט', 'פייבוקס', keep.payment].filter(Boolean))];
  f.innerHTML = `<h3>עריכת הזמנה #${o.orderNo}</h3>
    <div class="two"><label>שם פרטי<input name="firstName" value="${esc(keep.firstName)}"></label><label>שם משפחה<input name="lastName" value="${esc(keep.lastName)}"></label></div>
    <div class="two"><label>טלפון<input name="phone" dir="ltr" value="${esc(keep.phone)}"></label><label>שעת הכנה<select name="slot">${opt(slots, keep.slot)}</select></label></div>
    <label>תשלום<select name="payment">${opt(pays, keep.payment)}</select></label>
    ${items.map((it, i) => `<div class="it" data-i="${i}">
      <div class="it-h"><b class="it-n">מגש ${i + 1}</b><select data-f="base">${opt(cfg.bases.map((b) => b.name), it.base)}</select>
        <input type="number" min="1" max="20" data-f="qty" value="${it.qty}" aria-label="כמות">
        ${items.length > 1 ? '<button type="button" class="x" data-f="rm">הסרה</button>' : ''}</div>
      <div class="tops">${cfg.toppings.map((t) => `<label><input type="checkbox" data-f="top" value="${esc(t.name)}" ${it.toppings.includes(t.name) ? 'checked' : ''}>${esc(t.name)}</label>`).join('')}</div>
    </div>`).join('')}
    <button type="button" class="add" data-f="add">+ עוד מגש</button>
    <label>הערות<textarea name="notes" rows="2">${esc(keep.notes)}</textarea></label>
    <div class="ef-err" id="efErr"></div>
    <div class="ef-foot"><span class="sum" id="efSum"></span>
      <div class="ef-btns"><button type="button" data-f="cancel">ביטול</button><button type="button" class="main" data-f="save">שמירה</button></div></div>`;
  sumEdit();
}
function sumEdit() {
  const t = editing.items.reduce((s, it) => s + it.qty * itemPrice(it), 0);
  const n = editing.items.reduce((s, it) => s + it.qty, 0);
  $('#efSum').textContent = `${n} מגשים · ${t} ₪`;
}
$('#editForm').addEventListener('input', (e) => {
  const box = e.target.closest('.it'); if (!box) return;
  const it = editing.items[Number(box.dataset.i)], f = e.target.dataset.f;
  if (f === 'base') it.base = e.target.value;
  if (f === 'qty') it.qty = Math.max(1, Number(e.target.value) || 1);
  if (f === 'top') it.toppings = [...box.querySelectorAll('[data-f=top]:checked')].map((c) => c.value);
  sumEdit();
});
$('#editForm').addEventListener('click', async (e) => {
  const f = e.target.dataset?.f; if (!f) return;
  if (f === 'add') { editing.items.push({ base: cfg.bases[0].name, toppings: [], qty: 1 }); drawEdit(); }
  if (f === 'rm') { editing.items.splice(Number(e.target.closest('.it').dataset.i), 1); drawEdit(); }
  if (f === 'cancel') $('#editDlg').close();
  if (f === 'save') {
    const el = $('#editForm').elements, phone = el.phone.value.replace(/\D/g, '');
    if (!el.firstName.value.trim()) { $('#efErr').textContent = 'חסר שם'; return; }
    if (!/^05\d{8}$/.test(phone)) { $('#efErr').textContent = 'מספר נייד לא תקין'; return; }
    const items = editing.items.map((it) => ({ ...it, price: itemPrice(it) }));
    const order = {
      firstName: el.firstName.value.trim(), lastName: el.lastName.value.trim(), phone, slot: el.slot.value,
      payment: el.payment.value, notes: el.notes.value.trim(), items,
      pizzaCount: items.reduce((s, it) => s + it.qty, 0),
      total: cfg.showPrices === false ? '' : items.reduce((s, it) => s + it.qty * it.price, 0),
      itemsText: items.map((it) => `${it.qty}× ${it.base}${it.toppings.length ? ': ' + it.toppings.join(', ') : ''}`).join('\n')
    };
    e.target.disabled = true; e.target.textContent = 'שומר…';
    const res = await adminEdit('update', editing.o.saleDate || $('#date').value, editing.o.orderNo, $('#key').value.trim(), order);
    e.target.disabled = false; e.target.textContent = 'שמירה';
    if (!res.ok) { $('#efErr').textContent = 'השמירה נכשלה: ' + (res.error || ''); return; }
    $('#editDlg').close(); load(true);
  }
});

$('#load').addEventListener('click', () => load());
$('#date').addEventListener('change', () => load());
$('#print').addEventListener('click', () => print());
$('#csv').addEventListener('click', csv);
/* ---------- פתיחה / סגירה של ההזמנות באתר ---------- */
let status = {};
const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
function drawStatus() {
  applyStatus(status);
  const now = new Date();
  const next = nextSaleDate();
  const wk = thisWeekSale(), wkKey = ymd(wk);
  const wkEnd = new Date(`${wkKey}T${OPEN_UNTIL}`);
  const late = now >= regularClose(wk) && now < wkEnd; // מועד הסגירה הרגיל של השבוע עבר
  const line = !cfg.ordersOpen
    ? `<div class="st off"><i></i>ההזמנות באתר סגורות<small>אף אחד לא יכול להזמין עד שתפתח שוב</small></div>`
    : `<div class="st"><i></i>האתר מקבל הזמנות ל${esc(heDate(next))}<small>עד ${esc(heDay(closeDate(next)))} ${hm(closeDate(next))}</small></div>`;
  let btns = '';
  if (late && status.openSale === wkKey) btns += `<button type="button" data-s="close-week">סגירת ההזמנות ל${esc(heDay(wk))} ${wk.getDate()}.${wk.getMonth() + 1}</button>`;
  else if (late) btns += `<button type="button" class="go" data-s="open-week">פתיחת הזמנות ל${esc(heDay(wk))} ${wk.getDate()}.${wk.getMonth() + 1}</button>`;
  btns += status.paused
    ? `<button type="button" class="go" data-s="resume">פתיחת ההזמנות באתר</button>`
    : `<button type="button" data-s="pause">עצירת כל ההזמנות</button>`;
  $('#status').innerHTML = line + btns;
}
async function loadStatus() {
  try { status = await fetchStatus(); drawStatus(); } catch (e) { console.warn('status', e); }
}
$('#status').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-s]'); if (!b) return;
  const a = b.dataset.s, wkKey = ymd(thisWeekSale());
  const patch = a === 'open-week' ? { openSale: wkKey } : a === 'close-week' ? { openSale: '' } : { paused: a === 'pause' };
  b.disabled = true; b.textContent = 'שומר…';
  try {
    const res = await saveStatus($('#key').value.trim(), patch);
    if (!res.ok) throw new Error(res.error === 'KEY' ? 'סיסמה שגויה' : res.error);
    status = res; drawStatus(); loadWeeks($('#key').value.trim());
  } catch (err) { alert('לא נשמר: ' + err.message); drawStatus(); }
});

loadStatus();
if (isLocal() || $('#key').value) load();
// רענון אוטומטי כל דקה, כדי שהזמנות חדשות יופיעו לבד
setInterval(() => { if (!document.hidden && (isLocal() || $('#key').value)) { load(true); loadStatus(); } }, 60000);
