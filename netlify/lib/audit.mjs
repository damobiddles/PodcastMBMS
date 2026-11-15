// Calls Claude to write the marketing check. The API key stays on the server
// (ANTHROPIC_API_KEY in Netlify's environment variables) and is never sent to the browser.

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, OUTPUT_SCHEMA, SERVICES, buildUserMessage } from './audit-prompt.mjs';

export const MODEL = 'claude-sonnet-5-5';
// Thinking + the written check fit comfortably in this; it is also the per-run cost ceiling
// (at $10 per million output tokens, 6,000 tokens is at most 6p of output).
const MAX_TOKENS = 6000;

export class AuditError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AuditError('config', 'ANTHROPIC_API_KEY is not set');
  client ||= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

/** Validates and tidies Claude's JSON so the page and email can trust its shape. */
export function normaliseAudit(raw) {
  const s = (v, max = 1200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const oc = (o) => ({ observed: s(o?.observed, 600), comment: s(o?.comment, 900) });
  const wins = Array.isArray(raw?.quick_wins) ? raw.quick_wins.slice(0, 3).map((w) => ({ title: s(w?.title, 120), detail: s(w?.detail, 700) })) : [];
  const service = SERVICES[raw?.bigger_opportunity?.service] ? raw.bigger_opportunity.service : 'brand-strategy';
  const audit = {
    page_quality: raw?.page_quality === 'thin' ? 'thin' : 'ok',
    summary: s(raw?.summary, 600),
    positioning: { verdict: s(raw?.positioning?.verdict, 300), detail: s(raw?.positioning?.detail, 900) },
    messaging: { headline: oc(raw?.messaging?.headline), proof: oc(raw?.messaging?.proof), ctas: oc(raw?.messaging?.ctas) },
    quick_wins: wins,
    bigger_opportunity: { service, title: s(raw?.bigger_opportunity?.title, 120), detail: s(raw?.bigger_opportunity?.detail, 900) },
  };
  if (!audit.summary || wins.length < 3 || !audit.bigger_opportunity.detail) throw new AuditError('shape', 'Incomplete check');
  return audit;
}

/** Runs one check. Returns { audit, usage, model }. */
export async function runAudit({ business, sells, goal, goalOther, page, finalUrl }) {
  const anthropic = getClient();
  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // If a safety classifier declines, the API retries on a suitable model in the same call
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserMessage({ business, sells, goal, goalOther, page, finalUrl }) }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AuditError('busy', 'Rate limited');
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AuditError('timeout', 'Timed out');
    if (e instanceof Anthropic.APIError) throw new AuditError('api', `API error ${e.status}`);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new AuditError('refusal', 'Declined');
  if (response.stop_reason === 'max_tokens') throw new AuditError('length', 'Ran out of room');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new AuditError('shape', 'Not JSON'); }
  return { audit: normaliseAudit(parsed), usage: response.usage, model: response.model };
}

// Sonnet 5.5 list prices, USD per million tokens (cache reads $0.10)
export function estimateCostUsd(usage) {
  if (!usage) return null;
  const input = (usage.input_tokens || 0) * 2 + (usage.cache_creation_input_tokens || 0) * 2.5 + (usage.cache_read_input_tokens || 0) * 0.1;
  const output = (usage.output_tokens || 0) * 10;
  return Math.round((input + output) / 1e6 * 10000) / 10000;
}
