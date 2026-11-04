-- Rasiti tables. The app runs these automatically; you can also paste them into the Neon SQL editor.

CREATE TABLE IF NOT EXISTS admin_users(
  id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('owner','admin','officer','viewer')),
  password_hash TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ);

CREATE TABLE IF NOT EXISTS sellers(
  no TEXT PRIMARY KEY, name TEXT NOT NULL, trade TEXT, market TEXT,
  status TEXT NOT NULL DEFAULT 'enrolled', tin TEXT, joined_at TIMESTAMPTZ,
  via_rasiti BOOLEAN NOT NULL DEFAULT FALSE, phone TEXT, declared_last NUMERIC,
  helper BOOLEAN NOT NULL DEFAULT FALSE, registered_at TIMESTAMPTZ,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS receipts(
  code TEXT PRIMARY KEY, seller_no TEXT NOT NULL, amount NUMERIC NOT NULL,
  channel TEXT NOT NULL, phone TEXT, issued_at TIMESTAMPTZ NOT NULL, note TEXT,
  source TEXT NOT NULL DEFAULT 'demo');

CREATE INDEX IF NOT EXISTS receipts_seller_time ON receipts(seller_no, issued_at);

CREATE TABLE IF NOT EXISTS claims(
  id TEXT PRIMARY KEY, seller_no TEXT NOT NULL, amount NUMERIC NOT NULL, phone TEXT,
  state TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS reports(
  id TEXT PRIMARY KEY, phone TEXT, type TEXT NOT NULL, seller_no TEXT,
  place_key TEXT, place_label TEXT, area TEXT, kind TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS fakes(
  id TEXT PRIMARY KEY, code TEXT, kind TEXT, phone TEXT, detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS reviews(
  code TEXT PRIMARY KEY, decision TEXT NOT NULL, decided_by INT, decided_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS actions(
  item_id TEXT PRIMARY KEY, kind TEXT NOT NULL, target TEXT, done_by INT,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS draws(
  id SERIAL PRIMARY KEY, seed BIGINT, live_entries INT, winners JSONB, run_by INT,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS audit_log(
  id SERIAL PRIMARY KEY, user_id INT, user_email TEXT, action TEXT NOT NULL,
  detail JSONB, at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS returns(
  id TEXT PRIMARY KEY, seller_no TEXT NOT NULL, period TEXT NOT NULL, sales NUMERIC, declared NUMERIC NOT NULL,
  nil_reason TEXT, tax_due NUMERIC NOT NULL DEFAULT 0, channel TEXT, filed_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(seller_no, period));
CREATE TABLE IF NOT EXISTS payments(
  id TEXT PRIMARY KEY, seller_no TEXT NOT NULL, period TEXT NOT NULL, amount NUMERIC NOT NULL, ref TEXT,
  channel TEXT, paid_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS reminders BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS phone_prefs(phone TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en', updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE phone_prefs ADD COLUMN IF NOT EXISTS tips_sub BOOLEAN NOT NULL DEFAULT FALSE; -- optional daily tip by SMS, M2.00 a day
-- Seller sign-in PIN (hashed, never shown) and mobile-money merchant codes: M-Pesa (Vodacom Lesotho) and EcoCash (Econet Telecom Lesotho)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pin_fails INT NOT NULL DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pin_lock_until TIMESTAMPTZ;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS mpesa_code TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS ecocash_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sellers_mpesa_code ON sellers(mpesa_code) WHERE mpesa_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sellers_ecocash_code ON sellers(ecocash_code) WHERE ecocash_code IS NOT NULL;
-- Card payments (speed points) and network notices on a payment ('reversed', 'payback')
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS card_last4 TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS flag TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS card_terminal TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS card_bank TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sellers_card_terminal ON sellers(card_terminal) WHERE card_terminal IS NOT NULL;
-- Cash: the buyer claims a cash sale on *999#. It counts only when the seller confirms it (pending -> confirmed or rejected;
-- pending claims older than 3 days are treated as expired). A confirmed claim becomes a receipt with channel 'cash'.
ALTER TABLE claims ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS receipt_code TEXT;
CREATE INDEX IF NOT EXISTS claims_seller_state ON claims(seller_no, state);
CREATE INDEX IF NOT EXISTS claims_phone_time ON claims(phone, created_at);
-- Email reports and alerts (rules, outbox, alerts already sent so they are not repeated)
CREATE TABLE IF NOT EXISTS email_rules(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, frequency TEXT NOT NULL, recipients TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE, ai_summary BOOLEAN NOT NULL DEFAULT TRUE, last_key TEXT, last_run TIMESTAMPTZ,
  created_by INT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS email_outbox(
  id SERIAL PRIMARY KEY, rule_id INT, kind TEXT, subject TEXT, recipients TEXT[], html TEXT, text TEXT, status TEXT NOT NULL,
  error TEXT, alerts INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS alert_seen(key TEXT PRIMARY KEY, first_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_sent TIMESTAMPTZ);
