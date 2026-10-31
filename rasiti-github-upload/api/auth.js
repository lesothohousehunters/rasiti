// GET  /api/auth                       -> { user }
// POST /api/auth {op:'login', email, password}
// POST /api/auth {op:'logout'}
// POST /api/auth {op:'password', current, next}
import bcrypt from 'bcryptjs';
import { db, audit } from './_lib/db.js';
import { route, body, currentUser, startSession, endSession, requireRole, bad } from './_lib/http.js';

export default route(async (req, res) => {
  if (req.method === 'GET') {
    const user = await currentUser(req);
    const q = await db();
    const [{ n }] = await q('SELECT count(*)::int AS n FROM admin_users');
    return res.status(200).json({ user, setupNeeded: n === 0 });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = body(req);
  const q = await db();

  if (b.op === 'login') {
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!email || !password) throw bad('Enter your email and password.');

    // First sign-in: create the owner account from ADMIN_EMAIL / ADMIN_PASSWORD.
    const [{ n }] = await q('SELECT count(*)::int AS n FROM admin_users');
    if (n === 0) {
      const envEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const envPass = process.env.ADMIN_PASSWORD || '';
      if (!envEmail || !envPass) throw bad('No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment, then sign in with them.');
      if (email === envEmail && password === envPass) {
        const hash = await bcrypt.hash(password, 10);
        await q("INSERT INTO admin_users(email,name,role,password_hash) VALUES ($1,$2,'owner',$3) ON CONFLICT (email) DO NOTHING", [email, 'Account owner', hash]);
      }
    }

    const [u] = await q('SELECT * FROM admin_users WHERE email=$1', [email]);
    const ok = u && u.active && await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      await audit(q, null, 'login_failed', { email });
      return res.status(401).json({ error: 'Email or password is incorrect, or the account is switched off.' });
    }
    await q('UPDATE admin_users SET last_login=now() WHERE id=$1', [u.id]);
    await startSession(res, u);
    const user = { uid: u.id, email: u.email, name: u.name, role: u.role };
    await audit(q, user, 'login');
    return res.status(200).json({ user });
  }

  if (b.op === 'logout') {
    const user = await currentUser(req);
    if (user) await audit(q, user, 'logout');
    endSession(res);
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'password') {
    const user = await requireRole(req, res);
    if (!user) return;
    if (String(b.next || '').length < 10) throw bad('New password must be at least 10 characters.');
    const [u] = await q('SELECT password_hash FROM admin_users WHERE id=$1', [user.uid]);
    if (!(await bcrypt.compare(String(b.current || ''), u.password_hash))) throw bad('Current password is incorrect.');
    await q('UPDATE admin_users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(b.next, 10), user.uid]);
    await audit(q, user, 'password_changed');
    return res.status(200).json({ ok: true });
  }

  throw bad('Unknown operation.');
});
