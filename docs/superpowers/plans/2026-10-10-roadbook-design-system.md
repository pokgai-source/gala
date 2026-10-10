# GALA Roadbook Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-built V1 Baguio page with one data-driven template that renders the approved preview-v2 design for every route and partner. It also outputs a tri-fold PDF and screenshots, and fails the build on design-rule breaks.

**Architecture:** Each route's layout lives in `data/routes/<route>.json`. Facts and stops stay where they are. Pure Node modules in `scripts/lib/` turn data into one inlined payload. The map's SVG paths are projected at build time. One template (`site/_design/`) renders the payload in the browser, the same way V1 does. Playwright scripts print the PDF, take screenshots and run design checks. CI runs the same build.

**Tech Stack:** Node 22 (ESM, `node:test`), vanilla JS/CSS in the page, Playwright (Chromium), `world-atlas` + `topojson-client` (Natural Earth coastline), `@fontsource/overpass` + `@fontsource/kalam`, GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-10-10-roadbook-design-system-design.md`
**Visual reference:** `docs/design/preview-v2.html`. Port its markup and CSS; replace its literals with data.

## Global Constraints

**Data and facts**
- No facts in templates or route files. Facts come from `data/facts.json` and stops from `data/stops-<route>.json`. Route-file text may include facts only through placeholders.
- Placeholder syntax (refines spec §5): `{<factId>:<dot.path>|<filter>}`, e.g. `{rfid:data.easytripMin|peso}`. Filters: `peso` (₱ + en-PH thousands), `plain`. An unknown fact id or path throws at build time.
- Every rendered fact shows "Checked <D Mon YYYY>, from <source.name>". A fact is stale when `checked` is more than 45 days old; a stale fact shows "Needs re-check" in `--hand` with `--pencil`.

**Look and theming**
- Brand tokens a partner may override: `--brand`, `--brand-2`, `--accent`, `--on-accent`.
- Fixed tokens: road-sign colours `--sign-blue #1C58A6`, `--sign-green #136B3E`, `--sign-red #C42127`, `--sign-yellow #F7C51E`, and `--on-brand #F3F6F1`.
- GALA defaults: `--brand #15382A`, `--brand-2 #24543F`, `--accent #F2B01E`, `--on-accent #1B1606`.
- Fonts: Overpass (`--display`/`--body`) and Kalam (`--hand`), self-hosted woff2 with `font-display: swap` and the fallback stacks from preview-v2.
- Banned in markup and CSS: status pill/chip classes (`.pill`, `.chip`, `.badge`), emoji, `→` in button text, all-caps eyebrow labels, `·`-joined meta lines.

**Accessibility and performance**
- Tap targets ≥48px (Maps and Call buttons 52px), with ≥8px gaps between them.
- Contrast ≥4.5:1 for `--on-accent`/`--accent`, `--on-brand`/`--brand` and `--on-brand`/`--brand-2`.
- No horizontal overflow at 360px.
- Light and dark tokens. `prefers-reduced-motion` disables the road draw-in and map transitions.
- Budgets: built HTML ≤150 KB; HTML + fonts ≤300 KB.

**Build and git**
- PDF: 11×8.5in landscape, 2 pages, 0.125in bleed. Outside: cover / road check + route strip / back. Inside: 01 / 02 / 03.
- One command: `node scripts/build.mjs`. QA (PDF, shots, checks) runs when Playwright resolves; `--no-qa` skips it.
- Commits end with the session attribution lines. Work on branch `roadbook-design-system`.

## Review Focus

1. **A stop whose status is `closed`** (e.g. `baguio-pma`). It still appears in its list, shows the red no-entry sign and its note, shows no "call ahead" note, and its Maps button stays. Test: Task 5.
2. **A fact older than 45 days** at build time. The page shows "Needs re-check" beside it. The build warns but doesn't fail. Test: Task 1 (`isStale`), Task 5 (render).
3. **A route file that names a fact id or stop id that doesn't exist.** The build fails with the route and id named. It never renders a blank card. Test: Task 2.
4. **A partner theme with a low-contrast accent** (e.g. accent `#F6E7A8` with on-accent `#FFFFFF`). The build fails and names the hotel file and the failing pair. Test: Task 6.
5. **Long names at 360px** (e.g. "Benguet–Nueva Vizcaya Road (Beckel)", or a stop with a 60-character name). Nothing overflows sideways. Test: Task 8 runs the overflow check against a fixture route with long strings.

