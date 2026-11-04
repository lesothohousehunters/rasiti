// Email reports and alerts.
// GET  /api/notify                    -> rules, outbox, email service status, alerts right now (every signed-in role)
// POST /api/notify {op:'save'|'delete'|'send_now'|'preview'|'run'}   owners and admins
// GET  /api/notify?cron=1&key=CRON_KEY -> sends every rule that is due (call it every 10-15 minutes from an outside scheduler,
//                                        e.g. cron-job.org; the same call keeps a free Render server awake). The local server also runs it itself.
// Reports: daily, weekly, monthly, quarterly, every 6 months, yearly. Alerts: as soon as something happens (only new ones, repeated weekly
// while still open) or a daily digest. Each email: figures, actions needed, what is coming up, and forecasts from the learning models.
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';
import { build, periodOf, renderEmail, templateSummary, FREQ } from './_lib/insights.js';
import { sendMail, mailStatus } from './_lib/mail.js';
import { KEY, complete } from './bohlale.js';

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;
const KINDS = { report: 'Report', alerts: 'Alerts' };
const site = req => process.env.SITE_URL || (req && req.headers && req.headers.host ? (req.headers['x-forwarded-proto'] || 'https') + '://' + String(req.headers['x-forwarded-host'] || req.headers.host).split(',')[0] : '');

async function aiSummary(I, kind, fallback) {
  if (!KEY()) return fallback;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const data = { period: I.period.label, figures: I.cur, previous_period: I.prev, totals: I.tot, actions: I.alerts.slice(0, 10).map(a => ({ level: a.level, title: a.title })), coming_up: I.upcoming.slice(0, 5).map(u => u.what), forecast: I.forecast };
    const { r, j } = await complete([{ role: 'system', content: 'You write the opening paragraph of an email for managers at Revenue Services Lesotho about Rasiti, a receipt-lottery platform. Plain English, at most 90 words, no lists, no greeting, no sign-off. Use only the figures given. Mention the most important action and the forecast. Never accuse anyone; officers decide.' },
      { role: 'user', content: `Kind of email: ${kind}. DATA: ${JSON.stringify(data)}` }], ctrl.signal);
    const a = r.ok ? (j.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() : '';
    return a && a.length < 1200 ? a : fallback;
  } catch { return fallback; } finally { clearTimeout(t); }
}

