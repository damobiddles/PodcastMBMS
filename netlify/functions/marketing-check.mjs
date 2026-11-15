// POST /api/marketing-check
// Free marketing check: validates the form, fetches the visitor's homepage, asks Claude for
// a short audit, stores the lead, emails the visitor their check and alerts MBMS.

import crypto from 'node:crypto';
import { fetchPublicPage, normaliseUrl, FetchError } from '../lib/fetch-page.mjs';
import { extractPage } from '../lib/extract.mjs';
import { runAudit, estimateCostUsd, AuditError, MODEL } from '../lib/audit.mjs';
import { GOALS } from '../lib/audit-prompt.mjs';
import { renderAuditEmail, renderLeadEmail, SITE } from '../lib/render-email.mjs';
import { checkLimits, isSuppressed, saveLead, sendEmail, sign } from '../lib/store.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const fail = (status, message, code) => json(status, { ok: false, code, message });

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const MIN_FILL_MS = 3000; // humans take longer than this to fill the form

function allowedOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // some privacy tools strip it; other checks still apply
  try {
    const host = new URL(origin).hostname;
    return host === 'mbmspodcaststudio.com' || host === 'www.mbmspodcaststudio.com' || host.endsWith('--peaceful-torrone-22f39e.netlify.app') || host === 'peaceful-torrone-22f39e.netlify.app' || host === 'localhost';
  } catch { return false; }
}

export default async (req, context) => {
  if (req.method !== 'POST') return fail(405, 'Method not allowed', 'method');
  if (!allowedOrigin(req)) return fail(403, 'Please use the form on our website.', 'origin');
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, 'The free check is being switched on and isn’t ready just yet. Please book a free 20-minute call instead, or try again tomorrow.', 'config');

  let body;
  try {
    const text = await req.text();
    if (text.length > 8000) return fail(413, 'That’s more than the form needs.', 'size');
    body = JSON.parse(text);
  } catch { return fail(400, 'Something went wrong sending the form. Please try again.', 'body'); }

  // Bot checks: hidden honeypot field and a minimum time on the page
  if (body.company_website || body.botcheck) return json(200, { ok: false, code: 'bot', message: 'Thanks.' });
  const started = Number(body.started || 0);
  if (!started || Date.now() - started < MIN_FILL_MS) return fail(400, 'That was quick. Please check your details and send the form again.', 'fast');

  const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
  const lead = {
    business: clip(body.business, 100),
    sells: clip(body.sells, 300),
    goal: Object.hasOwn(GOALS, body.goal) ? body.goal : '',
    goalOther: clip(body.goal_other, 150),
    email: clip(body.email, 200).toLowerCase(),
    consent: body.consent === true || body.consent === 'yes',
    followUp: body.follow_up === true || body.follow_up === 'yes',
  };
  if (!lead.business) return fail(400, 'Please tell us your business name.', 'business');
  if (!lead.sells) return fail(400, 'Please tell us briefly what you sell.', 'sells');
  if (!lead.goal) return fail(400, 'Please choose your main goal.', 'goal');
  if (!EMAIL_RE.test(lead.email)) return fail(400, 'Please check your email address.', 'email');
  if (!lead.consent) return fail(400, 'Please tick the box so we can send you your check.', 'consent');

  let url;
  try { url = normaliseUrl(body.url); } catch (e) { return fail(400, e.message, e.code || 'url'); }

  if (await isSuppressed(lead.email)) return fail(403, 'This email address asked us not to contact it again. Get in touch through our Work with us page if that’s changed.', 'suppressed');
  const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const limited = await checkLimits({ ip, email: lead.email });
  if (limited === 'site') return fail(429, 'We’ve had lots of requests today and paused new checks until tomorrow. Book a free 20-minute call instead and we’ll look at your site with you.', 'limit_site');
  if (limited) return fail(429, 'You’ve run a few checks today already. Try again tomorrow, or book a free 20-minute call and we’ll look at it together.', 'limit_visitor');

  // 1. Read the homepage
  let fetched;
  try { fetched = await fetchPublicPage(url); } catch (e) {
    const message = e instanceof FetchError ? e.message : 'We couldn’t read that website just now.';
    console.warn('[marketing-check] fetch failed', url.hostname, e.code || e.message);
    return fail(422, `${message} You can try again, or book a free 20-minute call and we’ll look at it with you.`, 'fetch');
  }
  const page = extractPage(fetched.html);
  if (page.wordCount < 25) {
    return fail(422, 'We could only read a few words on that page. It may be built in a way that needs a full browser to show its text, or it may be a holding page. Book a free 20-minute call and we’ll look at it with you instead.', 'thin');
  }

  // 2. Ask Claude for the check
  let result;
  try {
    result = await runAudit({ ...lead, page, finalUrl: fetched.url });
  } catch (e) {
    console.error('[marketing-check] audit failed', e.code || e.message);
    const message = e instanceof AuditError && e.code === 'config'
      ? 'The check isn’t switched on yet. Please book a free 20-minute call instead.'
      : 'Our checker had a problem writing your report. Please try again in a minute, or book a free 20-minute call.';
    return fail(503, message, 'audit');
  }
  const { audit, usage } = result;
  const costUsd = estimateCostUsd(usage);

  // 3. Store the lead (email, URL, goal, date and the check itself)
  const id = crypto.randomUUID();
  const record = {
    id, createdAt: new Date().toISOString(), ...lead, url: fetched.url, audit,
    model: result.model || MODEL, usage, costUsd, deploy: process.env.CONTEXT || 'dev',
  };
  try { await saveLead(record); } catch (e) { console.error('[marketing-check] save failed', e.message); }

  // 4. Emails: the visitor's check, and the lead alert
  const optOutUrl = `${SITE}/api/marketing-check/opt-out?id=${id}&t=${sign(id)}`;
  const visitorEmail = renderAuditEmail({ audit, business: lead.business, url: fetched.url, optOutUrl });
  const leadEmail = renderLeadEmail({ lead: record, audit, costUsd, leadsUrl: `${SITE}/api/marketing-check/leads.csv` });
  const [emailed] = await Promise.all([
    sendEmail({ to: lead.email, ...visitorEmail, headers: { 'List-Unsubscribe': `<${optOutUrl}>` } }),
    process.env.CHECK_NOTIFY_TO ? sendEmail({ to: process.env.CHECK_NOTIFY_TO, ...leadEmail, replyTo: lead.email }) : Promise.resolve(false),
  ]);

  return json(200, { ok: true, id, emailed, business: lead.business, url: fetched.url, audit });
};

export const config = { path: '/api/marketing-check', method: ['POST'] };
