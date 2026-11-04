# Rasiti (Receipt) Lottery

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
| `ADMIN_NAME` | Optional. The owner's display name (default: Katleho Tlale) |
| `SMTP_URL` | Optional, to send email reports and alerts. Any SMTP account, e.g. `smtps://you%40gmail.com:APP-PASSWORD@smtp.gmail.com:465` (Gmail needs an app password). Or use `RESEND_API_KEY` instead |
| `MAIL_FROM` | Optional. Sender shown on emails, e.g. `Rasiti <rasiti@yourdomain.co.ls>` |
| `CRON_KEY` | Optional. A random word; an outside scheduler calls `/api/notify?cron=1&key=THAT-WORD` to send scheduled emails (see below) |
| `SITE_URL` | Optional. The site's address, used for the "Open Rasiti" links in emails, e.g. `https://rasiti.statspack.africa` |

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
2. URL: `https://your-subdomain/api/notify?cron=1&key=YOUR-CRON_KEY` (or `https://your-subdomain/api/health` if you do not use email)
3. Interval: every **10 minutes**.

The first URL keeps the server awake and sends any email report or alert that is due. `/api/health` does not touch the database, so it costs nothing to check. Check Render's current free-plan limits on monthly hours before relying on this long term.

## Test on a real USSD connection (free sandbox)

The on-screen phones are a simulation. To show the menus working over a real USSD connection, use the free Africa's Talking sandbox. Its USSD format (CON / END replies, answers joined by `*`) is the common standard, so a Lesotho gateway can use the same endpoint later.

1. Create a free account at africastalking.com and open the **Sandbox** app.
2. Go to **USSD → Create channel**. Pick any channel number the sandbox offers.
3. **Callback URL:** `https://your-subdomain/api/ussd`
   - Optional, to stop others calling it: set `USSD_KEY` in your host's environment to a random word, and use `https://your-subdomain/api/ussd?key=THAT-WORD` as the callback. The demo phones on the website keep working when `USSD_KEY` is set, because requests from the site's own pages are allowed without the key.
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

## Seller sign-in: seller code and PIN

Sellers sign in to their menu with their **4-digit seller code and a 4-digit PIN**, on USSD and on WhatsApp. A merchant code is never used to sign in.

- New sellers choose a PIN when they join (entered twice; easy PINs such as 1234 are refused). It is stored only as a bcrypt hash, never shown, and never sent to the browser.
- 3 wrong PINs lock the seller menu for 15 minutes; the lock is written to the system log.
- Sellers who joined before PINs existed create one the first time they dial, and only from their own registered phone number.
- Demo sellers loaded with the demo dataset all use PIN **2580** (shown on the Start here page).
- On WhatsApp the PIN is shown as •••• in the chat.

## Cash: the buyer claims, the seller confirms

Most informal trade is cash, so cash gets receipts too, but **only the seller can put a sale into the seller's book**:

1. The buyer pays cash, dials `*999#` > 1 (customer) > **1. I paid cash**, and enters the seller code and the amount. This makes a **pending claim**: it is not in the sales book, not taxed and gives no draw entry.
2. The seller gets an SMS (simulated) and answers on `*999#` > 2 > seller code > PIN > **1. Confirm cash sales**: pick one and choose 1 Yes or 2 No, or **9** to confirm all at once. On WhatsApp the same menu works, with the PIN.
3. A **confirmed** claim becomes a receipt (channel `cash`): **1 draw entry** (2 at a registered seller), whatever the amount, and the sale is in the sales book, so the cash total is already there at filing time.
4. A **rejected** claim, or one ignored for 3 days (expired), never touches the sales book or the tax bill.

Limits: 5 claims per phone a day, M1 to M5,000 a claim (bigger sales: mobile money or card), no claims at your own shop, no duplicate within 10 minutes. Nobody can post a cash receipt directly (`/api/event` refuses it).

