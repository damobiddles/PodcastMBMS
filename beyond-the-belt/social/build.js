// Generates every social/brand PNG from the logo SVGs.
// Run from the repo:  node beyond-the-belt/social/build.js
// Needs Playwright with Chromium. Edit the TEXT block below, then re-run to refresh the images.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = __dirname;
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'btb-'));
const f = p => 'file://' + path.join(ROOT, p);

// ---- Edit these -----------------------------------------------------------
const TEXT = {
  url: 'beyondthebelt.org',        // assumed domain: change when confirmed
  tagline: 'Life is bigger than the belt.',
  quote: 'Add a quote from a student, parent or coach here.',
  quoteBy: 'Name, role',
  eventTitle: 'Event name',
  eventDate: '00 Month',
  eventDetail: 'Time · Place · How to join',
};
// ---------------------------------------------------------------------------

const logo = {
  full: f('assets/logo/btb-logo.svg'),
  fullDark: f('assets/logo/btb-logo-on-dark.svg'),
  fullWhite: f('assets/logo/btb-logo-white.svg'),
  mark: f('assets/logo/btb-mark.svg'),
  markDark: f('assets/logo/btb-mark-on-dark.svg'),
  markWhite: f('assets/logo/btb-mark-white.svg'),
};

const CSS = `
@font-face{font-family:Montserrat;src:url(${f('fonts/montserrat.woff2')});font-weight:600 900}
@font-face{font-family:Inter;src:url(${f('fonts/inter.woff2')});font-weight:400 700}
*{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#080808;--red:#ED1726;--deep:#D10F1D;--bone:#F5F2EB}
body{font-family:Inter,sans-serif;color:var(--bone);background:var(--ink);overflow:hidden;position:relative}
.stitch::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(255,255,255,.035) 46px 48px)}
.red.stitch::before{background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(0,0,0,.07) 46px 48px)}
.bone.stitch::before{background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(0,0,0,.035) 46px 48px)}
.ink{background:var(--ink)}.red{background:var(--deep)}.bone{background:var(--bone);color:var(--ink)}
.abs{position:absolute}
h1,h2,h3,.m{font-family:Montserrat,sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:.98}
em{font-style:normal;color:var(--red)}
.red em{color:var(--ink)}
.eyebrow{font:800 22px/1 Montserrat;letter-spacing:.2em;text-transform:uppercase;color:var(--red);display:flex;align-items:center;gap:14px}
.eyebrow::before{content:'';width:40px;height:6px;background:currentColor;border-radius:3px}
.red .eyebrow{color:#fff}
.pill{display:inline-block;background:var(--red);color:#fff;font:800 26px/1 Montserrat;letter-spacing:.08em;text-transform:uppercase;padding:22px 38px;border-radius:999px}
.red .pill{background:var(--ink)}
.bone .pill{background:var(--deep)}
.url{font:700 26px/1 Montserrat;letter-spacing:.06em;text-transform:lowercase;opacity:.85}
.belt{position:absolute;height:26px;border-radius:4px;background:var(--red)}
.fill{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
`;

const jobs = [];
const add = (name, w, h, cls, body, extra = '') => jobs.push({ name, w, h, html: `<!doctype html><meta charset=utf-8><style>${CSS}body{width:${w}px;height:${h}px}${extra}</style><body class="${cls}">${body}</body>` });
const img = (src, style) => `<img class="abs" src="${src}" style="${style}">`;

// ---- Profile pictures (centre-safe for circular crops) --------------------
add('profile-dark-1080', 1080, 1080, 'ink stitch', img(logo.markDark, 'left:190px;top:200px;width:700px'));
add('profile-light-1080', 1080, 1080, 'bone stitch', img(logo.full, 'left:200px;top:150px;width:680px'));
add('profile-red-1080', 1080, 1080, 'red stitch', img(logo.markWhite, 'left:190px;top:200px;width:700px'));

// ---- Banners ---------------------------------------------------------------
const bannerText = (size, extra = '') => `<div class="abs" style="${extra}"><div class="eyebrow" style="font-size:${size * .2}px;margin-bottom:${size * .22}px">A charity built on the mats</div><h1 style="font-size:${size}px">Life is bigger<br><em>than the belt.</em></h1></div>`;
add('facebook-cover-1640x624', 1640, 624, 'ink stitch',
  img(logo.markDark, 'left:150px;top:72px;width:480px') + bannerText(86, 'left:700px;top:150px') +
  '<div class="belt" style="right:0;bottom:0;width:380px"></div>');
