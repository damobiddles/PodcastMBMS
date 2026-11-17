// Reads a podcast for the free podcast check, from one of:
// - an Apple Podcasts link (looked up with Apple's public lookup API to find the RSS feed)
// - the show's RSS feed
// - a YouTube channel link (the channel page, then YouTube's public feed of recent videos)
// Every request goes through the same SSRF-safe fetcher as the rest of the checker.

import { fetchPublic, normaliseUrl, FetchError } from './fetch-page.mjs';

const MAX_EPISODES = 20;

// ---- small XML helpers (feeds are simple enough not to need a parser library) ----

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
export function decode(s) {
  return String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const safeChar = (n) => (n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '');
export const stripTags = (s) => decode(String(s ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[ \t\f\v ]+/g, ' ')
  .replace(/\s*\n\s*/g, '\n')
  .trim();

const esc = (n) => n.replace(/[:.]/g, (c) => '\\' + c);
function tagText(xml, name) {
  const m = new RegExp(`<${esc(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${esc(name)}>`, 'i').exec(xml);
  return m ? m[1] : '';
}
function tagAttr(xml, name, attr) {
  const m = new RegExp(`<${esc(name)}\\s[^>]*?${attr}=["']([^"']*)["']`, 'i').exec(xml);
  return m ? decode(m[1]) : '';
}
const blocks = (xml, name) => xml.match(new RegExp(`<${esc(name)}[\\s>][\\s\\S]*?</${esc(name)}>`, 'gi')) || [];

/** "1:02:03", "62:03", "3723" → seconds */
export function parseDuration(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((t, n) => t * 60 + n, 0);
}

const clip = (s, n) => { const t = String(s || '').trim(); return t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };
const isoDate = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };

// ---- RSS / Atom podcast feeds ----

export function parseRss(xml) {
  if (!/<rss[\s>]|<channel[\s>]/i.test(xml)) throw new FetchError('notfeed', 'That link isn’t a podcast feed we can read.');
  const channel = xml.replace(/<item[\s>][\s\S]*$/i, ''); // channel-level tags come before the first item
  const items = blocks(xml, 'item');
  // Most feeds list newest first, but not all: sort by date before taking the newest
  const dated = items.map((it, i) => ({ it, i, t: Date.parse(stripTags(tagText(it, 'pubDate'))) || 0 }));
  if (dated.some((d) => d.t)) dated.sort((a, b) => b.t - a.t || a.i - b.i);
  const episodes = dated.slice(0, MAX_EPISODES).map(({ it }) => {
    const description = stripTags(tagText(it, 'content:encoded') || tagText(it, 'description') || tagText(it, 'itunes:summary'));
    return {
      title: stripTags(tagText(it, 'title')),
      date: isoDate(stripTags(tagText(it, 'pubDate'))),
      durationSec: parseDuration(stripTags(tagText(it, 'itunes:duration'))),
      episodeType: stripTags(tagText(it, 'itunes:episodeType')) || null,
      season: stripTags(tagText(it, 'itunes:season')) || null,
      number: stripTags(tagText(it, 'itunes:episode')) || null,
      hasChapters: /<podcast:chapters/i.test(it),
      hasTranscript: /<podcast:transcript/i.test(it),
      isVideo: /<enclosure[^>]+type=["']video\//i.test(it),
      descriptionWords: description ? description.split(/\s+/).length : 0,
      description: clip(description, 700),
      hasLinks: /https?:\/\//i.test(tagText(it, 'description') + tagText(it, 'content:encoded')),
    };
  });
  const categories = [...channel.matchAll(/<itunes:category[^>]+text=["']([^"']+)["']/gi)].map((m) => decode(m[1]));
  return {
    kind: 'rss',
    title: stripTags(tagText(channel, 'title')),
    author: stripTags(tagText(channel, 'itunes:author')),
    description: clip(stripTags(tagText(channel, 'itunes:summary') || tagText(channel, 'description')), 1500),
    categories: [...new Set(categories)].slice(0, 4),
    language: stripTags(tagText(channel, 'language')),
    hasArtwork: Boolean(tagAttr(channel, 'itunes:image', 'href') || tagText(channel, 'image')),
    website: stripTags(tagText(channel, 'link')),
    type: stripTags(tagText(channel, 'itunes:type')) || null,
    totalEpisodes: items.length,
    episodes,
  };
}

// ---- YouTube ----

export function parseYouTubeFeed(xml) {
  const entries = blocks(xml, 'entry');
  return entries.slice(0, MAX_EPISODES).map((e) => {
    const description = stripTags(tagText(e, 'media:description'));
    const views = tagAttr(e, 'media:statistics', 'views');
    return {
      title: stripTags(tagText(e, 'title')),
      date: isoDate(stripTags(tagText(e, 'published'))),
      isShort: /\/shorts\//i.test(tagAttr(e, 'link', 'href')),
      views: views ? Number(views) : null,
      descriptionWords: description ? description.split(/\s+/).length : 0,
      description: clip(description, 500),
    };
  });
}

export function channelIdFromHtml(html) {
  const m = /<meta itemprop=["'](?:identifier|channelId)["'] content=["'](UC[\w-]{22})["']/i.exec(html) ||
    /"externalId":"(UC[\w-]{22})"/.exec(html) ||
    /<link rel=["']canonical["'] href=["']https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})["']/i.exec(html) ||
    /"channelId":"(UC[\w-]{22})"/.exec(html);
  return m ? m[1] : null;
}

const meta = (html, prop) => {
  const m = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html) ||
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i').exec(html);
  return m ? decode(m[1]) : '';
};

async function readYouTube(url) {
  let channelId = (/\/channel\/(UC[\w-]{22})/.exec(url.pathname) || [])[1] || null;
  // The channel page gives the name, description and (for @handles) the channel ID
  const path = url.pathname.replace(/\/(videos|featured|shorts|streams|playlists|about|podcasts)\/?$/, '') || '/';
  const page = await fetchPublic(new URL(`https://www.youtube.com${path}`), { kind: 'html' });
  channelId ||= channelIdFromHtml(page.body);
  let title = meta(page.body, 'og:title');
  const description = meta(page.body, 'og:description');
  if (!channelId) throw new FetchError('notfound', 'We couldn’t find that YouTube channel. Paste the link to your channel’s home page.');
  const feed = await fetchPublic(new URL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`), { kind: 'xml' });
  const videos = parseYouTubeFeed(feed.body);
  if (!title) title = stripTags(tagText(feed.body.replace(/<entry[\s>][\s\S]*$/i, ''), 'title'));
  return { kind: 'youtube', title, author: title, description: clip(description, 1500), channelId, episodes: videos, totalEpisodes: videos.length, recentOnly: true };
}

// ---- Apple Podcasts ----

async function readApple(url) {
  const id = (/\/id(\d{5,})/.exec(url.pathname) || [])[1] || url.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) throw new FetchError('notfound', 'That Apple Podcasts link doesn’t include the show’s ID. Copy the link from the show’s page in Apple Podcasts.');
  const res = await fetchPublic(new URL(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`), { kind: 'json' });
  let data;
  try { data = JSON.parse(res.body); } catch { throw new FetchError('notfound', 'Apple Podcasts didn’t recognise that show.'); }
  const show = (data.results || []).find((r) => r.feedUrl) || null;
  if (!show) throw new FetchError('notfound', 'Apple Podcasts didn’t give us a feed for that show. Try pasting your RSS feed link instead.');
  const feed = await readFeed(show.feedUrl);
  return { ...feed, kind: 'apple', title: feed.title || show.collectionName, author: feed.author || show.artistName, appleGenres: (show.genres || []).filter((g) => g !== 'Podcasts').slice(0, 3) };
}

