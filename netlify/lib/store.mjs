// Lead storage (Netlify Blobs), rate limits, signed opt-out links and sending email (Resend).

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

// Store names kept from the original marketing check so earlier leads stay in one list
const leads = () => getStore({ name: 'marketing-check-leads', consistency: 'strong' });
const limits = () => getStore({ name: 'marketing-check-limits', consistency: 'strong' });

const secret = () => process.env.CHECK_SECRET || process.env.ANTHROPIC_API_KEY || 'dev-only-secret';
export const hash = (s) => crypto.createHmac('sha256', secret()).update(String(s)).digest('hex').slice(0, 32);
export const sign = (id) => crypto.createHmac('sha256', secret()).update(`optout:${id}`).digest('hex').slice(0, 32);
export const verify = (id, token) => {
  const a = Buffer.from(sign(id)); const b = Buffer.from(String(token || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ---- rate limits ------------------------------------------------------------
// Per visitor (hashed IP), per email address, and a daily cap across the whole site
// that is the hard ceiling on spend.
export const LIMITS = {
  perIpPerDay: Number(process.env.CHECK_LIMIT_PER_IP || 3),
  perEmailPerDay: Number(process.env.CHECK_LIMIT_PER_EMAIL || 2),
  perDay: Number(process.env.CHECK_LIMIT_PER_DAY || 50),
};

const today = () => new Date().toISOString().slice(0, 10);

async function bump(key, max) {
  const store = limits();
  const n = Number((await store.get(key)) || 0);
  if (n >= max) return false;
  await store.set(key, String(n + 1));
  return true;
}

/** Returns null if allowed, or a reason code. Counts the attempt when allowed. */
export async function checkLimits({ ip, email }) {
  const d = today();
  if (!(await bump(`day/${d}`, LIMITS.perDay))) return 'site';
  if (!(await bump(`ip/${d}/${hash(ip)}`, LIMITS.perIpPerDay))) return 'visitor';
  if (!(await bump(`email/${d}/${hash(email.toLowerCase())}`, LIMITS.perEmailPerDay))) return 'visitor';
  return null;
}

export async function isSuppressed(email) {
  return Boolean(await limits().get(`suppressed/${hash(email.toLowerCase())}`));
}

// ---- leads ------------------------------------------------------------------

export async function saveLead(lead) {
  await leads().setJSON(`lead/${lead.id}`, lead);
}

export async function getLead(id) {
  return leads().get(`lead/${id}`, { type: 'json' });
}

export async function deleteLead(id) {
  const lead = await getLead(id);
  if (!lead) return null;
  await leads().delete(`lead/${id}`);
  await limits().set(`suppressed/${hash(lead.email.toLowerCase())}`, today());
  return lead;
}

export async function listLeads() {
  const store = leads();
  const { blobs } = await store.list({ prefix: 'lead/' });
  const all = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
  return all.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// ---- email --------------------------------------------------------------------

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CHECK_EMAIL_FROM);
}

/** Sends one email through Resend. Returns true on success; never throws. */
export async function sendEmail({ to, subject, html, text, replyTo, headers }) {
  if (!emailConfigured()) { console.log('[marketing-check] email not configured; skipped:', subject); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.CHECK_EMAIL_FROM, to: [to], subject, html, text, reply_to: replyTo || process.env.CHECK_REPLY_TO || undefined, headers }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error('[marketing-check] Resend error', res.status, (await res.text()).slice(0, 300)); return false; }
    return true;
  } catch (e) {
    console.error('[marketing-check] Resend failed', e.message);
    return false;
  }
}
