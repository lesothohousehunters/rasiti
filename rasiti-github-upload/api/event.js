// POST /api/event — actions from the public seller and customer phones.
// Every kind is validated; anything else is refused.
import { db } from './_lib/db.js';
import { route, body, bad } from './_lib/http.js';
import { validCode, PHONE, inLesotho } from './_lib/codes.js';

const ID = /^[a-z0-9-]{6,40}$/i;
const txt = (v, n) => String(v ?? '').trim().slice(0, n);
const phoneOrNull = (p) => { if (p == null || p === '') return null; if (!PHONE.test(p)) throw bad('Phone must be 266 followed by 8 digits.'); return p; };
const amount = (a) => { const v = Number(a); if (!(v > 0 && v <= 100000)) throw bad('Amount must be between M1 and M100,000.'); return Math.round(v); };
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
      if (!['momo', 'cash'].includes(b.channel)) throw bad('Channel must be momo or cash.');
      await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source) VALUES ($1,$2,$3,$4,$5,now(),'tester') ON CONFLICT DO NOTHING",
        [b.code, b.seller_no, amount(b.amount), b.channel, phoneOrNull(b.phone)]);
      break;
    }
    case 'receipt_phone': {
      const ph = phoneOrNull(b.phone); if (!ph) throw bad('Phone required.');
      const rows = await q('UPDATE receipts SET phone=$1 WHERE code=$2 AND phone IS NULL RETURNING code', [ph, b.code]);
      if (!rows.length) return res.status(409).json({ error: 'This receipt already belongs to another phone.' });
      break;
    }
    case 'claim': {
      if (!ID.test(b.id || '')) throw bad('Bad id.');
      await seller(b.seller_no);
      if (!['pending', 'queued'].includes(b.state)) throw bad('Bad state.');
      await q('INSERT INTO claims(id,seller_no,amount,phone,state) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [b.id, b.seller_no, amount(b.amount), phoneOrNull(b.phone), b.state]);
      break;
    }
    case 'claim_state': {
      if (!['pending', 'confirmed', 'rejected'].includes(b.state)) throw bad('Bad state.');
      await q('UPDATE claims SET state=$1 WHERE id=$2', [b.state, txt(b.id, 40)]);
      break;
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
      const rows = await q("INSERT INTO sellers(no,name,trade,market,status,joined_at,phone,lat,lng) VALUES ($1,$2,$3,$4,'enrolled',now(),$5,$6,$7) ON CONFLICT DO NOTHING RETURNING no",
        [b.no, name, txt(b.trade, 60), txt(b.market, 60), phoneOrNull(b.phone), lat, lng]);
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
    default: throw bad('Unknown event.');
  }
  res.status(200).json({ ok: true });
});
