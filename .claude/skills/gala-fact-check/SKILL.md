---
name: gala-fact-check
description: Use before any GALA roadbook build or update, when Jed says "check the facts", and on the monthly schedule. Re-verifies every fact in data/facts.json and every stop in data/stops-*.json against the newest official sources, updates them, and writes data/CHANGELOG.md.
---

# GALA fact check

Goal: every published fact is current, comes from the best available source, and carries an honest `checked`
date and `status`.

## Source ranking (rule 3)

1. Official: DPWH, Baguio City LGU (baguio.gov.ph) / Visita, TRB (trb.gov.ph), toll operators (NLEX/MPTC,
   SMC/TPLEX/SCTEX), PAGASA, DOT, PNP/BCPO, DOH/hospital sites, the app stores for apps.
2. News: GMA, ABS-CBN, Inquirer, Philstar, Manila Bulletin, BusinessWorld, PNA, SunStar Baguio, Herald Express.
3. Aggregators (Expressway.ph, TollGuru) — usable when they cite official tariffs; prefer the official tariff.
4. Blogs, vlogs, social posts — **leads only**. Never the `source` of a fact. If a vlogger led you to a fact,
   add them to `data/creators.json`.

## Steps

1. Read `data/facts.json` and every `data/stops-*.json`. Today's date is the `checked` date you write.
2. For **each fact**:
   - Search the web for the newest statement (include the current year and month in the query).
   - **Open the page** and read it. Never trust a search snippet. If a page can't be opened, it doesn't count.
   - Compare with the stored `value` and `data`.
   - Same → keep value, update `checked`, `status: "ok"`, update `source` if you found a better/newer one.
   - Different → update `value`, `data`, `source`, `checked`, set `status: "changed"`, and note old → new.
   - **Whenever `value` changes, rewrite `short`** (≤90 characters). The short line is what people read
     first. The build warns when a number in `short` isn't in `value` or `data`.
   - Can't confirm (no source opens, or only blogs) → keep the value, **don't** bump `checked`,
     set `status: "stale"`.
   - Any fact whose `checked` is more than **45 days** old after this run → `status: "stale"`.
3. For **each stop**: confirm it is still open and at the same place (official page, Google Maps listing,
   recent news or reviews). Update `checked`; set `status` the same way. Closed → `status: "closed"` and flag it.
   - **EV chargers (`ev`):** confirm the operator, kW and plugs on the operator's own app or site
     (Shell Recharge, ACMobility, etc.). Aggregators are leads only. Update `ev.checked`, or remove `ev` if the
     charger is gone.
   - **Map pins:** if the build warns that a pin is approximate, look at the stop's `osm.near` hint. Fix the
     hint if it is wrong and push, so the Assets workflow re-pins it.
4. Fill any fact listed under `missing` in `data/facts.json` when an official source is found; remove it from
   `missing` once filled.
5. Set the top-level `updated` to today in each file you touched.
6. Prepend a dated section to `data/CHANGELOG.md`:
   ```
   ## 2026-10-10
   Changed: <id> — old → new (source)
   Confirmed: <ids>
   Stale / needs Jed: <id> — why
   New: <id> — value (source)
   ```
7. Run `node scripts/build.mjs` to make sure the data still validates.
8. Report to Jed in plain words, short: what changed, what is stale, what needs his eyes. No jargon.

## Never

- Never invent a fact, number, phone number, or source URL.
- Never use a blog or vlog as the `source`.
- Never mark a fact `ok` without having opened its source page during this run.
