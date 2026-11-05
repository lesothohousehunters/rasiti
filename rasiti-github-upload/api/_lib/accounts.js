// Test accounts and shop moves.
// Test accounts (for testing only; TEST_TOOLS=off switches them off): an admin types a seller code (the shop's unique identifier).
// Rasiti gives that seller a new 4-digit PIN and links dummy payment accounts: an M-Pesa merchant code (Vodacom), an EcoCash
// merchant code (Econet) and a bank card machine (speed point) terminal ID. A code that is not on Rasiti yet becomes a new test shop.
// Shop moves: a seller whose shop changed place tells Rasiti; the old and new place are kept, and the map moves the seller.
import { readFile } from 'node:fs/promises';
import { hashPin, pinProblem } from './pin.js';

let PL = null;
export async function places() { if (PL) return PL; const src = await readFile(new URL('../../public/places.js', import.meta.url), 'utf8'); const g = {}; new Function('window', src)(g); return (PL = g.RASITI_PLACES); }

export const testTools = () => String(process.env.TEST_TOOLS || '').toLowerCase() !== 'off';
export const BANKS = { slb: ['Standard Lesotho Bank', 'SLB'], fnb: ['FNB Lesotho', 'FNB'], nedbank: ['Nedbank Lesotho', 'NED'], postbank: ['Lesotho PostBank', 'LPB'] };
const BANK_KEYS = Object.keys(BANKS);
const rnd = n => Math.floor(Math.random() * n);
export function newPin() { let p; do { p = String(rnd(10000)).padStart(4, '0'); } while (pinProblem(p) || p === '2580'); return p; }

// A free code in a column: tries random values made by gen() until one is not used by another seller.
async function freeCode(q, col, gen, no) {
  for (let i = 0; i < 60; i++) { const c = gen(i); const [o] = await q(`SELECT no FROM sellers WHERE ${col}=$1 AND no<>$2`, [c, no]); if (!o) return c; }
  throw Object.assign(new Error('Could not find a free code. Try again.'), { status: 409 });
}
const luhn = s => { let t = 0; [...s].reverse().forEach((d, i) => { let v = +d; if (i % 2 === 0) { v *= 2; if (v > 9) v -= 9; } t += v; }); return String((10 - t % 10) % 10); };
export const mkMpesa = () => '58' + String(rnd(10000)).padStart(4, '0');             // 6 digits, like 584112
export const mkEcocash = () => '2' + String(rnd(10000)).padStart(4, '0');            // 5 digits, like 20931
export const mkTerminal = (no, bank, i) => { const b = BANKS[bank][1] + String(no).slice(-4) + String(i % 10); return b + luhn(b.replace(/\D/g, '')); }; // e.g. SLB330705

// Links every payment account the seller does not have yet (or all of them again with relink). Returns what was set.
export async function linkDummy(q, seller, { relink } = {}) {
  const set = {};
  if (relink || !seller.mpesa_code) set.mpesa_code = await freeCode(q, 'mpesa_code', mkMpesa, seller.no);
  if (relink || !seller.ecocash_code) set.ecocash_code = await freeCode(q, 'ecocash_code', mkEcocash, seller.no);
  if (relink || !seller.card_terminal) { const bank = seller.card_bank && BANKS[seller.card_bank] ? seller.card_bank : BANK_KEYS[Number(seller.no) % BANK_KEYS.length];
    set.card_bank = bank; set.card_terminal = await freeCode(q, 'card_terminal', i => mkTerminal(seller.no, bank, i + rnd(10)), seller.no); }
  const cols = Object.keys(set); if (!cols.length) return set;
  await q(`UPDATE sellers SET ${cols.map((c, i) => `${c}=$${i + 1}`).join(', ')} WHERE no=$${cols.length + 1}`, [...cols.map(c => set[c]), seller.no]);
  return set;
}

// Creates or resets one test account. Returns the seller with the new PIN (shown once to the admin, kept for the test-account list).
export async function testAccount(q, { no, name, market, trade }) {
  no = String(no || '').replace(/\D/g, ''); if (!/^\d{4}$/.test(no)) throw Object.assign(new Error('The seller code (shop identifier) must be 4 digits.'), { status: 400 });
  const P = await places(); let [s] = await q('SELECT * FROM sellers WHERE no=$1', [no]); let created = false;
  if (!s) { const mk = P.AREAS[market] ? market : P.LIST[Number(no) % P.LIST.length]; const ll = P.latLng('T' + no, mk);
    const phone = '2665' + String(8000000 + rnd(1999999)).padStart(7, '0');
    [s] = await q("INSERT INTO sellers(no,name,trade,market,status,joined_at,phone,lat,lng) VALUES ($1,$2,$3,$4,'enrolled',now(),$5,$6,$7) RETURNING *",
      [no, String(name || '').trim().slice(0, 60) || `Test shop ${no}`, String(trade || '').trim().slice(0, 60) || 'Test goods', mk, phone, ll[0], ll[1]]); created = true; }
  const pin = newPin();
  await q('UPDATE sellers SET pin_hash=$1, test_pin=$2, pin_fails=0, pin_lock_until=NULL WHERE no=$3', [await hashPin(pin), pin, no]);
  const links = await linkDummy(q, s);
  const [out] = await q('SELECT no, name, trade, market, status, mpesa_code, ecocash_code, card_bank, card_terminal FROM sellers WHERE no=$1', [no]);
  return { ...out, pin, created, linked: Object.keys(links) };
}

// Moves a seller's shop to a new place. market = a known market name, or any place the seller typed.
export async function moveShop(q, seller, market, channel) {
  const P = await places(); const typed = String(market || '').trim().slice(0, 60); if (typed.length < 2) return { ok: false, msg: 'Type the name of the new place.' };
  const area = P.areaOf(typed); const to = area || typed;
  if (to.toLowerCase() === String(seller.market || '').toLowerCase()) return { ok: false, msg: `Your shop is already at ${to}.` };
  const [{ n }] = await q("SELECT count(*)::int AS n FROM seller_moves WHERE seller_no=$1 AND created_at > now() - interval '30 days'", [seller.no]);
  if (n >= 3) return { ok: false, msg: 'Your shop moved 3 times in 30 days. Call the Rasiti help line 6808 8101 to move it again.' };
  // a home seller is shown at the centre of the area only, never at the home
  const ll = seller.sell_type === 'home' && area ? P.AREAS[area] : P.latLng('T' + seller.no + '-' + to, area || '');
  const lat = area ? ll[0] : null, lng = area ? ll[1] : null;
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  await q('INSERT INTO seller_moves(id,seller_no,from_market,to_market,from_lat,from_lng,to_lat,to_lng,channel) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, seller.no, seller.market, to, seller.lat, seller.lng, lat, lng, channel]);
  await q('UPDATE sellers SET market=$1, lat=$2, lng=$3 WHERE no=$4', [to, lat, lng, seller.no]);
  return { ok: true, id, from: seller.market, to, known: !!area };
}
