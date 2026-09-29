# MBMS Podcast Studio website

A static, single-page website for podcast recording, production and marketing services.

## Files

- `index.html` – page content (services, pricing, case study, packages, contact)
- `styles.css` – styling and responsive layout
- `script.js` – mobile menu, contact form and YouTube embed

## Publishing

The site is hosted on Netlify, which publishes the `main` branch automatically.
Changes are made on a separate branch and opened as a pull request; merging the
pull request into `main` puts them live. There is no build step.

Enquiries from the contact form go to the `CONTACT_EMAIL` address in `script.js`.

## Running locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```
