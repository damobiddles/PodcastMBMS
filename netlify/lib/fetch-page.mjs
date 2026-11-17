// Fetches one public web page safely, for the free marketing check.
//
// Guardrails (SSRF):
// - http/https only, default ports only, no usernames/passwords in the URL
// - every hostname is resolved and EVERY resolved address must be public
//   (no loopback, private ranges, link-local, cloud metadata, CGNAT, multicast...)
// - the connection uses the address we checked (custom DNS lookup), so a DNS
//   answer cannot change between the check and the connection (DNS rebinding)
// - redirects are followed by hand, at most 4, and each hop is checked again
// - hard time limit and a size cap on the body; only the expected kind of file is accepted
//   (HTML pages, RSS/Atom feeds or JSON, depending on the caller)

import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';

export const MAX_BYTES = 1_500_000; // 1.5 MB of HTML is plenty for a page
export const MAX_FEED_BYTES = 4_000_000; // long-running shows have big feeds; newest episodes come first, so a cut-off is fine
const TIMEOUT_MS = 9000;
const MAX_REDIRECTS = 4;
const UA = 'Mozilla/5.0 (compatible; MBMS-PodcastCheck/1.0; +https://mbmspodcaststudio.com/podcast-check/)';
const ACCEPT = {
  html: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
  xml: 'application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.5',
  json: 'application/json,text/javascript;q=0.9,*/*;q=0.5',
};

export class FetchError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// ---- address checks -------------------------------------------------------

function ipv4ToInt(ip) {
  return ip.split('.').reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}
const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => [ipv4ToInt(base), bits]);

function isPublicIPv4(ip) {
  const n = ipv4ToInt(ip);
  return !V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (base & mask);
  });
}

function isPublicIPv6(ip) {
  const a = ip.toLowerCase().split('%')[0];
  if (a === '::' || a === '::1') return false;
  // IPv4-mapped / compatible (::ffff:1.2.3.4 or ::1.2.3.4)
  const mapped = a.match(/^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIPv4(mapped[1]);
  if (/^::ffff:/.test(a)) return false; // hex-form mapped addresses: refuse
  const first = parseInt(a.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return false; // fe80::/10 link local
  if ((first & 0xffc0) === 0xfec0) return false; // fec0::/10 site local (old)
  if ((first & 0xff00) === 0xff00) return false; // multicast
  if (a.startsWith('64:ff9b:')) return false;    // NAT64, can reach IPv4 internals
  if (a.startsWith('2001:db8:') || a.startsWith('2001:0db8:')) return false; // docs
  if (a.startsWith('2002:')) return false;       // 6to4 can embed private IPv4
  return true;
}

export function isPublicAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPublicIPv4(ip);
  if (family === 6) return isPublicIPv6(ip);
  return false;
}

// A DNS lookup that refuses non-public answers. Node calls this while connecting.
export function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length) return callback(new FetchError('dns', 'No address'));
    const bad = addresses.find((a) => !isPublicAddress(a.address));
    if (bad) return callback(new FetchError('blocked', 'That address is not a public website.'));
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

// ---- URL checks -----------------------------------------------------------

const BLOCKED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.intranet', '.lan', '.home', '.corp', '.arpa'];

export function normaliseUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new FetchError('invalid', 'Please enter your website address.');
  if (raw.length > 300) throw new FetchError('invalid', 'That web address is too long.');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = 'https://' + raw;
  let url;
  try { url = new URL(raw); } catch { throw new FetchError('invalid', 'That doesn’t look like a web address. Try something like yourbusiness.co.uk'); }
  checkUrl(url);
  url.hash = '';
  return url;
}

function checkUrl(url) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new FetchError('invalid', 'Please use a normal website address (http or https).');
  if (url.username || url.password) throw new FetchError('invalid', 'Please enter the address without a username or password.');
  if (url.port && !['80', '443'].includes(url.port)) throw new FetchError('blocked', 'Please use your public website address.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const bareHost = host.replace(/^\[|\]$/g, '');
  if (net.isIP(bareHost)) {
    if (!isPublicAddress(bareHost)) throw new FetchError('blocked', 'That address is not a public website.');
    throw new FetchError('invalid', 'Please enter your website’s name (like yourbusiness.co.uk) rather than an IP address.');
  }
  if (!host.includes('.') || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new FetchError('blocked', 'That address is not a public website.');
  }
}

// ---- fetching -------------------------------------------------------------

function requestOnce(url, deadline, accept = 'html') {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new FetchError('timeout', 'The site took too long to respond.'));
    const req = lib.request(url, {
      method: 'GET',
      lookup: safeLookup,
      agent: false,
      timeout: remaining,
      headers: {
        'User-Agent': UA,
        Accept: ACCEPT[accept] || ACCEPT.html,
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    }, (res) => resolve(res));
    req.on('timeout', () => req.destroy(new FetchError('timeout', 'The site took too long to respond.')));
    req.on('error', reject);
    const timer = setTimeout(() => req.destroy(new FetchError('timeout', 'The site took too long to respond.')), remaining);
    req.on('close', () => clearTimeout(timer));
    req.end();
  });
}

