---
name: gala-design
description: Use before any change to how a GALA roadbook or page looks, and before publishing any roadbook or partner version. Holds the design system, the do/don't list and the pre-publish checklist.
---

# GALA design

The approved look is `docs/design/preview-v2.html`. Open it in a browser before changing anything visual.
Every roadbook is built from one template, so a design change happens **once**, in `site/_design/`, and every
route and partner page picks it up. Never hand-edit a built page in `_site/`.

## Where things live

| File | What it holds |
| --- | --- |
| `site/_design/gala.css` | Tokens and every component (phone page) |
| `site/_design/print.css` | Tri-fold PDF layout (11×8.5 in + 0.125 in bleed, 2 pages × 3 panels) |
| `site/_design/roadbook.html` | Page skeleton with `<!--GALA:*-->` slots |
| `site/_design/print.html` | Print skeleton; composes the six panels |
| `site/_design/roadbook.js` | Renders every section from the inlined data; coding checker; scroll-following map |
| `site/_design/signs.svg` | Road signs and services-board icons |
| `site/_design/art.svg` | Polaroid art and section-head art |
| `data/routes/<route>.json` | A route's layout: title, polaroids, plates, timeline, map. No facts, only `{fact:path\|filter}` placeholders |
| `data/hotels/<slug>.json` | A partner's name, logo, contact and 4 theme colours |

## Tokens

**Brand.** A partner may override only these:

| Token | GALA value | Role |
| --- | --- | --- |
| `--brand` | `#15382A` pine | Hero band, buttons, footer |
| `--brand-2` | `#24543F` | Section heads, ridges |
| `--accent` | `#F2B01E` jeepney yellow | Route line, current km post, money totals, title |
| `--on-accent` | `#1B1606` | Text on the accent colour |

**Fixed.** These are never rebranded:

| Token | Value |
| --- | --- |
| `--on-brand` | `#F3F6F1` |
| `--sign-blue` | `#1C58A6` |
| `--sign-green` | `#136B3E` |
| `--sign-red` | `#C42127` |
| `--sign-yellow` | `#F7C51E` |

Road signs must always look like real road signs.

**Paper.** `--paper` (fog `#E9EDE7`), `--sheet`, `--ink`, `--muted`, `--line`, `--sea`, `--land`, `--pencil`,
`--berry` and `--go` each have light and dark values in the two standard dark blocks.

**Type.**
- Overpass (based on highway-sign lettering) for display at 800/900 and body at 400.
- Kalam for handwriting, used only for the tagline, margin notes, the road-check title, "you're reading", the
  "confirm it's open first" note, the morning-of check and the sign-off.
- Both fonts are self-hosted (`npm install` puts them in `node_modules/@fontsource`). Overpass ships latin and
  latin-ext because the ₱ sign is only in latin-ext.

## Signature elements (keep them)

- **Hero:** pine band, ridges, a zigzag road that draws in once, "Manila to" plus a huge destination, and the
  handwritten tagline.
- **Fact-check stamp:** shows the newest `checked` date in the data. It is real, never decoration.
- **Taped polaroids:** real photos (`cover-1/2/3` in `data/photos.json`). If a photo isn't ready, the SVG art
  shows instead. Jed's own photos can replace any of them.
- **Stat plates:** only figures backed by facts. The money total uses the accent fill.
- **Road check:** status shown as real sign shapes, decided by `signFor()` from fact data.
  - Yellow diamond with the ton limit: open with limits.
  - Green go sign: passable.
  - Red no-entry sign: closed.
