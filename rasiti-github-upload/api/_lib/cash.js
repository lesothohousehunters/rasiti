// Seller-confirmed cash receipts, shared by /api/ussd and /api/event.
//
// 1. The buyer pays cash, dials *999#, and enters the seller code and the amount. This makes a PENDING claim:
//    it is not in the seller's sales book, it is not taxed and it gives no draw entry.
// 2. The seller is told by SMS (simulated) and confirms or rejects it on *999#, one by one or all at once.
// 3. A CONFIRMED claim becomes a receipt (channel 'cash'): one draw entry for the buyer (two at a registered seller),
//    and the sale is in the seller's sales book, so the cash total is already there at filing time.
// 4. A REJECTED or ignored claim (pending for more than 3 days) never touches the sales book or the tax bill.
//    Refusals only show RSL where to look: an officer visit, never a bill.
import { mkCode } from './codes.js';
import { audit } from './db.js';

export const CASH = { maxAmount: 5000, perPhoneDay: 5, expireDays: 3 };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const mkp = p => p ? `+266 ${String(p)[3]}*** *${String(p).slice(-3)}` : 'unknown phone';
const M = n => 'M' + Math.round(Number(n) || 0).toLocaleString('en-US');

// The buyer's claim. Returns {ok:true, id} or {ok:false, msg}.
export async function claimCash(q, { phone, seller, amount, channel }) {
  const amt = Math.round(Number(amount));
  if (!phone) return { ok: false, msg: 'We could not read your phone number. Please try again.' };
  if (!(amt >= 1 && amt <= CASH.maxAmount)) return { ok: false, msg: `Cash amount must be M1 to ${M(CASH.maxAmount)}. Bigger sales: pay by M-Pesa, EcoCash or card.` };
  if (seller.phone && seller.phone === phone) return { ok: false, msg: 'You cannot claim a sale at your own shop.' };
  const [{ n }] = await q("SELECT count(*)::int AS n FROM claims WHERE phone=$1 AND created_at > now() - interval '1 day'", [phone]);
  if (n >= CASH.perPhoneDay) return { ok: false, msg: `You can claim ${CASH.perPhoneDay} cash sales a day. Try again tomorrow.` };
  const [dup] = await q("SELECT id FROM claims WHERE phone=$1 AND seller_no=$2 AND amount=$3 AND state='pending' AND created_at > now() - interval '10 minutes'", [phone, seller.no, amt]);
  if (dup) return { ok: false, msg: 'You already sent this claim. Wait for the seller to confirm it.' };
  const id = rid();
  await q("INSERT INTO claims(id,seller_no,amount,phone,state) VALUES ($1,$2,$3,$4,'pending')", [id, seller.no, amt, phone]);
  await audit(q, null, 'cash_claim_sent', { actor: 'Customer ' + mkp(phone), channel: channel || 'USSD', seller: seller.no, amount: amt, sms_to_seller: 'sent (simulated)' }).catch(() => {});
  return { ok: true, id, amount: amt };
}

// Pending claims the seller still has to answer (newest last). Older than 3 days = expired, not shown.
export async function pendingCash(q, no) {
  return q(`SELECT id, amount::float AS amount, phone, created_at FROM claims WHERE seller_no=$1 AND state='pending'
            AND created_at > now() - interval '${CASH.expireDays} days' ORDER BY created_at`, [no]);
}

// The seller's answer: ids is an array of claim ids, or 'all'. decision is 'confirm' or 'reject'.
// Returns [{id, code, phone, amount}] for what was changed.
export async function decideCash(q, seller, ids, decision, channel) {
  const open = await pendingCash(q, seller.no);
  const pick = ids === 'all' ? open : open.filter(c => ids.includes(c.id));
  const out = [];
  for (const c of pick) {
    if (decision === 'confirm') {
      const code = mkCode(seller.no);
      const rows = await q("UPDATE claims SET state='confirmed', decided_at=now(), receipt_code=$1 WHERE id=$2 AND state='pending' RETURNING id", [code, c.id]);
      if (!rows.length) continue;
      await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,note,source) VALUES ($1,$2,$3,'cash',$4,now(),$5,'confirmed')", [code, seller.no, c.amount, c.phone, 'claim:' + c.id]);
      out.push({ id: c.id, code, phone: c.phone, amount: c.amount });
    } else {
      const rows = await q("UPDATE claims SET state='rejected', decided_at=now() WHERE id=$1 AND state='pending' RETURNING id", [c.id]);
      if (rows.length) out.push({ id: c.id, code: null, phone: c.phone, amount: c.amount });
    }
  }
  if (out.length) await audit(q, null, decision === 'confirm' ? 'cash_sales_confirmed' : 'cash_sales_rejected',
    { actor: 'Seller ' + seller.no, channel: channel || 'USSD', count: out.length, total: out.reduce((a, x) => a + x.amount, 0), sms_to_buyers: 'sent (simulated)' }).catch(() => {});
  return out;
}
