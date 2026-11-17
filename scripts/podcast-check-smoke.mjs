// Smoke test for the podcast check's show reader on real shows (run in GitHub Actions,
// because Claude's cloud sessions can't reach podcast feeds). Reads each link through the
// same safe fetcher the live function uses and prints what Claude would be given.
// No Claude call and no lead is stored.
import fs from 'node:fs';
import { readShow } from '../netlify/lib/show.mjs';
import { fetchPublicPage } from '../netlify/lib/fetch-page.mjs';
import { buildUserMessage } from '../netlify/lib/audit-prompt.mjs';

const links = process.argv.slice(2);
fs.mkdirSync('smoke-out', { recursive: true });
for (const link of links) {
  const name = link.replace(/^https?:\/\//, '').replace(/[^a-z0-9.]+/gi, '_').slice(0, 80);
  const t = Date.now();
  try {
    const show = await readShow(link);
    fs.writeFileSync(`smoke-out/${name}.json`, JSON.stringify({ link, ms: Date.now() - t, show }, null, 2));
    console.log(`OK   ${link} -> ${show.kind} “${show.title}” ${show.episodes.length} episodes (feed total ${show.totalEpisodes}) ${Date.now() - t}ms`);
    if (process.env.SMOKE_PRINT) console.log(`::group::${link}\n${buildUserMessage({ goal: 'audience', show, finalUrl: link })}\n::endgroup::`);
  } catch (e) {
    fs.writeFileSync(`smoke-out/${name}.json`, JSON.stringify({ link, error: e.code || 'error', message: e.message }));
    console.log(`FAIL ${link}: ${e.code || ''} ${e.message}`);
  }
}
// The SSRF guard must refuse these even from a real network
for (const bad of ['http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1/', 'http://localhost:8080/', 'http://metadata.google.internal/']) {
  try { await fetchPublicPage(bad); console.log(`LEAK ${bad}`); process.exitCode = 1; } catch (e) { console.log(`BLOCKED ${bad}: ${e.message}`); }
  try { await readShow(bad); console.log(`LEAK ${bad}`); process.exitCode = 1; } catch (e) { console.log(`BLOCKED ${bad}: ${e.message}`); }
}
