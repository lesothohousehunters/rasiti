// POST /api/ussd — real USSD connection (Africa's Talking format, which most gateways share).
// The gateway sends: sessionId, serviceCode, phoneNumber, text ("" first, then answers joined by "*").
// We reply in plain text starting with "CON " (show menu, wait for reply) or "END " (close session).
// Optional: set USSD_KEY in the environment and add ?key=... to the callback URL to block other callers.
import { db, audit } from './_lib/db.js';
import { mkCode, normCode } from './_lib/codes.js';
import { readFile } from 'node:fs/promises';

// Questions and answers live in public/faq.js, shared with the on-screen phones and the WhatsApp chatbot.
let FAQ = null;
let I18N = null;
async function i18n() { if (I18N) return I18N; const src = await readFile(new URL('../public/i18n.js', import.meta.url), 'utf8'); const g = {}; new Function('window', src)(g); return (I18N = g.RASITI_I18N); }
let RSLM, TIPS;
const shared = async (file, key) => { const src = await readFile(new URL('../public/' + file, import.meta.url), 'utf8'); const g = {}; new Function('window', src)(g); return g[key]; };
async function rslm() { return RSLM || (RSLM = await shared('rsl-mock.js', 'RASITI_RSL')); }
async function tips() { return TIPS || (TIPS = await shared('tips.js', 'RASITI_TIPS')); }
async function faq() { if (FAQ) return FAQ; const src = await readFile(new URL('../public/faq.js', import.meta.url), 'utf8'); const g = {}; new Function('window', src)(g); return (FAQ = g.RASITI_FAQ); }

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


/* Filing and paying (demo schedule: monthly return for last month, due on the 20th; demo tax rate 3% of declared sales,
   clearly labelled; RSL sets the real SBT rate and schedule). */
const DEMO_RATE = Number(process.env.SBT_DEMO_RATE || 0.03);
const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const lastPeriod = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const perName = p => MONF[+p.slice(5) - 1];
const perDue = p => { const [y, m] = p.split('-').map(Number); const d = new Date(y, m, 20); return '20 ' + MON[d.getMonth()]; };
async function taxState(q, no) {
  const per = lastPeriod(); const [y, m] = per.split('-').map(Number);
  const [{ s }] = await q('SELECT COALESCE(sum(amount),0)::float AS s FROM receipts WHERE seller_no=$1 AND issued_at >= $2 AND issued_at < $3', [no, new Date(y, m - 1, 1), new Date(y, m, 1)]);
  const rets = await q('SELECT period, declared::float AS declared, tax_due::float AS tax_due, nil_reason FROM returns WHERE seller_no=$1 ORDER BY period', [no]);
  const pays = await q('SELECT period, amount::float AS amount FROM payments WHERE seller_no=$1', [no]);
  const paid = p => pays.filter(x => x.period === p).reduce((a, x) => a + x.amount, 0);
  const owed = rets.reduce((a, r) => a + Math.max(0, r.tax_due - paid(r.period)), 0);
  const oldest = rets.find(r => r.tax_due - paid(r.period) > 0.5);
  return { per, sales: s, ret: rets.find(r => r.period === per), rets, paid, owed: Math.round(owed), oldest };
}
async function fileReturn(q, seller, st, declared, reason) {
  const tax = Math.round(declared * DEMO_RATE);
  const [row] = await q(`INSERT INTO returns(id,seller_no,period,sales,declared,nil_reason,tax_due,channel) VALUES ($1,$2,$3,$4,$5,$6,$7,'USSD')
           ON CONFLICT (seller_no, period) DO UPDATE SET declared=EXCLUDED.declared, nil_reason=EXCLUDED.nil_reason, tax_due=EXCLUDED.tax_due, filed_at=now() RETURNING id`,
    [rid(), seller.no, st.per, Math.round(st.sales), declared, reason, tax]);
  // Simulated RSL e-services: the return is "sent to RSL", which answers with an acknowledgement number.
  const ack = (await rslm()).ack(row.id);
  await audit(q, null, 'rsl_return_sent', { actor:'Seller ' + seller.no, channel:'RSL e-services (simulated)', period: st.per, ack });
  await q('UPDATE sellers SET declared_last=$1 WHERE no=$2', [declared, seller.no]);
  await audit(q, null, declared ? 'return_filed' : 'nil_return_filed', { actor:'Seller ' + seller.no, channel:'USSD', period: st.per, declared, sales_book: Math.round(st.sales), reason });
  return { tax, ack };
}

