// Bohlale AI: RSL officer assistant.
// GET  /api/bohlale            -> { configured, model, provider }
// GET  /api/bohlale?check=1    -> also tests the AI connection: { ok, model, error }
// POST /api/bohlale {task, question, context, history[]} -> { mode:'ai', answer, model } or { mode:'template', note }
//
// Works with any OpenAI-compatible chat API:
//   Demo (free):       AI_API_KEY=<Groq key>   (AI_BASE_URL and AI_MODEL are optional)
//   Production (own):  AI_BASE_URL=http://your-rsl-server:8000/v1  (vLLM or Ollama running an open model)
// If AI_MODEL is missing or retired, Bohlale picks an available model from the provider's list by itself.
// Without AI_API_KEY the page uses built-in answers instead.
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';

const KEY = () => (process.env.AI_API_KEY || '').trim();
// Accepts common mistakes: a missing /openai/v1, a trailing /chat/completions, extra slashes or spaces.
function BASE() {
  let u = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(u)) u = 'https://' + u;
  try { const x = new URL(u);
    if (x.host === 'api.groq.com' && !x.pathname.startsWith('/openai/v1')) u = 'https://api.groq.com/openai/v1';
    if (x.host === 'openrouter.ai' && !x.pathname.startsWith('/api/v1')) u = 'https://openrouter.ai/api/v1';
    if (x.host === 'api.openai.com' && !x.pathname.startsWith('/v1')) u = 'https://api.openai.com/v1';
  } catch {}
  return u;
}
const WANTED = () => (process.env.AI_MODEL || '').trim();
// Preferred models, best first. The first one the provider actually offers is used when AI_MODEL is unset or unavailable.
const PREFERRED = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'qwen/qwen3-32b', 'openai/gpt-oss-20b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant'];
let picked = null; // cached across requests

const SYSTEM = `You are Bohlale ("wisdom" in Sesotho), the friendly AI colleague of officers at Revenue Services Lesotho (RSL). You work inside Rasiti, a receipt-lottery platform that helps informal and small businesses give receipts, keeps a free sales book for sellers, and helps RSL widen the tax net.

How to talk:
- Be warm, natural and conversational, like a helpful colleague. Greet back when greeted ("Lumela!" is welcome), answer small talk briefly, then offer help.
- Use the conversation history: understand follow-ups such as "and Palesa?", "why?", "show me more" or "make it shorter" in light of what was asked before.
- If a question is unclear, give your best answer and ask one short follow-up question.
- Prefer short paragraphs. Use bullet points only for lists or numbers. Keep answers under 200 words unless asked for a report or a draft.
- You can explain how Rasiti works (receipts, the monthly draw, the Fraud Shield, community watch, the officer console) and general tax ideas in plain words.

What you know and the rules you keep:
- The DATA in each message is the current state of Rasiti (mock data for the RSL Taxathon demo). Answer any question about it: sellers, receipts, the draw, the Fraud Shield, community watch, returns, registration and officer actions. Calculate totals, averages, rankings and comparisons when asked.
- For facts about sellers, numbers and events use ONLY the DATA. If the data does not hold the answer, say so plainly and suggest where an officer could look. Never invent sellers, numbers, laws, tax rates or deadlines.
- You advise; officers decide. Never approve, reject, penalise or accuse anyone. Use words like "suggest", "check", "ask".
- A nil return or a low receipt rate is never proof of wrongdoing. Suggest a friendly first step (a call, a visit, an invitation) first.
- Phone numbers are masked. Never try to reveal or guess them.
- Simplified Business Tax (SBT): the call for innovation says SBT taxpayers have annual income below M2,000,000 and operate in specific sectors. Do not state rates or deadlines that are not in the data.
- If asked to write in Sesotho, write it, then add: "Please check the Sesotho wording with a fluent speaker before sending."
- For community watch analytics, act as the data analyst: key numbers, trends (first half vs second half), best and worst areas, time-of-day patterns and leads, then recommended actions. Warn when numbers are small.
- When your answer uses figures from the DATA, end with a short line starting "Based on:" naming what you used. Skip that line for greetings and small talk.`;