---

## File Structure

```
package.json                      dev deps + "test": "node --test scripts/"
scripts/lib/facts.mjs             load data, fill placeholders, dates, staleness
scripts/lib/route.mjs             validate route file, resolve timeline, road-sign rule
scripts/lib/map.mjs               projection, coastline path, route path
scripts/lib/contrast.mjs          WCAG contrast ratio
scripts/lib/render.mjs            assemble one page (template + inlined css/js/svg + payload + theme)
scripts/build.mjs                 orchestrates (rewritten; keeps current validation)
scripts/trace-route.mjs           one-off: OSRM → data/routes/<route>.geo.json
scripts/qa/pdf.mjs                print.html → PDF
scripts/qa/shots.mjs              screenshots
scripts/qa/check-design.mjs       overflow, checked lines, budgets, banned classes
scripts/*.test.mjs                unit tests
scripts/fixtures/                 test data (long-names route, low-contrast hotel)
site/_design/roadbook.html        page skeleton with <!--GALA:*--> slots
site/_design/print.html           tri-fold skeleton
site/_design/gala.css             tokens + components (from preview-v2)
site/_design/print.css            11×8.5 tri-fold layout
site/_design/roadbook.js          renders payload, coding checker, map follow
site/_design/signs.svg            symbol sheet: services icons, road signs, pin, underline
site/_design/art.svg              symbol sheet: polaroid and section-head art
site/_design/fonts/*.woff2        copied from @fontsource by build
data/routes/baguio.json           Baguio layout data
data/routes/baguio.geo.json       traced road line (committed)
data/stops-baguio.json            + km, lnglat per stop
```

Deleted: `site/baguio/index.html` (now generated). `site/brand.css` stays until Task 9 moves the home page onto `gala.css`.

---

### Task 1: Tooling and pure helpers (facts, contrast)

**Files:**
- Create: `package.json`, `scripts/lib/facts.mjs`, `scripts/lib/contrast.mjs`, `scripts/facts.test.mjs`, `scripts/contrast.test.mjs`
- Modify: `.gitignore` (add `node_modules/`)

**Interfaces:**
- Produces, from `facts.mjs`:
  - `loadData(root: string) -> { facts, stopsByRoute: {[route]: stopsFile}, creators, routes: {[route]: routeFile}, hotels: hotelFile[] }`
  - `indexFacts(facts) -> Map<string, Fact>`
  - `getPath(obj, dotPath: string) -> any` (throws `Unknown path`)
  - `fillPlaceholders(text: string, factsById: Map) -> string`
  - `formatPeso(n: number) -> string`
  - `latestChecked(items: {checked: string}[]) -> string`
  - `isStale(checked: string, now: Date, maxAgeDays = 45) -> boolean`
  - `fmtDate(iso: string) -> string` ("10 Oct 2026")
- Produces, from `contrast.mjs`: `contrastRatio(hexA: string, hexB: string) -> number` (WCAG 2.x relative luminance, rounded to 2 decimals).

- [ ] **Step 1: Set up `package.json`.** Fields: `"type": "module"`, `"private": true`, scripts `{ "build": "node scripts/build.mjs", "test": "node --test scripts/" }`, devDependencies `playwright@1.49.1`, `world-atlas@2.0.2`, `topojson-client@3.1.0`, `@fontsource/overpass@5`, `@fontsource/kalam@5`. Then run `npm install` and commit the lockfile.

- [ ] **Step 2: Write failing tests.**
  - `fillPlaceholders("Top up ({rfid:data.easytripMin|peso}+)", facts)` → `"Top up (₱670+)"`.
  - `fillPlaceholders("{nope:data.x}", facts)` throws `/Unknown fact nope/`.
  - `fillPlaceholders("{rfid:data.missing}", facts)` throws `/Unknown path data.missing in rfid/`.
  - `formatPeso(2337)` → `"₱2,337"`.
  - `latestChecked([{checked:"2026-09-01"},{checked:"2026-10-10"}])` → `"2026-10-10"`.
  - `isStale("2026-08-25", new Date("2026-10-10T12:00:00+08:00"))` → `true` (46 days); `"2026-08-26"` → `false`.
  - `fmtDate("2026-10-10")` → `"10 Oct 2026"`.
  - `contrastRatio("#1B1606","#F2B01E") >= 4.5` is true; `contrastRatio("#FFFFFF","#F6E7A8") < 4.5` is true; `contrastRatio("#000000","#FFFFFF") === 21`.

