import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, normaliseUrl } from '../lib/fetch-page.mjs';
import { extractPage } from '../lib/extract.mjs';
import { normaliseAudit } from '../lib/audit.mjs';
import { renderAuditEmail } from '../lib/render-email.mjs';

test('blocks private, loopback, link-local and metadata addresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::a00:1', '224.0.0.1']) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ['8.8.8.8', '104.198.14.52', '172.32.0.1', '2a00:1450:4009:81f::200e']) assert.equal(isPublicAddress(ip), true, ip);
});

test('rejects unsafe URLs before any request', () => {
  for (const u of ['http://localhost/', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/', 'file:///etc/passwd', 'ftp://example.com', 'http://example.com:8080/', 'http://user:pw@example.com/', 'http://printer.local/', 'http://intranet/', 'gopher://x.com']) {
    assert.throws(() => normaliseUrl(u), u);
  }
  assert.equal(normaliseUrl('example.co.uk').toString(), 'https://example.co.uk/');
  assert.equal(normaliseUrl('  https://Example.com/#x ').toString(), 'https://example.com/');
});

test('DNS answers pointing at private addresses are refused at connect time (rebinding)', async () => {
  const dns = (await import('node:dns')).default;
  const real = dns.lookup;
  const { safeLookup } = await import('../lib/fetch-page.mjs');
  try {
    dns.lookup = (h, o, cb) => cb(null, [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.5', family: 4 }]);
    await assert.rejects(new Promise((res, rej) => safeLookup('evil.example', {}, (e, a) => (e ? rej(e) : res(a)))), /not a public website/);
    dns.lookup = (h, o, cb) => cb(null, [{ address: '93.184.216.34', family: 4 }]);
    assert.equal(await new Promise((res, rej) => safeLookup('ok.example', {}, (e, a) => (e ? rej(e) : res(a)))), '93.184.216.34');
  } finally { dns.lookup = real; }
});

test('extracts headings, buttons and visible text, and drops scripts', () => {
  const html = `<!doctype html><html lang="en-GB"><head><title>Acme Kitchens | Marlow</title><meta name="description" content="Kitchens fitted in 10 days"><meta property="og:title" content="Acme"><script>var x = "secret";</script></head>
  <body><nav><a href="/">Home</a></nav><h1>Kitchens fitted in 10 days</h1><p>Family run since 1998. &ldquo;Brilliant job&rdquo; &ndash; Sue</p>
  <a class="btn btn-primary" href="/quote">Get a free quote</a><button>Call us</button><img src="a.png" alt="Which? Trusted Trader logo">
  <div hidden><p>hidden text</p></div><style>.x{}</style><ul><li>Free survey</li><li>10-year guarantee</li></ul></body></html>`;
  const p = extractPage(html);
  assert.equal(p.title, 'Acme Kitchens | Marlow');
  assert.equal(p.description, 'Kitchens fitted in 10 days');
  assert.deepEqual(p.h1, ['Kitchens fitted in 10 days']);
  assert.ok(p.ctas.includes('Get a free quote') && p.ctas.includes('Call us'));
  assert.ok(p.imageAlts.includes('Which? Trusted Trader logo'));
  assert.ok(p.text.includes('“Brilliant job” – Sue'));
  assert.ok(p.text.includes('- 10-year guarantee'));
  assert.ok(!p.text.includes('secret') && !p.text.includes('hidden text'));
  assert.equal(p.lang, 'en-GB');
});

const sample = {
  page_quality: 'ok', summary: 'Good. Needs proof.',
  positioning: { verdict: 'Clear.', detail: 'Detail.' },
  messaging: { headline: { observed: 'a', comment: 'b' }, proof: { observed: 'c', comment: 'd' }, ctas: { observed: 'e', comment: 'f' } },
  quick_wins: [{ title: '1', detail: 'x' }, { title: '2', detail: 'y' }, { title: '3', detail: 'z' }, { title: '4', detail: 'extra' }],
  bigger_opportunity: { service: 'not-a-service', title: 'T', detail: 'D' },
};

test('normalises the audit shape', () => {
  const a = normaliseAudit(sample);
  assert.equal(a.quick_wins.length, 3);
  assert.equal(a.bigger_opportunity.service, 'brand-strategy');
  assert.throws(() => normaliseAudit({ ...sample, quick_wins: [] }));
});

test('email escapes page-derived text', () => {
  const a = normaliseAudit({ ...sample, summary: '<script>alert(1)</script> & more' });
  const { html, text } = renderAuditEmail({ audit: a, business: 'A<b>', url: 'https://acme.co.uk/', optOutUrl: 'https://x/opt?id=1&t=2' });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Book your free 20-minute call'));
  assert.ok(text.includes('Delete my details'));
});
