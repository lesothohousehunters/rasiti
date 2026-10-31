// POST /api/ussd — real USSD connection (Africa's Talking format, which most gateways share).
// The gateway sends: sessionId, serviceCode, phoneNumber, text ("" first, then answers joined by "*").
// We reply in plain text starting with "CON " (show menu, wait for reply) or "END " (close session).
// Optional: set USSD_KEY in the environment and add ?key=... to the callback URL to block other callers.
import { db, audit } from './_lib/db.js';
import { mkCode, normCode } from './_lib/codes.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const M = n => 'M' + Math.round(Number(n) || 0).toLocaleString('en-US');
const mask = p => p ? '…' + String(p).slice(-3) : 'no phone';
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const con = t => 'CON ' + t;
const end = t => 'END ' + t;
const BACK = '\n00. Main menu';

function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString() : String(req.body || '');
  try { return JSON.parse(raw); } catch {}
  return Object.fromEntries(new URLSearchParams(raw));
}
const cleanPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 8 && d.length <= 15 ? d : null; };
const entries = (amt, registered) => Math.max(1, Math.min(5, Math.floor(amt / 10))) * (registered ? 2 : 1);
const drawDay = () => { const d = new Date(); const e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return e.getDate() + ' ' + MON[e.getMonth()]; };
const dueDate = () => { const d = new Date(); return '20 ' + MON[(d.getMonth() + 1) % 12]; };