**The rule:** only three things can create tax: the seller's own confirmation, the seller's own return, and a payment a network or bank saw. Anything a buyer says (a cash claim, a rating) is a reason to look, never a bill. A person at home who claims cash at many shops changes nothing. A seller who confirms fake cash for friends pays tax on it and wins only 1 entry each time.

**Refusals as a signal, not a bill:** when one seller rejects or ignores most cash claims (at least half) from 3 or more different buyers who also pay by mobile money or card, the officer worklist suggests a friendly visit to explain cash confirmations. Phones made up for the purpose do not count. In the demo, Mme 'Mathabo (5140) shows this.

## Mobile money: M-Pesa and EcoCash merchant codes (no QR codes, nothing extra to type)

Every seller already has M-Pesa (Vodacom Lesotho) and EcoCash (Econet Telecom Lesotho) merchant accounts. Buyers pay them exactly as they do today.

1. The seller links their own merchant code once: `*999#` > 2 > seller code > PIN > **4. Payment codes** (or the same menu on WhatsApp). By linking, the seller agrees that payments to that code get Rasiti receipts. One merchant code can belong to only one seller; a clash is refused and logged. In a pilot, the network confirms the code belongs to the seller before linking (simulated here).
2. The buyer pays the merchant code as usual.
3. The network (or its payment aggregator) sends each payment to a linked code to Rasiti at **`/api/momo`**: network, merchant code, amount, payer's number, transaction id.
4. Rasiti issues the receipt and draw entries to the payer by SMS and records the sale in the seller's book. Repeats of the same transaction are ignored; a code that is not linked gets no receipt.

| Code | Who gives it | What it is for |
| --- | --- | --- |
| Rasiti seller code (4 digits) | Rasiti, when the seller joins | The seller's identity: sticker, card claims, officer records, sign-in with the PIN |
| M-Pesa merchant code | Vodacom | Where M-Pesa payments go. Linked to one Rasiti seller |
| EcoCash merchant code | Econet | Where EcoCash payments go. Linked to one Rasiti seller |
| Card machine terminal ID | The seller's bank | Where card payments go (mostly registered shops). Linked to one Rasiti seller |

- Settings: optional `MOMO_KEY`. Give the networks the callback `https://your-subdomain/api/momo?key=THAT-WORD`. The demo panel on the Phones page works without the key.

Example notification (JSON or form-encoded):
```
POST /api/momo?key=MOMO_KEY
{"network":"mpesa","merchant_code":"584112","amount":30,"msisdn":"26658123301","txn":"QK7XYZ123"}
```

## Card payments (speed points)

Most informal sellers have no card machine; registered shops often do. Card payments work like mobile money, except that a bank rarely knows the buyer's phone:

1. The seller links the card machine once: `*999#` > 2 > seller code > PIN > **4. Payment codes > 3. Link card machine**, then the bank (Standard Lesotho Bank, FNB Lesotho, Nedbank Lesotho or Lesotho PostBank) and the terminal ID. In a pilot the bank confirms the machine belongs to the seller (simulated here).
2. The buyer taps or swipes as usual. The bank sends each payment to **`/api/card`**: bank, terminal ID, amount, last 4 digits of the card, transaction id (and the phone, if the bank has it).
3. The receipt is issued at once. The buyer claims it on `*999#` > 1 > **2. I paid by card**: seller code, amount, last 4 digits of the card, within 3 days. No reference number to type. A payment can be claimed by one phone only; 3 claims that do not match in a day block that phone until tomorrow, and each miss is shown to officers.
4. A reversal from the bank (`{"type":"reversal","bank":"slb","txn":"..."}`) cancels the receipt.

- Settings: optional `CARD_KEY`. Give the banks `https://your-subdomain/api/card?key=THAT-WORD`.

```
POST /api/card?key=CARD_KEY
{"bank":"slb","terminal_id":"SLB60181","amount":250,"card_last4":"4471","txn":"A91XYZ"}
```

