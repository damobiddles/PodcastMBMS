// Turns a homepage's HTML into the visible text Claude reads, with light structure
// (headings, list items, buttons) so it can judge headline, proof and calls to action.
// No dependencies: a careful regex pass is enough for one page of marketing copy.

const MAX_TEXT_CHARS = 14000; // about 3,500 tokens: keeps each audit cheap and focused

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', pound: '£', euro: '€', copy: '©', reg: '®', trade: '™', middot: '·', bull: '•', rarr: '→', larr: '←', times: '×' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return ' '; }
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const clean = (s) => decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function attr(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? '').trim() : '';
}

function metaContent(html, key) {
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const n = (attr(tag, 'name') || attr(tag, 'property')).toLowerCase();
    if (n === key) return attr(tag, 'content');
  }
  return '';
}

/** Returns { title, description, ogTitle, ogDescription, h1, h2, ctas, text, wordCount, truncated, lang } */
export function extractPage(html) {
  let h = String(html || '');
  const lang = attr((/<html\b[^>]*>/i.exec(h) || [''])[0], 'lang');
  const title = clean((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || [])[1]);
  const description = metaContent(h, 'description');
  const ogTitle = metaContent(h, 'og:title');
  const ogDescription = metaContent(h, 'og:description');

  // Drop everything a visitor can't read
  h = h.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|canvas|iframe|object|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<([a-z][a-z0-9]*)\b[^>]*\s(?:hidden(?=[\s>/])|aria-hidden\s*=\s*["']?true["']?)[^>]*>[\s\S]{0,400}?<\/\1>/gi, ' ');

  const h1 = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1])).filter(Boolean).slice(0, 4);
  const h2 = [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => clean(m[1])).filter(Boolean).slice(0, 15);

  // Calls to action: buttons, links styled as buttons, and submit inputs
  const ctas = [];
  const seen = new Set();
  const addCta = (t) => { const k = t.toLowerCase(); if (t && t.length <= 60 && !seen.has(k)) { seen.add(k); ctas.push(t); } };
  for (const m of h.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) addCta(clean(m[1]));
  for (const m of h.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const cls = (attr(`<a ${m[1]}>`, 'class') + ' ' + attr(`<a ${m[1]}>`, 'role')).toLowerCase();
    if (/\b(btn|button|cta)\b|button/.test(cls)) addCta(clean(m[2]));
  }
  for (const m of h.matchAll(/<input\b[^>]*type\s*=\s*["']?submit[^>]*>/gi)) addCta(attr(m[0], 'value'));

  // Image alt text is often where logos, awards and testimonials live
  const alts = [...h.matchAll(/<img\b[^>]*>/gi)].map((m) => attr(m[0], 'alt')).filter((a) => a && a.length > 2 && a.length < 120);

  // Visible text with simple markers for structure
  let t = h
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, inner) => `\n\n${'#'.repeat(Number(n))} ${clean(inner)}\n\n`)
    .replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, (m, inner) => ` [button: ${clean(inner)}] `)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>(?!\s*<br)/gi, '\n')
    .replace(/<\/?(p|div|section|article|header|footer|nav|main|aside|ul|ol|table|tr|blockquote|figure|figcaption|form|label)\b[^>]*>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ');
  t = decodeEntities(t)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove repeated lines (menus that appear twice, cookie banners)
  const lines = [];
  const lineSeen = new Set();
  for (const line of t.split('\n')) {
    const k = line.trim().toLowerCase();
    if (k && k.length > 3 && lineSeen.has(k)) continue;
    if (k) lineSeen.add(k);
    lines.push(line);
  }
  t = lines.join('\n').replace(/\n{3,}/g, '\n\n');

  const wordCount = (t.match(/[A-Za-zÀ-ÿ0-9’']{2,}/g) || []).length;
  const truncated = t.length > MAX_TEXT_CHARS;
  if (truncated) t = t.slice(0, MAX_TEXT_CHARS).replace(/\s+\S*$/, '') + '\n[…page text cut here]';

  return { lang, title, description, ogTitle, ogDescription, h1, h2, ctas: ctas.slice(0, 25), imageAlts: [...new Set(alts)].slice(0, 25), text: t, wordCount, truncated };
}
