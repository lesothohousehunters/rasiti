// What Rasiti knows right now, for email reports and alerts: figures for a period, actions needed, what is coming up,
// and forecasts from the same learning models the website uses (public/ml.js). No customer phone numbers leave here.
import { readFile } from 'node:fs/promises';

let MLM = null;
async function ml() { if (MLM) return MLM; const src = await readFile(new URL('../../public/ml.js', import.meta.url), 'utf8'); const g = {}; new Function('window', src)(g); return (MLM = g.RASITI_ML); }

const DAY = 86400000, TZ = 2 * 3600000; // Lesotho: UTC+2 all year
const RATE = Number(process.env.SBT_DEMO_RATE || 0.03);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const M = n => 'M' + Math.round(Number(n) || 0).toLocaleString('en-US');
const L = t => new Date(t + TZ);                                  // local clock read with UTC getters
const fromLocal = (y, m, d) => Date.UTC(y, m, d) - TZ;            // local midnight -> timestamp
const fD = t => { const d = L(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
const qOf = t => { const d = L(t); return d.getUTCFullYear() + '-Q' + (Math.floor(d.getUTCMonth() / 3) + 1); };
const qStart = p => { const [y, q] = p.split('-Q').map(Number); return fromLocal(y, (q - 1) * 3, 1); };
const qNext = p => { const [y, q] = p.split('-Q').map(Number); return q === 4 ? (y + 1) + '-Q1' : y + '-Q' + (q + 1); };
const qPrev = p => { const [y, q] = p.split('-Q').map(Number); return q === 1 ? (y - 1) + '-Q4' : y + '-Q' + (q - 1); };
const qDue = p => { const [y, q] = p.split('-Q').map(Number); return fromLocal(y, q * 3, 20) + DAY - 1; };
const qName = p => { const [y, q] = p.split('-Q').map(Number); return `${MON[(q - 1) * 3]}–${MON[(q - 1) * 3 + 2]} ${y}`; };
export const FREQ = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', half_year: 'Every 6 months', annual: 'Yearly', instant: 'As soon as something happens' };

// The period a scheduled email covers (the last complete one), and a key that changes once per period.
export function periodOf(freq, now, rolling) {
  const d = L(now), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  const today = fromLocal(y, m, day);
  if (rolling) { const n = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, half_year: 182, annual: 365, instant: 1 }[freq] || 7; return { from: now - n * DAY, to: now, key: 'manual', label: `the last ${n === 1 ? '24 hours' : n + ' days'}` }; }
  if (freq === 'daily' || freq === 'instant') return { from: today - DAY, to: today, key: `${y}-${m + 1}-${day}`, label: fD(today - DAY) };
  if (freq === 'weekly') { const dow = (d.getUTCDay() + 6) % 7; const mon = today - dow * DAY; return { from: mon - 7 * DAY, to: mon, key: 'w' + fD(mon), label: `${fD(mon - 7 * DAY)} to ${fD(mon - DAY)}` }; }
  if (freq === 'monthly') { const a = fromLocal(y, m - 1, 1), b = fromLocal(y, m, 1); return { from: a, to: b, key: `${y}-${m}`, label: `${MON[L(a).getUTCMonth()]} ${L(a).getUTCFullYear()}` }; }
  if (freq === 'quarterly') { const p = qPrev(qOf(now)); return { from: qStart(p), to: qStart(qNext(p)), key: p, label: qName(p) }; }
  if (freq === 'half_year') { const h = m < 6 ? 0 : 6; const a = fromLocal(h ? y : y - 1, h ? 0 : 6, 1), b = fromLocal(y, h, 1); return { from: a, to: b, key: `${y}-H${h ? 2 : 1}`, label: `${MON[L(a).getUTCMonth()]}–${MON[L(b - DAY).getUTCMonth()]} ${L(a).getUTCFullYear()}` }; }
  return { from: fromLocal(y - 1, 0, 1), to: fromLocal(y, 0, 1), key: String(y), label: String(y - 1) };
}

export async function build(q, win, now) {
  now = now || Date.now();
  const iso = t => new Date(t).toISOString(); const pfrom = win.from - (win.to - win.from);
  // ---------- figures for the period, and the one before ----------
  const fig = async (a, b) => { const [r] = await q(`SELECT count(*)::int AS n, COALESCE(sum(amount),0)::float AS v,
      count(*) FILTER (WHERE channel='cash')::int AS cash, count(*) FILTER (WHERE channel='momo')::int AS momo, count(*) FILTER (WHERE channel='card')::int AS card,
      count(DISTINCT phone)::int AS buyers FROM receipts WHERE flag IS NULL AND issued_at >= $1 AND issued_at < $2`, [iso(a), iso(b)]);
    const [s] = await q(`SELECT count(*) FILTER (WHERE joined_at >= $1 AND joined_at < $2)::int AS joined, count(*) FILTER (WHERE registered_at >= $1 AND registered_at < $2)::int AS registered FROM sellers`, [iso(a), iso(b)]);
    const [t] = await q(`SELECT (SELECT count(*)::int FROM returns WHERE filed_at >= $1 AND filed_at < $2) AS returns, (SELECT COALESCE(sum(amount),0)::float FROM payments WHERE paid_at >= $1 AND paid_at < $2) AS paid,
      (SELECT count(*)::int FROM claims WHERE created_at >= $1 AND created_at < $2) AS claims, (SELECT count(*)::int FROM claims WHERE created_at >= $1 AND created_at < $2 AND state='confirmed') AS confirmed,
      (SELECT count(*)::int FROM fakes WHERE created_at >= $1 AND created_at < $2) AS fakes, (SELECT count(*)::int FROM receipts WHERE flag IS NOT NULL AND issued_at >= $1 AND issued_at < $2) AS voided`, [iso(a), iso(b)]);
    return { ...r, ...s, ...t }; };
  const cur = await fig(win.from, win.to), prev = await fig(pfrom, win.from);
  const [tot] = await q("SELECT count(*)::int AS sellers, count(*) FILTER (WHERE status='registered')::int AS registered, count(*) FILTER (WHERE via_rasiti)::int AS via FROM sellers");

  // ---------- actions needed now ----------
  const alerts = []; const add = (key, level, title, detail, page, drill) => alerts.push({ key, level, title, detail, page: page || 'officer', drill: drill || null });
  const sellers = await q('SELECT no, name, market, status, phone, helper, registered_at FROM sellers'); const byNo = Object.fromEntries(sellers.map(s => [s.no, s]));
  const rets = await q('SELECT seller_no, period, declared::float AS declared, tax_due::float AS tax_due, nil_reason, filed_at FROM returns');
  const pays = await q('SELECT seller_no, period, sum(amount)::float AS paid FROM payments GROUP BY 1,2'); const paidOf = (no, p) => (pays.find(x => x.seller_no === no && x.period === p) || {}).paid || 0;
  for (const r of rets) { const owe = r.tax_due - paidOf(r.seller_no, r.period); if (owe > 0.5 && qDue(r.period) < now && byNo[r.seller_no])
    add(`overdue:${r.seller_no}:${r.period}`, 'high', `${byNo[r.seller_no].name}: ${M(owe)} tax overdue`, `For ${qName(r.period)}, due ${fD(qDue(r.period))}. Offer a payment plan; small weekly payments are allowed.`, 'officer', 'seller:' + r.seller_no); }
  const lp = qPrev(qOf(now)), due = qDue(lp); const regs = sellers.filter(s => s.status === 'registered' && (!s.registered_at || Date.parse(s.registered_at) < qStart(qNext(lp))));
  const notFiled = regs.filter(s => !rets.some(r => r.seller_no === s.no && r.period === lp));
  if (due < now) for (const s of notFiled) add(`missing:${s.no}:${lp}`, 'high', `${s.name}: ${qName(lp)} return not filed`, `It was due ${fD(due)}. Send a reminder or call; the return is prefilled from the sales book.`, 'officer', 'seller:' + s.no);
  for (const r of rets.filter(r => r.period === lp && r.declared === 0)) { const [x] = await q('SELECT COALESCE(sum(amount),0)::float AS v FROM receipts WHERE seller_no=$1 AND flag IS NULL AND issued_at >= $2 AND issued_at < $3', [r.seller_no, iso(qStart(lp)), iso(qStart(qNext(lp)))]);
    if (x.v > 1000 && byNo[r.seller_no]) add(`nil:${r.seller_no}:${lp}`, 'high', `${byNo[r.seller_no].name}: nil return but receipts show ${M(x.v)}`, `${qName(lp)}. A friendly call first: it can be a mistake.`, 'officer', 'seller:' + r.seller_no); }
  const cashRef = await q(`WITH c AS (SELECT seller_no, phone, state, created_at FROM claims WHERE created_at > now() - interval '30 days'),
      est AS (SELECT DISTINCT phone FROM receipts WHERE channel <> 'cash' AND phone IS NOT NULL)
    SELECT seller_no, count(*)::int AS n, count(*) FILTER (WHERE state='rejected' OR (state='pending' AND created_at < now() - interval '3 days'))::int AS refused,
      count(DISTINCT phone) FILTER (WHERE (state='rejected' OR (state='pending' AND created_at < now() - interval '3 days')) AND phone IN (SELECT phone FROM est))::int AS buyers
    FROM c GROUP BY 1`);
  for (const c of cashRef) if (c.buyers >= 3 && c.refused >= c.n / 2 && byNo[c.seller_no]) add(`cashref:${c.seller_no}:${L(now).getUTCMonth()}`, 'medium', `${byNo[c.seller_no].name}: ${c.refused} of ${c.n} cash claims rejected or ignored`, `From ${c.buyers} different buyers who also pay by mobile money or card. A friendly visit, never a bill.`, 'officer', 'seller:' + c.seller_no);
  const exp = await q("SELECT seller_no, count(*)::int AS n FROM claims WHERE state='pending' AND created_at < now() - interval '2 days' AND created_at > now() - interval '3 days' GROUP BY 1");
  for (const e of exp) if (byNo[e.seller_no]) add(`cashexp:${e.seller_no}:${fD(now)}`, 'info', `${byNo[e.seller_no].name}: ${e.n} cash claim${e.n === 1 ? '' : 's'} expire tomorrow`, 'Remind the seller to confirm real cash sales on *999# > 2 > 1.', 'officer', 'seller:' + e.seller_no);
  const leads = await q(`SELECT place_key, max(place_label) AS label, max(area) AS area, count(DISTINCT phone)::int AS people FROM reports
    WHERE place_key IS NOT NULL AND type <> 'got' AND created_at > now() - interval '30 days' GROUP BY 1 HAVING count(DISTINCT phone) >= 3`);
  for (const l of leads) add(`lead:${l.place_key}`, 'medium', `New lead: ${l.label}`, `${l.people} different customers reported it (${l.area || 'area not given'}). Book an assisted enrolment visit.`, 'officer', 'shop:P' + l.place_key);
  for (const s of sellers.filter(s => s.helper && s.status === 'enrolled')) add(`helper:${s.no}`, 'high', `${s.name} asked a tax helper to call`, 'Call back within 2 working days to help them register.', 'officer', 'seller:' + s.no);
  const flagged = await q("SELECT seller_no, flag, count(*)::int AS n FROM receipts WHERE flag IS NOT NULL AND issued_at > now() - interval '7 days' GROUP BY 1,2");
  for (const f of flagged) if (byNo[f.seller_no]) add(`flag:${f.seller_no}:${f.flag}:${fD(now)}`, 'medium', `${byNo[f.seller_no].name}: ${f.n} payment${f.n === 1 ? '' : 's'} ${f.flag === 'payback' ? 'sent back to the payer' : 'reversed'} this week`, 'The receipts were voided automatically. Check the Fraud Shield for a pattern.', 'shield', 'seller:' + f.seller_no);
  const self = await q(`SELECT r.seller_no, count(*)::int AS n FROM receipts r JOIN sellers s ON s.no=r.seller_no LEFT JOIN reviews v ON v.code=r.code
    WHERE r.phone = s.phone AND v.code IS NULL AND r.issued_at > now() - interval '30 days' GROUP BY 1`);
  for (const x of self) add(`self:${x.seller_no}`, 'medium', `${byNo[x.seller_no].name}: ${x.n} receipt${x.n === 1 ? '' : 's'} bought from their own phone`, 'Blocked from the draw by the Fraud Shield. Review it in the officer console.', 'shield', 'seller:' + x.seller_no);
  const vel = await q(`SELECT seller_no, count(*)::int AS n FROM (SELECT seller_no, phone, date_trunc('day', issued_at) d, count(*) c FROM receipts WHERE phone IS NOT NULL AND issued_at > now() - interval '7 days' GROUP BY 1,2,3 HAVING count(*) >= 6) z GROUP BY 1`);
  for (const x of vel) if (byNo[x.seller_no]) add(`vel:${x.seller_no}:${fD(now)}`, 'medium', `${byNo[x.seller_no].name}: one phone with 6 or more receipts in a day`, 'Draw entries are held for an officer. A reseller stocking up, or someone farming entries?', 'officer', 'seller:' + x.seller_no);
  const [fk] = await q("SELECT count(*)::int AS n FROM fakes WHERE created_at > now() - interval '7 days' AND kind IN ('forged','unknown','tampered')");
  if (fk.n) add(`fakes:${qOf(now)}:${Math.floor((now + TZ) / (7 * DAY))}`, 'info', `${fk.n} fake or altered receipt code${fk.n === 1 ? '' : 's'} caught this week`, 'Customers checked them on *999#. See the Fraud Shield.', 'shield');
  const d = L(now), ms = fromLocal(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const [dr] = await q('SELECT count(*)::int AS n FROM draws WHERE run_at >= $1', [iso(ms)]);
  if (!dr.n && d.getUTCDate() <= 10) add(`draw:${d.getUTCFullYear()}-${d.getUTCMonth()}`, 'high', `Run the ${MON[(d.getUTCMonth() + 11) % 12]} draw`, 'Clear the review queue first, then run the monthly draw.', 'draw');

  // ---------- forecasts (models learn from the last 112 days) ----------
  const ML = await ml(); const N = 112, today = fromLocal(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), first = today - N * DAY;
  const rows = await q(`SELECT seller_no, floor((extract(epoch from issued_at) * 1000 - $1) / 86400000)::int AS i, sum(amount)::float AS v FROM receipts WHERE flag IS NULL AND issued_at >= $2 AND issued_at < $3 GROUP BY 1,2`, [first, iso(first), iso(today)]);
  const all = Array(N).fill(0), per = {}; for (const r of rows) { if (r.i < 0 || r.i >= N) continue; all[r.i] += r.v; (per[r.seller_no] = per[r.seller_no] || Array(N).fill(0))[r.i] += r.v; }
  let s0 = all.findIndex(x => x > 0); const ys = s0 < 0 ? [] : all.slice(s0); let fc = null;
  if (ys.length >= 21) { const m = ML.fit(ys); const f = ML.forecast(m, 92); const bt = ML.backtest(ys, 14); const sum = (a, k) => a.reduce((x, y) => x + y[k], 0);
    const next7 = sum(f.slice(0, 7), 'yhat'), last7 = ys.slice(-7).reduce((a, x) => a + x, 0);
    const cq = qOf(now), left = Math.max(0, Math.round((qStart(qNext(cq)) - today) / DAY)); let qTax = 0;
    for (const s of regs) { const y = per[s.no]; if (!y) continue; const a = y.findIndex(x => x > 0); const yy = y.slice(a); const soFar = y.slice(Math.max(0, Math.round((qStart(cq) - first) / DAY))).reduce((x, v) => x + v, 0);
      const rest = yy.length >= 21 ? ML.forecast(ML.fit(yy), left).reduce((x, z) => x + z.yhat, 0) : 0; qTax += (soFar + rest) * RATE; }
    fc = { next7, last7, next30: sum(f.slice(0, 30), 'yhat'), lo30: sum(f.slice(0, 30), 'lo'), hi30: sum(f.slice(0, 30), 'hi'), quarter: qName(cq), quarterDue: fD(qDue(cq)), quarterTax: Math.round(qTax), backtest: bt, days: ys.length };
    if (last7 > 0 && next7 < last7 * 0.8) add(`fcdrop:${fD(today)}`, 'medium', 'Forecast: receipted sales expected to fall', `Next 7 days about ${M(next7)}, ${Math.round((1 - next7 / last7) * 100)}% below the last 7 days (${M(last7)}).`, 'forecast');
    for (const no in per) { const y = per[no], a = y.findIndex(x => x > 0); const yy = y.slice(a); if (yy.length < 28 || !byNo[no]) continue;
      const mh = ML.fit(yy.slice(0, -7)); const e7 = ML.forecast(mh, 7).reduce((x, z) => x + z.yhat, 0), l7 = yy.slice(-7).reduce((x, v) => x + v, 0); const z = mh.sd ? (l7 - e7) / (mh.sd * Math.sqrt(7)) : 0;
      if (z <= -2.5 && e7 > 300) add(`anom:${no}:${fD(today)}`, 'medium', `Forecast: ${byNo[no].name} far below expectation`, `Last 7 days ${M(l7)} against about ${M(e7)} expected. Closed, a phone problem, or sales not receipted?`, 'forecast', 'seller:' + no); } }

  // ---------- coming up ----------
  const upcoming = [];
  if (due >= now) { upcoming.push({ when: due, what: `${qName(lp)} returns due (${notFiled.length} of ${regs.length} registered sellers not filed yet)` });
    const days = Math.ceil((due - now) / DAY); if (days <= 7 && notFiled.length) add(`due${days <= 2 ? 2 : 7}:${lp}`, days <= 2 ? 'high' : 'medium', `${notFiled.length} seller${notFiled.length === 1 ? '' : 's'} not filed: ${qName(lp)} return due in ${days} day${days === 1 ? '' : 's'}`, 'Send reminders from the officer console (Filing and payments).', 'officer'); }
  upcoming.push({ when: qDue(qOf(now)), what: `${qName(qOf(now))} returns due` });
  const me = fromLocal(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - DAY; upcoming.push({ when: me, what: 'Monthly draw closes (run it in the first days of next month)' });
  const qe = qStart(qNext(qOf(now))) - DAY; upcoming.push({ when: qe, what: 'Quarterly motorbike draw closes' });
  const mm = L(now).getUTCMonth(); if (mm === 5 || mm === 11 || mm === 4 || mm === 10) upcoming.push({ when: fromLocal(d.getUTCFullYear(), mm < 6 ? 6 : 12, 1) - DAY, what: 'Six-month M100,000 draw closes' });
  if (mm >= 9) upcoming.push({ when: fromLocal(d.getUTCFullYear() + 1, 0, 1) - DAY, what: 'Yearly car draw closes' });
  for (const e of exp) if (byNo[e.seller_no]) upcoming.push({ when: now + DAY, what: `${byNo[e.seller_no].name}: ${e.n} cash claim(s) expire` });
  upcoming.sort((a, b) => a.when - b.when);
  const order = { high: 0, medium: 1, info: 2 }; alerts.sort((a, b) => order[a.level] - order[b.level]);
  return { period: win, cur, prev, tot, alerts, upcoming: upcoming.filter(u => u.when >= now - DAY && u.when <= now + 92 * DAY), forecast: fc, now };
}

// Plain-language summary: the AI writes it when available (masked figures only), otherwise a built-in one.
export function templateSummary(I) { const c = I.cur, p = I.prev; const ch = (a, b) => b ? `${a >= b ? 'up' : 'down'} ${Math.abs(Math.round((a - b) / b * 100))}%` : 'no earlier figure';
  const hi = I.alerts.filter(a => a.level === 'high').length;
  return `${c.n.toLocaleString('en-US')} receipts worth ${M(c.v)} (${ch(c.v, p.v)} on the previous period), ${c.confirmed} of ${c.claims} cash claims confirmed by sellers, ${c.returns} returns filed and ${M(c.paid)} tax paid through Rasiti. `
    + (hi ? `${hi} item${hi === 1 ? ' needs' : 's need'} action now. ` : 'Nothing urgent. ')
    + (I.forecast ? `The model expects about ${M(I.forecast.next30)} in receipted sales over the next 30 days and about ${M(I.forecast.quarterTax)} tax for ${I.forecast.quarter}.` : ''); }

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function renderEmail(I, o) { const c = I.cur, p = I.prev; const site = (o.site || '').replace(/\/$/, '');
  const ch = (a, b) => !b ? '' : `<span style="color:${a >= b ? '#1d7a46' : '#b4321e'};font-size:12px"> ${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}%</span>`;
  const LV = { high: ['#fbebeb', '#b4321e', 'Act now'], medium: ['#f9eeda', '#8a5a00', 'This week'], info: ['#e7f1fb', '#1d5fa3', 'For information'] };
  const link = a => site ? `${site}/#${a.page}` : '';
  const kp = [[c.n.toLocaleString('en-US') + ch(c.n, p.n), 'Receipts'], [M(c.v) + ch(c.v, p.v), 'Receipted sales'], [`${c.cash} / ${c.momo} / ${c.card}`, 'Cash / mobile money / card'], [`${c.confirmed} of ${c.claims}`, 'Cash claims confirmed'],
    [String(c.joined), 'New sellers'], [String(c.registered), 'Registered for tax'], [String(c.returns), 'Returns filed'], [M(c.paid), 'Tax paid']];
  const td = 'padding:8px 10px;border-bottom:1px solid #eceef2;font-size:14px';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1a1b2e">
  <div style="max-width:640px;margin:0 auto;padding:20px"><div style="background:#1a1b2e;color:#fff;border-radius:12px 12px 0 0;padding:18px 22px">
  <div style="font-size:12px;letter-spacing:.12em;color:#e8793a;font-weight:700">RASITI (RECEIPT) LOTTERY · RSL</div><div style="font-size:20px;font-weight:700;margin-top:4px">${esc(o.title)}</div>
  <div style="font-size:13px;color:#c9cbd6;margin-top:2px">${esc(o.subtitle)}</div></div><div style="background:#fff;border-radius:0 0 12px 12px;padding:20px 22px">
  <p style="font-size:15px;line-height:1.5;margin:0 0 16px">${esc(o.summary)}</p>
  ${o.kind === 'report' ? `<table style="width:100%;border-collapse:collapse;margin-bottom:18px">${kp.map((k, i) => i % 2 ? '' : `<tr><td style="${td}"><b style="font-size:18px">${k[0]}</b><br><span style="color:#5f6475;font-size:12px">${k[1]}</span></td><td style="${td}">${kp[i + 1] ? `<b style="font-size:18px">${kp[i + 1][0]}</b><br><span style="color:#5f6475;font-size:12px">${kp[i + 1][1]}</span>` : ''}</td></tr>`).join('')}</table>` : ''}
  <h3 style="font-size:15px;margin:18px 0 8px">${o.alerts.length ? `Action needed (${o.alerts.length})` : 'Action needed'}</h3>
  ${o.alerts.length ? o.alerts.map(a => `<div style="border-left:4px solid ${LV[a.level][1]};background:${LV[a.level][0]};border-radius:6px;padding:9px 12px;margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:${LV[a.level][1]};text-transform:uppercase">${LV[a.level][2]}</div><div style="font-size:14px;font-weight:700">${esc(a.title)}</div><div style="font-size:13px;color:#3d4152">${esc(a.detail)}${link(a) ? ` <a href="${link(a)}" style="color:#c25a1c">Open</a>` : ''}</div></div>`).join('') : '<p style="font-size:14px;color:#5f6475">Nothing needs action right now.</p>'}
  ${I.forecast ? `<h3 style="font-size:15px;margin:18px 0 8px">Forecast (learned from the last ${I.forecast.days} days)</h3><table style="width:100%;border-collapse:collapse">
   <tr><td style="${td}">Receipted sales, next 30 days</td><td style="${td};text-align:right"><b>${M(I.forecast.next30)}</b><br><span style="color:#5f6475;font-size:12px">likely ${M(I.forecast.lo30)} to ${M(I.forecast.hi30)}</span></td></tr>
   <tr><td style="${td}">Tax expected for ${esc(I.forecast.quarter)} (due ${esc(I.forecast.quarterDue)}, demo rate)</td><td style="${td};text-align:right"><b>${M(I.forecast.quarterTax)}</b></td></tr>
   ${I.forecast.backtest ? `<tr><td style="${td}">Measured accuracy (last ${I.forecast.backtest.days} days hidden and forecast)</td><td style="${td};text-align:right"><b>${I.forecast.backtest.mape}% average error</b></td></tr>` : ''}</table>` : ''}
  ${I.upcoming.length ? `<h3 style="font-size:15px;margin:18px 0 8px">Coming up</h3><table style="width:100%;border-collapse:collapse">${I.upcoming.slice(0, 8).map(u => `<tr><td style="${td};white-space:nowrap;color:#5f6475">${fD(u.when)}</td><td style="${td}">${esc(u.what)}</td></tr>`).join('')}</table>` : ''}
  ${site ? `<p style="margin:20px 0 0"><a href="${site}/#dash" style="background:#e8793a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;font-size:14px">Open Rasiti</a></p>` : ''}
  <p style="font-size:11px;color:#8a8fa0;margin:20px 0 0">Sent by Rasiti to the addresses an administrator chose (${esc(o.rule)}). Mock data for the RSL Taxathon 2026. Customer phone numbers are never included. Forecasts guide where to look first; officers decide.</p>
  </div></div></body></html>`;
  const text = `${o.title}\n${o.subtitle}\n\n${o.summary}\n\nAction needed:\n${o.alerts.map(a => `- ${a.title}: ${a.detail}`).join('\n') || '- Nothing'}\n` + (I.forecast ? `\nForecast: ${M(I.forecast.next30)} receipted sales in the next 30 days; ${M(I.forecast.quarterTax)} tax expected for ${I.forecast.quarter}.\n` : '') + (site ? `\nOpen Rasiti: ${site}/#dash\n` : '');
  return { html, text }; }