## What the seller does

- **Once:** join (2 minutes, with a PIN) and link their M-Pesa, EcoCash or card machine.
- **For cash:** say Yes to real cash sales when a buyer claims one (one tap, or 9 to confirm all at the end of the day).
- **Each quarter:** file from the sales book (prefilled) and pay by mobile money.
- Mobile money and card receipts issue themselves. Every winner shows ID and the SIM registered to them before payout.

## Prize calendar (amounts to be agreed with RSL)

| Draw | Prizes | Who can win |
| --- | --- | --- |
| Monthly | M5,000, M2,000, M1,000 cash; 5 smartphones; 20 x M100 airtime | Every receipt with the buyer's phone (cash the seller confirmed, M-Pesa, EcoCash, card) |
| Quarterly | 3 motorbikes: 2 for buyers, 1 for a registered seller who filed and paid the quarter on time | Every receipt in the quarter |
| Every 6 months | M100,000 cash | Every receipt in the 6 months |
| Every year | A car | Every receipt in the year |

Every entry counts in its month and again in the quarter, half-year and year draws. Winners show their ID and the SIM registered to them before payout.

### Payment fraud: what the Fraud Shield looks for

A fake digital sale means really paying the seller, and a fake cash sale needs the seller's own Yes. The rules look for money that did not stay paid, phones made only to farm entries, and people claiming other people's card payments:

1. **Payment reversed or paid back** (60 points, blocked): the network or bank reports a reversal or refund (`{"type":"reversal",...}`), or that the seller's wallet sent the same amount back to the payer within 24 hours (`{"type":"payback",...}` on `/api/momo`). The receipt leaves the draw and the seller's sales book.
2. **New phones paying the same amount** (40 points): 5 or more phones that never paid anyone before each pay one seller the same amount within an hour (a SIM-card farm).
3. **One phone claims many cards** (30 points): one phone claims card payments made with 3 or more different cards in 7 days.
4. The existing rules still run: seller buying from their own phone, one phone with many receipts in a day, a purchase split into small payments, a burst of new heavy buyers, and a sale far larger than usual.

Faking sales costs the network fee (digital) or raises the seller's taxable sales (every confirmed sale). Confirmed collusion: the prize is lost and both are barred from draws for 12 months. The demo data includes each pattern (sellers 4821, 3902 and 6018), so they show on the Fraud Shield page. The prototype runs the monthly draw (3 cash, 5 smartphones, 20 airtime) and shows the other draws with their live entry counts on the Monthly draw page.

## Working with Lekuka (RSL's e-invoicing system)

Lekuka is RSL's national e-invoicing platform: VAT-registered businesses issue invoices through an RSL-accredited billing system (EBS), which sends them to RSL's Invoice Data Management System (IDMS); buyers can check an invoice by scanning its QR code. It is compulsory for VAT-registered businesses from 1 November 2026 (VAT (E-Invoicing) Regulations 2026, Legal Notice 25 of 2026). Rasiti covers the traders Lekuka does not reach: small, mostly informal sellers who are not VAT-registered and are paid in cash, by M-Pesa or by EcoCash. Proposed links, to agree with RSL:

- **One taxpayer record:** a Rasiti seller's TIN is the same TIN used in RSL's systems, so a seller who grows past the VAT threshold moves onto Lekuka with their sales history.
- **Rasiti receipts as simple e-receipts:** Rasiti could be accredited as a light EBS for small sellers, sending each receipt (seller TIN, amount, time, receipt code) to the IDMS, so RSL holds one record of all sales.
- **Lekuka invoices in the draw (phase 2):** a buyer at a VAT-registered shop types the Lekuka invoice number (or scans the QR) on Rasiti; Rasiti checks it with the IDMS and adds draw entries. This gives buyers a reason to ask for e-invoices, which RSL needs Lekuka to succeed. Card payments at formal shops are already on Lekuka invoices, so this also covers most card buying.
- **Shared fraud checks:** a cancelled invoice or credit note in Lekuka cancels the matching draw entries, and a seller whose Lekuka sales jump while their Rasiti sales do not is flagged for an officer.

