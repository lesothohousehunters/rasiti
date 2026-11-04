// Local development server: serves public/ and runs api/*.js like Vercel does.
// Usage: DATABASE_URL=... SESSION_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node dev-server.mjs
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
try { // load .env if present
  const env = await readFile(join(root, '.env'), 'utf8');
  for (const line of env.split('\n')) { const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
} catch {}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon' };
// Render sets PORT (usually 10000). A bad value falls back to 10000 instead of crashing.
const PORT = Number.isInteger(Number(process.env.PORT)) && Number(process.env.PORT) > 0 ? Number(process.env.PORT) : (process.env.RENDER ? 10000 : 3000);
console.log(`Starting Rasiti (Node ${process.version}) on port ${PORT}...`);

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9_-]/gi, '');
    if (!name || name.startsWith('_')) { res.writeHead(404).end(); return; }
    let mod;
    try { mod = await import(pathToFileURL(join(root, 'api', name + '.js')).href); } catch { res.writeHead(404).end('Not found'); return; }
    let raw = ''; for await (const c of req) raw += c;
    req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : {};
    req.query = Object.fromEntries(url.searchParams);
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    return mod.default(req, res);
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, 'public', p);
  try {
    if (!(await stat(file)).isFile()) throw 0;
    // no-cache: browsers check for a new version on every visit, so a deploy shows up straight away
    const ext = extname(file); res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ['.html', '.js', '.css', '.json'].includes(ext) ? 'no-cache' : 'public, max-age=86400' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error', e => { console.error('Rasiti could not start:', e.code || '', e.message); process.exit(1); });
server.listen(PORT, '0.0.0.0', () => console.log(`Rasiti running on port ${PORT}`));
// Email reports and alerts: check every 10 minutes which emails are due (see api/notify.js). An outside scheduler can also call
// /api/notify?cron=1&key=CRON_KEY, which keeps a sleeping free server awake as well. Set NOTIFY_INTERNAL=0 to switch this off.
if (process.env.DATABASE_URL && process.env.NOTIFY_INTERNAL !== '0') {
  const tick = async () => { try { const m = await import(pathToFileURL(join(root, 'api', 'notify.js')).href); const ran = await m.runDue(null); if (ran.length) console.log('Email:', ran.map(r => `${r.rule}: ${r.status || (r.skipped ? 'nothing new' : r.error)}`).join('; ')); } catch (e) { console.error('Email check failed:', e.message); } };
  setTimeout(tick, 60000); setInterval(tick, 10 * 60000);
}
