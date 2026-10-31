// Database access for Neon (production) or any Postgres (local development).
// q(text, params) runs one parameterised statement and returns rows.
import { SCHEMA } from './schema.js';

let _q = null;
let _ready = null;

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw Object.assign(new Error('DATABASE_URL is not set. Add your Neon connection string to the environment.'), { status: 500 });
  const useNeon = /neon\.tech/i.test(url) || process.env.USE_NEON === '1';
  if (useNeon) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    return (text, params = []) => (typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params));
  }
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return async (text, params = []) => (await pool.query(text, params)).rows;
}

export async function db() {
  if (!_q) _q = await connect();
  if (!_ready) _ready = (async () => { for (const stmt of SCHEMA) await _q(stmt); })().catch(e => { _ready = null; throw e; });
  await _ready;
  return _q;
}

export async function audit(q, user, action, detail = {}) {
  await q('INSERT INTO audit_log(user_id, user_email, action, detail) VALUES ($1,$2,$3,$4::jsonb)',
    [user ? user.uid : null, user ? user.email : null, action, JSON.stringify(detail)]);
}
