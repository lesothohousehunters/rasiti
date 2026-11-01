# Rasiti: receipts that reward

RSL Taxathon 2026, Challenge 1 prototype. Customers get receipts and prize-draw entries, sellers get a free sales book, and RSL gets a live, mapped picture of where trade happens.

- **Public side (no sign-in):** Start here, and the seller and customer phones. The keypad phone dials `*999#` and runs a live session against `/api/ussd`; the smartphone has a home screen where you open WhatsApp, start a chat with the Rasiti contact and register.
- **RSL side (sign-in):** Fraud Shield, Community watch with satellite map, Officer console with leads map, Monthly draw, Users and activity log.
- **Data:** Neon Postgres. Tables are created automatically on first request.

## What you need

1. A **Neon** account (free tier is fine) for the database: https://neon.tech
2. A free hosting account. Two options are set up in this repository:
   - **Vercel (recommended):** never sleeps, because it only runs code when someone visits.
   - **Render:** runs a small server. On the free plan it sleeps after a period with no visitors; see "Keeping Render awake".
3. Access to the **DNS settings** of your domain, to point your subdomain at the host.

## 1. Create the database (Neon)

1. In Neon, create a project. Pick the region closest to your users.
2. On the project dashboard, click **Connect** and copy the connection string. It looks like
   `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
3. Optional: open the **SQL editor** and run `schema.sql`. If you skip this, the app creates the tables itself.

## 2. Settings (the same on any host)

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | A random string of 32+ characters. Generate one with `openssl rand -base64 48` |
| `ADMIN_EMAIL` | The email for the first owner account |
| `ADMIN_PASSWORD` | A strong password for that account (10+ characters) |

## 3A. Deploy on Vercel (recommended)

1. In Vercel: **Add New → Project**, import this GitHub repository. Framework preset: **Other**. Leave build settings empty.
2. Add the four settings under **Environment Variables**, then deploy.
3. Subdomain: **Project → Settings → Domains → Add**, type e.g. `rasiti.yourdomain.co.ls`, and create the DNS record Vercel shows (usually `CNAME` → `cname.vercel-dns.com`).
4. If you change settings later: **Deployments → … → Redeploy**.

## 3B. Deploy on Render

1. In Render: **New → Web Service**, connect this GitHub repository (or use **New → Blueprint**, which reads `render.yaml`).
2. Runtime **Node**, Build command `npm install`, Start command `npm start`, Instance type **Free**.
3. Add the four settings under **Environment**.
4. Health check path: `/api/health`.
5. Subdomain: **Settings → Custom Domains → Add**, then create the DNS record Render shows (usually `CNAME` → `your-service.onrender.com`).

### Keeping Render awake

Free Render services go to sleep when nobody visits for a while, and the next visitor waits while it wakes up. To keep it awake for demos, use a free uptime monitor such as UptimeRobot or cron-job.org:

1. Create a monitor of type **HTTP(s)**.
2. URL: `https://your-subdomain/api/health`
3. Interval: every **10 minutes**.

This page does not touch the database, so it costs nothing to check. Check Render's current free-plan limits on monthly hours before relying on this long term.

## Test on a real USSD connection (free sandbox)

The on-screen phones are a simulation. To show the menus working over a real USSD connection, use the free Africa's Talking sandbox. Its USSD format (CON / END replies, answers joined by `*`) is the common standard, so a Lesotho gateway can use the same endpoint later.

1. Create a free account at africastalking.com and open the **Sandbox** app.
2. Go to **USSD → Create channel**. Pick any channel number the sandbox offers.
3. **Callback URL:** `https://your-subdomain/api/ussd`
   - Optional, to stop others calling it: set `USSD_KEY` in your host's environment to a random word, and use `https://your-subdomain/api/ussd?key=THAT-WORD` as the callback.
4. Open the sandbox **Simulator** (Launch Simulator), enter a phone number, and dial the service code the sandbox shows (it looks like `*384*1234#`).
5. Choose **1** for customer or **2** for seller. A seller logs in with their 4-digit code (e.g. `3307`), or `0` to join.

