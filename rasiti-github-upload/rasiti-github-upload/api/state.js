// GET /api/state -> everything the demo needs. Demo build: all data is mock.
// For a live pilot, split this into a public endpoint (no phone numbers) and an officer endpoint.
import { db } from './_lib/db.js';
import { route } from './_lib/http.js';

export default route(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = await db();
  const [{ n }] = await q('SELECT count(*)::int AS n FROM sellers');
  if (n === 0) return res.status(200).json({ empty: true, now: new Date().toISOString() });
  const [sellers, receipts, claims, reports, fakes, reviews, actions, draws, returns, payments] = await Promise.all([
    q('SELECT * FROM sellers ORDER BY created_at'),
    q("SELECT code, seller_no, amount::float AS amount, channel, phone, issued_at, note, source FROM receipts WHERE issued_at > now() - interval '75 days' ORDER BY issued_at"),
    q("SELECT id, seller_no, amount::float AS amount, phone, state, created_at FROM claims WHERE created_at > now() - interval '30 days'"),
    q("SELECT * FROM reports WHERE created_at > now() - interval '75 days' ORDER BY created_at"),
    q('SELECT * FROM fakes ORDER BY created_at DESC LIMIT 200'),
    q('SELECT code, decision FROM reviews'),
    q('SELECT item_id, kind, target FROM actions'),
    q('SELECT id, seed, live_entries, winners, run_at FROM draws ORDER BY run_at DESC LIMIT 5'),
    q("SELECT id, seller_no, period, sales::float AS sales, declared::float AS declared, nil_reason, tax_due::float AS tax_due, channel, filed_at FROM returns WHERE filed_at > now() - interval '400 days' ORDER BY period"),
    q("SELECT id, seller_no, period, amount::float AS amount, ref, channel, paid_at FROM payments WHERE paid_at > now() - interval '400 days' ORDER BY paid_at")
  ]);
  res.status(200).json({ empty: false, now: new Date().toISOString(), sellers, receipts, claims, reports, fakes, reviews, actions, draws, returns, payments });
});
