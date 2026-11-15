import { cfg, nextSaleDate, ymd, fromYmd, heDate, fmtPhone, isLocal, fetchOrders } from './common.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

$('#date').value = ymd(nextSaleDate());
$('#key').value = store.get('pizza.adminKey') || '';
if (isLocal()) $('#key').style.display = 'none';

let orders = [];

async function load() {
  const date = $('#date').value;
  $('#title').textContent = `דוח הזמנות · ${heDate(fromYmd(date))}`;
  $('#out').innerHTML = '<p class="empty">טוען…</p>';
  try {
    const key = $('#key').value.trim();
    const res = await fetchOrders(date, key);
    if (!res.ok) throw new Error(res.error === 'KEY' ? 'סיסמה שגויה' : res.error);
    store.set('pizza.adminKey', key);
    orders = res.orders.sort((a, b) => a.slot.localeCompare(b.slot) || a.orderNo - b.orderNo);
    render(date);
  } catch (e) {
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
        <div class="pay"><b>${o.total ? esc(o.total) + ' ₪' : ''}</b>${esc(o.payment)}</div>
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

$('#load').addEventListener('click', load);
$('#date').addEventListener('change', load);
$('#print').addEventListener('click', () => print());
$('#csv').addEventListener('click', csv);
if (isLocal() || $('#key').value) load();
