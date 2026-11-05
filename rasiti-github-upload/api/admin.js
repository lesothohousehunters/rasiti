// POST /api/admin — officer and owner operations. Every operation is written to the audit log.
//   {op:'review', codes[], decision:'approved'|'rejected'}   officer+
//   {op:'action', item_id, kind, target}                     officer+
//   {op:'draw', seed, live, winners[]}                       officer+
//   {op:'seed', data:{sellers,receipts,claims,reports,fakes,returns,payments}}       owner/admin, empty database only
//   {op:'unreview', codes[]} · {op:'unaction', item_id} · {op:'undraw', id}   officer+: undo
//   {op:'test_account', no, name?, market?}                   owner/admin: new PIN + dummy M-Pesa, EcoCash and card machine codes for that
//                                                             seller code (a code not on Rasiti yet becomes a new test shop). Testing only.
//   {op:'test_link_all'} · {op:'test_list'}                   owner/admin: link dummy payment codes to every seller · list test accounts
//   {op:'reset'}                                              owner: deletes all demo data, keeps users and audit log
//   {op:'clear', confirm:'CLEAR'}                             owner: deletes ALL data, the activity log and every other user
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';
import { hashPin, DEMO_PIN } from './_lib/pin.js';
import { testTools, testAccount, linkDummy, BANKS } from './_lib/accounts.js';

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
    const winners = (Array.isArray(b.winners) ? b.winners : []).slice(0, 40).map(w => Object.fromEntries(Object.entries(w || {}).slice(0, 12).map(([k, v]) => [String(k).slice(0, 20), typeof v === 'number' ? v : String(v ?? '').slice(0, 80)])));
    const [row] = await q('INSERT INTO draws(seed, live_entries, winners, run_by) VALUES ($1,$2,$3::jsonb,$4) RETURNING id',
      [Number(b.seed) || 0, Number(b.live) || 0, JSON.stringify(winners), me.uid]);
    await audit(q, me, 'draw_run', { id: row.id, seed: b.seed, live: b.live, winners: winners.length });
    return res.status(200).json({ ok: true, id: row.id });
  }

  if (b.op === 'unreview') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    const codes = (Array.isArray(b.codes) ? b.codes : []).slice(0, 500).map(String);
    if (!codes.length) throw bad('No receipts given.');
    await q('DELETE FROM reviews WHERE code = ANY($1::text[])', [codes]);
    await audit(q, me, 'undo_review', { count: codes.length, first: codes[0] });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'unaction') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    await q('DELETE FROM actions WHERE item_id=$1', [String(b.item_id || '').slice(0, 80)]);
    await audit(q, me, 'undo_worklist', { item: b.item_id });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'undraw') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    const id = Number(b.id); if (!Number.isInteger(id)) throw bad('Unknown draw.');
    await q('DELETE FROM draws WHERE id=$1', [id]);
    await audit(q, me, 'undo_draw', { id });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'reminders') {
    const me = await requireRole(req, res, WORKERS); if (!me) return;
    const n = Math.max(0, Math.min(5000, Number(b.count) || 0));
    await audit(q, me, 'reminders_sent', { count: n, period: String(b.period || '').slice(0, 7), due: String(b.due || '').slice(0, 20) });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'contacts') {
    const me = await requireRole(req, res, ['owner', 'admin']); if (!me) return;
    await audit(q, me, b.show ? 'contacts_shown' : 'contacts_hidden', { page: String(b.page || '').slice(0, 30) });
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'seed') {
    const me = await requireRole(req, res, ['owner', 'admin']); if (!me) return;
    const [{ n }] = await q('SELECT count(*)::int AS n FROM sellers');
    if (n > 0) throw bad('The database already has data. Reset it first.');
    const d = b.data || {};
    const counts = {
      sellers: await bulk(q, 'sellers', [['no', 'text'], ['name', 'text'], ['trade', 'text'], ['market', 'text'], ['status', 'text'], ['tin', 'text'], ['joined_at', 'timestamptz'], ['via_rasiti', 'boolean'], ['phone', 'text'], ['declared_last', 'numeric'], ['lat', 'double precision'], ['lng', 'double precision'], ['mpesa_code', 'text'], ['ecocash_code', 'text'], ['card_terminal', 'text'], ['card_bank', 'text']], d.sellers),
      receipts: await bulk(q, 'receipts', [['code', 'text'], ['seller_no', 'text'], ['amount', 'numeric'], ['channel', 'text'], ['phone', 'text'], ['issued_at', 'timestamptz'], ['note', 'text'], ['source', 'text'], ['card_last4', 'text'], ['flag', 'text']], (d.receipts || []).map(r => ({ ...r, source: 'demo', card_last4: /^\d{4}$/.test(String(r.card_last4 || '')) ? String(r.card_last4) : null, flag: ['reversed', 'payback'].includes(r.flag) ? r.flag : null }))),
      reports: await bulk(q, 'reports', [['id', 'text'], ['phone', 'text'], ['type', 'text'], ['seller_no', 'text'], ['place_key', 'text'], ['place_label', 'text'], ['area', 'text'], ['kind', 'text'], ['lat', 'double precision'], ['lng', 'double precision'], ['created_at', 'timestamptz']], d.reports),
      fakes: await bulk(q, 'fakes', [['id', 'text'], ['code', 'text'], ['kind', 'text'], ['phone', 'text'], ['detail', 'text'], ['created_at', 'timestamptz']], d.fakes),
      returns: await bulk(q, 'returns', [['id', 'text'], ['seller_no', 'text'], ['period', 'text'], ['sales', 'numeric'], ['declared', 'numeric'], ['nil_reason', 'text'], ['tax_due', 'numeric'], ['channel', 'text'], ['filed_at', 'timestamptz']], d.returns),
      claims: await bulk(q, 'claims', [['id', 'text'], ['seller_no', 'text'], ['amount', 'numeric'], ['phone', 'text'], ['state', 'text'], ['created_at', 'timestamptz'], ['decided_at', 'timestamptz'], ['receipt_code', 'text']], (d.claims || []).filter(c => ['pending', 'confirmed', 'rejected'].includes(c.state))),
      payments: await bulk(q, 'payments', [['id', 'text'], ['seller_no', 'text'], ['period', 'text'], ['amount', 'numeric'], ['ref', 'text'], ['channel', 'text'], ['paid_at', 'timestamptz']], d.payments),
      moves: await bulk(q, 'seller_moves', [['id', 'text'], ['seller_no', 'text'], ['from_market', 'text'], ['to_market', 'text'], ['from_lat', 'double precision'], ['from_lng', 'double precision'], ['to_lat', 'double precision'], ['to_lng', 'double precision'], ['channel', 'text'], ['created_at', 'timestamptz']], d.moves)
    };
    // Demo sellers all use the demo PIN (shown on the Start here page). Real sellers choose their own when they join.
    await q('UPDATE sellers SET pin_hash=$1, test_pin=$2 WHERE pin_hash IS NULL', [await hashPin(DEMO_PIN), DEMO_PIN]);
    // every demo seller gets dummy M-Pesa, EcoCash and card machine accounts (codes already in the dataset are kept)
    for (const sl of await q('SELECT * FROM sellers WHERE mpesa_code IS NULL OR ecocash_code IS NULL OR card_terminal IS NULL')) await linkDummy(q, sl);
    await audit(q, me, 'demo_data_loaded', counts);
    return res.status(200).json({ ok: true, counts });
  }

  if (b.op === 'test_account' || b.op === 'test_link_all' || b.op === 'test_list') {
    const me = await requireRole(req, res, ['owner', 'admin']); if (!me) return;
    if (!testTools()) throw bad('Test accounts are switched off on this server (TEST_TOOLS=off).');
    if (b.op === 'test_account') {
      const a = await testAccount(q, { no: b.no, name: b.name, market: b.market, trade: b.trade });
      await audit(q, me, 'test_account_made', { seller: a.no, name: a.name, new_shop: a.created, mpesa: a.mpesa_code, ecocash: a.ecocash_code, bank: BANKS[a.card_bank][0], terminal: a.card_terminal });
      return res.status(200).json({ ok: true, account: a });
    }
    if (b.op === 'test_link_all') {
      let n = 0; for (const sl of await q('SELECT * FROM sellers ORDER BY no')) { const set = await linkDummy(q, sl); if (Object.keys(set).length) n++; }
      await audit(q, me, 'test_codes_linked', { sellers: n });
      return res.status(200).json({ ok: true, linked: n });
    }
    const rows = await q('SELECT no, name, market, status, test_pin, mpesa_code, ecocash_code, card_bank, card_terminal FROM sellers ORDER BY no');
    return res.status(200).json({ ok: true, accounts: rows.map(r => ({ ...r, bank: r.card_bank && BANKS[r.card_bank] ? BANKS[r.card_bank][0] : null })) });
  }

  if (b.op === 'reset') {
    const me = await requireRole(req, res, ['owner']); if (!me) return;
    for (const t of ['receipts', 'claims', 'reports', 'fakes', 'reviews', 'actions', 'draws', 'returns', 'payments', 'seller_moves', 'sellers', 'phone_prefs']) await q(`DELETE FROM ${t}`);
    await audit(q, me, 'demo_data_reset');
    return res.status(200).json({ ok: true });
  }

  if (b.op === 'clear') {
    const me = await requireRole(req, res, ['owner']); if (!me) return;
    if (b.confirm !== 'CLEAR') throw bad('Type CLEAR to confirm.');
    for (const t of ['receipts', 'claims', 'reports', 'fakes', 'reviews', 'actions', 'draws', 'returns', 'payments', 'seller_moves', 'sellers', 'phone_prefs', 'audit_log']) await q(`DELETE FROM ${t}`);
    const gone = await q('DELETE FROM admin_users WHERE id <> $1 RETURNING id', [me.uid]);
    await audit(q, me, 'all_data_cleared', { users_removed: gone.length });
    return res.status(200).json({ ok: true, users_removed: gone.length });
  }

  throw bad('Unknown operation.');
});
