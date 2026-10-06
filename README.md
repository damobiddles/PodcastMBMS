# MBMS Podcast Studio website

A static, single-page website for podcast recording, production and marketing services.

## Files

- `index.html` – page content (services, pricing, case study, packages, contact)
- `styles.css` – styling and responsive layout
- `script.js` – mobile menu, contact form and YouTube embed
- `services/` – services and prices (recording, Hale House, mobile/remote, post-production, marketing, YouTube clips, packages)
- `blog/` – the blog: `blog/index.html` lists the posts, and each post has its own folder

## Publishing

The site is hosted on Netlify, which publishes the `main` branch automatically.
Changes are made on a separate branch and opened as a pull request; merging the
pull request into `main` puts them live. There is no build step.

Enquiries from the contact form are sent by [Web3Forms](https://web3forms.com) (free plan) to meadowbms@gmail.com. The access key in `index.html` is tied to that address and is safe to publish; to change the destination, create a new key for the new address. If sending fails, the form asks visitors to email the `CONTACT_EMAIL` address in `script.js`.

## Adding a blog post

1. Copy an existing post folder in `blog/` and rename it with a short, readable slug
   (for example `blog/preparing-for-your-first-recording/`).
2. Update the post's `<title>`, meta description, date, heading and content.
3. Add a card for the post at the top of the list in `blog/index.html`.
4. Put any new images in `images/`, resized (about 1600px wide, WebP).
5. Search and sharing: update the post's canonical link, `og:` tags and JSON-LD
   block in its `<head>`, add a 1200×630 share image in `images/share/`, and add
   the post to `sitemap.xml`, `llms.txt` and the blog JSON-LD in `blog/index.html`.

## Running locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```
