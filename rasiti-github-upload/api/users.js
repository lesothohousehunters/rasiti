// Admin user management. Owners manage everyone; admins manage officers and viewers.
// GET  /api/users                                   -> { users, activity }
// POST /api/users {op:'create', name, email, role, password}
// POST /api/users {op:'update', id, role?, active?}
// POST /api/users {op:'reset', id, password}
import bcrypt from 'bcryptjs';
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';

const ROLES = ['owner', 'admin', 'officer', 'viewer'];
const canManage = (actor, targetRole) => actor.role === 'owner' || (actor.role === 'admin' && ['officer', 'viewer'].includes(targetRole));

export default route(async (req, res) => {
  const me = await requireRole(req, res, ['owner', 'admin']);
  if (!me) return;
  const q = await db();

  if (req.method === 'GET') {
    const users = await q('SELECT id, email, name, role, active, created_at, last_login FROM admin_users ORDER BY created_at');
    const activity = await q('SELECT user_email, action, detail, at FROM audit_log ORDER BY at DESC LIMIT 60');
    return res.status(200).json({ users, activity });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = body(req);

  if (b.op === 'create') {
    const name = String(b.name || '').trim().slice(0, 80);
    const email = String(b.email || '').trim().toLowerCase();
    const role = String(b.role || 'officer');
    const password = String(b.password || '');
    if (!name) throw bad('Enter a name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Enter a valid email address.');
    if (!ROLES.includes(role)) throw bad('Choose a role.');
    if (!canManage(me, role)) throw bad('Only the owner can add owners or admins.');
    if (password.length < 10) throw bad('Temporary password must be at least 10 characters.');
    const [exists] = await q('SELECT id FROM admin_users WHERE email=$1', [email]);
    if (exists) throw bad('A user with that email already exists.');
    const [u] = await q('INSERT INTO admin_users(email,name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role, active',
      [email, name, role, await bcrypt.hash(password, 10)]);
    await audit(q, me, 'user_created', { email, role });
    return res.status(200).json({ user: u });
  }

  const id = Number(b.id);
  const [target] = await q('SELECT id, email, role FROM admin_users WHERE id=$1', [id]);
  if (!target) throw bad('User not found.');
  if (!canManage(me, target.role)) throw bad('You cannot change this user.');

  if (b.op === 'update') {
    if (target.id === me.uid) throw bad('You cannot change your own role or switch yourself off.');
    if (b.role !== undefined) {
      if (!ROLES.includes(b.role) || !canManage(me, b.role)) throw bad('You cannot give that role.');
      await q('UPDATE admin_users SET role=$1 WHERE id=$2', [b.role, id]);
    }
    if (b.active !== undefined) await q('UPDATE admin_users SET active=$1 WHERE id=$2', [!!b.active, id]);
    await audit(q, me, 'user_updated', { email: target.email, role: b.role, active: b.active });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'reset') {
    if (String(b.password || '').length < 10) throw bad('Temporary password must be at least 10 characters.');
    await q('UPDATE admin_users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(b.password, 10), id]);
    await audit(q, me, 'password_reset', { email: target.email });
    return res.status(200).json({ ok: true });
  }

  throw bad('Unknown operation.');
});
