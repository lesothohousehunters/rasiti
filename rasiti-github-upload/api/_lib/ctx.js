// The request being handled right now, so every log entry can record the IP address it came from
// without passing the request through every function.
import { AsyncLocalStorage } from 'node:async_hooks';
export const reqCtx = new AsyncLocalStorage();
// Client IP: the first address in X-Forwarded-For (set by Render, Vercel and most proxies), else the socket address.
export function clientIp(req) {
  const h = (req && req.headers) || {};
  const xf = String(h['x-forwarded-for'] || '').split(',')[0].trim() || String(h['x-real-ip'] || '').trim();
  let ip = xf || (req && req.socket && req.socket.remoteAddress) || '';
  ip = ip.replace(/^::ffff:/, ''); if (ip === '::1') ip = '127.0.0.1';
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null;
}
export const currentIp = () => { const s = reqCtx.getStore(); return s ? s.ip : null; };
