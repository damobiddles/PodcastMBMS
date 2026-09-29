# MBMS Podcast Studio website

A static, single-page website for podcast recording, production and marketing services.

## Files

- `index.html` – page content (services, pricing, packages, contact)
- `styles.css` – styling and responsive layout
- `script.js` – mobile menu and contact form

## Running locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Before going live

- Set `CONTACT_EMAIL` in `script.js` to the address enquiries should go to. The form opens the visitor's email client with the enquiry pre-filled.
- Update the studio name ("MBMS Podcast Studio") in `index.html` if needed.

The site has no build step, so it can be hosted as-is on GitHub Pages, Netlify or any static host.
