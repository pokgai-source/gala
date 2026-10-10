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
   1. Copy `data/routes/baguio.json` to `data/routes/<route>.json`. Change the title, tagline, polaroids, plates,
      road check, route strip, tolls receipt, timeline, city section, morning-of check, and the map `bbox`,
      `waypoints` and `labels`.
   2. Add facts with ids prefixed by the route to `data/facts.json`, and stops with `km` (when there is a km post)
      and `lnglat` to `data/stops-<route>.json`.
   3. Any fact inside route-file text goes in as a placeholder: `{factId:data.path|peso}`.
   4. Run `node scripts/trace-route.mjs <route>` once to save the real road line
      (`data/routes/<route>.geo.json`). If the network blocks it, CI traces it.
4. Build: `npm install` (first time only), `npm test`, then `node scripts/build.mjs`. The build makes:
   - the phone page
   - `print.html`
   - the tri-fold PDF
   - four screenshots
   - design checks, which must pass
5. Follow the `gala-design` pre-publish checklist. Show Jed the phone screenshot and the PDF before big changes.
6. Commit with a plain message and push to `main`. The Pages workflow publishes. Give Jed the link:
   `https://pokgai-source.github.io/gala/<route>/`.

## Budgets

- Built HTML ≤150 KB.
- HTML + fonts ≤300 KB.
- Text must be readable before the fonts load (system fallbacks).
- Tap targets ≥48px, body text 17px on phones.