- [ ] **Step 3: Run the tests.** `npm test` should FAIL with the modules not found.
- [ ] **Step 4: Implement both modules.** `loadData` reads `data/facts.json`, `data/creators.json`, every `data/stops-*.json`, `data/routes/*.json` (skipping `*.geo.json`) and `data/hotels/*.json` if that directory exists. Dates use the `+08:00` offset, as `build.mjs` already does.
- [ ] **Step 5: Run the tests.** `npm test` should PASS.
- [ ] **Step 6: Commit.** `feat: add data and contrast helpers with tests`.

---

### Task 2: Route file, stop coordinates, validation

**Files:**
- Create: `data/routes/baguio.json`, `scripts/lib/route.mjs`, `scripts/route.test.mjs`, `scripts/fixtures/route-bad.json`
- Modify: `data/stops-baguio.json` (add `km`, `lnglat` to each stop)

**Interfaces:**
- Consumes: `indexFacts`, `fillPlaceholders` (Task 1).
- Produces, from `route.mjs`:
  - `validateRoute(route, factsById, stopsById) -> string[]`. Errors look like `"route baguio: unknown fact kennon.statuz"` or `"route baguio: unknown stop nlex-x"`. It also runs every placeholder in the route file through `fillPlaceholders` and reports throws as errors.
  - `resolveTimeline(route, stopsById, factsById) -> TimelineItem[]`, where TimelineItem is `{ kind: "waypoint"|"stop", id, title, body, post: {km?: number, label?: string}, services: ("gas"|"food"|"restroom"|"pasalubong")[], status, mapsUrl?, lnglat?, checked?, source? }`.
  - `signFor(fact) -> "stop"|"warn"|"go"`. The rule: `data.closed` is a non-empty array, or `data.open === false` → `"stop"`; `data.maxTons` set or `data.oneLaneSections.length > 0` → `"warn"`; otherwise `"go"`.

**Route file shape for `data/routes/baguio.json`** (spec §5 with the placeholder syntax above). Copy text from preview-v2.
- `title`, `tagline`, `polaroids` (`art` ids: `kennon-zigzag`, `strawberries`, `pines-fog`; `photo: null`).
- `plates`, each `{ fact, label, value, note, style? }` or `{ kind: "coding-today", fact: "baguio.coding" }`. Values:
  - `"{tolls.manila-baguio:data.class1|peso}"`
  - `"~{route.drive-time:data.hoursNoTraffic} hrs"`
  - `"2"`, with fact `rfid` (the count is copy; the fact supplies the date)
- `roadCheck: ["kennon.status","marcos.status","baguio.road-closures"]`
- `routeStrip`: 5 items `{ place, via? }` from preview-v2.
- `timeline`: start waypoint → the 5 way stops by id → `exit` → `end`.
- `baguio: { codingFact, zoneFact, parkingFacts: ["baguio.parking","baguio.police-app"] }`
- `morningCheck`: 4 lines.
- `map: { bbox: [119.75,14.35,121.45,16.75], width: 340, waypoints: [...from scratch coast.mjs...], labels: [{text,at:[lng,lat],kind:"road"|"water"|"town"}] }`

**Stop coordinates:**

| Stop | lnglat | km |
| --- | --- | --- |
| Caltex | `[120.69,15.04]` | 55 |
| SEAOIL | `[120.665,15.075]` | 62 |
| Petron | `[120.635,15.10]` | 71 |
| PTT | `[120.60,15.60]` | — |
| Total | `[120.62,15.89]` | — |
| Drive & Dine | `[120.97,14.74]` | 21 |

Baguio stops: approximate lnglat from their public addresses; flag these approximate in the stop `note` only if shown.

