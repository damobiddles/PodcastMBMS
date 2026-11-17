// GET /api/podcast-check/leads.csv  (password protected)
// Downloads every stored check lead (podcast checks, plus older marketing checks) as a spreadsheet-friendly CSV.
// Sign in with any username and the password in CHECK_LEADS_PASSWORD.

import crypto from 'node:crypto';
import { listLeads } from '../lib/store.mjs';
import { GOALS, SERVICES } from '../lib/audit-prompt.mjs';

const deny = () => new Response('Password needed', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="MBMS leads", charset="UTF-8"', 'Cache-Control': 'no-store' } });
const csv = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };

export default async (req) => {
  const password = process.env.CHECK_LEADS_PASSWORD;
  if (!password || password.length < 12) return new Response('Set CHECK_LEADS_PASSWORD (12+ characters) in Netlify to use this.', { status: 503 });
  const auth = req.headers.get('authorization') || '';
  const given = auth.startsWith('Basic ') ? Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':').slice(1).join(':') : '';
  const a = crypto.createHash('sha256').update(given).digest(); const b = crypto.createHash('sha256').update(password).digest();
  if (!crypto.timingSafeEqual(a, b)) return deny();

  const rows = await listLeads();
  const header = ['date', 'tool', 'show or business', 'email', 'link', 'who the show is for', 'goal', 'happy to hear from us', 'bigger opportunity', 'service', 'summary', 'cost usd', 'site'];
  const lines = [header.join(',')].concat(rows.map((l) => [
    l.createdAt, l.tool || 'marketing-check', l.business, l.email, l.url, l.audience || l.sells, l.goal === 'other' && l.goalOther ? `Other: ${l.goalOther}` : (GOALS[l.goal] || l.goal),
    l.followUp ? 'yes' : 'no', l.audit?.bigger_opportunity?.title, SERVICES[l.audit?.bigger_opportunity?.service]?.name || l.audit?.bigger_opportunity?.service, l.audit?.summary, l.costUsd, l.deploy,
  ].map(csv).join(',')));
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="podcast-check-leads-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
};

export const config = { path: ['/api/podcast-check/leads.csv', '/api/marketing-check/leads.csv'], method: ['GET'] };
