// Small helpers shared by the API routes: sessions, cookies, roles and error handling.
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db.js';

const COOKIE = 'rasiti_session';
const SESSION_HOURS = 8;

function key() {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 32) throw Object.assign(new Error('SESSION_SECRET must be at least 32 characters.'), { status: 500 });
  return new TextEncoder().encode(s);
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function secure() { return process.env.VERCEL || process.env.RENDER || process.env.NODE_ENV === 'production' ? '; Secure' : ''; }

export async function startSession(res, user) {
  const token = await new SignJWT({ uid: user.id, email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(key());
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure()}`);
}

export function endSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`);
}

// Returns the signed-in user, re-checked against the database so that
// deactivated users and role changes take effect immediately.
export async function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  let payload;
  try { ({ payload } = await jwtVerify(token, key())); } catch { return null; }
  const q = await db();
  const [u] = await q('SELECT id, email, name, role, active FROM admin_users WHERE id=$1', [payload.uid]);
  if (!u || !u.active) return null;
  return { uid: u.id, email: u.email, name: u.name, role: u.role };
}

export async function requireRole(req, res, roles) {
  const u = await currentUser(req);
  if (!u) { res.status(401).json({ error: 'Please sign in.' }); return null; }
  if (roles && !roles.includes(u.role)) { res.status(403).json({ error: 'Your role does not allow this.' }); return null; }
  return u;
}

export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export function route(handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { await handler(req, res); }
    catch (e) {
      if (!e.status) console.error(e);
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong on the server. Check the logs.' });
    }
  };
}

export const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
