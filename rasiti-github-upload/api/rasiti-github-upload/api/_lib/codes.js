// Receipt code check character, identical to the one in the browser.
const AL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function chk(body) {
  let s = 0;
  for (let i = 0; i < body.length; i++) s += (i + 1) * body.charCodeAt(i) * (i % 2 ? 3 : 7);
  return AL[s % 31];
}
export function validCode(code) {
  const m = /^RS-(\d{4})-([A-Z0-9]{4})-([A-Z0-9])$/.exec(code || '');
  return !!m && chk(m[1] + m[2]) === m[3];
}
export const PHONE = /^266\d{8}$/;
export const inLesotho = (lat, lng) => lat > -30.8 && lat < -28.5 && lng > 26.9 && lng < 29.6;
export function mkCode(no) {
  let r = '';
  for (let i = 0; i < 4; i++) r += AL[Math.floor(Math.random() * 31)];
  return `RS-${no}-${r}-${chk(no + r)}`;
}
export function normCode(raw) {
  const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = /^RS(\d{4})([A-Z0-9]{4})([A-Z0-9])$/.exec(c);
  return m ? { code: `RS-${m[1]}-${m[2]}-${m[3]}`, ok: chk(m[1] + m[2]) === m[3], no: m[1] } : null;
}