- **Km posts:** stops sit on a dotted timeline, each with a km post (or the road name when there's no km). The
  post fills with the accent colour when it's the stop being read.
- **Blue services board:** white icons for gas, food, restroom and pasalubong, like NLEX signs.
- **"confirm it's open first":** a handwritten pencil note with an underline, for stops with status `check`.
- **Scroll-following map:** Natural Earth coastline, route line lit up to the stop being read, and a pin.
- **Section heads:** band art, washi tape, outlined 01/02/03. The numbers are allowed because the sections are a
  real trip sequence.

## Photos

- **Source:** every photo comes from Wikimedia Commons under CC0, public domain, CC BY 2.0–4.0 or CC BY-SA
  2.0–4.0. Jed's own photos also count.
- **Listing:** they are listed in `data/photos.json` with `place`, which is a stop id, `cover-1`/`2`/`3` or
  `city-hero`.
- **Adding a photo:**
  1. Add an entry with a `query` and no `file`.
  2. Push. The **Assets** workflow saves candidates to `docs/photo-candidates/<id>/`.
  3. Look at them and pick one: the real place, sharp, no person as the subject.
  4. Set `file` and push again. The workflow makes 320/640/1280 WebP files in `site/img/<route>/` and fills the
     author and licence.
- **Credits:** a credit line ("Photo: author, licence", linked) shows under every photo, except polaroids, which
  are too small. Every photo is also in the "Photo credits" list on the page and the PDF back panel. The build
  fails on a used photo with no author or licence.
- **Size on the page:** every `<img>` has width and height. Only the cover photos load eagerly; the rest are
  lazy. Budget: HTML + fonts + first-screen images ≤ 400 KB.
- **Must-sees:** swipe cards with a tall photo and the name plus one line on the photo. Tap for details and Maps.
  The row scrolls inside itself, never the page.

## Less text

- Every fact has a `short` line (≤90 characters; the build enforces it).
- Pages show the short line plus a visible "Checked <date>". The full text and the source sit behind "More".
- Stops show their first sentence. The rest shows on tap.

## Motion

- **CSS scroll-driven animations only** (`animation-timeline`), no JS library. Browsers without support show a
  static page.
- **What moves:**
  - the cover (title, polaroids, stamp)
  - the city photo zoom
  - each section's flip-pad entrance
  - the laptop tri-fold unfold
- **Rules:**
  - Every animated element's first frame is readable. Nothing waits at opacity 0.
  - Use `scale`/`translate`/`rotate` so motion adds to existing tilts.
  - `prefers-reduced-motion: reduce` turns everything off. A test checks both states.
- **Laptop tri-fold:** at ≥1080px a "Your printable roadbook" block shows PDF page 2's panels
  (`fold-1/2/3.webp`, cut by the build), unfolding as you scroll. Phones never show it.

## Do / Don't

**Don't:**
- word pills, chips or badges for status (use the sign symbols)
- emoji
- all-caps eyebrow labels
- `·`-joined meta lines
- `→` at the end of buttons
- shadows on every card
- a cream background with a terracotta accent
- hard-coded facts in templates or route files

**Do:**
- Put "Checked <date>, from <source>" next to every fact. Anything with `data-fact` must contain a `.checked`.
- Use tap targets ≥48px (Maps and Call buttons 52px), with ≥8px gaps.
- Keep contrast ≥4.5:1, including for partner colours. The build checks this.
- Make light and dark both work, and let `prefers-reduced-motion` turn off the road draw-in and map motion.
- Keep the page from scrolling sideways at 360px.

## Adding things

- **New sign or icon:** add a `<symbol id="…">` to `signs.svg`, use white on `--sign-blue` for services, and
  reference it by id from `roadbook.js`.
- **New polaroid or section art:** add a symbol to `art.svg`. Themed fills use `style="fill:var(--brand)"`
  (inline style, so partner colours reach inside `<use>`). Reference it from the route file as
  `polaroids[].art`.

## UI UX Pro Max

UI UX Pro Max is useful for UX rules (touch targets, contrast, motion). **Don't apply its generated styles or
palettes**; they gave a generic gradient look for GALA.

## Pre-publish checklist

1. `npm install` (first time only), then `npm test`. All tests must pass.
2. `node scripts/build.mjs` must end with `qa: 0 design errors`.
3. Look at all four screenshots in `_site/<route>/check/` (phone and laptop, light and dark) next to
   `docs/design/preview-v2.html`.
4. Open `_site/<route>/<route>-roadbook.pdf`. Both pages must have nothing cut off at panel edges, and the cover
   and 02 photos must show.
5. Scroll the page on a phone or laptop once to see the motion. With reduce motion on, it must be still.
6. For a partner, the contrast gate passes. If it fails, offer Jed the nearest passing shade as an MCQ.