async function readFeed(feedUrl) {
  const res = await fetchPublic(normaliseUrl(feedUrl), { kind: 'xml' });
  const show = parseRss(res.body);
  return { ...show, feedUrl: res.url, truncated: res.truncated };
}

// ---- entry point ----

/** Works out what kind of link this is, without fetching anything. */
export function identifyShowUrl(url) {
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (host === 'podcasts.apple.com' || host === 'itunes.apple.com') return 'apple';
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') return 'youtube';
  if (host === 'open.spotify.com' || host === 'spotify.com' || host === 'podcasters.spotify.com' || host === 'creators.spotify.com') return 'spotify';
  return 'rss';
}

/** Reads a show from a pasted link. Returns a plain summary object. Throws FetchError. */
export async function readShow(input) {
  const url = normaliseUrl(input);
  const kind = identifyShowUrl(url);
  if (kind === 'spotify') throw new FetchError('spotify', 'Spotify doesn’t share show details publicly. Paste your Apple Podcasts link, your RSS feed or your YouTube channel instead.');
  if (kind === 'apple') return readApple(url);
  if (kind === 'youtube') {
    if (url.hostname === 'youtu.be' || /^\/(watch|shorts\/)/.test(url.pathname)) throw new FetchError('video', 'That’s a link to one video. Paste the link to your YouTube channel instead (it usually looks like youtube.com/@yourshow).');
    return readYouTube(url);
  }
  return readFeed(url.toString());
}