## Transaction search (whole history)

Menu **Search**, for every signed-in RSL role. One list holds every receipt (cash the seller confirmed, M-Pesa, EcoCash, card), every tax return and every tax payment since the start, searched on the server (`/api/search`). Type a receipt code, seller code or name, market, tax period, payment reference or the last digits of a phone, and filter by type, paid by, reported by (network, bank or seller), network notice (reversed or paid back), seller, market, dates and amount. Results download as CSV or PDF (up to 5,000 rows). Phone numbers stay masked unless an admin has switched on *Show contacts*, which is logged.

## Mohlomi AI (test agent)

**Mohlomi AI** ("the wise one") is a test agent inside Rasiti, for owners and admins only (menu: Mohlomi AI). Type what to check in plain words, for example "check that a customer who pays by M-Pesa gets a receipt". Mohlomi plans the steps, opens Rasiti's pages and demo phones in your browser while you watch, and reports what passed and what failed (copy or PDF). Every run is written to the system log.

- **Look only** (default, safe during judging): opens pages, reads them and checks downloads. Changes nothing.
- **Allow test changes**: also uses the demo phones and buttons such as payments and the draw. These are real demo records; use Undo or reset the demo data afterwards.
- Clearing or resetting data, switching users off and passwords are always blocked.
- Planning uses the same AI settings as Bohlale (`AI_API_KEY`). Without them, Mohlomi uses five built-in tests: every page, every download, a cash sale (buyer claims, seller confirms), the phones (USSD, PIN, M-Pesa payment, WhatsApp) and show/hide contacts. Plans are kept short (25 steps at most).
- Bohlale remains the officers' AI assistant; Mohlomi only tests the platform.

## Reports (every download in one place)