- [ ] **Step 1: Write failing tests.**
  - `validateRoute(baguioRoute, facts, stops)` → `[]`.
  - The fixture `route-bad.json` (fact `kennon.statuz`, stop `nlex-x`) gives exactly those two errors.
  - `signFor(kennon)` → `"warn"`; `signFor(marcos)` → `"go"`; `signFor(closures)` → `"stop"`; `signFor({data:{open:false}})` → `"stop"`.
  - `resolveTimeline` maps `nlex-caltex-mega` to `post.km === 55`, `services` `["gas","food","restroom"]`, status `"check"`.
  - `tplex-ptt-victoria` gets `post.label === "TPLEX"` (first word of `segment`).
  - A must-see type never appears in `services`.
- [ ] **Step 2: Run the tests.** `npm test` should FAIL.
- [ ] **Step 3: Write the data files and implement `route.mjs`.**
- [ ] **Step 4: Run the tests.** `npm test` should PASS.
- [ ] **Step 5: Commit.** `feat: add Baguio route file, stop coordinates and route validation`.

---

### Task 3: Map projection, coastline, traced route

**Files:**
- Create: `scripts/lib/map.mjs`, `scripts/map.test.mjs`, `scripts/trace-route.mjs`, `data/routes/baguio.geo.json`

**Interfaces:**
- Produces, from `map.mjs`:
  - `makeProjection(bbox, width) -> { project([lng,lat]) -> [x,y], width, height, viewBox }`. Equirectangular with `cos(midLat)` correction, `height = round(width * latSpan / (lngSpan * cos(midLat)))`, and `y` growing downward.
  - `coastPath(bbox, proj) -> string` (Natural Earth 10m, Philippines rings touching bbox + 1°, 1 decimal place).
  - `linePath(coords, proj) -> string`.
  - `buildMap(route, stopsById, root) -> { viewBox, coast, line, stops: {[id]: [x,y]}, labels: [{text,x,y,kind}], traced: boolean }`. It uses `data/routes/<id>.geo.json` (a GeoJSON LineString) when present; otherwise it uses `map.waypoints` and sets `traced: false`.
- `trace-route.mjs <route>` fetches `https://router.project-osrm.org/route/v1/driving/<lng,lat;...>?overview=full&geometries=geojson` through the route's waypoints. It writes the LineString, simplified to ≤400 points (keep every nth point), and prints the point count.

- [ ] **Step 1: Write failing tests.**
  - With bbox `[119.75,14.35,121.45,16.75]` and width 340: `height === 498`, `project([121.0,14.657])` ≈ `[250.0,434.3]` (±0.2), and `project([120.60,16.41])` ≈ `[170.0,70.5]`.
  - `linePath([[121,14.657],[120.6,16.41]], proj)` starts with `"M250.0 434.3L"`.
  - `coastPath` returns a string longer than 10,000 characters that starts with `M`.
  - `buildMap` without a geo file gives `traced === false` and has a stops entry for every stop with `lnglat`.
- [ ] **Step 2: Run the tests.** `npm test` should FAIL.
- [ ] **Step 3: Implement `map.mjs` and `trace-route.mjs`.**
- [ ] **Step 4: Run the tests.** `npm test` should PASS.
- [ ] **Step 5: Trace the route.** Run `node scripts/trace-route.mjs baguio`.
  - If the sandbox blocks OSRM, commit without the geo file. The build logs `map: using waypoints (run trace-route in CI)` and Task 10 adds a CI step that traces it.
- [ ] **Step 6: Commit.** `feat: project Luzon coastline and route line for roadbook maps`.

---

### Task 4: Design system assets

**Files:**
- Create: `site/_design/gala.css`, `site/_design/signs.svg`, `site/_design/art.svg`, `scripts/lib/fonts.mjs`, `scripts/fonts.test.mjs`

**Interfaces:**
- Produces:
  - `copyFonts(root, outDir) -> string[]`. It copies `overpass-latin-{400,600,800,900}-normal.woff2` and `kalam-latin-{400,700}-normal.woff2` from `node_modules/@fontsource/*/files/`, plus the `latin-ext` files only when the ₱ check needs them.
  - `hasGlyph(woff2Path, codepoint) -> boolean`. It reads the cmap through `fontkit` if that is available; otherwise it renders with Playwright and compares the width of `"₱"` against the fallback font.
