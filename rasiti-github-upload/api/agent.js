// Mohlomi AI, the test agent: an owner or admin types what to test in plain words; the AI turns it into steps
// that the browser runs on Rasiti's own pages and demo phones. Owners and admins only.
// POST /api/agent {op:'plan', instruction, allowChanges, ui} -> { mode:'ai', plan:{title, steps[]} } or { mode:'builtin', note }
// POST /api/agent {op:'report', ...}                         -> writes the result to the system log
// Without AI_API_KEY (or if the AI fails) the page picks one of its built-in test plans instead.
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';
import { KEY, complete, why } from './bohlale.js';

const PAGES = ['guide', 'phones', 'dash', 'shield', 'watch', 'officer', 'search', 'draw', 'bohlale', 'users', 'logs'];
const DO = ['go', 'click', 'type', 'select', 'ussd', 'whatsapp', 'expect', 'expectNot', 'download', 'wait'];

const SYSTEM = `You are Mohlomi AI, the test agent of Rasiti. Rasiti is a web platform (RSL Taxathon prototype, mock data) with public demo phones and RSL officer pages.
An owner or admin tells you in plain words what to test. You reply with ONLY a JSON object, no other text:
{"title":"short name of the test","steps":[ ... ]}

Each step has "do", the fields for that kind, and "say": one short plain-English sentence for a non-technical reader.
Kinds of step:
- {"do":"go","page":"<page id>"}  open a page. Page ids: guide (Start here), phones, dash (Dashboard), shield (Fraud Shield), watch (Community watch), officer (Officer console), search (Transaction search: the whole history with filters Search, Type, Paid by, Recorded by, Seller check, Seller, Market or area, From, To, Min (M), Max (M), Sort and downloads Results CSV and Results PDF), draw (Monthly draw), bohlale (Bohlale AI), users (Users and activity), logs (System log).
- {"do":"click","text":"<visible text of a button, link or tab on the current page>"}
- {"do":"type","field":"<label, placeholder or id of a box>","value":"<text>"}
- {"do":"select","field":"<label or id of a drop-down>","option":"<visible option text>"}
- {"do":"ussd","phone":"customer"|"seller","inputs":["1","4"]}  dials *999# on that demo keypad phone, then sends each input in turn. Needs the phones page; open it first.
- {"do":"whatsapp","phone":"customer"|"seller","message":"<text>"}  sends a WhatsApp message to Rasiti from that demo phone.
- {"do":"expect","text":"<words that must appear>","where":"page"|"customer"|"seller"}  check the current page, or the last screen of a demo phone.
- {"do":"expectNot","text":"<words that must NOT appear>","where":"page"|"customer"|"seller"}
- {"do":"download","text":"<download button text>"}  click it and check a file is produced (the file is not saved).
- {"do":"wait","seconds":1-10}

Rules:
- Use only button texts, fields and pages that appear in the UI MAP below. Never invent labels. Keep "expect" texts short (2 to 5 words) and copied from the UI MAP or from menus you know.
- At most 30 steps. Start with a "go" step. After important actions add an "expect" step so the test proves something.
- USSD menus: main menu "1. I am a customer, 2. I am a seller, 3. Questions & answers, 4. Sesotho". Customer: 1 claim a card payment (seller code, amount, last 4 digits of the card), 2 check a receipt (code), 3 rate a shop, 4 my draw entries. Seller: after choosing 2, type seller code 3307 and then the PIN 2580 (demo PIN of every demo seller), then 1 my sales book, 2 my tax, 3 payment codes (M-Pesa, EcoCash, card machine), 4 questions. Questions menu: 3 tip of the day, 4 daily tip by SMS. WhatsApp words: Hi, TIP, SUBSCRIBE, STOP, menu. Payments: on the phones page the panel "Customer pays with M-Pesa, EcoCash or card" has fields "Pay with" (M-Pesa, EcoCash or Card (speed point)), "Seller", "Merchant code" (or the card machine's terminal ID), "Card, last 4 digits" (card only), "Amount (M)" (field ids mmNet, mmSeller, mmCode, mmL4, mmAmt) and the button "Pay as the customer". Mobile money receipts arrive by SMS; a card buyer claims the receipt with option 1. There are no cash receipts.
- If ALLOW CHANGES is false, do not use ussd or whatsapp steps and do not click buttons that change data (draw, approve, reject, send, add user, mark contacted, book visit, show contacts). Plan a look-only test and say so in the title.
- Never plan "Clear entire data", "Reset demo data", switching users off or password changes. They are always blocked.
- If the request is not about testing Rasiti, plan a short general health check instead.`;

