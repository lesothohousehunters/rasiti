// GET /api/search: search the whole transaction history for RSL staff (every signed-in role).
// One list holds every receipt (M-Pesa, EcoCash, card, and cash sales the seller confirmed), every tax return and every tax payment, with filters:
//   ?q=        receipt code, seller code or name, market, tax period, payment reference, or the last digits of a phone
//   &kind=     receipt | return | payment
//   &paid=     momo (any mobile money) | mpesa | ecocash | card | cash (confirmed by the seller)
//   &rec=      network (M-Pesa/EcoCash told Rasiti) | bank (a card machine) | seller (cash the seller confirmed, returns, payments)
//   &flag=     reversed | payback | any   (the network or bank said the payment was reversed, or the money went back to the payer)
//   &seller=   seller code      &market=  market or area
//   &from= &to=  dates (YYYY-MM-DD, inclusive)      &min= &max=  amount in maloti
//   &sort=     new (default) | old | big | small     &limit= (max 5000) &offset=
//   &reveal=1  full phone numbers, owners and admins only (the page asks only when "Show contacts" is on, which is logged)
// Phone numbers are masked for everyone else, and Bohlale never sees this endpoint.
import { db } from './_lib/db.js';
import { route, requireRole } from './_lib/http.js';

const KINDS = ['receipt', 'return', 'payment'];
const PAID = { cash: ["paid = 'cash'"], momo: ["paid IN ('momo','mpesa','ecocash')"], mpesa: ["paid = 'mpesa'"], ecocash: ["paid = 'ecocash'"], card: ["paid = 'card'"] };
const SORT = { new: 'at DESC', old: 'at ASC', big: 'amount DESC, at DESC', small: 'amount ASC, at DESC' };
const maskPh = p => p ? '+266 ' + String(p).slice(3, 4) + '••• •' + String(p).slice(-3) : null;

const BASE = `WITH t AS (
  SELECT 'receipt'::text AS kind, r.code AS ref, r.seller_no, r.amount::float AS amount, r.issued_at AS at,
    CASE WHEN r.channel = 'cash' THEN 'cash' WHEN r.channel = 'card' THEN 'card' WHEN r.source IN ('mpesa','ecocash') THEN r.source
         WHEN r.note LIKE 'mpesa:%' THEN 'mpesa' WHEN r.note LIKE 'ecocash:%' THEN 'ecocash' ELSE 'momo' END AS paid,
    CASE WHEN r.channel = 'momo' THEN 'network' WHEN r.channel = 'card' THEN 'bank' ELSE 'seller' END AS rec,
    r.flag, r.card_last4, r.phone, NULL::text AS period, CASE WHEN r.note ~ '^(mpesa|ecocash|card|claim):' OR r.note IN ('confirmed','disputed') THEN NULL ELSE r.note END AS note
  FROM receipts r
  UNION ALL
  SELECT 'return', x.id, x.seller_no, x.declared::float, x.filed_at, NULL, 'seller', NULL, NULL, NULL, x.period,
    CASE WHEN x.declared = 0 THEN 'Nil return' || COALESCE(': ' || x.nil_reason, '') ELSE 'Tax due M' || round(x.tax_due) END
  FROM returns x
  UNION ALL
  SELECT 'payment', COALESCE(p.ref, p.id), p.seller_no, p.amount::float, p.paid_at, 'momo', 'seller', NULL, NULL, NULL, p.period, 'Tax payment by ' || COALESCE(p.channel, 'mobile money')
  FROM payments p
)
SELECT t.*, s.name AS seller_name, s.market FROM t LEFT JOIN sellers s ON s.no = t.seller_no`;

export default route(async (req, res) => {
  const me = await requireRole(req, res, ['owner', 'admin', 'officer', 'viewer']); if (!me) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const p = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const q = await db();
  const where = [], args = [];
  const arg = v => { args.push(v); return '$' + args.length; };
  const str = (v, n = 80) => String(v ?? '').trim().slice(0, n);

  const text = str(p.q);
  if (text) {
    const like = arg('%' + text.replace(/[%_\\]/g, '') + '%');
    const alnum = text.replace(/[^A-Za-z0-9]/g, '');
    const parts = [`ref ILIKE ${like}`, `seller_no ILIKE ${like}`, `seller_name ILIKE ${like}`, `market ILIKE ${like}`, `period ILIKE ${like}`, `COALESCE(note,'') ILIKE ${like}`];
    if (alnum.length >= 4) parts.push(`regexp_replace(ref, '[^A-Za-z0-9]', '', 'g') ILIKE ${arg('%' + alnum + '%')}`);
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 3 && digits.length === text.replace(/[\s+-]/g, '').length) parts.push(`phone LIKE ${arg('%' + digits)}`);
    where.push('(' + parts.join(' OR ') + ')');
  }
  if (KINDS.includes(p.kind)) where.push(`kind = ${arg(p.kind)}`);
  if (PAID[p.paid]) where.push(...PAID[p.paid]);
  if (['seller', 'network', 'bank'].includes(p.rec)) where.push(`rec = ${arg(p.rec)}`);
  if (['reversed', 'payback'].includes(p.flag)) where.push(`flag = ${arg(p.flag)}`); else if (p.flag === 'any') where.push('flag IS NOT NULL');
  if (/^\d{4}$/.test(p.seller || '')) where.push(`seller_no = ${arg(p.seller)}`);
  if (str(p.market)) where.push(`market = ${arg(str(p.market))}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.from || '')) where.push(`at >= ${arg(p.from)}::date`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.to || '')) where.push(`at < (${arg(p.to)}::date + 1)`);
  const min = Number(p.min), max = Number(p.max);
  if (p.min !== undefined && p.min !== '' && min >= 0) where.push(`amount >= ${arg(min)}`);
  if (p.max !== undefined && p.max !== '' && max >= 0) where.push(`amount <= ${arg(max)}`);

  const W = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = Math.min(5000, Math.max(1, Number(p.limit) || 50)), offset = Math.max(0, Number(p.offset) || 0);
  const order = SORT[p.sort] || SORT.new;
  const [sum] = await q(`SELECT count(*)::int AS n, COALESCE(sum(amount) FILTER (WHERE kind = 'receipt'), 0)::float AS receipts_value,
      count(*) FILTER (WHERE kind = 'receipt')::int AS receipts, count(*) FILTER (WHERE kind = 'return')::int AS returns, count(*) FILTER (WHERE kind = 'payment')::int AS payments,
      COALESCE(sum(amount) FILTER (WHERE kind = 'payment'), 0)::float AS tax_paid, min(at) AS first, max(at) AS last
    FROM (${BASE}) z ${W}`, args);
  const rows = await q(`SELECT * FROM (${BASE}) z ${W} ORDER BY ${order}, ref LIMIT ${limit} OFFSET ${offset}`, args);
  const full = p.reveal === '1' && ['owner', 'admin'].includes(me.role);
  for (const r of rows) r.phone = full ? r.phone : maskPh(r.phone);
  const markets = (await q('SELECT DISTINCT market FROM sellers WHERE market IS NOT NULL ORDER BY 1')).map(r => r.market);
  const sellers = await q('SELECT no, name FROM sellers ORDER BY name');
  return res.status(200).json({ total: sum.n, summary: sum, rows, markets, sellers, full });
});