- Symbol ids, used by Task 5:
  - `signs.svg`: `i-gas`, `i-food`, `i-wc`, `i-bag`, `s-warn` (text from `data-tons`; the template writes the number into a `<text>`), `s-go`, `s-stop`, `s-ask`, `i-pin`, `u-line`.
  - `art.svg`: `art-kennon-zigzag`, `art-strawberries`, `art-pines-fog`, `head-way`, `head-city`, `head-weather`.
- `gala.css`:
  - All tokens and components from preview-v2's `<style>`, minus the `.controls` block and the `data-font` sets. Keep only Expressway.
  - Plus `@font-face` rules pointing to `fonts/…`.
  - Plus `.stale-note` (hand font, `--pencil`) and `.sign-closed-note`.
  - `[data-brand]` sample themes are removed; partner themes come from Task 6.

- [ ] **Step 1: Write failing tests.**
  - `copyFonts` puts 6+ `.woff2` files in a temp dir.
  - `hasGlyph(<overpass 400 file>, 0x20B1)` returns a boolean. Record the result in the test name output.
  - `gala.css` contains no `.pill`, `.chip` or `.badge` selectors. (The test greps the file.)
- [ ] **Step 2: Run the tests.** `npm test` should FAIL.
- [ ] **Step 3: Implement the assets.** Port the preview-v2 CSS and SVG symbols as is. Move the inline polaroid and section-head art into `art.svg` symbols, colouring ridges and section art through the `.ridge-*`/`.art-*` classes.
- [ ] **Step 4: Run the tests.** `npm test` should PASS. If the ₱ glyph is missing, add the `latin-ext` files and re-run.
- [ ] **Step 5: Commit.** `feat: add GALA design system css, sign and art symbol sheets, self-hosted fonts`.

---

### Task 5: Template, renderer and build for the phone page

**Files:**
- Create: `site/_design/roadbook.html`, `site/_design/roadbook.js`, `scripts/lib/render.mjs`, `scripts/render.test.mjs`
- Modify: `scripts/build.mjs` (rewrite on top of `loadData`/`validateRoute`; keep the existing per-fact/per-stop checks and the warnings list)
- Delete: `site/baguio/index.html`

**Interfaces:**
- Consumes: Tasks 1–4.
- Payload (inlined as `<script id="gala-data" type="application/json">`):

  ```
  { builtAt, maxAgeDays: 45, route, facts, stops, creators,
    timeline: TimelineItem[], map: buildMap(...), roadCheck: [{fact, sign, tons?}],
    plates: [{label, value, note, style, kind?, checked, source}],
    morningCheck: string[], theme: null | {brand,brand2,accent,onAccent,name,logo,contact},
    pdfHref: "<route>-roadbook.pdf" }
  ```

  All placeholders are already filled at build time.
- `render.mjs`: `renderPage({ root, templateFile, payload, theme }) -> string`. It replaces these slots in the template:
  - `<!--GALA:CSS-->` (gala.css inlined; font URLs rewritten to `../_design/fonts/` relative to the output page)
  - `<!--GALA:SIGNS-->`, `<!--GALA:ART-->`
  - `<!--GALA:THEME-->` (a `<style>:root{--brand:…}</style>`, or empty)
  - `<!--GALA:DATA-->`, `<!--GALA:JS-->`

  It throws if any slot remains.
- `roadbook.js` has one render function per section, all taking `(D)`:
  - `renderHero` (stamp date = `latestChecked`)
  - `renderPlates`
  - `renderRoadCheck`
  - `renderWay` (map SVG, receipt, margin note, timeline)
  - `renderCity` (checker, zone note, must-sees and pasalubong with `<details>` "See all N places", parking)
  - `renderBeforeYouGo` (rain, pack, emergency, morning check, credits)
  - `renderFooter` (PDF link)

  Plus behaviours: `initCodingChecker(D)` and `initMapFollow(D)`, ported from preview-v2. Shared helpers: `checkedLine(item)`, `staleNote(item)`, `servicesBoard(services)`, `kmPost(post)`, `roadSign(kind, tons)`.
- Built output: `_site/<route>/index.html` and `_site/_design/fonts/*`.

