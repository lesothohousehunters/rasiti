// Bohlale AI: RSL officer assistant.
// GET  /api/bohlale           -> { configured, model, provider }
// POST /api/bohlale {task, question, context, history[]} -> { mode:'ai', answer, model } or { mode:'template' }
//
// Works with any OpenAI-compatible chat API:
//   Demo (free):       AI_BASE_URL=https://api.groq.com/openai/v1   AI_MODEL=llama-3.3-70b-versatile
//   Production (own):  AI_BASE_URL=http://your-rsl-server:8000/v1  (vLLM or Ollama running an open model)
// Without AI_API_KEY the page uses built-in template answers instead.
import { db, audit } from './_lib/db.js';
import { route, body, requireRole, bad } from './_lib/http.js';

const BASE = () => (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
const MODEL = () => process.env.AI_MODEL || 'llama-3.3-70b-versatile';
const KEY = () => process.env.AI_API_KEY || '';

const SYSTEM = `You are Bohlale AI, the assistant for officers of Revenue Services Lesotho (RSL) using Rasiti, a receipt-lottery platform for informal and small businesses.

Rules you must always follow:
- Answer ANY question about the DATA: sellers, receipts, the draw, the Fraud Shield, community watch, returns, registration and officer actions. Calculate totals, averages, rankings and comparisons from it when asked.
- Use ONLY the DATA provided in the user message. If the data does not contain the answer, say so plainly. Never invent sellers, numbers, laws or tax rates.
- You advise; officers decide. Never approve, reject, penalise or accuse anyone. Use words like "suggest", "check", "ask".
- A nil return or a low receipt rate is never proof of wrongdoing. Always suggest a friendly first step (a call, a visit, an invitation) before anything else.
- Phone numbers are masked. Never try to reveal or guess them.
- Simplified Business Tax (SBT): the call for innovation says SBT taxpayers have annual income below M2,000,000 and operate in specific sectors. Do not state rates or deadlines that are not in the data.
- Write in simple, plain English with short sentences. Use short bullet points where helpful. Keep answers under 250 words unless asked for a report.
- If asked to write in Sesotho, write it, then add one line: "Please check the Sesotho wording with a fluent speaker before sending."
- When the DATA is community watch analytics, act as the data analyst: state the key numbers, trends (first half vs second half), best and worst areas, time-of-day patterns and leads, then give clear recommended actions. Warn when numbers are small.
- End every answer with a line starting "Based on:" naming the data you used (for example: worklist item, seller code, area statistics, held receipts).`;

export default route(async (req, res) => {
  const me = await requireRole(req, res, ['owner', 'admin', 'officer', 'viewer']);
  if (!me) return;

  if (req.method === 'GET') {
    let provider = '';
    try { provider = new URL(BASE()).host; } catch {}
    return res.status(200).json({ configured: !!KEY(), model: MODEL(), provider });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = body(req);
  const task = String(b.task || 'ask').slice(0, 40);
  const question = String(b.question || '').trim().slice(0, 2000);
  const context = JSON.stringify(b.context || {});
  if (!question) throw bad('Type a question.');
  if (context.length > 90000) throw bad('Too much data for one question. Narrow it down.');
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 3000) }));

  const q = await db();
  await audit(q, me, 'bohlale_ask', { task, question: question.slice(0, 160), mode: KEY() ? 'ai' : 'template' });
  if (!KEY()) return res.status(200).json({ mode: 'template' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(BASE() + '/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY() },
      body: JSON.stringify({
        model: MODEL(), temperature: 0.2, max_tokens: 1200,
        messages: [
          { role: 'system', content: SYSTEM },
          ...history,
          { role: 'user', content: `DATA (JSON, mock data for the RSL Taxathon demo):\n${context}\n\nTASK: ${task}\nQUESTION: ${question}` }
        ]
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j.error?.message || j.message || r.statusText;
      console.error('Bohlale AI provider error', r.status, msg);
      const why = r.status === 429 ? 'The free AI limit was reached for now. Try again in a minute' : r.status === 401 ? 'The AI key is wrong or expired. Check AI_API_KEY' : `The AI service answered with an error (${r.status})`;
      return res.status(200).json({ mode: 'template', note: `${why}. Showing a built-in answer instead.` });
    }
    const answer = j.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(200).json({ mode: 'template', note: 'The AI service returned an empty answer. Showing a template answer instead.' });
    return res.status(200).json({ mode: 'ai', answer, model: j.model || MODEL() });
  } catch (e) {
    console.error('Bohlale AI request failed', e.name, e.message);
    return res.status(200).json({ mode: 'template', note: e.name === 'AbortError' ? 'The AI service took too long. Showing a template answer instead.' : 'Could not reach the AI service. Showing a template answer instead.' });
  } finally { clearTimeout(timer); }
});