Everything done through USSD is saved to the database and shows on the RSL screens (receipts are marked as USSD). Type `00` at any menu to go back to the start.

Note: the sandbox simulator runs on the provider's website. Dialling from a real handset needs a short code from Vodacom Lesotho and Econet Telecom Lesotho, approved by the Lesotho Communications Authority, through a USSD gateway.

## Bohlale AI (officer assistant)

Bohlale is on the RSL side of the menu. It reads the worklist, receipts, ratings and Fraud Shield results, then explains cases, drafts SMS and call scripts, and writes reports. It only suggests; officers decide. Full phone numbers are never sent to it, and every question is written to the activity log.

**Without a key** it still works: the task buttons give template answers built from the data. Free-text questions need a key.

**Free demo key (Groq):**

1. Sign up at console.groq.com and create an API key.
2. In Render: your service → **Environment** → add `AI_API_KEY` = the key. Save; Render restarts the app.
3. Open Bohlale AI. The chip at the top should say **AI on · (model name) via api.groq.com**. If something is wrong, Bohlale shows the exact problem when an owner or admin opens the page.

Optional settings (any OpenAI-compatible service works):

| Variable | Default | Example |
|---|---|---|
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | `https://openrouter.ai/api/v1` |
| `AI_MODEL` | picked automatically (gpt-oss-120b, then Llama 3.3 70B, then others the provider offers) | `llama-3.1-8b-instant` |
| `AI_API_KEY` | (empty = template mode) | |

**Production:** run an open model (for example gpt-oss, Qwen or Gemma) on RSL's own server with vLLM or Ollama, and point `AI_BASE_URL` to it (for example `http://10.0.0.5:8000/v1`). Taxpayer data then never leaves RSL. Free cloud services must only receive mock data.

## Downloads and analytics

- **Community watch** has filters (period, area, shop type, signal), three maps (shop ratings, hotspots without receipts, receipt rate by area), charts, and an "Ask Bohlale about this view" box that works as the data analyst.
- **Download:** ratings, shops and areas as CSV (opens in Excel), and a full **PDF report** with Bohlale's findings, charts, a schematic map and tables. Bohlale answers and the officer worklist can also be downloaded.
- Customer phone numbers are masked in every download.

## Filing and paying (sustained compliance)

- Registered sellers choose **4. My tax** on USSD or WhatsApp to **file** last month's return (prefilled from the sales book, a different amount, or nil with a reason), **pay** by mobile money in full or in small parts, see their **tax record** and on-time streak, and turn **reminders** on or off.
- Officers see a **Filing and payments** panel (on-time filing and payment, overdue tax, streaks), worklist items that suggest a **payment plan** rather than a penalty, and a **Send reminders** button. All of it is in the officer CSV/PDF downloads, the dashboard and Bohlale.
- Demo schedule: a monthly return for last month, due on the 20th. Tax uses a **demo rate of 3% of declared sales** (`SBT_DEMO_RATE` on the server); RSL sets the real SBT rate and schedule.
- After deploying, use **Reset demo data** then **Load demo dataset** so the 6-month filing history is created.

## Languages: English and Sesotho

- **USSD:** on the main menu choose **4. Sesotho** (or **5. English**). The choice is saved for that phone number, so the next time the person dials, Rasiti answers in their language.
- **WhatsApp and the on-screen phones:** choose **9. Sesotho / 9. English** on the menu, or simply type "Sesotho" or "English".
- Every menu, message and help answer has a Sesotho version: `public/i18n.js` (screens) and `public/faq.js` (questions and answers). The same files serve the real USSD server, the on-screen phones and WhatsApp, so a correction in one place changes all three. Sesotho screens stay within the 182-character USSD limit.
- **The Sesotho wording is a careful draft. Ask a fluent Sesotho speaker at RSL to check it before the pilot.**

## Dashboard and help questions