// Build (and send) one email for a rule. manual = "Send now": covers the last days up to now and sends every open alert.
async function runRule(q, rule, { manual, req, dry } = {}) {
  const now = Date.now(); const win = periodOf(rule.frequency, now, manual);
  const I = await build(q, win, now);
  let alerts = I.alerts;
  if (rule.kind === 'alerts' && rule.frequency === 'instant' && !manual) { // only alerts not sent before (or last sent over a week ago)
    const seen = await q('SELECT key, last_sent FROM alert_seen WHERE key = ANY($1)', [alerts.map(a => a.key)]);
    const old = Object.fromEntries(seen.map(s => [s.key, Date.parse(s.last_sent)]));
    alerts = alerts.filter(a => !old[a.key] || now - old[a.key] > 7 * 86400000);
    if (!alerts.length) return { skipped: true };
  }
  const isReport = rule.kind === 'report';
  const title = isReport ? `${FREQ[rule.frequency]} report: ${win.label}` : `${alerts.length} alert${alerts.length === 1 ? '' : 's'}: action needed on Rasiti`;
  const fallback = templateSummary(I);
  const summary = dry ? fallback : await aiSummary(I, isReport ? 'report' : 'alerts', fallback);
  const subtitle = isReport ? `Rasiti ${FREQ[rule.frequency].toLowerCase()} report for ${win.label}` : `Alerts as of ${new Date(now + 7200000).toISOString().slice(0, 16).replace('T', ' ')} (Maseru time)`;
  const { html, text } = renderEmail(I, { kind: rule.kind, title, subtitle, summary, alerts: isReport ? alerts.slice(0, 12) : alerts, site: site(req), rule: rule.name });
  const subject = `Rasiti · ${title}`;
  if (dry) return { subject, html, alerts: alerts.length };
  const res = await sendMail({ to: rule.recipients, subject, html, text });
  const [row] = await q('INSERT INTO email_outbox(rule_id, kind, subject, recipients, html, text, status, error, alerts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [rule.id || null, rule.kind, subject, rule.recipients, html, text, res.status, res.error || null, alerts.length]);
  if (rule.kind === 'alerts') for (const a of alerts) await q('INSERT INTO alert_seen(key, last_sent) VALUES ($1, now()) ON CONFLICT (key) DO UPDATE SET last_sent = now()', [a.key]);
  if (rule.id) await q('UPDATE email_rules SET last_run=now(), last_key=$1 WHERE id=$2', [manual ? rule.last_key : win.key, rule.id]);
  await audit(q, null, 'email_' + res.status, { actor: 'Rasiti', channel: 'email', rule: rule.name, subject, to: rule.recipients.length + ' recipient(s)', alerts: alerts.length, error: res.error || null }).catch(() => {});
  return { id: row.id, status: res.status, error: res.error, subject };
}

// Every rule whose period has passed (reports go out from 06:00 Maseru time; instant alerts on every run).
export async function runDue(req) {
  const q = await db(); await defaults(q); const now = Date.now(); const hour = new Date(now + 7200000).getUTCHours(); const out = [];
  for (const r of await q('SELECT * FROM email_rules WHERE active ORDER BY id')) {
    if (!r.recipients.length) continue;
    const due = r.frequency === 'instant' ? true : hour >= 6 && periodOf(r.frequency, now).key !== r.last_key;
    if (!due) continue;
    try { out.push({ rule: r.name, ...(await runRule(q, r, { req })) }); } catch (e) { console.error('notify', r.name, e.message); out.push({ rule: r.name, error: e.message }); }
  }
  return out;
}

async function defaults(q) {
  const [{ n }] = await q('SELECT count(*)::int AS n FROM email_rules'); if (n) return;
  const to = (process.env.ADMIN_EMAIL || '').trim().toLowerCase(); const r = EMAIL.test(to) ? [to] : [];
  for (const [name, kind, f] of [['Alerts as they happen', 'alerts', 'instant'], ['Daily report', 'report', 'daily'], ['Weekly report', 'report', 'weekly'], ['Monthly report', 'report', 'monthly'],
    ['Quarterly report', 'report', 'quarterly'], ['Six-month report', 'report', 'half_year'], ['Yearly report', 'report', 'annual']])
    await q('INSERT INTO email_rules(name, kind, frequency, recipients, active) VALUES ($1,$2,$3,$4,$5)', [name, kind, f, r, ['instant', 'weekly', 'monthly', 'quarterly'].includes(f)]);
}

export default route(async (req, res) => {
  const p = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  if (p.cron) {
    if (!process.env.CRON_KEY || p.key !== process.env.CRON_KEY) return res.status(403).json({ error: 'Set CRON_KEY and call /api/notify?cron=1&key=CRON_KEY.' });
    return res.status(200).json({ ok: true, ran: await runDue(req) });
  }
  if (req.method === 'GET') {
    const me = await requireRole(req, res, ['owner', 'admin', 'officer', 'viewer']); if (!me) return;
    const q = await db(); await defaults(q);
    const rules = await q('SELECT id, name, kind, frequency, recipients, active, ai_summary, last_run FROM email_rules ORDER BY id');
    const outbox = await q('SELECT id, rule_id, kind, subject, recipients, status, error, alerts, created_at, html FROM email_outbox ORDER BY id DESC LIMIT 40');
    const users = ['owner', 'admin'].includes(me.role) ? (await q('SELECT email, name FROM admin_users WHERE active ORDER BY name')) : [];
    let alerts = []; try { alerts = (await build(q, periodOf('daily', Date.now(), true), Date.now())).alerts; } catch (e) { console.error('alerts', e.message); }
    return res.status(200).json({ rules, outbox, users, alerts, mail: mailStatus(), cron: !!process.env.CRON_KEY, ai: !!KEY(), freq: FREQ, kinds: KINDS, can: ['owner', 'admin'].includes(me.role) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const me = await requireRole(req, res, ['owner', 'admin']); if (!me) return;
  const b = body(req); const q = await db();
  if (b.op === 'save') {
    const name = String(b.name || '').trim().slice(0, 60); if (!name) throw bad('Give the email a name.');
    if (!KINDS[b.kind]) throw bad('Choose a report or alerts.'); if (!FREQ[b.frequency]) throw bad('Choose how often.');
    if (b.kind === 'report' && b.frequency === 'instant') throw bad('Reports go out on a schedule; choose daily, weekly, monthly, quarterly, every 6 months or yearly.');
    const rec = [...new Set(String(Array.isArray(b.recipients) ? b.recipients.join(',') : b.recipients || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean))];
    const badOne = rec.find(x => !EMAIL.test(x)); if (badOne) throw bad(`"${badOne}" is not an email address.`); if (rec.length > 30) throw bad('At most 30 addresses.');
    if (b.id) await q('UPDATE email_rules SET name=$1, kind=$2, frequency=$3, recipients=$4, active=$5, ai_summary=$6 WHERE id=$7', [name, b.kind, b.frequency, rec, b.active !== false, b.ai_summary !== false, Number(b.id)]);
    else await q('INSERT INTO email_rules(name, kind, frequency, recipients, active, ai_summary, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [name, b.kind, b.frequency, rec, b.active !== false, b.ai_summary !== false, me.uid]);
    await audit(q, me, 'email_rule_saved', { name, kind: b.kind, frequency: FREQ[b.frequency], recipients: rec.length, active: b.active !== false });
    return res.status(200).json({ ok: true });
  }
  if (b.op === 'delete') { const [r] = await q('DELETE FROM email_rules WHERE id=$1 RETURNING name', [Number(b.id)]); if (r) await audit(q, me, 'email_rule_deleted', { name: r.name }); return res.status(200).json({ ok: true }); }
  if (b.op === 'send_now' || b.op === 'preview') {
    const [r] = await q('SELECT * FROM email_rules WHERE id=$1', [Number(b.id)]); if (!r) throw bad('Unknown email.');
    if (b.op === 'send_now' && !r.recipients.length) throw bad('Add at least one email address first.');
    const out = await runRule(q, r, { manual: true, req, dry: b.op === 'preview' });
    if (b.op === 'send_now') await audit(q, me, 'email_sent_now', { rule: r.name, status: out.status });
    return res.status(200).json({ ok: true, ...out });
  }
  if (b.op === 'run') return res.status(200).json({ ok: true, ran: await runDue(req) });
  throw bad('Unknown request.');
});
