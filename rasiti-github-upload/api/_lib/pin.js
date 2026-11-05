// Seller PINs: 4 digits, stored only as a bcrypt hash. 3 wrong PINs lock the seller menu for 15 minutes.
// The PIN is checked together with the seller code; the network also gives us the caller's phone number.
import bcrypt from 'bcryptjs';

export const DEMO_PIN = '2580'; // PIN of the demo sellers loaded with the demo dataset
const WEAK = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876']);
export const pinProblem = (p) => !/^\d{4}$/.test(String(p || '')) ? 'The PIN must be 4 digits.' : WEAK.has(p) ? 'That PIN is too easy to guess. Choose another.' : null;
export const hashPin = (p) => bcrypt.hash(String(p), 8);

// Returns { ok } or { ok:false, msg } and records wrong tries.
export async function checkPin(q, seller, pin) {
  if (seller.pin_lock_until && new Date(seller.pin_lock_until) > new Date()) {
    const t = new Date(seller.pin_lock_until).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maseru' });
    return { ok: false, locked: true, msg: `Too many wrong PINs. Try again after ${t}, or call the Rasiti help line 6808 8101.` };
  }
  if (!seller.pin_hash) return { ok: false, msg: 'No PIN set yet.' };
  if (/^\d{4}$/.test(String(pin)) && await bcrypt.compare(String(pin), seller.pin_hash)) {
    if (seller.pin_fails) await q('UPDATE sellers SET pin_fails=0, pin_lock_until=NULL WHERE no=$1', [seller.no]);
    return { ok: true };
  }
  const fails = (seller.pin_fails || 0) + 1;
  if (fails >= 3) {
    await q("UPDATE sellers SET pin_fails=0, pin_lock_until=now() + interval '15 minutes' WHERE no=$1", [seller.no]);
    return { ok: false, locked: true, lockedNow: true, msg: 'Wrong PIN 3 times. The seller menu is locked for 15 minutes.' };
  }
  await q('UPDATE sellers SET pin_fails=$1 WHERE no=$2', [fails, seller.no]);
  return { ok: false, msg: `Wrong PIN. ${3 - fails} ${3 - fails === 1 ? 'try' : 'tries'} left.` };
}
// The data sent to the browser never includes PIN details.
export const publicSeller = ({ pin_hash, pin_fails, pin_lock_until, test_pin, ...s }) => ({ ...s, has_pin: !!pin_hash });