Menu **Reports & alerts** (also a button in the top bar of every RSL page): the dashboard PDF; officer worklist, review queue, complaints, and filing & payments as CSV, plus the officer PDF; the **cash claims CSV** (every claim and what the seller did); Fraud Shield receipts and fake codes CSV and PDF; community watch ratings, shops and areas CSV and PDF (with Bohlale's latest analysis); draw entries and winners CSV and the draw PDF. Each report uses the filters last set on its own page. Search results and the system log keep their own downloads. Customer phone numbers are masked in every download.

## Filing and paying (sustained compliance)

- Registered sellers choose **3. My tax** on USSD or WhatsApp to **file** the return for the quarter that just ended (prefilled from the sales book, a different amount, or nil with a reason), **pay** by mobile money in full or in small parts, see their **tax record** and on-time streak, and turn **reminders** on or off.
- Officers see a **Filing and payments** panel (on-time filing and payment, overdue tax, streaks), worklist items that suggest a **payment plan** rather than a penalty, and a **Send reminders** button. All of it is in the officer CSV/PDF downloads, the dashboard and Bohlale.
- Demo schedule: one return a quarter (Jan–Mar by 20 April, Apr–Jun by 20 July, Jul–Sep by 20 October, Oct–Dec by 20 January). Tax uses a **demo rate of 3% of declared sales** (`SBT_DEMO_RATE` on the server); RSL sets the real SBT rate and schedule.
- After deploying, use **Reset demo data** then **Load demo dataset** so the 6-month filing history is created.

## Languages: English and Sesotho

- **USSD:** on the main menu choose **4. Sesotho** (or **5. English**). The choice is saved for that phone number, so the next time the person dials, Rasiti answers in their language.
- **WhatsApp and the on-screen phones:** choose **9. Sesotho / 9. English** on the menu, or simply type "Sesotho" or "English".
- Every menu, message and help answer has a Sesotho version: `public/i18n.js` (screens) and `public/faq.js` (questions and answers). The same files serve the real USSD server, the on-screen phones and WhatsApp, so a correction in one place changes all three. Sesotho screens stay within the 182-character USSD limit.
- **The Sesotho wording is a careful draft. Ask a fluent Sesotho speaker at RSL to check it before the pilot.**

## Overview: click anything

- **Overview** (first RSL page): sales per day with the forecast for the next 14 days, sellers and leads on a map, "Needs attention", top sellers, the tax-net funnel and the tip of the day, for 7, 14 or 30 days.
- **Every chart bar, map dot, KPI, funnel step and list item is clickable.** It opens one detail panel on the right: a day's receipts by seller, a seller's own chart with forecast, risk score, tax position and the actions to take (invite, visit, mark contacted, ask Bohlale, see all transactions), a shop or area, a rating type, a time slot, a forecast day. Inside the panel, rows are clickable too, and **Back** returns. The same panel works on Community watch (charts and the three maps), the Officer console (worklist names and the map) and Forecasts.
- Less-used tables (Filing and payments, RSL e-services link, latest ratings, how the models work) are folded; click their heading to open them.

## Forecasts and machine learning

`public/ml.js` holds small, explainable models that **re-train from Rasiti's own data whenever it changes** (in the browser for the pages, and on the server for emails). No outside service.

- **Sales forecast:** Holt-Winters exponential smoothing with a weekly season. It learns the level, the trend and the day-of-week pattern; its three settings are chosen by testing many combinations on the history. Forecasts come with an 80% range.
- **Measured accuracy:** the last 14 days are hidden, forecast and compared (average error and how many days fell inside the range), shown on the Forecasts page and in emails.
- **One forecast per seller:** expected sales and tax for the current quarter (sales so far plus the forecast for the rest of the quarter, at the demo rate).
- **Chance of a late return or payment:** logistic regression trained on every past return, with four plain features (past late filing, past late payment, unpaid earlier tax, declared below receipts). The learned weights are shown, and each seller's score comes with its main reason.
- **Unusual weeks:** a seller whose last 7 days are far below (or above) what their own model expected is flagged.
- **Forecasts page** (menu): the next 30 days with range, the learned weekly pattern, tax expected by seller, late-payment risk by seller, forecast alerts and a "How the models work" table. Bohlale can answer questions about forecasts. Forecasts only rank what officers look at first; they never decide anything.

## Email reports and alerts

Menu **Reports & alerts**, section *Email reports and alerts* (owners and admins edit; everyone can read).

- **Reports:** daily, weekly, monthly, quarterly, every 6 months or yearly, to any addresses you choose. Each covers the last complete period: figures with the change on the period before, actions needed, what is coming up (due dates, draws, cash claims about to expire), and the forecast with its measured accuracy. Bohlale writes the opening summary when an AI key is set (masked figures only).
- **Alerts:** "As soon as something happens" sends only new actions, and repeats one weekly while it is still open. Alerts cover: tax overdue, returns not filed, returns due in 7 and 2 days, nil returns with receipts, cash claims rejected by many real buyers, cash claims about to expire, new leads, sellers asking for a helper, reversed or paid-back payments, self-buying, one phone with many receipts, fake codes, the monthly draw to run, and forecast alerts (sales expected to fall, a seller far below expectation).
- **Buttons:** Preview, Send now, Edit, Delete, On/off. **Alerts right now** shows what an alert email would contain; **Emails sent** keeps every email (click to read it), with its status.
- **Sending:** set `SMTP_URL` (or `RESEND_API_KEY`) and `MAIL_FROM`. Without them, every email is still built and kept in *Emails sent* as "Not sent", so the feature can be shown without an email account.
- **Timing:** reports go out from 06:00 Maseru time. The server checks every 10 minutes while it is awake; on a free Render server, point the keep-awake monitor at `/api/notify?cron=1&key=CRON_KEY` so the check also runs when nobody is using the site.
- Seven emails are created on first use, sent to `ADMIN_EMAIL`: alerts as they happen, weekly, monthly and quarterly reports (on), and daily, six-month and yearly reports (off).

## Help questions

- **Questions & answers** on USSD and WhatsApp: tax help for sellers (registering, Simplified Business Tax, filing, paying, records, nil returns, penalties, VAT, privacy) and help for customers (receipts, entries, the draw, prizes and scams, checking receipts, reporting shops, privacy). USSD: main menu option 3, customer option 6 or seller option 5. On WhatsApp customers and sellers can also type a question in their own words. All answers are in `public/faq.js`; edit that one file to change them everywhere. Tax answers are general guidance and send people to RSL for anything specific.

## Privacy controls and the system log

- Phone numbers are masked everywhere by default. Owners and admins can click **Show contacts** at the top of any RSL page to see full numbers; every switch is written to the system log. Bohlale AI and saved draw winners always stay masked.
- **System log** (menu, owners and admins): every action with who, what and when. Staff appear by email; customers and sellers using the phones appear with a masked number or seller code. Filter by person, action, date or search, and download as CSV or PDF.

## Simulated RSL e-services link

RSL does not give outside teams access to its live systems, so Rasiti shows how the link would work (`public/rsl-mock.js`):

- **TIN check:** when a seller registers, Rasiti checks the (simulated) RSL taxpayer register. ID numbers ending in `00` are treated as already registered and their TIN is linked; any other ID gets a new TIN.
- **Return sent to RSL:** every filed return gets an RSL acknowledgement number (`RSL-ACK-…`).
- **Payment receipt:** every tax payment gets an official RSL receipt number (`RSL-RCP-…`).

The Officer console shows every exchange under **RSL e-services link**. In a pilot, these three calls are replaced by RSL's real e-services connection.

## Daily education messages

`public/tips.js` holds 33 short tips in English and Sesotho, each with its source (RSL's public guides). They are free to read every day: a post on a Rasiti WhatsApp Channel, "Tip of the day" in the USSD Q&A menu (`*999#` → 3 → 3), on WhatsApp (type `TIP`; the first chat of the day shows it) and on the Overview.

To use RSL's own education material, replace or add tips in `public/tips.js`; the list repeats every 33 days.

## Who pays, and the laws to settle (to be agreed with RSL and the Ministry of Finance)

Running costs are about M71,000 a year; the full prize calendar is about M1.1 million a year at list prices. Funding options: **RSL's own budget** (running costs, officers' time), **development partners** (a domestic revenue grant for set-up, evaluation, training and first-year prizes), **sponsors** (networks, dealers and banks give phones, airtime, motorbikes and the car for publicity, with no say in the draw), and from year 2 **a capped share of the extra tax** (a yearly prize vote of, say, at most 15% of the extra tax from Rasiti sellers; all tax still goes to the Consolidated Fund).

Before the first real draw, RSL Legal and the Ministry of Finance confirm: the **Lotteries and Betting Act 1984** (is a free draw run by RSL a lottery; exemption, licence or Minister's notice), the **Revenue Services Lesotho Act 2001** (RSL's mandate to pay compliance rewards), the **Public Financial Management and Accountability Act 2011** and **Income Tax Act 1993** (prize money as public money; whether prizes are taxed), the **Data Protection Act 2011**, published **draw rules** (18+, staff excluded, an observer at each draw, complaints), and telecom and payment agreements. This is a checklist, not legal advice.

## Where Rasiti can be hosted (to be agreed with RSL)

Rasiti is plain Node.js and one PostgreSQL database, with no vendor lock-in, so it runs on any ordinary Linux server. The hosting arrangement will be agreed with RSL; the options are:

1. **RSL's own servers** in Maseru (lowest cost; RSL ICT has full control).
2. **Any data centre in Lesotho** chosen by RSL (government or private), if RSL prefers not to use its own machines.
3. **Outside Lesotho, at a Lesotho embassy or high commission** (for example in Pretoria), on servers on embassy premises, so the data stays under the Government of Lesotho's control.

The same steps work on all three: install Node.js 20+ and PostgreSQL, copy the code, set the environment variables from `.env.example`, run `node dev-server.mjs` behind HTTPS (nginx or Caddy), and keep nightly encrypted backups at a second site. Render (section 3B) is used only for the public prototype with mock data.

**Who runs it:** Samuel Mefane sets up Rasiti at the chosen site and manages it for at least 12 months (the 6-month pilot and at least 6 months after), then hands over to RSL ICT or a team RSL names, with a runbook and two handover sessions. RSL ICT works alongside if RSL confirms they are available.

### Running on RSL's own servers (lowest cost)

Rasiti is plain Node.js and Postgres, so it can run on RSL's servers and domain at no hosting cost. Free, open-source tools can replace paid services there:

- **AI:** an open model (for example gpt-oss-20b) served on an RSL machine with vLLM or Ollama; set `AI_BASE_URL` to it. Without AI, Bohlale gives built-in answers.
- **SMS and USSD:** a self-hosted open-source SMS gateway (for example Jasmin or Kannel) connected directly to Econet and Vodacom removes the middle-man's fee. The networks still charge for each SMS or session.
- **WhatsApp:** Meta's Cloud API directly, without a paid reseller.
- **Maps:** an OpenStreetMap tile server for Lesotho on RSL's server (`TILE_STREET_URL`).

## Who built what

The system architecture, user journeys and design were made by Samuel Mefane. AI tools were used as a coding assistant to write and test the code under his direction.

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
public/tips.js      Daily education messages (tip of the day), English and Sesotho, with sources
public/rsl-mock.js  Simulated RSL e-services link: TIN check, return acknowledgement, payment receipt
public/i18n.js      Sesotho for every phone screen (USSD, WhatsApp, on-screen phones)
public/app.js       Phones, Fraud Shield, maps, officer console, draw, Bohlale AI, users
public/agent.js     Mohlomi AI test agent (runs the steps in the browser)
public/ml.js        Machine learning: forecasts, accuracy test, late-payment risk, unusual weeks (browser and server)
public/vendor/      Leaflet maps and jsPDF (served locally)
public/img/         Login photo, Bohlale AI and Mohlomi AI logos
api/state.js        GET all demo data
api/event.js        POST actions from the public phones (validated)
api/auth.js         Sign in, sign out, change password
api/users.js        Add and manage users, activity log
api/admin.js        Reviews, worklist actions, draws, load/reset demo data
api/health.js       Health check for uptime monitors (no database)
api/ussd.js         Real USSD menus for a gateway (Africa's Talking format); seller code + PIN
api/momo.js         M-Pesa / EcoCash payment notifications: merchant code -> seller -> receipt; reversals and pay-backs
api/card.js         Card machine (speed point) notifications from banks: terminal -> seller -> receipt; reversals
api/agent.js        Mohlomi AI: plans tests from plain words, logs each run
api/bohlale.js      Bohlale AI: sends masked data to an OpenAI-compatible model
api/notify.js       Email reports and alerts: rules, outbox, scheduled sending (/api/notify?cron=1&key=CRON_KEY)
api/logs.js         Full system log (who, what, when) for owners and admins
api/tile.js         Map tiles for PDF reports (satellite, street map as backup; Lesotho only)
api/_lib/           Database, sessions, schema, receipt code checks, seller PINs, cash claims (cash.js), email (mail.js), report and alert builder (insights.js)
schema.sql          Same tables as the app creates automatically
dev-server.mjs      Server used by Render (npm start) and for local testing
vercel.json         Vercel settings
render.yaml         Render settings (optional blueprint)
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
