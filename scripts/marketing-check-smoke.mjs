// Smoke test for the marketing check's page reader on real websites (run in GitHub Actions).
// Fetches each homepage through the same safe fetcher the live function uses and saves
// what Claude would be given. No Claude call and no lead is stored.
import fs from 'node:fs';
import { fetchPublicPage } from '../netlify/lib/fetch-page.mjs';
import { extractPage } from '../netlify/lib/extract.mjs';

const sites = process.argv.slice(2);
fs.mkdirSync('smoke-out', { recursive: true });
for (const site of sites) {
  const name = site.replace(/^https?:\/\//, '').replace(/[^a-z0-9.]+/gi, '_');
  const t = Date.now();
  try {
    const { url, html, truncated } = await fetchPublicPage(site);
    const page = extractPage(html);
    fs.writeFileSync(`smoke-out/${name}.json`, JSON.stringify({ site, finalUrl: url, htmlBytes: html.length, truncated, ms: Date.now() - t, page }, null, 2));
    console.log(`OK   ${site} -> ${url} ${html.length}B ${page.wordCount} words ${Date.now() - t}ms`);
  } catch (e) {
    fs.writeFileSync(`smoke-out/${name}.json`, JSON.stringify({ site, error: e.code || 'error', message: e.message }));
    console.log(`FAIL ${site}: ${e.code || ''} ${e.message}`);
  }
}
// The SSRF guard must refuse these even from a real network
for (const bad of ['http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1/', 'http://localhost:8080/', 'http://metadata.google.internal/']) {
  try { await fetchPublicPage(bad); console.log(`LEAK ${bad}`); process.exitCode = 1; } catch (e) { console.log(`BLOCKED ${bad}: ${e.message}`); }
}
