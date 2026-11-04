// POST /api/card: card payment notification from the seller's bank (a speed point / card machine).
// The buyer taps or swipes as usual. When a seller links their card machine to Rasiti, the bank forwards each payment:
//   {bank:'slb'|'fnb'|'nedbank'|'postbank', terminal_id:'SLB60181', amount:250, card_last4:'4471', txn:'A91...', msisdn:'26658...'(optional)}
// A bank rarely knows the cardholder's phone, so most card receipts start without one. The buyer claims it on *999#
// (Customer > 1): seller code + amount + last 4 digits of the card, within 3 days. No reference number to type.
// A reversal or refund voids the receipt: {type:'reversal', bank, txn}.
// Optional: set CARD_KEY and give the banks .../api/card?key=CARD_KEY. The demo panel on the Phones page is allowed without the key.
import { db, audit } from './_lib/db.js';
import { mkCode } from './_lib/codes.js';

export const BANKS = { slb: 'Standard Lesotho Bank', fnb: 'FNB Lesotho', nedbank: 'Nedbank Lesotho', postbank: 'Lesotho PostBank' };
const mk = p => p ? `+266 ${String(p)[3]}*** *${String(p).slice(-3)}` : 'card holder';
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
  if (process.env.CARD_KEY) {
    const key = new URL(req.url, 'http://x').searchParams.get('key');
    if (key !== process.env.CARD_KEY && !sameSite(req)) return json(res, 403, { error: 'This payment notifier is not authorised.' });
  }
  try {
    const b = await readBody(req);
    const bank = String(b.bank || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!BANKS[bank]) return json(res, 400, { error: 'bank must be slb, fnb, nedbank or postbank' });
    const txn = String(b.txn || '').replace(/[^\w-]/g, '').slice(0, 40) || null;
    const q = await db();
    if (b.type === 'reversal') {
      if (!txn) return json(res, 400, { error: 'txn is required for a reversal' });
      const rows = await q("UPDATE receipts SET flag='reversed' WHERE note=$1 RETURNING code, seller_no, amount::float AS amount", [`card:${bank}:${txn}`]);
      if (rows[0]) await audit(q, null, 'payment_reversed', { actor: BANKS[bank], channel: 'Card', code: rows[0].code, seller: rows[0].seller_no, amount: rows[0].amount });
      return json(res, 200, { ok: true, voided: rows.length ? rows[0].code : null });
    }
    const term = String(b.terminal_id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{6,12}$/.test(term)) return json(res, 400, { error: 'terminal_id must be 6 to 12 letters or digits' });
    const amt = Math.round(Number(b.amount));
    if (!(amt > 0 && amt <= 100000)) return json(res, 400, { error: 'amount must be between 1 and 100000' });
    const last4 = String(b.card_last4 || '').replace(/\D/g, '');
    if (!/^\d{4}$/.test(last4)) return json(res, 400, { error: 'card_last4 must be 4 digits' });
    let ph = String(b.msisdn || '').replace(/\D/g, ''); if (ph.length === 8) ph = '266' + ph; if (!/^266\d{8}$/.test(ph)) ph = null;
    if (txn) { const [dup] = await q('SELECT code FROM receipts WHERE note=$1', [`card:${bank}:${txn}`]); if (dup) return json(res, 200, { ok: true, duplicate: true, code: dup.code }); }
    const [seller] = await q('SELECT no, name, status FROM sellers WHERE card_terminal=$1', [term]);
    if (!seller) {
      await audit(q, null, 'card_unlinked', { actor: BANKS[bank], channel: 'Card', terminal: term, amount: amt });
      return json(res, 200, { ok: true, receipt: null, reason: `Card machine ${term} is not linked to a Rasiti seller, so no receipt or draw entries.` });
    }
    const rc = mkCode(seller.no);
    await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source,note,card_last4) VALUES ($1,$2,$3,'card',$4,now(),'card',$5,$6)",
      [rc, seller.no, amt, ph, txn ? `card:${bank}:${txn}` : null, last4]);
    await audit(q, null, 'receipt_issued', { actor: ph ? 'Customer ' + mk(ph) : 'Card ••' + last4, channel: 'Card', code: rc, amount: amt, seller: seller.no, paid_by: `${BANKS[bank]} card machine ${term}` });
    const per = Math.max(1, Math.min(5, Math.floor(amt / 10))) * (seller.status === 'registered' ? 2 : 1);
    return json(res, 200, { ok: true, receipt: { code: rc, seller_no: seller.no, seller: seller.name, amount: amt, bank: BANKS[bank], terminal_id: term, card_last4: last4, phone: ph, entries: per } });
  } catch (e) {
    console.error(e); return json(res, 500, { error: 'Rasiti could not record this payment. The bank should retry.' });
  }
}
