// Tables are created automatically on first request. The same SQL is in schema.sql
// if you prefer to run it yourself in the Neon SQL editor.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admin_users(
     id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('owner','admin','officer','viewer')),
     password_hash TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS sellers(
     no TEXT PRIMARY KEY, name TEXT NOT NULL, trade TEXT, market TEXT,
     status TEXT NOT NULL DEFAULT 'enrolled', tin TEXT, joined_at TIMESTAMPTZ,
     via_rasiti BOOLEAN NOT NULL DEFAULT FALSE, phone TEXT, declared_last NUMERIC,
     helper BOOLEAN NOT NULL DEFAULT FALSE, registered_at TIMESTAMPTZ,
     lat DOUBLE PRECISION, lng DOUBLE PRECISION, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS receipts(
     code TEXT PRIMARY KEY, seller_no TEXT NOT NULL, amount NUMERIC NOT NULL,
     channel TEXT NOT NULL, phone TEXT, issued_at TIMESTAMPTZ NOT NULL, note TEXT,
     source TEXT NOT NULL DEFAULT 'demo')`,
  `CREATE INDEX IF NOT EXISTS receipts_seller_time ON receipts(seller_no, issued_at)`,
  `CREATE TABLE IF NOT EXISTS claims(
     id TEXT PRIMARY KEY, seller_no TEXT NOT NULL, amount NUMERIC NOT NULL, phone TEXT,
     state TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS reports(
     id TEXT PRIMARY KEY, phone TEXT, type TEXT NOT NULL, seller_no TEXT,
     place_key TEXT, place_label TEXT, area TEXT, kind TEXT,
     lat DOUBLE PRECISION, lng DOUBLE PRECISION, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS fakes(
     id TEXT PRIMARY KEY, code TEXT, kind TEXT, phone TEXT, detail TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS reviews(
     code TEXT PRIMARY KEY, decision TEXT NOT NULL, decided_by INT, decided_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS actions(
     item_id TEXT PRIMARY KEY, kind TEXT NOT NULL, target TEXT, done_by INT,
     done_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS draws(
     id SERIAL PRIMARY KEY, seed BIGINT, live_entries INT, winners JSONB, run_by INT,
     run_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS returns(
     id TEXT PRIMARY KEY, seller_no TEXT NOT NULL, period TEXT NOT NULL, sales NUMERIC, declared NUMERIC NOT NULL,
     nil_reason TEXT, tax_due NUMERIC NOT NULL DEFAULT 0, channel TEXT, filed_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(seller_no, period))`,
  `CREATE TABLE IF NOT EXISTS payments(
     id TEXT PRIMARY KEY, seller_no TEXT NOT NULL, period TEXT NOT NULL, amount NUMERIC NOT NULL, ref TEXT,
     channel TEXT, paid_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS reminders BOOLEAN NOT NULL DEFAULT TRUE`,
  `CREATE TABLE IF NOT EXISTS phone_prefs(phone TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `ALTER TABLE phone_prefs ADD COLUMN IF NOT EXISTS tips_sub BOOLEAN NOT NULL DEFAULT FALSE`,
  // Seller sign-in PIN (hashed) and mobile-money merchant codes: M-Pesa (Vodacom Lesotho) and EcoCash (Econet Telecom Lesotho).
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pin_hash TEXT`,
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pin_fails INT NOT NULL DEFAULT 0`,
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pin_lock_until TIMESTAMPTZ`,
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS mpesa_code TEXT`,
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS ecocash_code TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sellers_mpesa_code ON sellers(mpesa_code) WHERE mpesa_code IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sellers_ecocash_code ON sellers(ecocash_code) WHERE ecocash_code IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS audit_log(
     id SERIAL PRIMARY KEY, user_id INT, user_email TEXT, action TEXT NOT NULL,
     detail JSONB, at TIMESTAMPTZ NOT NULL DEFAULT now())`
];
