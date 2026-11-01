// GET /api/logs — the full system log (who, what, when), for owners and admins.
//   ?who=&action=&days=&q=&limit=&offset=
// Staff actions show the staff email; phone and USSD actions show a masked customer number or a seller code.
import { db } from './_lib/db.js';
import { route, requireRole } from './_lib/http.js';

export default route(async (req, res) => {
  const me = await requireRole(req, res, ['owner', 'admin']); if (!me) return;
  const p = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const q = await db();
  const where = [], args = [];
  const add = (sql, v) => { args.push(v); where.push(sql.replace('?', '$' + args.length)); };
  const who = String(p.who || '');
  if (who === 'staff') where.push('user_email IS NOT NULL');
  else if (who === 'public') where.push('user_email IS NULL');
  else if (who) add("COALESCE(user_email, detail->>'actor', 'system') = ?", who.slice(0, 120));
  if (p.action) add('action = ?', String(p.action).slice(0, 60));
  const days = Number(p.days); if (days > 0) add("at > now() - (? || ' days')::interval", String(Math.min(3650, Math.floor(days))));
  if (p.q) { args.push('%' + String(p.q).slice(0, 80).replace(/[%_\\]/g, '') + '%'); const i = '$' + args.length;
    where.push(`(action ILIKE ${i} OR detail::text ILIKE ${i} OR COALESCE(user_email,'') ILIKE ${i})`); }
  const W = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = Math.min(5000, Math.max(1, Number(p.limit) || 100)), offset = Math.max(0, Number(p.offset) || 0);
  const [{ n }] = await q(`SELECT count(*)::int AS n FROM audit_log ${W}`, args);
  const rows = await q(`SELECT id, at, user_email, detail->>'actor' AS actor, action, detail FROM audit_log ${W} ORDER BY at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`, args);
  const actions = (await q('SELECT action, count(*)::int AS n FROM audit_log GROUP BY action ORDER BY action')).map(r => r);
  const people = (await q("SELECT DISTINCT user_email FROM audit_log WHERE user_email IS NOT NULL ORDER BY 1")).map(r => r.user_email);
  return res.status(200).json({ total: n, rows, actions, people });
});
