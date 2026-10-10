# GALA roadbook design system and repeatable build

**Date:** 2026-10-10. **Status:** approved in chat. Waiting for Jed's review of this file.
**Approved look:** `docs/design/preview-v2.html`. Open it in a browser. This is the reference every build must match.

## 1. Why

V1 (`site/baguio/`) has the right facts but looks like a generic web page. Jed wants it to match the REINA
brochure's quality: taped polaroids, a stamp, a route strip, stat cards, and three numbered panels. It should
be phone-first and published on GitHub Pages. It should also be repeatable, so La Union, Tagaytay and partner
versions come out the same every time without hand design.

### What Jed said
- He wants the content of V1 at REINA's quality, and it must not look generic or AI-made.
- It should be published from GitHub.
- There should be a workflow that gives the same output every time.
- Colours will change with the partner (hotel or café) being featured.
- The "word pills" look generic, so replace them.
- He wants a map that follows the scroll and highlights the route.
- He asked to try more fonts, and picked **Expressway** as the default.

### What we assumed (and Jed approved)
- The phone page is the main product. The tri-fold PDF is built from the same data.
- Facts stay in `data/facts.json` with their source and checked date. This design changes the look, not the
  data rules in `CLAUDE.md`.

### Success looks like
1. `site/baguio/` is rebuilt from the template and matches `docs/design/preview-v2.html`.
2. A new route needs only data files plus `node scripts/build.mjs`, with no hand-written HTML.
3. A partner version needs only `data/hotels/<slug>.json`. Brand colours change and road-sign colours don't.
4. Each build also outputs a tri-fold PDF and phone and laptop screenshots.
5. The build fails on design-rule breaks such as missing dates, overflow, low contrast or an oversized page.

## 2. Decisions made in brainstorming

| Topic | Decision |
| --- | --- |
| How close to REINA | REINA's layout ideas, with GALA's own colours and fonts |
| Photos | Hand-drawn SVG art in polaroid frames now; each frame is a slot for Jed's own photos later |
| Content grouping | 3 trip phases: **01 On the way**, **02 In Baguio**, **03 Before you go** |
| Repeatability | One template plus per-route data, one build command, design checks in CI |
| Presentation | A map that follows the scroll. Page flip, on-screen tri-fold unfold and tulip diagrams are out of scope for now |
| Status labels | Real road-sign shapes and a blue services board; no word pills |
| Default fonts | Expressway: Overpass (based on highway-sign lettering) and Kalam (marker handwriting) |
| Partner theming | Partners change 4 brand tokens plus their logo and name; fonts and road-sign colours stay fixed |

## 3. Visual system

### Tokens (`site/_design/gala.css`)

**Brand.** A partner can override only these:

| Token | GALA value | Role |
| --- | --- | --- |
| `--brand` | `#15382A` (pine) | Hero band, buttons, footer |
| `--brand-2` | `#24543F` | Section heads, ridges |
| `--accent` | `#F2B01E` (jeepney yellow) | Route line, km post "now", money totals, title |
| `--on-accent` | `#1B1606` | Text on the accent colour |

`--on-brand` (`#F3F6F1`) is fixed.

**Paper.** These have light and dark values:

| Token | Light | Dark |
| --- | --- | --- |
| `--paper` (fog) | `#E9EDE7` | `#0F1914` |
| `--sheet` | `#F8F9F5` | `#16231C` |
| `--ink` | `#17211B` | `#E6ECE6` |

`--muted`, `--line`, `--sea`, `--land` and `--tape` follow the same pattern.

**Road signs.** These are fixed and never rebranded:

| Token | Value |
| --- | --- |
| `--sign-blue` | `#1C58A6` |
| `--sign-green` | `#136B3E` |
| `--sign-red` | `#C42127` |
| `--sign-yellow` | `#F7C51E` |

Semantic text colours are `--berry` (closed or coding on) and `--go` (free to drive).

**Type**

