// POST /api/admin — officer and owner operations. Every operation is written to the audit log.
//   {op:'review', codes[], decision:'approved'|'rejected'}   officer+
//   {op:'action', item_id, kind, target}                     officer+
//   {op:'draw', seed, live, winners[]}                       officer+
//   {op:'seed', data:{sellers,receipts,reports,fakes}}       owner/admin, empty database only
//   {op:'reset'}                                              owner: deletes all demo data, keeps users and audit log
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';

const WORKERS = ['owner', 'admin', 'officer'];

async function bulk(q, table, cols, rows) {
  if (!rows || !rows.length) return 0;
  const def = cols.map(([c, t]) => `${c} ${t}`).join(', ');
  const names = cols.map(([c]) => c).join(', ');
  for (let i = 0; i < rows.length; i += 1000) {
    await q(`INSERT INTO ${table}(${names}) SELECT ${names} FROM jsonb_to_recordset($1::jsonb) AS x(${def}) ON CONFLICT DO NOTHING`,
      [JSON.stringify(rows.slice(i, i + 1000))]);
  }
  return rows.length;
}

export default route(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = body(req);
  const q = await db();

  if (b.op === 'review') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    if (!['approved', 'rejected'].includes(b.decision)) throw bad('Decision must be approved or rejected.');
    const codes = (Array.isArray(b.codes) ? b.codes : []).slice(0, 500).map(String);
    if (!codes.length) throw bad('No receipts given.');
    await q(`INSERT INTO reviews(code, decision, decided_by) SELECT c, $2, $3 FROM unnest($1::text[]) AS c
             ON CONFLICT (code) DO UPDATE SET decision=EXCLUDED.decision, decided_by=EXCLUDED.decided_by, decided_at=now()`, [codes, b.decision, me.uid]);
    await audit(q, me, 'review', { decision: b.decision, count: codes.length, first: codes[0] });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'action') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    if (!['invite', 'visit', 'done'].includes(b.kind)) throw bad('Unknown action.');
    await q('INSERT INTO actions(item_id, kind, target, done_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [String(b.item_id).slice(0, 80), b.kind, String(b.target || '').slice(0, 80), me.uid]);
    await audit(q, me, 'worklist_' + b.kind, { item: b.item_id, target: b.target, label: String(b.label || '').slice(0, 120) });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'draw') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    await q('INSERT INTO draws(seed, live_entries, winners, run_by) VALUES ($1,$2,$3::jsonb,$4)',
      [Number(b.seed) || 0, Number(b.live) || 0, JSON.stringify(b.winners || []).slice(0, 5000), me.uid]);
    await audit(q, me, 'draw_run', { seed: b.seed, live: b.live });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'seed') {
    const me = await requireRole(req, res, ['owner', 'admin']); if (!me) return;
    const [{ n }] = await q('SELECT count(*)::int AS n FROM sellers');
    if (n > 0) throw bad('The database already has data. Reset it first.');
    const d = b.data || {};
    const counts = {
      sellers: await bulk(q, 'sellers', [['no', 'text'], ['name', 'text'], ['trade', 'text'], ['market', 'text'], ['status', 'text'], ['tin', 'text'], ['joined_at', 'timestamptz'], ['via_rasiti', 'boolean'], ['phone', 'text'], ['declared_last', 'numeric'], ['lat', 'double precision'], ['lng', 'double precision']], d.sellers),
      receipts: await bulk(q, 'receipts', [['code', 'text'], ['seller_no', 'text'], ['amount', 'numeric'], ['channel', 'text'], ['phone', 'text'], ['issued_at', 'timestamptz'], ['note', 'text']], d.receipts),
      reports: await bulk(q, 'reports', [['id', 'text'], ['phone', 'text'], ['type', 'text'], ['seller_no', 'text'], ['place_key', 'text'], ['place_label', 'text'], ['area', 'text'], ['kind', 'text'], ['lat', 'double precision'], ['lng', 'double precision'], ['created_at', 'timestamptz']], d.reports),
      fakes: await bulk(q, 'fakes', [['id', 'text'], ['code', 'text'], ['kind', 'text'], ['phone', 'text'], ['detail', 'text'], ['created_at', 'timestamptz']], d.fakes)
    };
    await audit(q, me, 'demo_data_loaded', counts);
    return res.status(200).json({ ok: true, counts });
  }

  if (b.op === 'reset') {
    const me = await requireRole(req, res, ['owner']); if (!me) return;
    for (const t of ['receipts', 'claims', 'reports', 'fakes', 'reviews', 'actions', 'draws', 'sellers']) await q(`DELETE FROM ${t}`);
    await audit(q, me, 'demo_data_reset');
    return res.status(200).json({ ok: true });
  }

  throw bad('Unknown operation.');
});
