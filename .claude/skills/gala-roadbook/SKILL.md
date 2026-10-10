---
name: gala-roadbook
description: Use when Jed says "build the <route> roadbook" or "update the <route> roadbook" (e.g. Baguio, La Union, Tagaytay). Runs the fact check, builds site/<route>/index.html from data files only, previews it, and publishes to GitHub Pages.
---

# GALA roadbook

## Steps

1. **Run `gala-fact-check` first.** Don't build on stale facts. If anything is `stale`, tell Jed and ask
   (MCQ) whether to publish with the warning showing or wait.
2. Make sure the data exists: `data/facts.json` (facts with ids prefixed by the route, e.g. `baguio.*`) and
   `data/stops-<route>.json`. New route → copy `site/baguio/` as the starting template.
3. Build or update `site/<route>/index.html`. It must contain **no facts** — only layout and the rendering
   script. Facts come from the inlined data (see `scripts/build.mjs`; pages read
   `<script id="gala-data" type="application/json">`, filled at build time).
4. Sections, in this order (co-pilot reads top to bottom):
   1. Route and drive times
   2. Tolls and RFID
   3. Stops — food, pasalubong, gas, restrooms; each with one-tap Google Maps button; "Featured" label when
      `featured: true`
   4. Number coding checker — plate last digit + day/time, runs on the phone only, stores nothing
   5. Parking
   6. Must-sees
   7. Weather and what to pack
   8. Emergency numbers — tap-to-call `tel:` links
   9. Credits to vloggers (from `data/creators.json`)
   10. Last-checked dates — shown next to every fact; `stale` facts show a warning
5. Phone-first checklist: tap targets ≥ 48px, body text ≥ 17px, high contrast (sunlight), no web fonts or
   images required to read the page, whole page < 100 KB, works if JS fails for the static parts where possible.
6. `node scripts/build.mjs`, then `node scripts/serve.mjs` and preview at mobile width (375px) in the browser
   pane. Show Jed a screenshot before big UI changes.
7. Commit with a plain message, push to `main`. The Pages workflow publishes. Give Jed the link:
   `https://pokgai-source.github.io/gala/<route>/`.
8. Add the roadbook to the list on `site/index.html` if it's new.