| Token | Font | Use |
| --- | --- | --- |
| `--display` | Overpass 800/900 | Headings and numbers. Weight comes from `--display-w` |
| `--body` | Overpass 400/600/800 | Body text, 17px on phones, line-height 1.55 |
| `--hand` | Kalam 400/700 | Only for the tagline, margin notes, the road-check title, "you're reading", the morning-of check and the sign-off |

Fonts are self-hosted as woff2 from `@fontsource/overpass` and `@fontsource/kalam` (OFL) in
`site/_design/fonts/`, with `font-display: swap` and system fallbacks. The build must check that the ₱ sign
(U+20B1) renders in Overpass. If it doesn't, add the subset that has it or let that character fall back.

### Signature elements (the "only GALA has this" list)

| Element | What it is | What it means |
| --- | --- | --- |
| Hero | Pine band, layered ridges, a dashed zigzag road that draws in once, "Manila to" plus a huge "Baguio", the handwritten tagline | The thesis of the trip |
| Fact-check stamp | Circular stamp showing the **latest `checked` date** from the data | A real date, never decoration |
| Polaroids | 2–3 taped polaroids with SVG art and handwritten captions; each can hold a photo instead | The REINA collage feel without borrowed photos |
| Stat plates | Tolls one way (accent fill), drive time, RFID count, coding today (live) | Only figures backed by facts |
| Road check | A taped notice: yellow diamond = open with limits (shows the ton limit), green go sign = passable, red no-entry = closed | Status as a road sign |
| Km posts | Stops on a dotted timeline, each marked by a km-post badge (or a road name when there's no km); the current one fills with the accent colour | Matches the markers on the road |
| Services board | A blue expressway-style board with white icons (gas, food, restroom, pasalubong) and an accessible label | Like the boards on NLEX |
| "Call ahead" note | Handwritten pencil note with a hand-drawn underline for stops with status `check` | Replaces "Confirm before you go" pills |
| Scroll-following map | Natural Earth coastline, dotted route, a lit route (accent over an ink edge) up to the stop being read, a pin, and a "you're reading" caption | Sticky at the top on phones, beside the stops at ≥900px |
| Section heads | Coloured band with simple art, washi tape, outlined ghost number 01/02/03 and the section title | Numbers are used because the sections are a real trip sequence |

### Rules (`gala-design` checks these)

- **Don't:**
  - word pills or chips for status (use the sign symbols)
  - emoji icons
  - all-caps eyebrow labels
  - a "·"-joined meta line
  - "→" on buttons
  - card shadows on everything
  - a cream background with a terracotta accent
- Every fact on the page shows "Checked <date>, from <source>" near it.
- Tap targets are ≥48px tall, Maps buttons ≥52px, with 8px+ gaps between targets.
- Body text contrast is ≥4.5:1 in both themes, including on partner colours. The build computes this for
  `--on-accent` on `--accent` and `--on-brand` on `--brand`/`--brand-2`.
- Light and dark themes both work. The dark tokens are defined in the two standard blocks.
- `prefers-reduced-motion` turns off the road draw-in and the map transitions.
- There is no horizontal page scroll at 360px.

## 4. Page structure (phone order)

1. Hero. Data: `route.title`, the polaroids, and the newest `checked` across facts.
2. Stat plates: `tolls.manila-baguio`, `route.drive-time`, `rfid` (count of RFID systems) and
   `baguio.coding` (today, computed on the device).
3. Road check: `kennon.status`, `marcos.status`, `baguio.road-closures`.
4. **01 On the way**
   - Map, sticky
   - Tolls receipt: `tolls.segments.class1` and `tolls.manila-baguio`
   - RFID margin note
   - Stop timeline: `route.timeline` in the route file, which mixes waypoints (start, exit, end) with stops
     from `data/stops-<route>.json`
5. **02 In Baguio**
   - Coding checker (as in V1)
   - Coding-zone note: `baguio.coding-zone`
   - Must-sees and pasalubong: stops with type `must-see` or `pasalubong`
   - Parking: `baguio.parking`, `baguio.police-app`
   - "See all" expands the full list
6. **03 Before you go**
   - Rain bars and pack list: `weather.baguio`
   - Emergency tap-to-call: `emergency.*`, with the number shown as text too
   - Morning-of check (from the route file; amounts are filled from facts)
   - Credits: `data/creators.json`
7. Footer: sign-off, the 45-day rule, Featured disclosure, and "Made by GALA".

Missing facts render nothing, never a placeholder. Stale facts show a "Needs re-check" note in the hand font
with the pencil colour.

## 5. Data model additions

**`data/routes/<route>.json`**: layout data only, no facts.
```json
{
  "id": "baguio",
  "title": { "from": "Manila to", "to": "Baguio" },
  "tagline": "Tara sa next GALA!",
  "polaroids": [ { "art": "kennon-zigzag", "caption": "Kennon zigzag", "photo": null } ],
  "plates": ["tolls.manila-baguio", "route.drive-time", "rfid", "baguio.coding"],
  "roadCheck": ["kennon.status", "marcos.status", "baguio.road-closures"],
  "timeline": [
    { "waypoint": "start", "title": "Balintawak toll plaza", "postLabel": "START", "body": "NLEX starts here. Follow signs for Tarlac at the SCTEX junction, not Subic." },
    { "stopId": "nlex-caltex-mega" },
    { "waypoint": "exit", "title": "Rosario exit, then up the mountain", "postLabel": "EXIT" },
    { "waypoint": "end", "title": "Baguio", "postLabel": "END" }
  ],
  "map": {
    "bbox": [119.75, 14.35, 121.45, 16.75],
    "waypoints": [[121.0, 14.657], [120.69, 15.04]],
    "geometry": "data/routes/baguio.geo.json",
    "labels": [{ "text": "NLEX", "at": [120.84, 14.9] }]
  },
  "morningCheck": [
    "Read the DPWH-Cordillera road advisory.",
    "Top up Easytrip ({rfid.easytripMin}+) and Autosweep ({rfid.autosweepMin}+)."
  ]
}
```

- Waypoint text is copy, not facts. Anything factual inside it must be a `{fact.path}` placeholder that the
  build fills.
- Stops get two new optional fields in `data/stops-<route>.json`: `km` (number) and `lnglat` ([lng, lat]).
  The build drops a stop from the map, but not from the list, when it has no `lnglat`.

**`data/routes/<route>.geo.json`**: the real road line, made once with `scripts/trace-route.mjs` (OSRM public
demo server, called once and cached) and committed. If it's missing, the build draws the line through
`map.waypoints` and logs a warning.

**`data/hotels/<slug>.json`**: keeps the existing gala-hotel-kit convention and adds `theme`:
```json
{ "name": "…", "route": "baguio", "theme": { "brand": "#…", "brand2": "#…", "accent": "#…", "onAccent": "#…" },
  "logo": "…", "contact": { "type": "messenger", "url": "…" }, "parking": "…", "arrival": "…",
  "source": "…", "checked": "YYYY-MM-DD" }
```

## 6. Template and build

**Template**
- `site/_design/roadbook.html` is the page skeleton.
- `roadbook.js` renders it from the inlined data, the same way V1 does with `<script id="gala-data">`.
- `gala.css` holds the system, and `signs.svg` is an inline SVG symbol sheet.

**`scripts/build.mjs`** keeps the current validation and adds the following steps:
1. For each `data/routes/*.json`, write `_site/<route>/index.html` from the template. Inline the CSS, JS,
   sign sheet, map path and data so the page is one request. Fonts are separate cached files.
2. For each `data/hotels/*.json`, write `_site/<route>/<slug>/index.html` with the theme tokens injected.
3. Project the map: Natural Earth 10m coastline (from the `world-atlas` npm package, public domain) clipped to
   `map.bbox`, plus the route geometry, into SVG path strings.
4. **PDF** (`scripts/pdf.mjs`, Playwright with Chromium): print `_site/<route>/print.html` (same data, print
   CSS) to `_site/<route>/<route>-roadbook.pdf`.
   - Format: 11×8.5in landscape, 2 pages.
   - Outside: cover (hero and stats), road check plus route strip, and back panel (emergency and credits).
   - Inside: the 01, 02 and 03 panels.
   - 0.125in bleed, vector output.
   - The map is drawn static (whole route lit).
5. **Screenshots** (`scripts/shots.mjs`): 390px and 1280px, light and dark, saved to `_site/<route>/check/`.
6. **Design checks** (`scripts/check-design.mjs`). The build fails on:
   - horizontal overflow at 360px
   - any fact element without a "Checked" line
   - contrast below 4.5:1 for the token pairs in §3
   - HTML over 150 KB or HTML plus fonts over 300 KB
   - any element using the banned pill classes

**Tooling**
- `package.json` is added with the dev dependencies `playwright`, `world-atlas`, `topojson-client`,
  `@fontsource/overpass` and `@fontsource/kalam`.
- `node scripts/build.mjs` stays the single command. PDF, screenshots and checks run when Playwright is
  available, and always in CI.

**GitHub Actions (`.github/workflows/pages.yml`)**
- Install dependencies and the Playwright Chromium.
- Run the build, keeping the existing lychee link checks.
- Upload `_site/*/check/*.png` and the PDFs as a run artifact so Jed can review from his phone.
- Publish to Pages. The PDF link appears in the footer of each roadbook.

## 7. Skills

- **New `.claude/skills/gala-design/SKILL.md`**
  - When to use it: before any change to how a roadbook looks, and before publishing.
  - Contents: the tokens, the signature elements, the do/don't list from §3, how to add a new sign or polaroid
    art, and the pre-publish checklist (build passes, check screenshots at 390px in light and dark, PDF opens,
    contrast passes for the partner theme).
  - It points to `docs/design/preview-v2.html` as the visual reference.
  - It says that UI UX Pro Max may be used for UX rules only; its auto-generated styles are not to be applied.
- **`gala-roadbook` (updated):** run `gala-fact-check` first. A new route means copying
  `data/routes/baguio.json`, filling stops with `km`/`lnglat`, running `trace-route.mjs` once, building, and
  following the gala-design checklist. Never hand-write route HTML.
- **`gala-hotel-kit` (updated):** a partner gets a `data/hotels/<slug>.json` with `theme`, and the build makes
  their page. The rest of the skill stays: no invented details, the pitch drafts, Jed sends the messages.
- **`CLAUDE.md`:** update the layout section and point to gala-design.

## 8. Testing

- `node --test scripts/*.test.mjs` unit tests for:
  - the projection (lng/lat → SVG)
  - `{fact.path}` filling
  - the contrast function
  - route validation (unknown `stopId` and missing fact ids fail)
- The build runs the design checks (§6.6) on the real Baguio output.
- Visual review: compare the 390px and 1280px screenshots against `docs/design/preview-v2.html` before
  publishing.

## 9. Out of scope (later features)

- Page-flip animation
- The tri-fold unfolding on screen
- Junction tulip diagrams
- Real photos (they go into the polaroid `photo` slots when Jed has them)
- Moving off GitHub Pages (still due before Gate C)

## 10. Risks and blockers

- **Push access.** This session can't push to `pokgai-source/gala` until the Claude GitHub App is installed
  for the repo. Until then, the work lives on the `roadbook-design-system` branch locally and can be handed to
  Claude Code or uploaded.
- **OSRM demo server** may rate-limit. The route is traced once and committed, with the waypoint line as the
  fallback.
- **Page weight.** Fonts add about 100 KB. The budget is raised from 100 KB to 300 KB total, and text is
  readable with system fonts before the web fonts load.