async function respond(q, parts, phone, sessionId) {
  const s = await (async no => (await q('SELECT * FROM sellers WHERE no=$1', [String(no)]))[0]);
  const [who, ...p] = parts;

  if (who === undefined) return con('Rasiti receipts\n1. I am a customer\n2. I am a seller');

  /* ---------- customer ---------- */
  if (who === '1') {
    const [m, a, b, c] = p;
    if (m === undefined) return con('Customer\n1. Get receipt for cash\n2. Check a receipt\n3. Rate a shop\n4. My draw entries\n5. Shops that give receipts' + BACK);

    if (m === '1') {
      if (a === undefined) return con('Seller code (on the sticker):');
      const seller = await s(a.replace(/\D/g, ''));
      if (!seller) return end(`Seller ${a} is not on Rasiti.\nYou can report them: Customer > 3. Rate a shop.`);
      if (b === undefined) return con(`${seller.name}\n${seller.market || ''}\nAmount you paid (M):`);
      const amt = Math.round(parseFloat(b));
      if (!(amt > 0 && amt <= 100000)) return end('Amount not valid. Please start again.');
      await q("INSERT INTO claims(id,seller_no,amount,phone,state) VALUES ($1,$2,$3,$4,'pending')", [rid(), seller.no, amt, phone]);
      return end(`Sent to ${seller.name.replace(/\.$/, '')}.\nYou get your receipt by SMS when they confirm.`);
    }

    if (m === '2') {
      if (a === undefined) return con('Check a receipt\nEnter the code, e.g. RS3307ABCDX:');
      const n = normCode(a);
      if (!n) return end('That is not a Rasiti code.\nCodes look like RS-1234-ABCD-X.');
      if (!n.ok) {
        await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,$2,$3,$4,$5)', [rid(), n.code, 'forged', phone, 'Checked by USSD. Check character does not match.']);
        return end(`NOT GENUINE\n${n.code}\nRasiti never issued this code. Do not accept it.`);
      }
      const [r] = await q('SELECT r.*, s.name, s.market FROM receipts r JOIN sellers s ON s.no=r.seller_no WHERE r.code=$1', [n.code]);
      if (!r) {
        await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,$2,$3,$4,$5)', [rid(), n.code, 'unknown', phone, 'Checked by USSD. Not in the register.']);
        return end(`NOT GENUINE\n${n.code}\nThis code is not in the Rasiti register.`);
      }
      const d = new Date(r.issued_at);
      return end(`GENUINE\n${r.name}\n${r.market || ''}\n${M(r.amount)} on ${d.getDate()} ${MON[d.getMonth()]}`);
    }

    if (m === '3') {
      const types = { 1: 'got', 2: 'none', 3: 'extra', 4: 'unlisted', 5: 'fake' };
      if (a === undefined) return con('Rate a shop you bought from\n1. I got a receipt\n2. No receipt given\n3. Charged extra for receipt\n4. Shop not on Rasiti\n5. Fake receipt');
      const type = types[a];
      if (!type) return end('Please choose 1 to 5. Start again.');
      if (b === undefined) return con('Seller code, or the shop name and where it is:');
      const txt = b.trim().slice(0, 100);
      const no = txt.replace(/\D/g, '');
      const seller = no.length === 4 ? await s(no) : null;
      const key = 'u-' + txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      await q('INSERT INTO reports(id,phone,type,seller_no,place_key,place_label,area,kind) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [rid(), phone, type, seller ? seller.no : null, seller ? null : key, seller ? null : txt, seller ? null : 'Area not given', seller ? null : 'Informal']);
      return end(type === 'got' ? 'Thank you.\nShops that give receipts earn a public "Gives receipts" badge.'
        : 'Thank you.\nYour number is never shown to the seller. RSL acts when several customers report the same shop.');
    }

    if (m === '4') {
      const rows = await q(`SELECT r.amount::float AS amount, s.status FROM receipts r JOIN sellers s ON s.no=r.seller_no
                            WHERE r.phone=$1 AND r.issued_at >= date_trunc('month', now())`, [phone]);
      const n = rows.reduce((t, r) => t + entries(r.amount, r.status === 'registered'), 0);
      return end(`My draw entries this month: ${n}\nNext draw: ${drawDay()}\nRegistered sellers give double entries.`);
    }

    if (m === '5') {
      const rows = await q(`SELECT COALESCE(s.name || ' · ' || s.trade, r.place_label) AS label
        FROM reports r LEFT JOIN sellers s ON s.no=r.seller_no WHERE r.created_at > now() - interval '30 days'
        GROUP BY 1 HAVING count(DISTINCT r.phone) >= 3 AND avg(CASE WHEN r.type='got' THEN 1 ELSE 0 END) >= 0.8
        ORDER BY count(*) DESC LIMIT 3`);
      return end('Shops that give receipts:\n' + (rows.length ? rows.map(r => '+ ' + r.label).join('\n') : 'None rated yet.'));
    }
    return end('Please choose a number from the menu.');
  }

  /* ---------- seller ---------- */
  if (who === '2') {
    const [code, m, a, b, c] = p;
    if (code === undefined) return con('Seller\nEnter your 4-digit seller code\n(or 0 to join Rasiti):' + BACK);

    if (code === '0') {
      if (m === undefined) return con('Join Rasiti\nYour name:');
      if (a === undefined) return con('Where do you trade?\n(e.g. Sefika rank)');
      if (b === undefined) return con('What do you sell?');
      let no, tries = 0;
      do { no = String(7000 + Math.floor(Math.random() * 2999)); tries++; } while ((await s(no)) && tries < 20);
      await q("INSERT INTO sellers(no,name,trade,market,status,joined_at,phone) VALUES ($1,$2,$3,$4,'enrolled',now(),$5)",
        [no, m.slice(0, 60), b.slice(0, 60), a.slice(0, 60), phone]);
      await audit(q, null, 'seller_joined_by_ussd', { no, sessionId });
      return end(`Welcome ${m.slice(0, 40)}!\nYour seller code: ${no}\nYou can give receipts now. No tax number needed yet.`);
    }

    const seller = await s(code.replace(/\D/g, ''));
    if (!seller) return end(`Seller code ${code} not found.\nDial again and choose 0 to join.`);
    const pending = await q("SELECT * FROM claims WHERE seller_no=$1 AND state='pending' ORDER BY created_at, id LIMIT 3", [seller.no]);

    if (m === undefined) return con(`Lumela ${seller.name}\nCode ${seller.no} · ${seller.status === 'registered' ? 'Registered' : 'Not yet registered'}\n1. Record cash sale\n2. Confirm receipts (${pending.length})\n3. My sales book\n4. ${seller.status === 'registered' ? 'My tax & badge' : 'Register for tax'}` + BACK);

    if (m === '1') {
      if (a === undefined) return con('Record cash sale\nAmount (M):');
      const amt = Math.round(parseFloat(a));
      if (!(amt > 0 && amt <= 100000)) return end('Amount not valid. Please start again.');
      if (b === undefined) return con(`Sale ${M(amt)}\nCustomer phone for their receipt SMS (or 0 to skip):`);
      const ph = b === '0' ? null : cleanPhone(b.length === 8 ? '266' + b : b);
      const rc = mkCode(seller.no);
      await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source) VALUES ($1,$2,$3,'cash',$4,now(),'ussd')", [rc, seller.no, amt, ph]);
      return end(`Recorded ${M(amt)}\nReceipt ${rc}\n${ph ? 'Customer gets it by SMS.' : 'Give the code to the customer.'}`);
    }

    if (m === '2') {
      if (!pending.length) return end('No receipts waiting.');
      if (a === undefined) return con('Customers asking for receipts\n' + pending.map((x, i) => `${i + 1}. ${M(x.amount)} from ${mask(x.phone)}`).join('\n'));
      const cl = pending[parseInt(a) - 1];
      if (!cl) return end('Please choose a number from the list.');
      if (b === undefined) return con(`${M(cl.amount)} from ${mask(cl.phone)}\n1. Yes, this was my sale\n2. Not my sale`);
      if (b === '1') {
        const rc = mkCode(seller.no);
        await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source) VALUES ($1,$2,$3,'cash',$4,now(),'ussd')", [rc, seller.no, cl.amount, cl.phone]);
        await q("UPDATE claims SET state='confirmed' WHERE id=$1", [cl.id]);
        return end(`Confirmed.\nReceipt ${rc} sent to the customer.`);
      }
      await q("UPDATE claims SET state='rejected' WHERE id=$1", [cl.id]);
      return end('Noted. The customer is told you did not confirm.');
    }

    if (m === '3') {
      const [t] = await q(`SELECT
          count(*) FILTER (WHERE issued_at >= date_trunc('day', now()))::int AS dn, COALESCE(sum(amount) FILTER (WHERE issued_at >= date_trunc('day', now())),0)::float AS ds,
          count(*) FILTER (WHERE issued_at > now() - interval '7 days')::int AS wn, COALESCE(sum(amount) FILTER (WHERE issued_at > now() - interval '7 days'),0)::float AS ws,
          count(*) FILTER (WHERE issued_at > now() - interval '30 days')::int AS mn, COALESCE(sum(amount) FILTER (WHERE issued_at > now() - interval '30 days'),0)::float AS ms
        FROM receipts WHERE seller_no=$1`, [seller.no]);
      return end(`My sales book\nToday: ${t.dn} sales, ${M(t.ds)}\n7 days: ${t.wn} sales, ${M(t.ws)}\n30 days: ${t.mn} sales, ${M(t.ms)}`);
    }

    if (m === '4') {
      const [t] = await q("SELECT COALESCE(sum(amount),0)::float AS s FROM receipts WHERE seller_no=$1 AND issued_at > now() - interval '30 days'", [seller.no]);
      if (seller.status === 'registered') return end(`TIN ${seller.tin || '-'} · SBT\nSales on Rasiti, 30 days: ${M(t.s)}\nReturn due ${dueDate()}, prefilled from your sales book.`);
      if (a === undefined) return con(`Register for tax\nSales last 30 days: ${M(t.s)}\nYou fit Simplified Business Tax.\nYour customers get double draw entries.\n1. Register now\n2. Ask a helper to call me`);
      if (a === '2') { await q('UPDATE sellers SET helper=TRUE WHERE no=$1', [seller.no]); return end('A tax helper will call you within 2 working days.'); }
      if (a !== '1') return end('Please choose 1 or 2.');
      if (b === undefined) return con('Enter your ID number:');
      if (b.replace(/\D/g, '').length < 6) return end('ID number must have at least 6 digits. Please start again.');
      const tin = '200-' + (100 + Math.floor(Math.random() * 899)) + '-' + (100 + Math.floor(Math.random() * 899));
      await q("UPDATE sellers SET status='registered', tin=$1, via_rasiti=TRUE, registered_at=now(), declared_last=NULL WHERE no=$2", [tin, seller.no]);
      await audit(q, null, 'seller_registered_by_ussd', { no: seller.no, sessionId });
      return end(`Done! TIN ${tin}\nYou are a registered seller.\nYour customers now earn double draw entries.\nFirst return due ${dueDate()}.`);
    }
    return end('Please choose a number from the menu.');
  }
  return end('Please choose 1 or 2. Dial again to start.');
}

export default async function handler(req, res) {
  const send = (t) => { if (t.length > 182) t = t.slice(0, 181) + '…'; res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(t); };
  if (req.method !== 'POST') return send(end('Rasiti USSD endpoint. Gateways must use POST.'));
  try {
    if (process.env.USSD_KEY) {
      const key = new URL(req.url, 'http://x').searchParams.get('key');
      if (key !== process.env.USSD_KEY) { res.statusCode = 403; return res.end('Forbidden'); }
    }
    const b = parseBody(req);
    let parts = String(b.text || '').split('*').filter((x, i, arr) => !(x === '' && arr.length === 1));
    const back = parts.lastIndexOf('00');
    if (back >= 0) parts = parts.slice(back + 1);
    parts = parts.map(x => x.trim().slice(0, 120));
    const q = await db();
    send(await respond(q, parts, cleanPhone(b.phoneNumber), String(b.sessionId || '').slice(0, 80)));
  } catch (e) {
    console.error(e);
    send(end('Sorry, Rasiti is busy. Please try again.'));
  }
}
