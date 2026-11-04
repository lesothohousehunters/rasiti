// Sends one email. Works with any SMTP account (SMTP_URL, e.g. smtps://user:app-password@smtp.gmail.com:465),
// or the Resend email API (RESEND_API_KEY). MAIL_FROM sets the sender. Without either, nothing is sent:
// the email stays in the outbox, where admins can read it, and the status says why.
export function mailStatus() {
  if (process.env.SMTP_URL) { let host = 'SMTP'; try { host = new URL(process.env.SMTP_URL).hostname; } catch {} return { configured: true, provider: 'SMTP (' + host + ')', from: from() }; }
  if (process.env.RESEND_API_KEY) return { configured: true, provider: 'Resend', from: from() };
  return { configured: false, provider: null, from: from() };
}
const from = () => process.env.MAIL_FROM || 'Rasiti <rasiti@localhost>';
const clean = s => String(s || '').replace(/(:\/\/[^:@/]+:)[^@]+@/, '$1***@').replace(/(re_|key-)[A-Za-z0-9_-]{6,}/g, '[hidden]').slice(0, 240);

export async function sendMail({ to, subject, html, text }) {
  if (!to || !to.length) return { status: 'skipped', error: 'No recipients.' };
  try {
    if (process.env.SMTP_URL) {
      const nm = (await import('nodemailer')).default;
      const t = nm.createTransport(process.env.SMTP_URL);
      await t.sendMail({ from: from(), to: to.join(', '), subject, html, text });
      return { status: 'sent' };
    }
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.RESEND_API_KEY },
        body: JSON.stringify({ from: from(), to, subject, html, text }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); return { status: 'failed', error: clean(j.message || r.statusText) }; }
      return { status: 'sent' };
    }
    return { status: 'not_sent', error: 'No email service set (SMTP_URL or RESEND_API_KEY). Saved in the outbox.' };
  } catch (e) { return { status: 'failed', error: clean(e.message) }; }
}
