// Branded ink-and-sunflower emails for the marketing check. Table layout and inline
// styles so it renders in Gmail, Outlook and Apple Mail.

import { SERVICES, GOALS } from './audit-prompt.mjs';

const INK = '#17161c';
const SUN = '#ffc93c';
const MUTED = '#5c5866';
const LINE = '#e4e3df';
const STONE = '#f3f3f1';
export const SITE = 'https://mbmspodcaststudio.com';
export const BOOK_URL = `${SITE}/work-with-us/?interest=Free%2020-minute%20marketing%20check#contact`;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const font = "font-family:Inter,'Helvetica Neue',Arial,sans-serif;";
const head = "font-family:Poppins,'Helvetica Neue',Arial,sans-serif;font-weight:700;";

function section(title, inner) {
  return `<tr><td style="padding:24px 32px 0">
    <p style="${head}margin:0 0 10px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a5300">${esc(title)}</p>
    ${inner}
  </td></tr>`;
}
const p = (t, extra = '') => `<p style="${font}margin:0 0 12px;font-size:16px;line-height:1.6;color:${INK};${extra}">${esc(t)}</p>`;

function observed(label, o) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:10px">
    <tr><td style="padding:14px 16px">
      <p style="${head}margin:0 0 6px;font-size:16px;color:${INK}">${esc(label)}</p>
      <p style="${font}margin:0 0 8px;font-size:14px;line-height:1.5;color:${MUTED}"><strong style="color:${INK}">On your page:</strong> ${esc(o.observed)}</p>
      <p style="${font}margin:0;font-size:15px;line-height:1.6;color:${INK}">${esc(o.comment)}</p>
    </td></tr></table>`;
}

function button(href, label) {
  return `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:${SUN};border:1.5px solid ${INK};border-radius:999px">
    <a href="${esc(href)}" style="${head}display:inline-block;padding:14px 26px;font-size:16px;color:${INK};text-decoration:none">${esc(label)}</a>
  </td></tr></table>`;
}

function shell({ preheader, heroEyebrow, heroTitle, heroIntro, body, footer }) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(heroTitle)}</title></head>
<body style="margin:0;padding:0;background:${STONE}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${STONE}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE}">
  <tr><td style="background:${INK};padding:28px 32px 30px">
    <span style="${head}display:inline-block;background:#24222b;color:#f3f0ea;border:1.5px solid #f3f0ea;padding:3px 10px;font-size:15px">MBMS</span>
    <p style="${head}margin:22px 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${SUN}">${esc(heroEyebrow)}</p>
    <h1 style="${head}margin:0 0 10px;font-size:28px;line-height:1.2;color:#f3f0ea">${esc(heroTitle)}</h1>
    ${heroIntro ? `<p style="${font}margin:0;font-size:16px;line-height:1.6;color:#c9c6d1">${esc(heroIntro)}</p>` : ''}
  </td></tr>
  ${body}
  <tr><td style="padding:28px 32px 30px;border-top:1px solid ${LINE};margin-top:24px">
    <p style="${font}margin:0;font-size:13px;line-height:1.6;color:${MUTED}">${footer}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

/** The email the visitor receives. */
export function renderAuditEmail({ audit, business, url, optOutUrl }) {
  const svc = SERVICES[audit.bigger_opportunity.service];
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
  const wins = audit.quick_wins.map((w, i) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px"><tr>
      <td width="40" valign="top"><span style="${head}display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background:${SUN};border:1.5px solid ${INK};border-radius:999px;font-size:15px;color:${INK}">${i + 1}</span></td>
      <td valign="top"><p style="${head}margin:3px 0 4px;font-size:16px;color:${INK}">${esc(w.title)}</p>${p(w.detail, 'font-size:15px')}</td>
    </tr></table>`).join('');

  const body = `
  ${section('In short', p(audit.summary))}
  ${section('Positioning', `${p(audit.positioning.verdict, 'font-weight:600')}${p(audit.positioning.detail)}`)}
  ${section('Messaging', observed('Headline', audit.messaging.headline) + observed('Proof', audit.messaging.proof) + observed('Calls to action', audit.messaging.ctas))}
  ${section('Three quick wins', wins)}
  <tr><td style="padding:12px 32px 0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${STONE};border-left:4px solid ${SUN};border-radius:8px"><tr><td style="padding:18px 20px">
      <p style="${head}margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a5300">The bigger opportunity</p>
      <p style="${head}margin:0 0 8px;font-size:18px;color:${INK}">${esc(audit.bigger_opportunity.title)}</p>
      ${p(audit.bigger_opportunity.detail, 'font-size:15px')}
      <p style="${font}margin:0;font-size:14px;color:${MUTED}">How we help: <a href="${esc(svc.url)}" style="color:${INK}">${esc(svc.name)}</a></p>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 8px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${INK};border-radius:12px"><tr><td style="padding:24px">
      <p style="${head}margin:0 0 8px;font-size:20px;color:#f3f0ea">Want a second pair of eyes on this?</p>
      <p style="${font}margin:0 0 16px;font-size:15px;line-height:1.6;color:#c9c6d1">In a free 20-minute call we’ll talk through your check, answer questions and agree the one or two things worth doing first. No obligation and no jargon.</p>
      ${button(BOOK_URL, 'Book your free 20-minute call')}
    </td></tr></table>
  </td></tr>`;

  const footer = `This check looked only at the text on your homepage (${esc(host)}) on the day you asked. It can’t see images, design, speed or other pages, so treat it as a starting point. You’re getting this because you asked for it on mbmspodcaststudio.com. We won’t add you to a mailing list. <a href="${esc(optOutUrl)}" style="color:${MUTED}">Delete my details</a> · <a href="${SITE}/privacy/" style="color:${MUTED}">Privacy</a><br>Meadow Brand Marketing Services (MBMS), Marlow, Buckinghamshire.`;

  const html = shell({
    preheader: audit.positioning.verdict,
    heroEyebrow: 'Your free marketing check',
    heroTitle: `${business || host}: your marketing check`,
    heroIntro: `We read your homepage at ${host} and wrote down what a new customer sees, what’s working and what we’d change first.`,
    body, footer,
  });

  const text = [
    `Your free marketing check: ${business || host}`,
    '',
    'IN SHORT', audit.summary, '',
    'POSITIONING', audit.positioning.verdict, audit.positioning.detail, '',
    'MESSAGING',
    `Headline. On your page: ${audit.messaging.headline.observed}`, audit.messaging.headline.comment, '',
    `Proof. On your page: ${audit.messaging.proof.observed}`, audit.messaging.proof.comment, '',
    `Calls to action. On your page: ${audit.messaging.ctas.observed}`, audit.messaging.ctas.comment, '',
    'THREE QUICK WINS',
    ...audit.quick_wins.map((w, i) => `${i + 1}. ${w.title}\n${w.detail}`), '',
    'THE BIGGER OPPORTUNITY', audit.bigger_opportunity.title, audit.bigger_opportunity.detail, `How we help: ${svc.name} ${svc.url}`, '',
    `Book your free 20-minute call: ${BOOK_URL}`, '',
    `This check looked only at the text on your homepage (${host}). Delete my details: ${optOutUrl}`,
    'Meadow Brand Marketing Services (MBMS), Marlow',
  ].join('\n');

  return { subject: `Your free marketing check: ${business || host}`, html, text };
}

