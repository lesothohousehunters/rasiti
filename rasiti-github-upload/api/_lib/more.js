// Sellers who move, sell from home or deliver; owners with several shops; payments to a personal number or a bank account.
// Shared by /api/ussd and /api/event (the WhatsApp phones), like cash.js.
//
// The rule that keeps it fair: a payment into a PERSONAL account counts only when the buyer claims it as a purchase.
// Rasiti never reads a seller's wallet or bank statement. A personal wallet also holds family money, rent and loans;
// counting all of it would tax money that is not income. So the buyer claims (seller code, amount, transaction ID),
// then either the network confirms the transaction (it counts at once) or the seller confirms it, exactly like cash.
import { createHash } from 'node:crypto';
import { audit } from './db.js';
import { hashPin, pinProblem } from './pin.js';
import { CASH, mkp } from './cash.js';
import { places, mkMpesa, mkEcocash } from './accounts.js';
import { mkCode } from './codes.js';

export const SELL_TYPES = { fixed: 'One place (shop or stall)', mobile: 'Moves around', home: 'Sells from home', delivery: 'Delivers to customers' };
export const NETS = { mpesa: 'M-Pesa', ecocash: 'EcoCash' };
export const BANKN = { slb: 'Standard Lesotho Bank', fnb: 'FNB Lesotho', nedbank: 'Nedbank Lesotho', postbank: 'Lesotho PostBank' };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const M = n => 'M' + Math.round(Number(n) || 0).toLocaleString('en-US');
// The network answers "is this transaction real?" (simulated here; in the pilot the M-Pesa and EcoCash APIs answer).
export const netCheckOn = () => String(process.env.P2P_CHECK || '').toLowerCase() !== 'off';
// One ID number, one owner: only a hash of the ID is kept, enough to see that two accounts use the same ID.
export const idHash = id => createHash('sha256').update('rasiti-id:' + String(id || '').replace(/\D/g, '')).digest('hex').slice(0, 32);
export const msisdn = v => { const d = String(v || '').replace(/\D/g, ''); const n = d.length === 8 ? '266' + d : d; return /^266[5-6]\d{7}$/.test(n) ? n : null; };
// Where a seller is shown on the map. A home seller: the centre of the area only, never the home.
export async function placeFor(type, place, key) { const P = await places(); const area = P.areaOf(place);
  if (!area) return { market: String(place || '').slice(0, 60), lat: null, lng: null };
  if (type === 'home') { const c = P.AREAS[area]; return { market: area, lat: c[0], lng: c[1] }; }
  const ll = P.latLng(key, area); return { market: area, lat: ll[0], lng: ll[1] }; }

