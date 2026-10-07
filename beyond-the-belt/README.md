# Beyond the Belt website and brand assets

Static, single-page charity website plus a full set of social media graphics. No build step.

- `index.html`, `styles.css`, `script.js`, `404.html`: the website
- `assets/logo/`: logo variants (SVG and PNG), `assets/`: favicons and app icons
- `social/`: ready-to-upload social PNGs; `social/build.js` regenerates them
- `fonts/`: self-hosted Montserrat and Inter
- `BRAND.md`: colours, type, logo rules and image sizes

## Before going live (placeholders to replace)
1. **Domain**: `beyondthebelt.org` is assumed in `index.html`, `robots.txt`, `sitemap.xml` and the social graphics (`TEXT.url` in `social/build.js`).
2. **Email**: `hello@beyondthebelt.org` in `index.html` and `script.js`. The contact form opens the visitor's email app; to send directly, use a form service such as Web3Forms.
3. **Donate**: the Donate buttons currently scroll to the contact form. Set the link on the `data-donate-link` button in `index.html` once a JustGiving, Stripe or similar page exists, and update the note beneath it.
4. **Charity number**, academy name/town and safeguarding policy link in the contact section and footer (search for `[`).
5. **Social links**: add handles to the footer once accounts exist.
6. **Copy**: programme descriptions are sensible starting points. Check them against what the charity really does, and add real photos and impact figures when available.

## Hosting
This folder is self-contained. Publish it as the root of its own Netlify/GitHub Pages site. Note it currently lives inside the MBMS repo, whose Netlify config publishes the repo root, so it would appear at `/beyond-the-belt/` on that site. Move it to its own repository before launch.