/** The new-lead alert Damien receives. */
export function renderLeadEmail({ lead, audit, costUsd, leadsUrl }) {
  const rows = [
    ['Name of business', lead.business], ['Email', lead.email], ['Website', lead.url], ['What they sell', lead.sells],
    ['Main goal', lead.goal === 'other' && lead.goalOther ? `Other: ${lead.goalOther}` : GOALS[lead.goal]],
    ['Happy to hear from us', lead.followUp ? 'Yes' : 'No (only send what they asked for)'],
    ['Date', new Date(lead.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })],
    ['Bigger opportunity', `${audit.bigger_opportunity.title} (${SERVICES[audit.bigger_opportunity.service].name})`],
    ['Cost of this check', costUsd != null ? `about $${costUsd.toFixed(3)}` : 'unknown'],
  ];
  const body = `<tr><td style="padding:24px 32px 0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.map(([k, v]) => `<tr>
      <td valign="top" style="${font}padding:6px 12px 6px 0;font-size:14px;color:${MUTED};white-space:nowrap">${esc(k)}</td>
      <td valign="top" style="${font}padding:6px 0;font-size:15px;color:${INK}">${esc(v)}</td></tr>`).join('')}</table>
  </td></tr>
  ${section('Their check said', p(audit.summary) + audit.quick_wins.map((w, i) => p(`${i + 1}. ${w.title}`, 'font-size:15px;margin-bottom:6px')).join(''))}
  <tr><td style="padding:20px 32px 0">${button(`mailto:${lead.email}?subject=${encodeURIComponent('Your marketing check from MBMS')}`, 'Reply to them')}</td></tr>`;
  const html = shell({
    preheader: `${lead.business} (${lead.url}) asked for a marketing check`,
    heroEyebrow: 'New lead from the marketing check',
    heroTitle: lead.business || lead.url,
    heroIntro: lead.followUp ? 'They said they’re happy to hear from you about their check.' : 'They did not tick “happy to hear from you”, so only reply if they get in touch.',
    body,
    footer: `All checks: <a href="${esc(leadsUrl)}" style="color:${MUTED}">download the leads list (CSV)</a>. If this person asks to be deleted you’ll get another email; please delete this one too.`,
  });
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nSummary: ${audit.summary}\n\nLeads list: ${leadsUrl}`;
  return { subject: `New marketing check lead: ${lead.business || lead.url}`, html, text };
}