/* ---------- payments to a personal number or bank account ---------- */
// The buyer's claim: method 'p2p' (mobile money to the seller's personal number) or 'bank' (bank transfer), with the reference.
// Returns {ok, verified, code?, id?, msg}.
export async function claimTransfer(q, { phone, seller, amount, method, ref, channel }) {
  const amt = Math.round(Number(amount)); ref = String(ref || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!phone) return { ok: false, msg: 'We could not read your phone number. Please try again.' };
  if (!['p2p', 'bank'].includes(method)) return { ok: false, msg: 'Choose 1 for mobile money or 2 for a bank transfer.' };
  if (method === 'p2p' && !seller.pay_personal) return { ok: false, msg: `${seller.name} has not linked a personal mobile money number. Ask for their merchant code, or claim cash: option 1.` };
  if (method === 'bank' && !seller.pay_bank) return { ok: false, msg: `${seller.name} has not linked a bank account. Claim cash instead: option 1.` };
  if (!(amt >= 1 && amt <= 100000)) return { ok: false, msg: 'Amount not valid. Please start again.' };
  if (!/^[A-Z0-9]{6,20}$/.test(ref)) return { ok: false, msg: 'The transaction ID has 6 to 20 letters or digits. It is in the SMS or on the slip.' };
  // Rule: nobody claims a payment to their own number or their own shop.
  if (phone === seller.phone || phone === seller.pay_personal) {
    await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,$2,$3,$4,$5)', [rid(), null, 'selfpay', phone, `Transfer claim to own shop ${seller.no}: ${M(amt)}. Refused.`]);
    return { ok: false, msg: 'You cannot claim a payment to your own number or shop.' };
  }
  const [{ n }] = await q("SELECT count(*)::int AS n FROM claims WHERE phone=$1 AND created_at > now() - interval '1 day'", [phone]);
  if (n >= CASH.perPhoneDay) return { ok: false, msg: `You can claim ${CASH.perPhoneDay} sales a day. Try again tomorrow.` };
  const [dup] = await q("SELECT id FROM claims WHERE method=$1 AND ref=$2 AND state <> 'rejected'", [method, ref]);
  if (dup) return { ok: false, msg: 'This transaction ID was already claimed. Each payment counts once.' };
  const [{ m: miss }] = await q("SELECT count(*)::int AS m FROM fakes WHERE phone=$1 AND kind='transfermiss' AND created_at > now() - interval '1 day'", [phone]);
  if (miss >= 3) return { ok: false, msg: 'Too many transaction IDs that did not match today. Try again tomorrow.' };
  const id = rid();
  if (method === 'p2p' && netCheckOn()) { // the network checks the transaction: from this buyer, to this seller's number, this amount
    const [t] = await q('SELECT * FROM net_txns WHERE ref=$1', [ref]);
    if (!t || t.to_msisdn !== seller.pay_personal || t.from_msisdn !== phone || Math.round(Number(t.amount)) !== amt) {
      await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,$2,$3,$4,$5)', [rid(), ref, 'transfermiss', phone, `Transfer claim at seller ${seller.no}: ${M(amt)}, ID ${ref}. ${NETS[seller.pay_personal_net] || 'The network'} has no such payment from this phone to the seller.`]);
      await audit(q, null, 'transfer_claim_refused', { actor: 'Customer ' + mkp(phone), channel: channel || 'USSD', seller: seller.no, amount: amt, ref, reason: 'not found by the network (simulated)' }).catch(() => {});
      return { ok: false, msg: `${NETS[seller.pay_personal_net] || 'The network'} has no payment of ${M(amt)} with ID ${ref} from your phone to ${seller.name}. Check the SMS and try again.` };
    }
    const code = mkCode(seller.no);
    await q("INSERT INTO claims(id,seller_no,amount,phone,state,method,ref,verified,decided_at,receipt_code) VALUES ($1,$2,$3,$4,'confirmed','p2p',$5,TRUE,now(),$6)", [id, seller.no, amt, phone, ref, code]);
    await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,note,source) VALUES ($1,$2,$3,'p2p',$4,now(),$5,$6)", [code, seller.no, amt, phone, `${seller.pay_personal_net || 'mpesa'}:${ref} claim:${id}`, seller.pay_personal_net || 'mpesa']);
    await audit(q, null, 'transfer_claim_verified', { actor: 'Customer ' + mkp(phone), channel: channel || 'USSD', seller: seller.no, amount: amt, ref, check: (NETS[seller.pay_personal_net] || 'Network') + ' confirmed (simulated)', code }).catch(() => {});
    return { ok: true, verified: true, id, code, amount: amt };
  }
  // Bank transfers (and mobile money when the network check is off) wait for the seller, exactly like cash.
  await q("INSERT INTO claims(id,seller_no,amount,phone,state,method,ref) VALUES ($1,$2,$3,$4,'pending',$5,$6)", [id, seller.no, amt, phone, method, ref]);
  await audit(q, null, 'transfer_claim_sent', { actor: 'Customer ' + mkp(phone), channel: channel || 'USSD', seller: seller.no, amount: amt, method: method === 'bank' ? 'bank transfer' : 'mobile money to a personal number', ref, sms_to_seller: 'sent (simulated)' }).catch(() => {});
  return { ok: true, verified: false, id, amount: amt };
}
// Simulated network: a person sends money to another person (the demo phones do this; in the pilot this happens on the real network).
export async function netSend(q, { network, from, to, amount }) {
  const net = NETS[network] ? network : 'mpesa'; const f = msisdn(from), t = msisdn(to), amt = Math.round(Number(amount));
  if (!f || !t || !(amt >= 1 && amt <= 100000)) return { ok: false, msg: 'Bad transfer.' };
  const ref = (net === 'mpesa' ? 'Q' : 'E') + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 5);
  await q('INSERT INTO net_txns(ref,network,from_msisdn,to_msisdn,amount) VALUES ($1,$2,$3,$4,$5)', [ref, net, f, t, amt]);
  return { ok: true, ref, network: net, amount: amt };
}
export async function linkPersonal(q, seller, number, network, channel) {
  const n = msisdn(number); if (!n) return { ok: false, msg: 'Type your number, e.g. 58123456.' }; const net = NETS[network] ? network : 'mpesa';
  const [other] = await q('SELECT no FROM sellers WHERE pay_personal=$1 AND no<>$2 AND COALESCE(owner_no, no) <> COALESCE($3, $2)', [n, seller.no, seller.owner_no]);
  if (other) { await audit(q, null, 'personal_number_conflict', { actor: 'Seller ' + seller.no, channel, network: NETS[net], linked_to: other.no });
    return { ok: false, msg: 'This number is already linked to another Rasiti seller. RSL will check it.' }; }
  await q('UPDATE sellers SET pay_personal=$1, pay_personal_net=$2 WHERE no=$3', [n, net, seller.no]);
  await audit(q, null, 'personal_number_linked', { actor: 'Seller ' + seller.no, channel, network: NETS[net], number: mkp(n) });
  return { ok: true, number: n, network: net };
}
export async function linkBank(q, seller, bank, acct, channel) {
  if (!BANKN[bank]) return { ok: false, msg: 'Choose your bank.' }; const d = String(acct || '').replace(/\D/g, '');
  if (d.length < 6 || d.length > 16) return { ok: false, msg: 'An account number has 6 to 16 digits.' };
  await q('UPDATE sellers SET pay_bank=$1, pay_bank_acct=$2 WHERE no=$3', [bank, d.slice(-4), seller.no]);
  await audit(q, null, 'bank_account_linked', { actor: 'Seller ' + seller.no, channel, bank: BANKN[bank], account: '••' + d.slice(-4) });
  return { ok: true, bank, last4: d.slice(-4) };
}
// At joining: "Do you want a merchant code?" The network opens one for the seller (simulated here).
export async function openMerchant(q, seller, network, channel) {
  const net = network === 'ecocash' ? 'ecocash' : 'mpesa', col = net + '_code';
  if (seller[col]) return { ok: true, code: seller[col], network: net, already: true };
  let code; for (let i = 0; i < 60; i++) { const c = net === 'mpesa' ? mkMpesa() : mkEcocash(); const [o] = await q(`SELECT no FROM sellers WHERE ${col}=$1`, [c]); if (!o) { code = c; break; } }
  if (!code) return { ok: false, msg: 'Please try again later.' };
  await q(`UPDATE sellers SET ${col}=$1 WHERE no=$2`, [code, seller.no]);
  await audit(q, null, 'merchant_code_opened', { actor: 'Seller ' + seller.no, channel, network: NETS[net], merchant_code: code, check: (net === 'mpesa' ? 'Vodacom' : 'Econet') + ' opened it (simulated)' });
  return { ok: true, code, network: net };
}

