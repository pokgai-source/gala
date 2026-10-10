# GALA — Guided Adventures, Local Areas

**Tara sa next GALA.** Phone-first roadbooks for self-drive trips out of Manila. One link per trip: route and
drive times, tolls and RFID, food/pasalubong/gas/restroom stops, number coding and parking, must-sees, weather
and packing, emergency numbers. Every stop has a one-tap Google Maps link. PDF comes after the phone page works.

- Owner: Jed (Quezon City). Hobby, free, tied to his travel vlogging. New to git, often on his phone:
  explain GitHub steps in plain words and do the git work yourself.
- Roadbooks: Manila → Baguio (first), then La Union (San Juan), then Tagaytay/Batangas.
- Who pays later: hotels/inns/transient houses (branded roadbook for guests, "Made by GALA" footer) and
  route restaurants/pasalubong shops (paid "Featured" stop). Full background: `docs/feasibility.md`,
  every planning decision: `GALA-KICKOFF.md`.

## Non-negotiable rules

1. **No hard-coded facts in pages.** Every fact lives in `data/facts.json` (value, source URL, `checked` date).
   Pages read from data files and show the last-checked date next to each fact.
2. **Latest data only.** Run the `gala-fact-check` skill before building or updating a roadbook. A fact older
   than **45 days** must be re-verified before it is published.
3. **Official sources first:** DPWH, LGU Baguio / Visita, TRB, toll operators (NLEX/MPTC, SMC/TPLEX), PAGASA,
   DOT. News second. Blogs and vlogs are **leads only**, never the source of a published fact.
4. **Vloggers:** credit by name and link (or embed). Never copy their photos, thumbnails or text. Track them in
   `data/creators.json`.
5. **Featured stops are always labelled "Featured".** Only well-reviewed places. Disclose paid ties in vlogs too.
6. **No personal data collected.** The coding checker runs on the phone only. No forms storing names or plates.
7. **Built for the co-pilot:** big tap targets, readable in sunlight, fast on a weak signal, nothing to install.
8. **Hosting:** GitHub Pages while free. Move to a host that allows business use **before Gate C** (Feb–Mar 2027).

## Ways of working

- Ask Jed multiple-choice questions, one at a time; recommend an option and say why. Keep messages short and plain.
- Superpowers workflow (brainstorm → plan → test) for new features. Show a preview before big UI changes.
- Never publish an unchecked fact. When unsure, say so and ask.

## Layout

```
data/facts.json              facts with source + checked date (schema in GALA-KICKOFF.md §5)
data/stops-<route>.json      stops: name, type, maps link, why, featured, km, lnglat, source, checked
data/routes/<route>.json     a roadbook's layout (title, polaroids, plates, timeline, map); facts only as {id:path|filter}
data/routes/<route>.geo.json real road line for the map (scripts/trace-route.mjs)
data/hotels/<slug>.json      partner pages: name, logo, contact, parking, arrival, 4 theme colours
data/creators.json           vloggers we credit
data/CHANGELOG.md            written by gala-fact-check
site/_design/                the one design system + templates (gala.css, print.css, roadbook.html/js, print.html, signs.svg, art.svg)
site/index.html              home page template
scripts/build.mjs            validates data, builds every roadbook + partner page, PDF, screenshots, design checks
scripts/lib/                 data, route, map, payload, render, theme, fonts helpers (unit-tested)
scripts/qa/                  pdf, screenshots, design checks (Playwright)
docs/design/preview-v2.html  the approved look
.claude/skills/              gala-fact-check, gala-roadbook, gala-hotel-kit, gala-design
.github/workflows/pages.yml  tests, builds, uploads screenshots + PDF, publishes to GitHub Pages
```

First time: `npm install`. Then `npm test`, `node scripts/build.mjs` (add `--no-qa` to skip PDF/screenshots),
`node scripts/serve.mjs` → http://localhost:8080/
Before any visual change or publish, follow the `gala-design` skill.
Live site: https://pokgai-source.github.io/gala/
