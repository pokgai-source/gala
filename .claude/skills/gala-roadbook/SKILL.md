---
name: gala-roadbook
description: Use when Jed says "build the <route> roadbook" or "update the <route> roadbook" (e.g. Baguio, La Union, Tagaytay). Runs the fact check, builds the roadbook from data files and the shared template, checks the design, and publishes to GitHub Pages.
---

# GALA roadbook

Every roadbook comes from one template (`site/_design/`) plus data. **Never hand-write route HTML.** For anything
about the look, follow `gala-design`.

## Steps

1. **Run `gala-fact-check` first.** Don't build on stale facts. If anything is `stale`, tell Jed and ask (MCQ)
   whether to publish with the "Needs re-check" note showing or wait.
2. **Updating an existing route:** change facts in `data/facts.json` and stops in `data/stops-<route>.json`
   only. The page updates itself.
3. **New route:**
   1. Copy `data/routes/baguio.json` to `data/routes/<route>.json`. Change `id` to the file name first, then the title, tagline, polaroids, plates,
      road check, route strip, tolls receipt, timeline, city section, pack list, morning-of check, and the map `bbox`,
      `waypoints` and `labels`.
   2. Add facts with ids prefixed by the route to `data/facts.json`, and stops with `km` (when there is a km post)
      and `lnglat` to `data/stops-<route>.json`.
   3. Leave out sections the place doesn't need (`tollsReceipt`, `city`, `wayNote`, `weatherFact`); the page and PDF skip them.
   4. Any fact inside route-file text goes in as a placeholder: `{factId:data.path|peso}`.
   5. Give each gas or EV stop an `osm` hint (`{ "brand": "Shell", "near": [lng, lat], "radius": 1500 }`), and add
      `suggested` (2 picks, each with its `nearby` options) and `photos.json` entries for the cover, the city hero
      and each must-see.
   6. Push. The **Assets** workflow (`.github/workflows/assets.yml`) does everything that needs the internet:
      - traces the real road on OpenStreetMap
      - pins stops to the real stations (`lnglatSource` says where each pin came from; "approximate" means it
        missed)
      - saves photo candidates
      It commits the results back to the branch. Pull them before building (`git pull`). Pick photos as
      described in `gala-design`, then push again so it makes the WebP sizes.
4. Build: `npm install` (first time only), `npm test`, then `node scripts/build.mjs`. The build makes:
   - the phone page
   - `print.html`
   - the tri-fold PDF
   - the laptop fold images
   - four screenshots
   - design checks, which must pass
5. Follow the `gala-design` pre-publish checklist. Show Jed the phone screenshot and the PDF before big changes.
6. Commit with a plain message and push to `main`. The Pages workflow publishes. Give Jed the link:
   `https://pokgai-source.github.io/gala/<route>/`.

## Budgets

- Built HTML ≤150 KB.
- HTML + fonts + first-screen images ≤400 KB.
- Text must be readable before the fonts load (system fallbacks).
- Tap targets ≥48px, body text 17px on phones.