const clean = s => String(s || '').replace(/(sk|gsk|key)[-_][A-Za-z0-9_-]{8,}/g, '[hidden]').slice(0, 220);
async function post(model, messages, signal) {
  const r = await fetch(BASE() + '/chat/completions', { method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY() },
    // gpt-oss models think before answering; low effort keeps answers fast and inside the free limits.
    body: JSON.stringify({ model, temperature: 0.4, max_tokens: 2000, messages, ...(/gpt-oss/.test(model) ? { reasoning_effort: 'low' } : {}) }) });
  const j = await r.json().catch(() => ({}));
  return { r, j, msg: clean(j.error?.message || j.message || r.statusText) };
}
async function listModels(signal) {
  try { const r = await fetch(BASE() + '/models', { signal, headers: { authorization: 'Bearer ' + KEY() } });
    const j = await r.json().catch(() => ({})); return (j.data || []).map(m => m.id).filter(Boolean); } catch { return []; }
}
function choose(ids) {
  const chat = ids.filter(id => !/whisper|tts|guard|embed|vision-only|orpheus|prompt-guard|distil|playai/i.test(id));
  return PREFERRED.find(m => chat.includes(m)) || chat.find(id => /gpt-oss|llama|qwen|gemma|mistral|deepseek|kimi/i.test(id)) || chat[0] || null;
}
const modelProblem = (r, msg) => r.status === 404 || (r.status === 400 && /model|decommission|not found|does not exist/i.test(msg));
// Calls the model; if the configured model is missing or retired, picks another one once and remembers it.
async function complete(messages, signal) {
  let model = picked || WANTED() || PREFERRED[0];
  let { r, j, msg } = await post(model, messages, signal);
  if (!r.ok && modelProblem(r, msg)) {
    const alt = choose(await listModels(signal));
    if (alt && alt !== model) { model = alt; ({ r, j, msg } = await post(model, messages, signal)); if (r.ok) picked = model; }
  } else if (r.ok && !picked) picked = model;
  return { r, j, msg, model };
}
function why(r, msg) {
  if (r.status === 401 || r.status === 403) return `The AI key was not accepted (${r.status}: ${msg}). Check AI_API_KEY in Render`;
  if (r.status === 429) return 'The free AI limit was reached for now. Try again in a minute';
  if (r.status === 404) return `The AI service could not find the model or address (404: ${msg}). Check AI_BASE_URL and AI_MODEL in Render, or delete AI_MODEL so Bohlale picks one`;
  return `The AI service answered with an error (${r.status}: ${msg})`;
}

export default route(async (req, res) => {
  const me = await requireRole(req, res, ['owner', 'admin', 'officer', 'viewer']);
  if (!me) return;
  let provider = ''; try { provider = new URL(BASE()).host; } catch {}

  if (req.method === 'GET') {
    const out = { configured: !!KEY(), model: picked || WANTED() || PREFERRED[0], provider };
    const check = String(req.query?.check ?? new URL(req.url, 'http://x').searchParams.get('check') ?? '') === '1';
    if (check && KEY()) {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
      try { const { r, msg, model } = await complete([{ role: 'user', content: 'Reply with the single word: ready' }], ctrl.signal);
        Object.assign(out, r.ok ? { ok: true, model } : { ok: false, error: why(r, msg) }); }
      catch (e) { Object.assign(out, { ok: false, error: e.name === 'AbortError' ? 'The AI service took too long to answer.' : `Could not reach ${provider} (${clean(e.message)}). Check AI_BASE_URL.` }); }
      finally { clearTimeout(t); }
    }
    return res.status(200).json(out);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = body(req);
  const task = String(b.task || 'ask').slice(0, 40);
  const question = String(b.question || '').trim().slice(0, 2000);
  const context = JSON.stringify(b.context || {});
  if (!question) throw bad('Type a question.');
  if (context.length > 90000) throw bad('Too much data for one question. Narrow it down.');
  const history = (Array.isArray(b.history) ? b.history : []).slice(-8)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 3000) }));

  const q = await db();
  await audit(q, me, 'bohlale_ask', { task, question: question.slice(0, 160), mode: KEY() ? 'ai' : 'template' });
  if (!KEY()) return res.status(200).json({ mode: 'template' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const { r, j, msg, model } = await complete([
      { role: 'system', content: SYSTEM + `\n\nThe officer talking to you is ${me.name || 'an RSL officer'} (role: ${me.role}). Today is ${new Date().toDateString()}.` },
      ...history,
      { role: 'user', content: `DATA (current Rasiti data as JSON):\n${context}\n\nTASK: ${task}\nMESSAGE FROM THE OFFICER: ${question}` }
    ], ctrl.signal);
    if (!r.ok) {
      console.error('Bohlale AI provider error', r.status, msg);
      return res.status(200).json({ mode: 'template', note: `${why(r, msg)}. Showing a built-in answer instead.` });
    }
    const answer = j.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!answer) return res.status(200).json({ mode: 'template', note: 'The AI service returned an empty answer. Showing a built-in answer instead.' });
    return res.status(200).json({ mode: 'ai', answer, model: j.model || model });
  } catch (e) {
    console.error('Bohlale AI request failed', e.name, e.message);
    return res.status(200).json({ mode: 'template', note: e.name === 'AbortError' ? 'The AI service took too long. Showing a built-in answer instead.' : `Could not reach ${provider}. Check AI_BASE_URL. Showing a built-in answer instead.` });
  } finally { clearTimeout(timer); }
});
