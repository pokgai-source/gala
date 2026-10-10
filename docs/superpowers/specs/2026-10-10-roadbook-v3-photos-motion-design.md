# Roadbook v3: photos, exact map, suggested stops, EV, less text, motion

**Date:** 2026-10-10. **Status:** approved by Jed in chat ("Yes, write it up and build").
**Builds on:** `docs/superpowers/specs/2026-10-10-roadbook-design-system-design.md`. Everything there still holds
unless this file changes it.

## Why

Jed's feedback on v2:
1. Make the map exact, not approximate.
2. Use free-licence photos of the must-sees and make them the focus, not a texty brochure.
3. "On the way" reads like stopping at every gas station.
4. Use less text and more images everywhere.

He also asked for EV charging data, Apple-style scrolling, pages that flip as you scroll, and the tri-fold
unfolding on laptop.

## Decisions (from chat)

| Topic | Decision |
| --- | --- |
| Photos | Wikimedia Commons, free licence with credit (CC BY, CC BY-SA, CC0, public domain). A tiny credit line under each photo. Jed's own photos can replace any of them later. |
| Must-sees | Swipe cards: tall photo, name and one line on the photo. Tap for details and Maps. |
| Cover | Same pine band, stamp and handwriting. The polaroids become real photos. |
| Suggested stops | 2 stops: **Petron Lakeshore** (NLEX Km 71) and **Shell, Rosario** (end of TPLEX, Shell Recharge EV). The others fold under each as "Or these nearby". |
| EV | Chargers are data on stops (operator, kW, plug), with a source and checked date like any fact. An EV plug icon sits on the services board. |
| Less text | Every fact gets a one-line `short`. The full value and the source sit behind a "More" tap. The "Checked" date stays visible. |
| Motion | Apple-style scroll: the cover moves as you scroll and the city photo pins and zooms. Sections flip up like a rally flip-pad. On laptop the tri-fold unfolds. |

## 1. Exact map: the GitHub assets job

This sandbox can't reach OpenStreetMap or Wikimedia, but GitHub Actions can. A new workflow
`.github/workflows/assets.yml` runs `node scripts/assets/run.mjs` and commits what it makes.

- **When it runs:** on push when `data/photos.json`, `data/routes/*.json`, `data/stops-*.json` or
  `scripts/assets/**` change, and on manual dispatch.
- **Permissions:** `contents: write`. Its own commits don't trigger it again (GitHub doesn't run workflows on
  `GITHUB_TOKEN` pushes).
- **Route line:** traced with OSRM through `map.waypoints`, but only when `data/routes/<id>.geo.json` is
  missing or the waypoints' hash has changed. The hash is stored in the geo file.
- **Stop pins:** a stop with `osm: { "brand": "Shell", "near": [lng, lat], "radius": 1500 }` is looked up through
  the Overpass API (`amenity=fuel` with `brand`/`name` matching, nearest to `near`).
  - It writes `lnglat` and `lnglatSource: "OpenStreetMap node/way <id>"`.
  - If nothing matches, it keeps the old value and writes `lnglatSource: "approximate"`, and the job log says so.
- **The page:** the map shows the traced road. Stop dots sit at their real spots, snapped onto the line for the
  scroll highlight.

## 2. Photos

**The list.** `data/photos.json` holds entries of the form
`{ id, place, query, file?, focus?, author?, license?, licenseUrl?, sourceUrl?, checked? }`.
- `place` is a stop id, or `cover-1`/`cover-2`/`cover-3`, or `city-hero`.

**Choosing a photo.**
1. For an entry with no `file`, the assets job searches Commons for the query.
2. It keeps only the allowed licences: CC0, Public domain, CC BY 2.0–4.0 and CC BY-SA 2.0–4.0.
3. It saves up to 6 candidate thumbnails to `docs/photo-candidates/<id>/` with a `candidates.json`.
4. Claude reviews them and picks one per place, choosing for quality, the subject truly shown, and no people
   as the focus. Claude then sets `file`.

**Preparing it.** For an entry with `file`, the job downloads the original and resizes it with `sharp` to WebP:
- 640 px wide, about 45 KB, for cards and polaroids
- 1280 px wide, for the city hero and the laptop view

The images go to `site/img/<route>/<id>-{640,1280}.webp`. The job fills `author`, `license`, `licenseUrl`,
`sourceUrl` and `checked` from the Commons API.