add('x-header-1500x500', 1500, 500, 'ink stitch',
  bannerText(68, 'left:90px;top:100px') + img(logo.markDark, 'right:150px;top:60px;width:380px') +
  '<div class="belt" style="left:0;bottom:0;width:300px"></div>');
add('linkedin-banner-1584x396', 1584, 396, 'ink stitch',
  bannerText(60, 'left:520px;top:104px') + img(logo.markDark, 'right:120px;top:36px;width:320px') +
  '<div class="belt" style="left:0;bottom:0;width:240px"></div>');
// YouTube: everything important sits inside the central 1546x423 safe area
add('youtube-banner-2560x1440', 2560, 1440, 'ink stitch',
  img(logo.markDark, 'left:640px;top:486px;width:430px') +
  `<div class="abs" style="left:1130px;top:520px"><div class="eyebrow" style="font-size:20px;margin-bottom:26px">A charity built on the mats</div><h1 style="font-size:96px">Life is bigger<br><em>than the belt.</em></h1></div>` +
  '<div class="belt" style="left:0;right:0;bottom:0;height:30px;border-radius:0"></div>');
add('og-share-1200x630', 1200, 630, 'ink stitch',
  img(logo.markDark, 'right:60px;top:110px;width:360px') +
  `<div class="abs" style="left:80px;top:200px"><div class="eyebrow" style="font-size:20px;margin-bottom:28px">Beyond the Belt</div><h1 style="font-size:76px">Life is bigger<br><em>than the belt.</em></h1></div>` +
  `<div class="url abs" style="left:80px;bottom:56px;font-size:24px">${TEXT.url}</div><div class="belt" style="right:0;bottom:0;width:420px"></div>`);

// ---- Instagram / Facebook posts 1080x1350 ---------------------------------
const foot = (cls = '') => `<div class="abs url" style="left:70px;bottom:70px">${TEXT.url}</div>` + img(cls === 'dark' ? logo.markDark : logo.markWhite, 'right:70px;bottom:56px;width:110px');
add('post-01-welcome-1080x1350', 1080, 1350, 'ink stitch',
  `<div class="abs" style="left:70px;top:90px"><div class="eyebrow">A charity built on the mats</div></div>` +
  img(logo.markDark, 'left:230px;top:200px;width:620px') +
  `<h1 class="abs" style="left:70px;top:860px;font-size:112px">Life is bigger<br><em>than the belt.</em></h1>` + foot('dark'));
add('post-02-donate-1080x1350', 1080, 1350, 'red stitch',
  `<div class="abs" style="left:70px;top:90px"><div class="eyebrow">Donate</div></div>` +
  `<h1 class="abs" style="left:70px;top:210px;font-size:128px">Give a young person a place to <em>belong.</em></h1>` +
  `<p class="abs" style="left:70px;top:860px;width:800px;font-size:36px;line-height:1.4;font-weight:500">Your gift keeps places free and the doors open at the academy.</p>` +
  `<div class="abs" style="left:70px;top:1030px"><span class="pill">Donate now</span></div>` + foot());
add('post-03-values-1080x1350', 1080, 1350, 'ink stitch',
  `<div class="abs" style="left:70px;top:90px"><div class="eyebrow">What we stand for</div></div>` +
  ['Respect', 'Resilience', 'Community', 'Confidence'].map((v, i) => `<div class="abs" style="left:70px;top:${210 + i * 235}px;right:70px;border-top:6px solid ${i === 3 ? 'var(--red)' : '#2b2b2b'};padding-top:26px;display:flex;align-items:baseline;gap:34px"><span class="m" style="font-size:44px;color:var(--red)">0${i + 1}</span><h2 style="font-size:116px">${v}</h2></div>`).join('') + foot('dark'));