function cleanPlan(raw) {
  let j = null;
  const t = String(raw || '').replace(/<think>[\s\S]*?<\/think>/g, '');
  const m = t.match(/\{[\s\S]*\}/);
  try { j = JSON.parse(m ? m[0] : t); } catch { return null; }
  if (!j || !Array.isArray(j.steps)) return null;
  const s = v => String(v ?? '').slice(0, 160);
  const steps = j.steps.slice(0, 30).map(x => {
    const d = String(x?.do || ''); if (!DO.includes(d)) return null;
    const o = { do: d, say: s(x.say) };
    if (d === 'go') { if (!PAGES.includes(x.page)) return null; o.page = x.page; }
    if (d === 'click' || d === 'download') { o.text = s(x.text); if (!o.text) return null; }
    if (d === 'type') { o.field = s(x.field); o.value = s(x.value); }
    if (d === 'select') { o.field = s(x.field); o.option = s(x.option); }
    if (d === 'ussd') { o.phone = x.phone === 'seller' ? 'seller' : 'customer'; o.inputs = (Array.isArray(x.inputs) ? x.inputs : []).slice(0, 12).map(v => s(v).slice(0, 40)); }
    if (d === 'whatsapp') { o.phone = x.phone === 'seller' ? 'seller' : 'customer'; o.message = s(x.message); }
    if (d === 'expect' || d === 'expectNot') { o.text = s(x.text); o.where = ['customer', 'seller'].includes(x.where) ? x.where : 'page'; if (!o.text) return null; }
    if (d === 'wait') o.seconds = Math.max(1, Math.min(10, Number(x.seconds) || 1));
    return o;
  }).filter(Boolean);
  return steps.length ? { title: s(j.title) || 'Test', steps } : null;
}

export default route(async (req, res) => {
  const me = await requireRole(req, res, ['owner', 'admin']);
  if (!me) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = body(req);
  const q = await db();

  if (b.op === 'report') {
    const n = v => Math.max(0, Math.min(999, Number(v) || 0));
    await audit(q, me, 'test_agent_run', { test: String(b.title || '').slice(0, 120), instruction: String(b.instruction || '').slice(0, 200),
      passed: n(b.passed), failed: n(b.failed), blocked: n(b.blocked), changes: !!b.allowChanges, planner: b.mode === 'ai' ? 'AI' : 'built-in', seconds: n(b.seconds) });
    return res.status(200).json({ ok: true });
  }
  if (b.op !== 'plan') throw bad('Unknown request.');
  const instruction = String(b.instruction || '').trim().slice(0, 1500);
  if (!instruction) throw bad('Type what you want the agent to test.');
  if (!KEY()) return res.status(200).json({ mode: 'builtin', note: 'The AI service is not set up, so the agent uses its built-in test plans.' });
  const ui = JSON.stringify(b.ui || {}).slice(0, 14000);
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const { r, j, msg } = await complete([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `UI MAP (pages with their headings, buttons and fields):\n${ui}\n\nALLOW CHANGES: ${b.allowChanges ? 'true' : 'false'}\n\nWHAT TO TEST: ${instruction}` }
    ], ctrl.signal);
    if (!r.ok) return res.status(200).json({ mode: 'builtin', note: `${why(r, msg)}. Using a built-in test plan instead.` });
    const plan = cleanPlan(j.choices?.[0]?.message?.content);
    if (!plan) return res.status(200).json({ mode: 'builtin', note: 'The AI did not return a usable plan. Using a built-in test plan instead.' });
    return res.status(200).json({ mode: 'ai', plan, model: j.model || '' });
  } catch (e) {
    return res.status(200).json({ mode: 'builtin', note: e.name === 'AbortError' ? 'The AI took too long. Using a built-in test plan instead.' : 'Could not reach the AI service. Using a built-in test plan instead.' });
  } finally { clearTimeout(timer); }
});
