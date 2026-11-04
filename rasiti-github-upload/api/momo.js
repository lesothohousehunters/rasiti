// POST /api/momo: payment notification from M-Pesa (Vodacom Lesotho) or EcoCash (Econet Telecom Lesotho).
// The buyer pays the seller's merchant code exactly as usual: nothing extra to type. When a seller links a merchant code to Rasiti,
// the seller agrees that payments to that code get a Rasiti receipt, so the network forwards those payments to Rasiti:
// network, merchant code, amount, payer's number, transaction id. Rasiti finds the seller and sends the receipt and draw entries to the payer.
//   {network:'mpesa'|'ecocash', merchant_code:'584112', amount:30, msisdn:'26658123301', txn:'QK72...'}
// A merchant code is only an address for payments; it never signs anyone in.
// Notices on a payment already sent: {type:'reversal', network, txn} (the payment was reversed or refunded) or
// {type:'payback', network, txn} (the merchant's wallet sent the same amount back to the payer within 24 hours: a round trip).
// Either one takes the receipt out of the draw and out of the seller's sales book.
// Optional: set MOMO_KEY and give the networks .../api/momo?key=MOMO_KEY. The demo panel on the Phones page is allowed without the key.
import { db, audit } from './_lib/db.js';
import { mkCode } from './_lib/codes.js';

const NET = { mpesa: 'M-Pesa', ecocash: 'EcoCash' };
const mk = p => p ? `+266 ${String(p)[3]}*** *${String(p).slice(-3)}` : 'unknown phone';
function sameSite(req) {
  const hosts = [req.headers['x-forwarded-host'], req.headers.host].filter(Boolean).map(h => String(h).split(',')[0].trim().toLowerCase());
  const from = req.headers.origin || req.headers.referer || '';
  try { return !!from && hosts.includes(new URL(from).host.toLowerCase()) && req.headers['x-rasiti-demo'] === '1'; } catch { return false; }
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = Buffer.isBuffer(req.body) ? req.body.toString() : typeof req.body === 'string' ? req.body : '';
  if (!raw) raw = await new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); req.on('error', () => r('')); });
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}
const json = (res, code, o) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (process.env.MOMO_KEY) {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (key !== process.env.MOMO_KEY && !sameSite(req)) return json(res, 403, { error: 'This payment notifier is not authorised.' });
  }
  try {
    const b = await readBody(req);
    const net = String(b.network || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!NET[net]) return json(res, 400, { error: 'network must be mpesa or ecocash' });
    if (b.type === 'reversal' || b.type === 'payback') {
      const txn = String(b.txn || '').replace(/[^\w-]/g, '').slice(0, 40); if (!txn) return json(res, 400, { error: 'txn is required' });
      const q = await db(); const flag = b.type === 'reversal' ? 'reversed' : 'payback';
      const rows = await q('UPDATE receipts SET flag=$1 WHERE note=$2 RETURNING code, seller_no, amount::float AS amount', [flag, `${net}:${txn}`]);
      if (rows[0]) await audit(q, null, flag === 'reversed' ? 'payment_reversed' : 'payment_paid_back', { actor: NET[net], channel: NET[net], code: rows[0].code, seller: rows[0].seller_no, amount: rows[0].amount });
      return json(res, 200, { ok: true, voided: rows.length ? rows[0].code : null });
    }
    const code = String(b.merchant_code || '').replace(/\D/g, '');
    if (!/^\d{5,7}$/.test(code)) return json(res, 400, { error: 'merchant_code must be 5 to 7 digits' });
    const amt = Math.round(Number(b.amount));
    if (!(amt > 0 && amt <= 100000)) return json(res, 400, { error: 'amount must be between 1 and 100000' });
    let ph = String(b.msisdn || '').replace(/\D/g, ''); if (ph.length === 8) ph = '266' + ph;
    if (!/^266\d{8}$/.test(ph)) return json(res, 400, { error: 'msisdn must be a Lesotho number' });
    const txn = String(b.txn || '').replace(/[^\w-]/g, '').slice(0, 40) || null;
    const q = await db();
    if (txn) { const [dup] = await q('SELECT code FROM receipts WHERE note=$1', [`${net}:${txn}`]); if (dup) return json(res, 200, { ok: true, duplicate: true, code: dup.code }); }
    const [seller] = await q(`SELECT no, name, status FROM sellers WHERE ${net === 'mpesa' ? 'mpesa_code' : 'ecocash_code'}=$1`, [code]);
    if (!seller) {
      await audit(q, null, 'momo_unlinked', { actor: 'Customer ' + mk(ph), channel: NET[net], merchant_code: code, amount: amt });
      return json(res, 200, { ok: true, receipt: null, reason: `${NET[net]} merchant code ${code} is not linked to a Rasiti seller, so no receipt or draw entries.` });
    }
    const rc = mkCode(seller.no);
    await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source,note) VALUES ($1,$2,$3,'momo',$4,now(),$5,$6)",
      [rc, seller.no, amt, ph, net, txn ? `${net}:${txn}` : null]);
    await audit(q, null, 'receipt_issued', { actor: 'Customer ' + mk(ph), channel: NET[net], code: rc, amount: amt, seller: seller.no, paid_by: `${NET[net]} merchant ${code}` });
    const per = Math.max(1, Math.min(5, Math.floor(amt / 10))) * (seller.status === 'registered' ? 2 : 1);
    return json(res, 200, { ok: true, receipt: { code: rc, seller_no: seller.no, seller: seller.name, amount: amt, network: NET[net], merchant_code: code, entries: per } });
  } catch (e) {
    console.error(e); return json(res, 500, { error: 'Rasiti could not record this payment. The network should retry.' });
  }
}