- **Dashboard** (first item on the RSL side): a bird's-eye view of receipts, sales, sellers, customer ratings, the Fraud Shield, the draw, what needs attention and the latest activity, for 7, 14 or 30 days. Every figure links to its page, and the PDF version explains each figure.
- **Questions & answers** on USSD and WhatsApp: tax help for sellers (registering, Simplified Business Tax, filing, paying, records, nil returns, penalties, VAT, privacy) and help for customers (receipts, entries, the draw, prizes and scams, checking receipts, reporting shops, privacy). USSD: main menu option 3, customer option 6 or seller option 5. On WhatsApp customers and sellers can also type a question in their own words. All answers are in `public/faq.js`; edit that one file to change them everywhere. Tax answers are general guidance and send people to RSL for anything specific.

## Privacy controls and the system log

- Phone numbers are masked everywhere by default. Owners and admins can click **Show contacts** at the top of any RSL page to see full numbers; every switch is written to the system log. Bohlale AI and saved draw winners always stay masked.
- **System log** (menu, owners and admins): every action with who, what and when. Staff appear by email; customers and sellers using the phones appear with a masked number or seller code. Filter by person, action, date or search, and download as CSV or PDF.

## 4. First sign-in and test data

1. Open `https://your-subdomain/#officer` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. This creates the owner account.
2. Click **Load demo dataset** in the banner. Testers and officers now share the same data.
3. Open **Users and activity** to add officers. Roles:
   - **Owner:** everything, including adding admins and resetting demo data
   - **Admin:** adds and manages officers and viewers
   - **Officer:** reviews held receipts, works the worklist, runs draws
   - **Viewer:** read only
4. Share `https://your-subdomain/` with testers. They can use the phones without an account.

After the first sign-in you can remove `ADMIN_PASSWORD` from your host's settings; it is only used while there are no users.

## Run it on your own computer

```bash
npm install
cp .env.example .env      # then fill in the values
npm run dev               # http://localhost:3000
```

`DATABASE_URL` can point at Neon or at any local Postgres.

## Files

```
public/index.html   Page, styles and layout
public/faq.js       Questions and answers for USSD and WhatsApp, English and Sesotho
public/i18n.js      Sesotho for every phone screen (USSD, WhatsApp, on-screen phones)
public/app.js       Phones, Fraud Shield, maps, officer console, draw, Bohlale AI, users
public/vendor/      Leaflet maps and jsPDF (served locally)
public/img/         Login photo and Bohlale AI logo
api/state.js        GET all demo data
api/event.js        POST actions from the public phones (validated)
api/auth.js         Sign in, sign out, change password
api/users.js        Add and manage users, activity log
api/admin.js        Reviews, worklist actions, draws, load/reset demo data
api/health.js       Health check for uptime monitors (no database)
api/ussd.js         Real USSD menus for a gateway (Africa's Talking format)
api/bohlale.js      Bohlale AI: sends masked data to an OpenAI-compatible model
api/logs.js         Full system log (who, what, when) for owners and admins
api/tile.js         Map tiles for PDF reports (satellite, street map as backup; Lesotho only)
api/_lib/           Database, sessions, schema, receipt code checks
schema.sql          Same tables as the app creates automatically
dev-server.mjs      Server used by Render (npm start) and for local testing
vercel.json         Vercel settings
render.yaml         Render settings (optional blueprint)
docs/               Rasiti solution brief (PDF)
```

## Changing the brand colours

All colours are at the top of `public/index.html`. To switch to RSL brand colours, change `--accent` (orange) and `--side` (navy sidebar).

## Before a real pilot

This build is for the competition and uses mock data only. Before live taxpayer data:

- Split `/api/state` into a public endpoint without phone numbers and an officer-only endpoint.
- Store phone numbers hashed, and follow the Data Protection Act 2011.
- Add rate limiting to `/api/event` and sign-in.
- Check the licence terms for Esri satellite imagery for production use, or use RSL's own map service.
- Agree the USSD short code with the mobile networks and set up a WhatsApp Business API account.
