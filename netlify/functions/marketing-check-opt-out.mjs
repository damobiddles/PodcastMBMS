// GET /api/marketing-check/opt-out?id=...&t=...
// The "Delete my details" link in every check email. Deletes the stored lead, stops future
// checks to that address, and tells MBMS so the alert email can be deleted too.

import { verify, deleteLead, sendEmail } from '../lib/store.mjs';
import { esc, SITE } from '../lib/render-email.mjs';

const page = (title, msg) => new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | MBMS</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/styles-firm.css"></head>
<body><main id="main"><section class="section page-intro"><div class="container"><p class="eyebrow">Your details</p><h1>${esc(title)}</h1><p class="section-intro">${esc(msg)}</p>
<div class="hero-actions" style="justify-content:flex-start"><a class="btn" href="${SITE}/">Back to the home page</a></div></div></section></main></body></html>`,
  { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export default async (req) => {
  const u = new URL(req.url);
  const id = u.searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/.test(id) || !verify(id, u.searchParams.get('t'))) {
    return page('That link didn’t work', 'The link may be incomplete. Reply to your check email and ask us to delete your details, and we’ll do it by hand.');
  }
  // Mail clients and scanners sometimes open links automatically, so deleting needs a button press
  if (req.method === 'GET') {
    return new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Delete my details | MBMS</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/styles-firm.css"></head>
<body><main id="main"><section class="section page-intro"><div class="container"><p class="eyebrow">Your details</p><h1>Delete my details</h1><p class="section-intro">This deletes your marketing check and contact details from our records and stops any more emails about it.</p>
<form method="POST" class="hero-actions" style="justify-content:flex-start"><button class="btn" type="submit">Delete my details</button></form></div></section></main></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  const lead = await deleteLead(id);
  if (lead && process.env.CHECK_NOTIFY_TO) {
    await sendEmail({
      to: process.env.CHECK_NOTIFY_TO,
      subject: `Delete request: ${lead.business || lead.url}`,
      text: `${lead.email} (${lead.business}, ${lead.url}) asked to delete their details. Their stored check has been deleted and they won't be emailed by the tool again. Please delete the original lead alert email and don't contact them about the check.`,
      html: `<p>${esc(lead.email)} (${esc(lead.business)}, ${esc(lead.url)}) asked to delete their details.</p><p>Their stored check has been deleted and the tool won’t email them again. Please delete the original lead alert email and don’t contact them about the check.</p>`,
    });
  }
  return page('Your details are deleted', 'We’ve deleted your marketing check and contact details, and we won’t email you about it again.');
};

export const config = { path: '/api/marketing-check/opt-out', method: ['GET', 'POST'] };