async function respond(q, parts, phone, sessionId, ctx) {
  const s = await (async no => (await q('SELECT * FROM sellers WHERE no=$1', [String(no)]))[0]);
  const [who, ...p] = parts;

  if (who === undefined) return con('Rasiti receipts\n1. I am a customer\n2. I am a seller\n3. Questions & answers\n' + (ctx.lang === 'st' ? '5. English' : '4. Sesotho'));
  if (who === '3') {
    if (p[0] === undefined) return con('Questions & answers\n1. For customers\n2. For sellers (tax help)\n3. Tip of the day\n4. Daily tip by SMS (M2/day)' + BACK);
    if (p[0] === '4') { // optional daily tip by SMS, paid by the subscriber
      if (!phone) return end('We could not read your phone number. Please try again.');
      const [pr] = await q('SELECT tips_sub FROM phone_prefs WHERE phone=$1', [phone]); const on = !!(pr && pr.tips_sub);
      if (p[1] === undefined) return con(`Daily tip by SMS: ${on ? 'ON' : 'OFF'}\nOne tax tip every day for M2.00 a day, charged to your airtime.\n1. Subscribe\n2. Stop` + BACK);
      if (p[1] !== '1' && p[1] !== '2') return end('Please choose 1 or 2.');
      const want = p[1] === '1';
      await q('INSERT INTO phone_prefs(phone, tips_sub) VALUES ($1,$2) ON CONFLICT (phone) DO UPDATE SET tips_sub=EXCLUDED.tips_sub, updated_at=now()', [phone, want]);
      await audit(q, null, want ? 'tip_subscribed' : 'tip_unsubscribed', { actor:'Customer ' + mk(phone), channel:'USSD', price:'M2.00 a day' });
      return end(want ? 'Subscribed. You will get one tax tip by SMS every day for M2.00 a day.\nTo stop: *999# > 3 > 4 > 2.' : 'Daily tip stopped. You will not be charged. The free tip stays in the menu: *999# > 3 > 3.');
    }
    if (p[0] === '3') { const T = await tips(); const t = T.forDate(new Date()); return end('Tip of the day\n' + T.text(t, ctx.lang)); }
    const set = p[0] === '1' ? 'buyer' : p[0] === '2' ? 'seller' : null;
    if (!set) return end('Please choose 1, 2 or 3. Dial again to start.');
    return con((await faq()).ussd(set, p.slice(1), ctx.lang) + BACK);
  }

  /* ---------- customer ---------- */
  if (who === '1') {
    const [m, a, b, c] = p;
    if (m === undefined) return con('Customer\n1. Get receipt for cash\n2. Check a receipt\n3. Rate a shop\n4. My draw entries\n5. Shops that give receipts\n6. Questions & answers' + BACK);
    if (m === '6') return con((await faq()).ussd('buyer', p.slice(1), ctx.lang) + BACK);

    if (m === '1') {
      if (a === undefined) return con('Seller code (on the sticker):');
      const seller = await s(a.replace(/\D/g, ''));
      if (!seller) return end(`Seller ${a} is not on Rasiti.\nYou can report them: Customer > 3. Rate a shop.`);
      if (b === undefined) return con(`${seller.name}\n${seller.market || ''}\nAmount you paid (M):`);
      const amt = Math.round(parseFloat(b));
      if (!(amt > 0 && amt <= 100000)) return end('Amount not valid. Please start again.');
      await q("INSERT INTO claims(id,seller_no,amount,phone,state) VALUES ($1,$2,$3,$4,'pending')", [rid(), seller.no, amt, phone]);
      await ulog(q, 'receipt_requested', 'Customer ' + mk(phone), { seller:seller.no, amount:amt });
      return end(`Sent to ${seller.name.replace(/\.$/, '')}.\nYou get your receipt by SMS when they confirm.`);
    }

    if (m === '2') {
      if (a === undefined) return con('Check a receipt\nEnter the code, e.g. RS3307ABCDX:');
      const n = normCode(a);
      if (!n) return end('That is not a Rasiti code.\nCodes look like RS-1234-ABCD-X.');
      if (!n.ok) {
        await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,$2,$3,$4,$5)', [rid(), n.code, 'forged', phone, 'Checked by USSD. Check character does not match.']);
        await ulog(q, 'fake_code_caught', 'Customer ' + mk(phone), { code:n.code, kind:'forged' });
        return end(`NOT GENUINE\n${n.code}\nRasiti never issued this code. Do not accept it.`);
      }
      const [r] = await q('SELECT r.*, s.name, s.market FROM receipts r JOIN sellers s ON s.no=r.seller_no WHERE r.code=$1', [n.code]);
      if (!r) {
        await q('INSERT INTO fakes(id,code,kind,phone,detail) VALUES ($1,$2,$3,$4,$5)', [rid(), n.code, 'unknown', phone, 'Checked by USSD. Not in the register.']);
        await ulog(q, 'fake_code_caught', 'Customer ' + mk(phone), { code:n.code, kind:'unknown' });
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
      await ulog(q, 'shop_rated', 'Customer ' + mk(phone), { rating:type, seller:seller ? seller.no : null, shop:seller ? null : txt.slice(0, 60) });
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
      await audit(q, null, 'seller_joined', { actor:'Seller ' + no, channel:'USSD', no });
      return end(`Welcome ${m.slice(0, 40)}!\nYour seller code: ${no}\nYou can give receipts now. No tax number needed yet.`);
    }

    const seller = await s(code.replace(/\D/g, ''));
    if (!seller) return end(`Seller code ${code} not found.\nDial again and choose 0 to join.`);
    const pending = await q("SELECT * FROM claims WHERE seller_no=$1 AND state='pending' ORDER BY created_at, id LIMIT 3", [seller.no]);

    if (m === undefined) return con(`Lumela ${seller.name}\nCode ${seller.no} · ${seller.status === 'registered' ? 'Registered' : 'Not yet registered'}\n1. Record cash sale\n2. Confirm receipts (${pending.length})\n3. My sales book\n4. ${seller.status === 'registered' ? 'My tax & badge' : 'Register for tax'}\n5. Questions & tax help` + BACK);
    if (m === '5') return con((await faq()).ussd('seller', p.slice(2), ctx.lang) + BACK);

    if (m === '1') {
      if (a === undefined) return con('Record cash sale\nAmount (M):');
      const amt = Math.round(parseFloat(a));
      if (!(amt > 0 && amt <= 100000)) return end('Amount not valid. Please start again.');
      if (b === undefined) return con(`Sale ${M(amt)}\nCustomer phone for their receipt SMS (or 0 to skip):`);
      const ph = b === '0' ? null : cleanPhone(b.length === 8 ? '266' + b : b);
      const rc = mkCode(seller.no);
      await q("INSERT INTO receipts(code,seller_no,amount,channel,phone,issued_at,source) VALUES ($1,$2,$3,'cash',$4,now(),'ussd')", [rc, seller.no, amt, ph]);
      await ulog(q, 'receipt_issued', 'Seller ' + seller.no, { code:rc, amount:amt, paid_by:'cash' });
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
        await ulog(q, 'receipt_request_confirmed', 'Seller ' + seller.no, { code:rc, amount:Number(cl.amount) });
        return end(`Confirmed.\nReceipt ${rc} sent to the customer.`);
      }
      await q("UPDATE claims SET state='rejected' WHERE id=$1", [cl.id]);
      await ulog(q, 'receipt_request_rejected', 'Seller ' + seller.no, { amount:Number(cl.amount) });
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
      if (seller.status === 'registered') {
        const st = await taxState(q, seller.no); const pn = perName(st.per);
        if (a === undefined) return con(`My tax · TIN ${seller.tin || '-'}\n1. File ${pn} return${st.ret ? ' (done)' : ''}\n2. Pay tax (${M(st.owed)} due)\n3. My tax record\n4. Reminders: ${seller.reminders === false ? 'OFF' : 'ON'}` + BACK);
        if (a === '1') {
          if (st.ret) return end(`${pn} return filed: ${M(st.ret.declared)}${st.ret.nil_reason ? ' (nil)' : ''}.\nTax due ${M(st.ret.tax_due)} by ${perDue(st.per)}.\nPay: My tax > 2.`);
          if (b === undefined) return con(`${pn} return\nYour sales book: ${M(st.sales)}\n1. File this amount\n2. Enter a different amount\n3. I did not trade (nil)`);
          let declared, reason = null;
          if (b === '1') declared = Math.round(st.sales);
          else if (b === '2') { if (c === undefined) return con(`Your sales for ${pn} (M):`); declared = Math.round(parseFloat(c)); if (!(declared >= 0 && declared < 2000000)) return end('Amount not valid. Please start again.'); }
          else if (b === '3') { if (c === undefined) return con('Why no trading?\n1. Stall was closed\n2. I was ill or away\n3. Other reason'); reason = { 1: 'stall closed', 2: 'ill or away', 3: 'other' }[c]; if (!reason) return end('Please choose 1 to 3. Start again.'); declared = 0; }
          else return end('Please choose 1 to 3.');
          const { tax, ack } = await fileReturn(q, seller, st, declared, reason);
          return end(`Filed! ${pn}: ${M(declared)}${reason ? ' (nil)' : ''}\nSent to RSL: ${ack}\nTax due ${M(tax)} by ${perDue(st.per)}\n(demo rate ${Math.round(DEMO_RATE * 100)}%)`);
        }
        if (a === '2') {
          if (st.owed <= 0) return end('Nothing to pay. Thank you for paying on time!');
          if (b === undefined) return con(`Tax due: ${M(st.owed)}\n1. Pay all by mobile money\n2. Pay part now (pay a little each week)`);
          let amt = st.owed; if (b === '2') { if (c === undefined) return con('Amount to pay now (M):'); amt = Math.round(parseFloat(c)); }
          if (!(amt > 0 && amt <= st.owed)) return end(`Amount must be between M1 and ${M(st.owed)}. Start again.`);
          const ref = 'PY' + Date.now().toString(36).toUpperCase().slice(-6); const per = (st.oldest || st.ret || { period: st.per }).period;
          const pid = rid(); await q("INSERT INTO payments(id,seller_no,period,amount,ref,channel) VALUES ($1,$2,$3,$4,$5,'USSD')", [pid, seller.no, per, amt, ref]);
          const rcpt = (await rslm()).receipt(pid);
          await audit(q, null, 'tax_paid', { actor:'Seller ' + seller.no, channel:'USSD', period: per, amount: amt, ref, rsl_receipt: rcpt });
          return end(`Mobile money request for ${M(amt)} sent. Approve it on your phone.\nRSL receipt ${rcpt}\n${st.owed - amt > 0 ? 'Still due: ' + M(st.owed - amt) + '.' : 'All paid. Thank you!'}`);
        }
        if (a === '3') {
          if (!st.rets.length) return end('No returns yet. File your first return under My tax > 1.');
          return end('My tax record\n' + st.rets.slice(-4).map(r => `${perName(r.period).slice(0, 3)}: ${M(r.declared)} · ${r.tax_due - st.paid(r.period) <= 0.5 ? 'paid' : 'owes ' + M(r.tax_due - st.paid(r.period))}`).join('\n'));
        }
        if (a === '4') { const on = seller.reminders === false; await q('UPDATE sellers SET reminders=$1 WHERE no=$2', [on, seller.no]); await audit(q, null, on ? 'reminders_on' : 'reminders_off', { actor:'Seller ' + seller.no, channel:'USSD' });
          return end(on ? 'Reminders ON. We will SMS you 3 days before each due date.' : 'Reminders OFF. You can turn them on again here.'); }
        return end('Please choose 1 to 4.');
      }
      if (a === undefined) return con(`Register for tax\nSales last 30 days: ${M(t.s)}\nYou fit Simplified Business Tax.\nYour customers get double draw entries.\n1. Register now\n2. Ask a helper to call me`);
      if (a === '2') { await q('UPDATE sellers SET helper=TRUE WHERE no=$1', [seller.no]); return end('A tax helper will call you within 2 working days.'); }
      if (a !== '1') return end('Please choose 1 or 2.');
      if (b === undefined) return con('Enter your ID number:');
      if (b.replace(/\D/g, '').length < 6) return end('ID number must have at least 6 digits. Please start again.');
      // Simulated RSL e-services TIN check: an ID already on RSL's register is linked to its TIN; otherwise RSL issues a new one.
      const R = await rslm(); const found = R.lookup(b); const tin = found.found ? found.tin : R.newTin(b);
      await q("UPDATE sellers SET status='registered', tin=$1, via_rasiti=TRUE, registered_at=now(), declared_last=NULL WHERE no=$2", [tin, seller.no]);
      await audit(q, null, 'rsl_tin_check', { actor:'Seller ' + seller.no, channel:'RSL e-services (simulated)', result: found.found ? 'already registered: TIN linked' : 'not found: new TIN issued', tin });
      await audit(q, null, 'seller_registered_for_tax', { actor:'Seller ' + seller.no, channel:'USSD', no: seller.no, tin });
      return end(`${found.found ? 'Found on RSL register.' : 'RSL issued your TIN.'}\nTIN ${tin}\nYou are a registered seller.\nYour customers now earn double draw entries.\nFirst return due ${dueDate()}.`);
    }
    return end('Please choose a number from the menu.');
  }
  return end('Please choose 1, 2 or 3. Dial again to start.');
}