**Credit.** "Photo: <author>, <license>", linked to the Commons page, in 11px muted text on or under the photo.
The build fails if a used photo has no `license` or `author`.

**Weight.** Polaroids load the 640 px image; other photos load lazily (`loading="lazy"`). The first screen stays
under the budget. New budget: HTML + fonts + first-screen images ≤ 400 KB. Lazy images don't count.

## 3. "On the way"

The route file gets a `suggested` list. Each item is
`{ "stopId": "nlex-petron-lakeshore", "label": "Breakfast stop", "nearby": ["nlex-caltex-mega", "sctex-seaoil-citymall", "nlex-shell-mexico-nb"] }`.

The timeline becomes:
1. Start
2. Suggested stop 1 (the "GALA pick" plate), with its nearby stops folded
3. Suggested stop 2, the same way
4. Rosario exit
5. Baguio

The map highlights only these.

**New stops.** They come from the fact check, with official or operator sources where possible:
- **Shell, Rosario** (TPLEX end): gas, food, restroom, Shell Recharge EV.
- **Shell NLEX northbound, Mexico, Pampanga** (ACMobility EV).
- **CB Mall Urdaneta** (ACMobility EV), folded under stop 2.

Total Rosales stays in the data, folded under stop 2. PTT Victoria stays folded too.

**EV charger data.** A stop's `ev` field is
`{ "operator", "kw", "plugs": ["CCS2"], "source", "checked" }`. A missing `ev` means "no charger known". The
services board shows a plug icon. Tapping it shows the kW and plugs.

**Baguio chargers.** The 02 section gets an "EV charging in Baguio" list from a new fact or stop group. It must
come from the operator's listing; aggregators (like Expressway.ph) are leads only.

## 4. Less text

`data/facts.json` facts get a `short` field (≤ 90 characters). For example, Kennon:
"Light vehicles only, max 5 t. One-lane detours at Camp 2 and Camp 6."

| Part of the page | What shows |
| --- | --- |
| Road check | Sign, name, `short`, "More" (full value + source) |
| Plates | Unchanged |
| Coding checker | Interactive. The rule text goes behind "More" |
| Coding zone | One line, plus "More" |
| Parking and app | One line each, plus "More" |
| Weather | The chart and pack list only; the fact value goes behind "More" |
| Emergency | Number, one line, Call |

A **stop's text** is its first sentence of `why` (or a new `short` field when present). The full text appears
when the card is tapped.

The **"Checked <date>" line stays visible** on every fact, in small text, to keep spec rule 1. The source link
moves inside "More".

## 5. Motion

All motion uses CSS scroll-driven animations (`animation-timeline: view()` / `scroll()`), with no JS library.
- **Where it's supported:** the motion runs.
- **Where it isn't:** the page is static.
- **`prefers-reduced-motion: reduce`:** there is no motion at all.
- **Every animated element has a readable resting state.** Nothing starts at opacity 0 and waits to be
  revealed.

**What moves**
- **Cover:** as the page scrolls 0 to 60vh, the title scales from 1 to 0.86 and drifts up, the polaroids spread
  ±18px and scale up to 1.06, and the stamp scales from 1.2 to 1 and rotates.
- **City hero:** the section opens with the full-width `city-hero` photo pinned (`position: sticky`) while it
  scales from 1.0 to 1.12. The swipe cards slide up over it.
- **Flip-pad:** each `.sec` enters with `transform: perspective(1200px) rotateX(-14deg → 0)` from its top edge,
  over its first 30% in view.
- **Tri-fold unfold (≥1080px only):** a "Your printable roadbook" block after the plates.
  - It shows 3 panel images (`fold-1/2/3.webp`) cut from PDF page 2 at build time.
  - Folded, the outer panels are at rotateY ±88°. As the block scrolls through the view they reach 0°.
  - A Download PDF button sits under it.
  - Phones don't show this block.

## 6. PDF

- The cover polaroids use the photos.
- The 02 panel shows small thumbnails, 2 per row, for up to 6 must-sees.
- Photo credits print in 5.5pt on the back panel.

## 7. Checks (added to check-design)

- Every `<img>` has `width`/`height` (no layout shift) and alt text or `alt=""` with a caption.
- Every photo shown has a credit link.
- There is no horizontal overflow at 360px, including the swipe row (it scrolls inside its own container).
- The first-screen weight budget (§2).
- Under reduced motion, every animated element is visible and in place.

## Out of scope

- Junction tulip diagrams
- Jed's own photos (slots ready)
- Moving off GitHub Pages