- [ ] **Step 1: Write failing tests.** They render Baguio to a string, parse it with a regex or DOM-free checks, and run `roadbook.js` under Playwright only in Task 8.
  - The output contains `id="gala-data"`, and the JSON parses.
  - `payload.plates[0].value === "₱981"`.
  - `payload.roadCheck` signs are `["warn","go","stop"]`, and kennon `tons === 5`.
  - The PMA stop in the payload has `status: "closed"`.
  - No `{` placeholder remains (`/\{[a-z0-9.-]+:/` is absent).
  - No `.pill`, `class="chip` or `→</a>` appears.
  - With `now` stubbed to 2026-11-30, `payload.facts.facts.find(f=>f.id==="rfid")` gets `stale: true` from the build.
  - `renderPage` with a template missing `<!--GALA:JS-->` throws `/slot GALA:JS/`.
- [ ] **Step 2: Run the tests.** `npm test` should FAIL.
- [ ] **Step 3: Implement the template, `render.mjs`, `roadbook.js` and the `build.mjs` rewrite.**
  - `roadbook.js` renders only from `D`, so no Baguio strings appear in the template or JS.
  - Closed stops: no-entry sign, the stop's `note`, no call-ahead note, Maps button kept.
  - The build adds `stale: isStale(...)` to each fact and stop in the payload.
- [ ] **Step 4: Run the tests.** `npm test` should PASS. Then run `node scripts/build.mjs --no-qa`, which should print `built baguio → _site/baguio/index.html`.
- [ ] **Step 5: Preview.** Run `node scripts/serve.mjs`, take a Playwright screenshot of `http://localhost:8080/baguio/` at 390px and compare it with preview-v2 by eye. Fix any differences.
- [ ] **Step 6: Commit.** `feat: render roadbooks from one template and route data`.

---

### Task 6: Partner themes

**Files:**
- Create: `scripts/theme.test.mjs`, `scripts/fixtures/hotels/low-contrast.json`, `scripts/fixtures/hotels/sample-inn.json`
- Modify: `scripts/build.mjs`, `scripts/lib/render.mjs`

**Interfaces:**
- Produces:
  - `themeErrors(hotel) -> string[]`, with errors like `"hotel low-contrast: on-accent on accent 1.27 < 4.5"`. It checks the three pairs from Global Constraints and requires `/^#[0-9a-f]{6}$/i` for each colour.
  - `themeStyle(theme) -> string`, the `:root{…}` rule.
- Built output: `_site/<route>/<slug>/index.html`, with the partner name and logo in the brandline and "Made by GALA" in the footer.
- The fixtures live under `scripts/fixtures` and are never in `data/hotels`. **No made-up partner is ever published.**

- [ ] **Step 1: Write failing tests.**
  - `themeErrors(lowContrast)` contains `on-accent on accent`.
  - `themeErrors(sampleInn)` (navy `#1D3352`, `#2E4C74`, accent `#F28C6B`, on-accent `#2A0F06`) → `[]`.
  - `themeStyle` output contains `--accent:#F28C6B` and not `--sign-`.
  - Building with `GALA_HOTELS_DIR=scripts/fixtures/hotels` exits non-zero and prints the low-contrast error.
- [ ] **Step 2: Run the tests.** `npm test` should FAIL.
- [ ] **Step 3: Implement.** Hotel files are read from `data/hotels/`, overridable by the env var `GALA_HOTELS_DIR` for tests.
- [ ] **Step 4: Run the tests.** `npm test` should PASS.
- [ ] **Step 5: Commit.** `feat: partner themes with contrast gate`.

---

### Task 7: Tri-fold print page and PDF

**Files:**
- Create: `site/_design/print.html`, `site/_design/print.css`, `scripts/qa/pdf.mjs`
- Modify: `scripts/build.mjs` (also writes `_site/<route>/print.html`), `site/_design/roadbook.js` (export the section renderers so print reuses them: `window.GALA = { renderHero, … }`)

**Interfaces:**
- `print.css`:
  - `@page { size: 11.25in 8.75in; margin: 0 }`, for 11×8.5 plus 0.125in bleed on each side.
  - `.sheet` is a 3-column grid of 3.667in panels.
  - Page 1 panels: [road check + route strip] [back: emergency, credits, footer] [cover: hero + plates]. This is the tri-fold outside order (inside flap, back, cover).
  - Page 2 panels: [01] [02] [03].
  - The map is static, with the whole route lit.
  - No sticky elements or interactive buttons. The checker becomes a printed coding table by day.
