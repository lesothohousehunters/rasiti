// POST /api/event — actions from the public seller and customer phones.
// Every kind is validated; anything else is refused.
import { db, audit } from './_lib/db.js';
import { route, body, bad } from './_lib/http.js';
import { validCode, PHONE, inLesotho } from './_lib/codes.js';
import { checkPin, hashPin, pinProblem } from './_lib/pin.js';
import { claimCash, decideCash, pendingCash } from './_lib/cash.js';

const ID = /^[a-z0-9-]{6,40}$/i;
const txt = (v, n) => String(v ?? '').trim().slice(0, n);
const phoneOrNull = (p) => { if (p == null || p === '') return null; if (!PHONE.test(p)) throw bad('Phone must be 266 followed by 8 digits.'); return p; };
const amount = (a) => { const v = Number(a); if (!(v > 0 && v <= 100000)) throw bad('Amount must be between M1 and M100,000.'); return Math.round(v); };
const mkp = p => `+266 ${String(p)[3]}*** *${String(p).slice(-3)}`;
const coords = (b) => (b.lat != null && b.lng != null && inLesotho(+b.lat, +b.lng)) ? [+b.lat, +b.lng] : [null, null];

export default route(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = body(req);
  const q = await db();
  const seller = async (no) => { const [s] = await q('SELECT no, status FROM sellers WHERE no=$1', [String(no)]); if (!s) throw bad('Unknown seller code.'); return s; };

  switch (b.kind) {
    case 'receipt': {
      if (!validCode(b.code)) throw bad('Invalid receipt code.');
      await seller(b.seller_no);
      // Receipts come from payments a network or a bank saw, or from cash claims the seller confirmed (cash_decide).
      // Nobody can post a cash receipt directly, so nobody can put a sale into a seller's book without the seller saying yes.
      if (!['momo', 'card'].includes(b.channel)) throw bad('Channel must be momo or card. Cash receipts come only from cash claims the seller confirms.');
      const l4 = b.channel === 'card' && /^\d{4}$/.test(String(b.card_last4 || '')) ? String(b.card_last4) : null;
      await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source,card_last4) VALUES ($1,$2,$3,$4,$5,now(),'tester',$6) ON CONFLICT DO NOTHING",
        [b.code, b.seller_no, amount(b.amount), b.channel, phoneOrNull(b.phone), l4]);
      break;
    }
    case 'receipt_phone': {
      const ph = phoneOrNull(b.phone); if (!ph) throw bad('Phone required.');
      const rows = await q('UPDATE receipts SET phone=$1 WHERE code=$2 AND phone IS NULL RETURNING code', [ph, b.code]);
      if (!rows.length) return res.status(409).json({ error: 'This receipt already belongs to another phone.' });
      break;
    }
    case 'cash_claim': { // the buyer says "I paid cash": a pending claim, nothing counts until the seller confirms
      const ph = phoneOrNull(b.phone); if (!ph) throw bad('Phone required.');
      const [sl] = await q('SELECT no, name, phone FROM sellers WHERE no=$1', [String(b.seller_no || '')]); if (!sl) throw bad('Unknown seller code.');
      const r = await claimCash(q, { phone: ph, seller: sl, amount: b.amount, channel: 'WhatsApp' });
      return res.status(200).json(r.ok ? { ok: true, id: r.id, amount: r.amount } : { ok: false, msg: r.msg });
    }
    case 'cash_pending': { // the seller's list of cash claims to answer; needs their PIN
      const [sl] = await q('SELECT * FROM sellers WHERE no=$1', [String(b.no || '')]); if (!sl) throw bad('Unknown seller code.');
      const r = await checkPin(q, sl, String(b.pin || '')); if (!r.ok) return res.status(403).json({ error: r.msg });
      return res.status(200).json({ ok: true, claims: (await pendingCash(q, sl.no)).map(c => ({ ...c, phone: mkp(c.phone) })) });
    }
    case 'cash_decide': { // the seller confirms or rejects cash claims (ids, or "all"); needs their PIN
      const [sl] = await q('SELECT * FROM sellers WHERE no=$1', [String(b.no || '')]); if (!sl) throw bad('Unknown seller code.');
      const r = await checkPin(q, sl, String(b.pin || '')); if (!r.ok) return res.status(403).json({ error: r.msg });
      if (!['confirm', 'reject'].includes(b.decision)) throw bad('Decision must be confirm or reject.');
      const ids = b.ids === 'all' ? 'all' : Array.isArray(b.ids) ? b.ids.map(x => txt(x, 40)).slice(0, 200) : null; if (!ids) throw bad('ids must be a list or "all".');
      const done = await decideCash(q, sl, ids, b.decision, 'WhatsApp');
      return res.status(200).json({ ok: true, done: done.map(d => ({ id: d.id, code: d.code, amount: d.amount })) });
    }
    case 'report': {
      if (!ID.test(b.id || '')) throw bad('Bad id.');
      if (!['got', 'none', 'extra', 'unlisted', 'fake'].includes(b.type)) throw bad('Bad report type.');
      const [lat, lng] = coords(b);
      if (b.seller_no) await seller(b.seller_no);
      await q('INSERT INTO reports(id,phone,type,seller_no,place_key,place_label,area,kind,lat,lng,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) ON CONFLICT DO NOTHING',
        [b.id, phoneOrNull(b.phone), b.type, b.seller_no || null, b.seller_no ? null : txt(b.place_key, 80), b.seller_no ? null : txt(b.place_label, 120),
         txt(b.area, 60) || null, txt(b.place_kind, 30) || null, lat, lng]);
      break;
    }
    case 'fake': {
      if (!ID.test(b.id || '')) throw bad('Bad id.');
      if (!['forged', 'unknown', 'tampered', 'duplicate'].includes(b.fkind)) throw bad('Bad kind.');
      await q('INSERT INTO fakes(id,code,kind,phone,detail,created_at) VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT DO NOTHING',
        [b.id, txt(b.code, 20), b.fkind, phoneOrNull(b.phone), txt(b.detail, 200)]);
      break;
    }
    case 'seller_join': {
      if (!/^\d{4}$/.test(b.no || '')) throw bad('Seller code must be 4 digits.');
      const name = txt(b.name, 60); if (!name) throw bad('Name required.');
      const [lat, lng] = coords(b);
      const pp = pinProblem(b.pin); if (pp) throw bad(pp);
      const rows = await q("INSERT INTO sellers(no,name,trade,market,status,joined_at,phone,lat,lng,pin_hash) VALUES ($1,$2,$3,$4,'enrolled',now(),$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING no",
        [b.no, name, txt(b.trade, 60), txt(b.market, 60), phoneOrNull(b.phone), lat, lng, await hashPin(b.pin)]);
      if (!rows.length) return res.status(409).json({ error: 'That seller code is taken. Try again.' });
      break;
    }
    case 'seller_register': {
      const s = await seller(b.no);
      if (s.status === 'registered') break;
      if (!/^200-\d{3}-\d{3}$/.test(b.tin || '')) throw bad('Bad TIN format.');
      await q("UPDATE sellers SET status='registered', tin=$1, via_rasiti=TRUE, registered_at=now(), declared_last=NULL WHERE no=$2", [b.tin, b.no]);
      break;
    }
    case 'seller_helper': {
      await seller(b.no);
      await q('UPDATE sellers SET helper=TRUE WHERE no=$1', [b.no]);
      break;
    }
    case 'return_filed': {
      if (!ID.test(b.id || '')) throw bad('Bad id.');
      const s = await seller(b.no); if (s.status !== 'registered') throw bad('Only registered sellers file returns.');
      if (!/^\d{4}-Q[1-4]$/.test(b.period || '')) throw bad('Bad period.');
      const declared = Math.round(Number(b.declared)); if (!(declared >= 0 && declared < 2000000)) throw bad('Bad amount.');
      const tax = Math.round(Number(b.tax_due)); if (!(tax >= 0 && tax <= declared)) throw bad('Bad tax.');
      await q(`INSERT INTO returns(id,seller_no,period,sales,declared,nil_reason,tax_due,channel) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT (seller_no, period) DO UPDATE SET declared=EXCLUDED.declared, nil_reason=EXCLUDED.nil_reason, tax_due=EXCLUDED.tax_due, filed_at=now()`,
        [b.id, b.no, b.period, Math.round(Number(b.sales) || 0), declared, txt(b.nil_reason, 40) || null, tax, b.channel === 'wa' ? 'WhatsApp' : 'USSD']);
      if (b.last) await q('UPDATE sellers SET declared_last=$1 WHERE no=$2', [declared, b.no]);
      break;
    }
    case 'tax_paid': {
      if (!ID.test(b.id || '')) throw bad('Bad id.');
      await seller(b.no); if (!/^\d{4}-Q[1-4]$/.test(b.period || '')) throw bad('Bad period.');
      await q('INSERT INTO payments(id,seller_no,period,amount,ref,channel) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [b.id, b.no, b.period, amount(b.amount), txt(b.ref, 20), b.channel === 'wa' ? 'WhatsApp' : 'USSD']);
      break;
    }
    case 'reminders': {
      await seller(b.no); await q('UPDATE sellers SET reminders=$1 WHERE no=$2', [!!b.on, b.no]);
      break;
    }
    case 'lang': {
      const ph = phoneOrNull(b.phone); if (!ph) throw bad('Phone required.'); if (!['en', 'st'].includes(b.lang)) throw bad('Language must be en or st.');
      await q('INSERT INTO phone_prefs(phone, lang) VALUES ($1,$2) ON CONFLICT (phone) DO UPDATE SET lang=EXCLUDED.lang, updated_at=now()', [ph, b.lang]);
      break;
    }
    case 'card_claim': { // the buyer claims a card payment: seller code + amount + last 4 digits of the card, within 3 days
      const ph = phoneOrNull(b.phone); if (!ph) throw bad('Phone required.');
      await seller(b.seller_no); const amt = amount(b.amount); const l4 = String(b.last4 || ''); if (!/^\d{4}$/.test(l4)) throw bad('Enter the last 4 digits of the card.');
      const [{ n: miss }] = await q("SELECT count(*)::int AS n FROM fakes WHERE phone=$1 AND kind='cardmiss' AND created_at > now() - interval '1 day'", [ph]);
      if (miss >= 3) return res.status(429).json({ error: 'Too many card claims that did not match today. Try again tomorrow.' });
      const [r] = await q("SELECT code, phone FROM receipts WHERE seller_no=$1 AND channel='card' AND amount=$2 AND card_last4=$3 AND flag IS NULL AND issued_at > now() - interval '3 days' ORDER BY (phone IS NULL) DESC, issued_at DESC LIMIT 1", [b.seller_no, amt, l4]);
      if (!r) { await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,NULL,$2,$3,$4)', [Math.random().toString(36).slice(2, 12), 'cardmiss', ph, `Card claim at seller ${b.seller_no}: M${amt}, card ending ${l4}. No card payment matched.`]);
        await audit(q, null, 'card_claim_failed', { actor: 'Customer ' + mkp(ph), channel: 'phone', seller: b.seller_no, amount: amt }).catch(() => {});
        return res.status(200).json({ ok: false, reason: 'nomatch' }); }
      if (r.phone && r.phone !== ph) return res.status(200).json({ ok: false, reason: 'taken', code: r.code });
      if (!r.phone) await q('UPDATE receipts SET phone=$1 WHERE code=$2 AND phone IS NULL', [ph, r.code]);
      await audit(q, null, 'card_receipt_claimed', { actor: 'Customer ' + mkp(ph), channel: 'phone', code: r.code, seller: b.seller_no, amount: amt }).catch(() => {});
      return res.status(200).json({ ok: true, code: r.code });
    }
    case 'card_link': { // the seller links their bank card machine (speed point); needs their PIN
      const [sl] = await q('SELECT * FROM sellers WHERE no=$1', [String(b.no || '')]); if (!sl) throw bad('Unknown seller code.');
      const r = await checkPin(q, sl, String(b.pin || '')); if (!r.ok) return res.status(403).json({ error: r.msg });
      const BN = { slb: 'Standard Lesotho Bank', fnb: 'FNB Lesotho', nedbank: 'Nedbank Lesotho', postbank: 'Lesotho PostBank' };
      if (!BN[b.bank]) throw bad('Unknown bank.');
      const term = String(b.terminal || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!/^[A-Z0-9]{6,12}$/.test(term)) throw bad('A terminal ID has 6 to 12 letters or digits.');
      const [other] = await q('SELECT no FROM sellers WHERE card_terminal=$1 AND no<>$2', [term, sl.no]);
      if (other) { await audit(q, null, 'card_terminal_conflict', { actor: 'Seller ' + sl.no, channel: 'WhatsApp', bank: BN[b.bank], terminal: term, linked_to: other.no });
        return res.status(409).json({ error: 'This card machine is already linked to another Rasiti seller. RSL will check it.' }); }
      await q('UPDATE sellers SET card_terminal=$1, card_bank=$2 WHERE no=$3', [term, b.bank, sl.no]);
      await audit(q, null, 'card_terminal_linked', { actor: 'Seller ' + sl.no, channel: 'WhatsApp', bank: BN[b.bank], terminal: term, check: BN[b.bank] + ' confirmed (simulated)' });
      break;
    }
    case 'seller_pin': { // WhatsApp seller sign-in: seller code + PIN, 3 wrong PINs lock it for 15 minutes
      const [sl] = await q('SELECT * FROM sellers WHERE no=$1', [String(b.no || '')]); if (!sl) throw bad('Unknown seller code.');
      const r = await checkPin(q, sl, String(b.pin || ''));
      if (r.lockedNow) await audit(q, null, 'seller_pin_locked', { actor: 'Seller ' + sl.no, channel: 'WhatsApp' });
      return res.status(200).json({ ok: r.ok, msg: r.ok ? '' : r.msg });
    }
    case 'merchant_link': { // the seller links their own M-Pesa or EcoCash merchant code; needs their PIN
      const [sl] = await q('SELECT * FROM sellers WHERE no=$1', [String(b.no || '')]); if (!sl) throw bad('Unknown seller code.');
      const r = await checkPin(q, sl, String(b.pin || '')); if (!r.ok) return res.status(403).json({ error: r.msg });
      const net = b.network === 'ecocash' ? 'ecocash' : b.network === 'mpesa' ? 'mpesa' : null; if (!net) throw bad('Network must be mpesa or ecocash.');
      const mc = String(b.code || '').replace(/\D/g, ''); if (!/^\d{5,7}$/.test(mc)) throw bad('A merchant code has 5 to 7 digits.');
      const col = net + '_code', NETN = net === 'mpesa' ? 'M-Pesa' : 'EcoCash';
      const [other] = await q(`SELECT no FROM sellers WHERE ${col}=$1 AND no<>$2`, [mc, sl.no]);
      if (other) { await audit(q, null, 'merchant_code_conflict', { actor: 'Seller ' + sl.no, channel: 'WhatsApp', network: NETN, merchant_code: mc, linked_to: other.no });
        return res.status(409).json({ error: `This ${NETN} code is already linked to another Rasiti seller. RSL will check it.` }); }
      await q(`UPDATE sellers SET ${col}=$1 WHERE no=$2`, [mc, sl.no]);
      await audit(q, null, 'merchant_code_linked', { actor: 'Seller ' + sl.no, channel: 'WhatsApp', network: NETN, merchant_code: mc, check: (net === 'mpesa' ? 'Vodacom' : 'Econet') + ' confirmed (simulated)' });
      break;
    }
    default: throw bad('Unknown event.');
  }
  // Every public action is written to the system log with a masked phone, so admins can see who did what and when.
  const mk = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 ? `+266 ${d[3]}*** *${d.slice(-3)}` : null; };
  const who = b.phone ? `Customer ${mk(b.phone)}` : b.seller_no || b.no ? `Seller ${b.seller_no || b.no}` : 'Phone user';
  const amt = Math.round(Number(b.amount)) || null; // already validated above for the kinds that carry an amount
  const LOG = { receipt:['receipt_issued', {code:b.code, seller:b.seller_no, amount:amt, paid_by:b.channel === 'card' ? 'card' : 'mobile money'}], receipt_phone:['receipt_claimed', {code:b.code}],
    report:['shop_rated', {rating:b.type, seller:b.seller_no || null, shop:b.seller_no ? null : txt(b.place_label, 60), area:txt(b.area, 60) || null}],
    fake:['fake_code_caught', {code:txt(b.code, 20), kind:b.fkind}], seller_join:['seller_joined', {no:b.no, name:txt(b.name, 60), market:txt(b.market, 60)}],
    seller_register:['seller_registered_for_tax', {no:b.no, tin:b.tin}], seller_helper:['seller_asked_for_help', {no:b.no}],
    return_filed:[Number(b.declared) ? 'return_filed' : 'nil_return_filed', {period:b.period, declared:Math.round(Number(b.declared)), sales_book:Math.round(Number(b.sales) || 0), reason:txt(b.nil_reason, 40) || null, rsl_ack:txt(b.ack, 20) || null}],
    tax_paid:['tax_paid', {period:b.period, amount:amt, ref:txt(b.ref, 20), rsl_receipt:txt(b.rcpt, 20) || null}], lang:['language_changed', {lang:b.lang === 'st' ? 'Sesotho' : 'English'}], reminders:[b.on ? 'reminders_on' : 'reminders_off', {}] }[b.kind];
  if (LOG) await audit(q, null, LOG[0], { actor:['seller_join', 'seller_register', 'seller_helper', 'return_filed', 'tax_paid', 'reminders'].includes(b.kind) ? `Seller ${b.no || b.seller_no || ''}`.trim() : who, channel:'phone', ...LOG[1] }).catch(() => {});
  res.status(200).json({ ok: true });
});
