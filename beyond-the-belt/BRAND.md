# Beyond the Belt: brand quick guide

## Logo
Files are in `assets/logo/`. SVG for print and web, PNG (1200px, transparent) for everything else.

| Use | File |
| --- | --- |
| Light backgrounds (default) | `btb-logo.svg`, `logo-1200.png` |
| Dark backgrounds | `btb-logo-on-dark.svg`, `logo-on-dark-1200.png` |
| One colour, white | `btb-logo-white.svg`, `logo-white-1200.png` |
| One colour, black | `btb-logo-black.svg` |
| Icon only (avatars, favicons) | `btb-mark*.svg`, `mark-*.png` |

Keep clear space around the logo equal to the height of the red head. Don't stretch, recolour or add effects. Use the icon-only mark when the logo would be smaller than about 80px wide.

## Colour
| Name | Hex | Use |
| --- | --- | --- |
| Ink | `#080808` | Backgrounds, text |
| Logo red | `#ED1726` | Graphics, large headlines on dark |
| Deep red | `#D10F1D` | Buttons and backgrounds carrying white text (passes AA contrast) |
| Bone | `#F5F2EB` | Light backgrounds, text on dark |
| Grey | `#727272` | Secondary detail only |

## Type
- **Montserrat** 800 to 900, uppercase, tight tracking for headlines (matches the logo wordmark).
- **Inter** 400 to 700 for body copy.
Both are open-source (SIL OFL) and self-hosted in `fonts/`.

## Voice
Warm, direct and proud. Short sentences. Talk about young people and community, not charity jargon. Signature line: **"Life is bigger than the belt."**

## Social image sizes
| File | Platform |
| --- | --- |
| `profile-*-1080.png` | Profile picture on every platform (keep important content centred for circular crops) |
| `facebook-cover-1640x624.png` | Facebook cover |
| `x-header-1500x500.png` | X / Twitter header |
| `linkedin-banner-1584x396.png` | LinkedIn banner |
| `youtube-banner-2560x1440.png` | YouTube banner (key content sits in the central 1546x423 safe area) |
| `og-share-1200x630.png` | Link preview image (used by the website) |
| `post-*-1080x1350.png` | Instagram / Facebook feed posts (4:5) |
| `story-*-1080x1920.png` | Stories and Reels covers (keep text clear of top 250px and bottom 340px) |
| `template-*` / `story-03-*` | Quote and event templates: edit `TEXT` in `build.js` and re-run |

Regenerate everything after a change: `node beyond-the-belt/social/build.js` (needs Playwright with Chromium).