- `pdf.mjs`: `makePdf(siteDir, route) -> outPath`. Chromium `page.pdf({ preferCSSPageSize: true, printBackground: true })` → `_site/<route>/<route>-roadbook.pdf`.

- [ ] **Step 1: Write the failing check** in `scripts/pdf.test.mjs`, skipped when Playwright is missing. After `makePdf`, the file exists and starts with `%PDF`. The page count is exactly 2 (count `/Type /Page` objects not followed by `s`). The first page's MediaBox is `[0 0 810 630]` (11.25×8.75in in points).
- [ ] **Step 2: Run the test.** `npm test` should FAIL.
- [ ] **Step 3: Implement `print.html`, `print.css` and `pdf.mjs`.**
- [ ] **Step 4: Run the test.** `npm test` should PASS. Then render page 1 and page 2 to PNG at 150 dpi with `pdftoppm` and look at both. No text may be clipped at panel edges or fold lines.
- [ ] **Step 5: Commit.** `feat: tri-fold PDF from the same data`.

---

### Task 8: Screenshots and design checks

**Files:**
- Create: `scripts/qa/shots.mjs`, `scripts/qa/check-design.mjs`, `scripts/qa.test.mjs`, `scripts/fixtures/route-long/` (a route + stops file with 60-character names and a road-closure list with 6 long names)
- Modify: `scripts/build.mjs` (after the site is written, `await import('playwright')`; on success run pdf, shots and checks; on failure log `qa skipped: playwright not installed`. `--no-qa` skips.)

**Interfaces:**
- `shots(siteDir, route) -> string[]`: `check/phone-light.png`, `phone-dark.png`, `laptop-light.png`, `laptop-dark.png` at 390×900 and 1280×900, full page, with `colorScheme` set per shot.
- `checkDesign(siteDir, route) -> string[]`, which returns errors for:
  - `scrollWidth > 360` at a 360px viewport
  - any `[data-fact]` element without a descendant `.checked`
  - HTML over 150 KB
  - HTML + fonts over 300 KB
  - any element matching `.pill, .chip, .badge`
  - any button or link whose text ends with `→`
  - any interactive element under 48px tall (`a.btn, button` inside `main`)

  The build fails if this list is non-empty.
- Task 5's markup must put `data-fact="<id>"` on every fact block. Add it there if it's missing.

- [ ] **Step 1: Write failing tests.**
  - `checkDesign` on the Baguio build → `[]`.
  - On the long-names fixture build → `[]`. This proves there is no overflow; if it fails, fix the CSS (`min-width:0`, `overflow-wrap:anywhere` on names), not the test.
  - An injected `<span class="pill">` gives an error containing `banned class`.
- [ ] **Step 2: Run the tests.** `npm test` should FAIL.
- [ ] **Step 3: Implement `shots.mjs`, `check-design.mjs` and the build wiring.**
- [ ] **Step 4: Run the tests.** `npm test` should PASS. `node scripts/build.mjs` should end with `qa: 0 design errors` and write 4 PNGs and a PDF.
- [ ] **Step 5: Commit.** `feat: screenshots and design checks in the build`.

---

### Task 9: Home page on the new design

**Files:**
- Modify: `site/index.html` (use `gala.css`; pine hero with "Tara sa next GALA."; one card per `data/routes/*.json` built from route data at build time via `<!--GALA:ROUTES-->`; each card has the route title, the newest checked date and a PDF link)
- Delete: `site/brand.css`

**Interfaces:**
- Consumes `loadData` and `latestChecked`. The build fills `<!--GALA:ROUTES-->`.

- [ ] **Step 1: Add a check to `qa.test.mjs`.** `_site/index.html` links to `baguio/` and `baguio/baguio-roadbook.pdf`, and contains no `brand.css`.
- [ ] **Step 2: Run the test.** `npm test` should FAIL.
- [ ] **Step 3: Implement.** No "coming next" list unless a route file exists.
- [ ] **Step 4: Run the tests.** `npm test` should PASS, and the build passes the design checks for the home page too (add `index` to the checked pages).
- [ ] **Step 5: Commit.** `feat: home page on the GALA design system`.

---

### Task 10: CI workflow

**Files:**
- Modify: `.github/workflows/pages.yml`