add('post-04-volunteer-1080x1350', 1080, 1350, 'bone stitch',
  `<div class="abs" style="left:70px;top:90px"><div class="eyebrow" style="color:var(--deep)">Get involved</div></div>` +
  `<h1 class="abs" style="left:70px;top:210px;font-size:150px">We need you <em style="color:var(--deep)">on the mats.</em></h1>` +
  `<p class="abs" style="left:70px;top:800px;width:880px;font-size:38px;line-height:1.4;font-weight:500">Coaches, helpers, fundraisers, creatives. Bring your skills and help us reach more young people.</p>` +
  `<div class="abs" style="left:70px;top:1030px"><span class="pill">Join the team</span></div>` + foot('dark').replace('markDark', '').replace(/src="[^"]*"/, `src="${logo.mark}"`));
add('template-quote-1080x1350', 1080, 1350, 'ink stitch',
  `<div class="abs m" style="left:60px;top:40px;font-size:420px;color:var(--red);line-height:1">“</div>` +
  `<h2 class="abs" style="left:70px;top:380px;width:940px;font-size:80px;line-height:1.08;text-transform:none;letter-spacing:-.03em">${TEXT.quote}</h2>` +
  `<div class="abs" style="left:70px;top:1010px;font:800 28px Montserrat;letter-spacing:.14em;text-transform:uppercase;color:var(--red)">${TEXT.quoteBy}</div>` + foot('dark'));
add('template-event-1080x1350', 1080, 1350, 'red stitch',
  `<div class="abs" style="left:70px;top:90px"><div class="eyebrow">Save the date</div></div>` +
  `<h1 class="abs" style="left:70px;top:230px;width:940px;font-size:140px">${TEXT.eventTitle}</h1>` +
  `<div class="abs m" style="left:70px;top:720px;font-size:170px;color:var(--ink)">${TEXT.eventDate}</div>` +
  `<p class="abs" style="left:70px;top:950px;width:900px;font-size:38px;font-weight:600">${TEXT.eventDetail}</p>` + foot());

// ---- Stories / Reels covers 1080x1920 (UI-safe: 250px top, 340px bottom) ---
add('story-01-welcome-1080x1920', 1080, 1920, 'ink stitch',
  img(logo.fullDark, 'left:190px;top:360px;width:700px') +
  `<h1 class="abs" style="left:70px;top:1260px;font-size:104px">Life is bigger <em>than the belt.</em></h1>`);
add('story-02-donate-1080x1920', 1080, 1920, 'red stitch',
  img(logo.markWhite, 'left:340px;top:300px;width:400px') +
  `<h1 class="abs" style="left:70px;top:760px;font-size:106px">Give a young person a place to <em>belong.</em></h1>` +
  `<div class="abs" style="left:70px;top:1380px"><span class="pill">Donate · link in bio</span></div>`);
add('story-03-event-template-1080x1920', 1080, 1920, 'ink stitch',
  `<div class="abs" style="left:70px;top:300px"><div class="eyebrow">Save the date</div></div>` +
  `<h1 class="abs" style="left:70px;top:420px;width:940px;font-size:150px">${TEXT.eventTitle}</h1>` +
  `<div class="abs m" style="left:70px;top:940px;font-size:190px;color:var(--red)">${TEXT.eventDate}</div>` +
  `<p class="abs" style="left:70px;top:1220px;width:900px;font-size:42px;font-weight:600">${TEXT.eventDetail}</p>` +
  img(logo.markDark, 'left:70px;top:1420px;width:120px'));

// ---- Logo PNGs (transparent) ------------------------------------------------
const logoPng = (name, src, w, h) => add(name, w, h, '', img(src, `left:0;top:0;width:${w}px;height:${h}px`), 'body{background:transparent!important}');
logoPng('logo-1200', logo.full, 1200, 1319);
logoPng('logo-on-dark-1200', logo.fullDark, 1200, 1319);
logoPng('logo-white-1200', logo.fullWhite, 1200, 1319);
logoPng('mark-1200', logo.mark, 1200, 1190);
logoPng('mark-on-dark-1200', logo.markDark, 1200, 1190);

(async () => {
  const browser = await chromium.launch();
  for (const j of jobs) {
    const file = path.join(TMP, j.name + '.html');
    fs.writeFileSync(file, j.html);
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
    await page.goto('file://' + file);
    await page.evaluate(() => document.fonts.ready);
    const dir = j.name.startsWith('logo') || j.name.startsWith('mark') ? path.join(ROOT, 'assets/logo') : OUT;
    await page.screenshot({ path: path.join(dir, j.name + '.png'), omitBackground: j.name.startsWith('logo') || j.name.startsWith('mark') });
    await page.close();
    console.log('✓', j.name);
  }
  await browser.close();
})();
