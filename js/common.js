/* פונקציות משותפות לאתר ולדף הניהול */
export const cfg = window.PIZZA_CONFIG;
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const LOCAL_KEY = 'pizza.orders.local';

/* מועד סגירת ההזמנות למכירה בתאריך d */
export function closeDate(d) {
  const ov = cfg.closeOverride?.[ymd(d)];
  if (ov) return new Date(ov);
  const [ch, cm] = cfg.closeTime.split(':').map(Number);
  const back = ((cfg.saleWeekday - cfg.closeWeekday + 7) % 7) || 7;
  const c = new Date(d); c.setDate(d.getDate() - back); c.setHours(ch, cm, 0, 0);
  return c;
}
/* המכירה הקרובה שעוד אפשר להזמין אליה */
export function nextSaleDate(from = new Date()) {
  const d0 = new Date(from); d0.setHours(0, 0, 0, 0);
  for (let i = 0; i < 15; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    if (d.getDay() === cfg.saleWeekday && from < closeDate(d)) return d;
  }
}
export const heDay = (d) => `יום ${DAYS[d.getDay()]}`;
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const heDate = (d) => `יום ${DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
export const fmtPhone = (p) => { const s = String(p).replace(/\D/g, ''); return s.length === 10 ? `${s.slice(0, 3)}-${s.slice(3)}` : p; };
export const money = (n) => `${n} ₪`;
export const isLocal = () => !cfg.scriptUrl;

function localOrders() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; } }

/* מספר הפיצות שכבר הוזמנו בכל שעה */
export async function fetchSlotCounts(date) {
  if (isLocal()) {
    const counts = {};
    localOrders().filter((o) => o.saleDate === date).forEach((o) => { counts[o.slot] = (counts[o.slot] || 0) + o.pizzaCount; });
    return counts;
  }
  const r = await fetch(`${cfg.scriptUrl}?action=slots&date=${encodeURIComponent(date)}&t=${Date.now()}`, { cache: "no-store" });
  const j = await r.json();
  return j.counts || {};
}

export async function sendOrder(order) {
  if (isLocal()) {
    const all = localOrders();
    const n = all.filter((o) => o.saleDate === order.saleDate).length + 1;
    all.push({ ...order, orderNo: n });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    return { ok: true, orderNo: n };
  }
  // text/plain כדי להימנע מבקשת preflight מול Google
  const r = await fetch(cfg.scriptUrl, { method: 'POST', body: JSON.stringify(order), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  return r.json();
}

export async function fetchOrders(date, key) {
  if (isLocal()) return { ok: true, orders: localOrders().filter((o) => o.saleDate === date) };
  const r = await fetch(`${cfg.scriptUrl}?action=orders&date=${encodeURIComponent(date)}&key=${encodeURIComponent(key)}&t=${Date.now()}`, { cache: "no-store" });
  return r.json();
}

/* רשימת השבועות שיש בהם הזמנות (לדף הניהול) */
export async function fetchWeeks(key) {
  if (isLocal()) {
    const w = {};
    localOrders().forEach((o) => { w[o.saleDate] = w[o.saleDate] || { date: o.saleDate, orders: 0, pizzas: 0 }; w[o.saleDate].orders++; w[o.saleDate].pizzas += Number(o.pizzaCount) || 0; });
    return { ok: true, weeks: Object.values(w).sort((a, b) => b.date.localeCompare(a.date)) };
  }
  const r = await fetch(`${cfg.scriptUrl}?action=weeks&key=${encodeURIComponent(key)}&t=${Date.now()}`, { cache: "no-store" });
  return r.json();
}

/* מחיקה / עריכה של הזמנה (לדף הניהול) */
export async function adminEdit(action, saleDate, orderNo, key, order) {
  if (isLocal()) {
    let all = localOrders();
    const i = all.findIndex((o) => o.saleDate === saleDate && Number(o.orderNo) === Number(orderNo));
    if (i < 0) return { ok: false, error: 'NOTFOUND' };
    if (action === 'delete') all.splice(i, 1); else all[i] = { ...all[i], ...order };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    return { ok: true };
  }
  const r = await fetch(cfg.scriptUrl, { method: 'POST', body: JSON.stringify({ action, saleDate, orderNo, key, order }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  return r.json();
}