**Build job steps:**
1. checkout
2. setup-node 22 with npm cache
3. `npm ci`
4. `npx playwright install --with-deps chromium`
5. `node scripts/trace-route.mjs baguio` only if `data/routes/baguio.geo.json` is missing, with `continue-on-error: true`
6. `npm test`
7. `node scripts/build.mjs`
8. The existing two lychee steps, unchanged
9. `actions/upload-artifact@v4` with name `roadbook-check` and path `_site/*/check/*.png` plus `_site/*/*.pdf`
10. configure-pages / upload-pages-artifact (unchanged)

The deploy job is unchanged.

- [ ] **Step 1: Validate the workflow.** Run `npx --yes action-validator .github/workflows/pages.yml` if it is reachable; otherwise run `node -e "require('js-yaml')..."` with js-yaml installed temporarily. Expected: no errors.
- [ ] **Step 2: Commit.** `ci: build with Playwright, run tests, upload screenshots and PDF`.

---

### Task 11: Skills and CLAUDE.md

**Files:**
- Create: `.claude/skills/gala-design/SKILL.md`
- Modify: `.claude/skills/gala-roadbook/SKILL.md`, `.claude/skills/gala-hotel-kit/SKILL.md`, `CLAUDE.md`

**Content required:**
- **gala-design:**
  - Frontmatter `description`: "Use before any change to how a GALA roadbook or page looks, and before publishing any roadbook or partner version."
  - Body:
    - the reference file (`docs/design/preview-v2.html`)
    - the token table and the fixed road-sign colours
    - the signature elements list (spec §3)
    - the Do/Don't list
    - how to add a sign or polaroid art (a symbol in `signs.svg`/`art.svg`, referenced by id from the route file)
    - how to swap a polaroid for Jed's photo (`photo` path, 1:1 crop, ≤60 KB WebP)
    - a note that UI UX Pro Max is for UX rules only and its generated styles are not to be applied
  - Pre-publish checklist: `npm test` passes; `node scripts/build.mjs` reports 0 design errors; check the 4 screenshots; open the PDF; for partners, `themeErrors` passes.
- **gala-roadbook:**
  - Step 3 becomes: copy `data/routes/baguio.json` → `data/routes/<route>.json`; add stops with `km`/`lnglat` to `data/stops-<route>.json`; run `node scripts/trace-route.mjs <route>`; build.
  - Remove "copy site/baguio/ as template". Point to gala-design for the look. Keep the fact-check-first rule.
  - Change the old "<100 KB, no web fonts" line to the new budgets.
- **gala-hotel-kit:** step 3 becomes "create `data/hotels/<slug>.json` with `theme` (4 colours from their brand), logo, contact, parking, arrival; build; the contrast gate must pass; if it fails, propose the nearest passing shade to Jed (MCQ)". Keep the never-invent rule and the pitch drafts.
- **CLAUDE.md:** update the layout block to the new files; add gala-design to the skills line; mention `npm install` before the first build.

- [ ] **Step 1: Write the four files.**
- [ ] **Step 2: Check.** `grep -n "site/baguio/index.html\|brand.css\|100 KB" CLAUDE.md .claude/skills -r` should print nothing.
- [ ] **Step 3: Commit.** `docs: gala-design skill; roadbook and hotel-kit skills use the template`.

---

### Task 12: Verification and hand-off

- [ ] **Step 1: Run everything.** `npm ci && npm test && node scripts/build.mjs`. Expected: all tests pass and `qa: 0 design errors`.
- [ ] **Step 2: Compare against the reference.** Put the screenshots in `_site/baguio/check/` side by side with preview-v2 rendered at the same sizes, and list any differences that aren't data-driven. Fix them, or note why they're intended.
- [ ] **Step 3: Check the PDF.** Render both PDF pages to PNG and send them to Jed with the phone screenshot.
- [ ] **Step 4: Confirm no V1 leftovers.** `grep -rn "Confirm before you go\|class=\"badge" _site` should find nothing.
- [ ] **Step 5: Get a branch review.** Hand the whole branch to a fresh reviewer with the spec and this plan.
- [ ] **Step 6: Push.** Push `roadbook-design-system` and open a PR if push access exists. Otherwise give Jed an upload zip of the changed files and the steps to apply them.