function readBody(res, deadline, maxBytes = MAX_BYTES) {
  return new Promise((resolve, reject) => {
    const enc = String(res.headers['content-encoding'] || '').toLowerCase();
    let stream = res;
    if (enc === 'gzip' || enc === 'x-gzip') stream = res.pipe(zlib.createGunzip());
    else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
    else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
    const chunks = [];
    let size = 0;
    let truncated = false;
    const timer = setTimeout(() => { res.destroy(); reject(new FetchError('timeout', 'The site took too long to respond.')); }, Math.max(1, deadline - Date.now()));
    stream.on('data', (c) => {
      if (truncated) return;
      size += c.length;
      if (size > maxBytes) {
        truncated = true;
        chunks.push(c.subarray(0, c.length - (size - maxBytes)));
        res.destroy();
        clearTimeout(timer);
        resolve({ buffer: Buffer.concat(chunks), truncated: true });
        return;
      }
      chunks.push(c);
    });
    stream.on('end', () => { clearTimeout(timer); if (!truncated) resolve({ buffer: Buffer.concat(chunks), truncated: false }); });
    stream.on('error', (e) => { clearTimeout(timer); if (!truncated) reject(e); });
  });
}

function charsetOf(contentType, buffer) {
  const m = /charset=["']?([\w-]+)/i.exec(contentType || '') ||
    (/<meta[^>]+charset=["']?([\w-]+)/i.exec(buffer.subarray(0, 4096).toString('latin1')) || /<\?xml[^>]+encoding=["']([\w-]+)/i.exec(buffer.subarray(0, 200).toString('latin1')));
  const cs = (m ? m[1] : 'utf-8').toLowerCase();
  try { return new TextDecoder(cs); } catch { return new TextDecoder('utf-8'); }
}

/**
 * Fetch a public URL. kind is 'html', 'xml' (RSS/Atom feeds) or 'json'.
 * Returns { url, body, html, truncated, type }. Throws FetchError.
 */
export async function fetchPublic(input, { kind = 'html' } = {}) {
  let url = input instanceof URL ? input : normaliseUrl(input);
  const deadline = Date.now() + TIMEOUT_MS;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res;
    try {
      res = await requestOnce(url, deadline, kind);
    } catch (e) {
      if (e instanceof FetchError) throw e;
      if (e && e.code === 'ENOTFOUND') throw new FetchError('dns', 'We couldn’t find that website. Check the address is spelled right.');
      if (e && /CERT|SSL|TLS/i.test(e.code || e.message || '')) throw new FetchError('tls', 'That site’s security certificate didn’t check out, so we couldn’t read it.');
      throw new FetchError('network', 'We couldn’t reach that website just now.');
    }
    const status = res.statusCode || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      if (hop === MAX_REDIRECTS) throw new FetchError('redirects', 'That site redirected too many times.');
      let next;
      try { next = new URL(res.headers.location, url); } catch { throw new FetchError('redirects', 'That site sent us to an address we couldn’t follow.'); }
      checkUrl(next);
      url = next;
      continue;
    }
    if (status === 401 || status === 403 || status === 429) {
      res.resume();
      throw new FetchError('refused', 'That site didn’t let us read its homepage (it may block automated visits).');
    }
    if (status >= 400) {
      res.resume();
      throw new FetchError('status', `That site returned an error (${status}).`);
    }
    const type = String(res.headers['content-type'] || '').toLowerCase();
    if (type && !typeOk(kind, type)) {
      res.resume();
      throw new FetchError('type', kind === 'html' ? 'That address isn’t a web page we can read (it looks like a file).' : 'That link didn’t give us what we expected.');
    }
    const { buffer, truncated } = await readBody(res, deadline, kind === 'xml' ? MAX_FEED_BYTES : MAX_BYTES);
    const body = charsetOf(type, buffer).decode(buffer);
    return { url: url.toString(), body, html: body, truncated, type };
  }
  throw new FetchError('redirects', 'That site redirected too many times.');
}

function typeOk(kind, type) {
  if (kind === 'html') return type.includes('html');
  if (kind === 'json') return type.includes('json') || type.includes('javascript') || type.includes('text/plain');
  // Feeds are served with all sorts of types; refuse only things that are clearly media
  return !/^(audio|video|image|font)\//.test(type);
}

/** Fetch a public HTML page. Returns { url, html, truncated }. Throws FetchError. */
export async function fetchPublicPage(input) {
  return fetchPublic(input, { kind: 'html' });
}