/* ---------- owners with several shops ---------- */
export async function branchesOf(q, ownerNo) { return q('SELECT * FROM sellers WHERE owner_no=$1 ORDER BY no', [ownerNo]); }
async function freeNo(q) { for (let i = 0; i < 40; i++) { const no = String(7000 + Math.floor(Math.random() * 2999)); const [x] = await q('SELECT no FROM sellers WHERE no=$1', [no]); if (!x) return no; } throw new Error('No free seller code.'); }
// The owner adds a shop: it gets its own seller code (for the sticker and the map) and belongs to the owner, who files one return for all.
export async function addBranch(q, owner, place, channel) {
  if (owner.owner_no) return { ok: false, msg: 'Only the main shop can add shops.' };
  const typed = String(place || '').trim().slice(0, 60); if (typed.length < 2) return { ok: false, msg: 'Type where the new shop is.' };
  const [{ n }] = await q('SELECT count(*)::int AS n FROM sellers WHERE owner_no=$1', [owner.no]); if (n >= 9) return { ok: false, msg: 'You can add up to 9 shops here. Call the Rasiti help line 6808 8101 for more.' };
  const no = await freeNo(q); const pl = await placeFor('fixed', typed, 'T' + no);
  await q(`INSERT INTO sellers(no,name,trade,market,status,tin,joined_at,phone,lat,lng,owner_no,sell_type,registered_at,via_rasiti)
           VALUES ($1,$2,$3,$4,$5,$6,now(),$7,$8,$9,$10,'fixed',$11,$12)`,
    [no, owner.name, owner.trade, pl.market, owner.status, owner.tin, owner.phone, pl.lat, pl.lng, owner.no, owner.registered_at || null, !!owner.via_rasiti]);
  await audit(q, null, 'branch_added', { actor: 'Seller ' + owner.no, channel, branch: no, market: pl.market });
  return { ok: true, no, market: pl.market };
}
export async function setKeeperPin(q, owner, branchNo, pin, channel) {
  const [b] = await q('SELECT * FROM sellers WHERE no=$1 AND owner_no=$2', [String(branchNo), owner.no]); if (!b) return { ok: false, msg: 'That shop is not one of yours.' };
  const bad = pinProblem(pin); if (bad) return { ok: false, msg: bad };
  await q('UPDATE sellers SET keeper_pin_hash=$1, keeper_test_pin=NULL, pin_fails=0, pin_lock_until=NULL WHERE no=$2', [await hashPin(pin), b.no]);
  await audit(q, null, 'keeper_pin_set', { actor: 'Seller ' + owner.no, channel, branch: b.no });
  return { ok: true, no: b.no, market: b.market };
}
// Today's figures per shop, for the owner (menu and the daily SMS at 19:00).
export async function branchSummary(q, owner) {
  const shops = [owner, ...(await branchesOf(q, owner.no))];
  const rows = await q(`SELECT seller_no, count(*)::int AS n, COALESCE(sum(amount),0)::float AS v FROM receipts WHERE seller_no = ANY($1::text[]) AND flag IS NULL
                        AND issued_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Maseru') AT TIME ZONE 'Africa/Maseru' GROUP BY seller_no`, [shops.map(s => s.no)]);
  const pend = await q("SELECT seller_no, count(*)::int AS n FROM claims WHERE seller_no = ANY($1::text[]) AND state='pending' AND created_at > now() - interval '3 days' GROUP BY seller_no", [shops.map(s => s.no)]);
  const by = Object.fromEntries(rows.map(r => [r.seller_no, r])), pb = Object.fromEntries(pend.map(r => [r.seller_no, r.n]));
  const lines = shops.map(s => ({ no: s.no, market: s.market, n: (by[s.no] || {}).n || 0, v: (by[s.no] || {}).v || 0, wait: pb[s.no] || 0 }));
  return { shops: lines, total: lines.reduce((a, x) => a + x.v, 0), count: lines.reduce((a, x) => a + x.n, 0) };
}
// The daily branch summary by SMS (simulated: written to the system log), once a day from 19:00 Maseru time.
export async function branchSms(q) {
  const owners = await q('SELECT DISTINCT o.* FROM sellers o JOIN sellers b ON b.owner_no=o.no');
  const out = [];
  for (const o of owners) {
    const [{ n }] = await q("SELECT count(*)::int AS n FROM audit_log WHERE action='branch_summary_sms' AND detail->>'owner'=$1 AND at > date_trunc('day', now() AT TIME ZONE 'Africa/Maseru') AT TIME ZONE 'Africa/Maseru'", [o.no]);
    if (n) continue; const s = await branchSummary(q, o);
    const text = `Rasiti today: ${s.shops.map(x => `${x.market} ${M(x.v)}`).join(', ')}. Total ${M(s.total)}.`;
    await audit(q, null, 'branch_summary_sms', { actor: 'Rasiti', channel: 'SMS (simulated)', owner: o.no, to: mkp(o.phone), text: text.slice(0, 300) });
    out.push({ owner: o.no, text });
  }
  return out;
}
// Re-used: the seller's own number or personal number, for the stock-purchase rule (a seller paying another shop is buying stock).
export async function isSellerPhone(q, phone) { if (!phone) return false; const [x] = await q('SELECT no FROM sellers WHERE phone=$1 OR pay_personal=$1 LIMIT 1', [phone]); return !!x; }