const ulog = (q, action, actor, d) => audit(q, null, action, { actor, channel:'USSD', ...d }).catch(() => {});
const mk = p => p ? `+266 ${String(p)[3]}*** *${String(p).slice(-3)}` : 'unknown phone';
function sameSite(req) {
  const hosts = [req.headers['x-forwarded-host'], req.headers.host].filter(Boolean).map(h => String(h).split(',')[0].trim().toLowerCase());
  const from = req.headers.origin || req.headers.referer || '';
  try { return !!from && hosts.includes(new URL(from).host.toLowerCase()) && req.headers['x-rasiti-demo'] === '1'; } catch { return false; }
}
export default async function handler(req, res) {
  const send = (t) => { if (t.length > 182) t = t.slice(0, 181) + '…'; res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(t); };
  if (req.method !== 'POST') return send(end('Rasiti USSD endpoint. Gateways must use POST.'));
  try {
    // A real gateway (Africa's Talking) must add ?key=USSD_KEY to the callback URL.
    // The demo phones on this website send no key, so requests coming from the site's own pages are allowed.
    if (process.env.USSD_KEY) {
      const key = new URL(req.url, 'http://x').searchParams.get('key');
      if (key !== process.env.USSD_KEY && !sameSite(req)) { res.statusCode = 403; return res.end('END Forbidden: this USSD gateway is not authorised.'); }
    }
    const b = parseBody(req);
    let parts = String(b.text || '').split('*').filter((x, i, arr) => !(x === '' && arr.length === 1));
    const back = parts.lastIndexOf('00');
    if (back >= 0) parts = parts.slice(back + 1);
    parts = parts.map(x => x.trim().slice(0, 120));
    const q = await db();
    // Language: saved per phone. On the main menu 4 = Sesotho and 5 = English (fixed numbers, so repeated text stays correct).
    const phone = cleanPhone(b.phoneNumber); const ctx = { lang: 'en' };
    if (phone) { const [pr] = await q('SELECT lang FROM phone_prefs WHERE phone=$1', [phone]); if (pr) ctx.lang = pr.lang; }
    let changed = null; while (parts[0] === '4' || parts[0] === '5') { changed = parts[0] === '4' ? 'st' : 'en'; parts = parts.slice(1); }
    if (changed && changed !== ctx.lang) { ctx.lang = changed; if (phone) { await q('INSERT INTO phone_prefs(phone, lang) VALUES ($1,$2) ON CONFLICT (phone) DO UPDATE SET lang=EXCLUDED.lang', [phone, changed]); await audit(q, null, 'language_changed', { actor:'Customer ' + mk(phone), channel:'USSD', lang: changed === 'st' ? 'Sesotho' : 'English' }); } }
    const out = await respond(q, parts, phone, String(b.sessionId || '').slice(0, 80), ctx);
    send(ctx.lang === 'st' ? out.slice(0, 4) + (await i18n()).tr(out.slice(4), 'st') : out);
  } catch (e) {
    console.error(e);
    send(end('Sorry, Rasiti is busy. Please try again.'));
  }
}
