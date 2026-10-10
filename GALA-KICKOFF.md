# GALA — Project Kickoff for Claude Code

> **Claude Code: read this whole file first.** It carries every decision Jed and Claude made in the
> planning chat on 2026-10-10. Then do the "First session" steps at the bottom.
> Ask Jed questions as **multiple choice (MCQ)**, one at a time. He is new to git and often works from his phone,
> so explain GitHub steps in plain words and do the git work yourself.

---

## 1. What GALA is

- **Name:** GALA (Filipino for "to roam"), acronym *Guided Adventures, Local Areas*.
- **Tagline:** **Tara sa next GALA.**
- **Product:** phone-first **roadbooks** for self-drive trips out of Manila. One link per trip with:
  route and drive times, tolls and RFID, food and pasalubong stops, gas and restroom stops,
  Baguio number coding and parking, must-sees, weather and what to pack, emergency numbers.
  Every stop has a one-tap Google Maps link. A **PDF version** comes after the phone page works.
- **First roadbook:** **Manila → Baguio**. Next: La Union (San Juan), then Tagaytay/Batangas.
- **Owner:** Jed (Quezon City). Starts as a **hobby, free**, tied to his travel vlogging.

## 2. Business decisions (from the feasibility study)

- **Not car rental shops** (most don't offer self-drive).
- **Who pays later:**
  1. **Hotels, inns, transient houses** — a roadbook branded with *their* logo, colors, parking details and
     contact button, sent to guests after booking or at check-in. Small footer: "Made by GALA".
  2. **Restaurants and pasalubong shops on the route** — paid **Featured stop** placement, priced against
     nano-influencer posts (about ₱1,000–5,000 per post in PH).
- **Starting test prices (guesses to validate):** hotel setup ₱1,500–3,000 + ₱300–500/month updates;
  featured stop ₱500–1,500/month. Phase 1 is free for 3–5 hotels in exchange for testimonials.
- **Roadmap and gates:**
  1. **Build** (Oct–Nov 2026): Baguio roadbook v1, test with 10 friends. **Gate A:** 10 real trips used it.
  2. **Prove** (Dec 2026–Jan 2027): free for 3–5 hotels, free featured stops. **Gate B:** 3 hotels send it to guests.
  3. **Charge** (Feb–Mar 2027): paid hotel test, paid featured stops, move hosting. **Gate C:** 2 paying within
     6 weeks, else stop charging or change angle.
  4. **Grow** (Apr–Jun 2027): La Union, Tagaytay, DTI registration, PDF.

## 3. Non-negotiable rules

1. **Facts are never hard-coded in pages.** Every fact lives in `data/facts.json` with its value, source URL,
   and `checked` date. Pages read from it and **show the last-checked date** next to each fact.
2. **Latest data only.** Before building or updating a roadbook, run the fact-check skill. A fact older than
   **45 days** must be re-verified before it is published.
3. **Official sources first:** DPWH, LGU Baguio / Visita, TRB, toll operators (NLEX/MPTC, SMC/TPLEX), PAGASA,
   DOT. News sites second. Blogs and vlogs are **leads only**, never the source of a published fact.
4. **Other vloggers (we lean on them until Jed can drive the route):** credit by name and link or embed
   their video. Never copy their photos, thumbnails or text. Keep a list of creators to thank and contact.
5. **Featured stops are always labelled "Featured".** Only feature places with good public reviews,
   and later ones Jed has tried. Disclose paid ties in vlogs too (Consumer Act on misleading ads).
6. **No personal data collected.** The coding checker runs on the phone only. No forms that store names or plates.
7. **Built for the co-pilot:** big tap targets, readable in sunlight, works on a slow signal, nothing to install.
8. **Hosting:** GitHub Pages while free. GitHub's terms say Pages isn't for running an online business, so
   move to a host that allows business use **before Gate C**.

## 4. Verified facts as of 2026-10-10 (seed for `data/facts.json`)

Re-verify all of these in the first session; these are the starting point, not the final word.

| id | Fact | Source (as shown) |
| --- | --- | --- |
| `baguio.coding` | Number coding 7am–7pm in the CBD: Mon plates ending 1-2, Tue 3-4, Wed 5-6, Thu 7-8, Fri 9-0. Applies to tourists. Enforced even on holidays. | [GMA, Dec 24 2024](https://gmanetwork.com/regionaltv/news/105780/number-coding-in-baguio-city-enforced-even-on-holidays-lgu-says/story) |
| `tolls.manila-baguio.class1` | Total ₱981 one way, Class 1 (Class 2 ₱2,337; Class 3 ₱2,941) | [Expressway.ph, rates verified vs TRB Feb 1 2026](https://www.expressway.ph/road-rules/manila-to-baguio) |
| `tolls.segments.class1` | NLEX Balintawak–Sta. Ines ₱440; SCTEX full length ₱311; TPLEX Tarlac–Rosario ₱370 | [TollGuru, Aug 2026](https://tollguru.mapup.ai/philippines-expressway-tolls-and-toll-information) |
| `rfid` | Easytrip for NLEX/SCTEX; Autosweep for TPLEX/Skyway. Low or no balance can mean barrier delay and a citation. | [TollGuru, Aug 2026](https://tollguru.mapup.ai/philippines-expressway-tolls-and-toll-information) |
| `kennon.status` | Open only to vehicles up to 5 tons; heavy vehicles use Marcos Highway. One-lane rockshed near Baguio, Acrow bridge at Camp 2 with 2.5 m clearance. | [Manila Bulletin, Mar 26 2026](https://mb.com.ph/2026/03/26/kennon-road-limited-to-light-vehicles-amid-persistent-hazards) |
| `baguio.parking` | City studying central weekend parking at Baguio Convention Center and a hop-on hop-off bus; street and park parking is a main traffic cause. | [BusinessWorld](https://www.bworldonline.com/?p=459995) |
| `baguio.visitors` | 1.31M visitors in 2023 (99.36% domestic); Cordillera 1,586,890 in 2025, Baguio 72.92%; 50k–60k a week, ~40k Fri–Sun. | [Manila Times](https://manilatimes.net/2024/08/05/regions/131m-tourists-visit-baguio-city-in-2023/1961851), [Daily Tribune, Jul 2026](https://tribune.net.ph/2026/07/26/baguio-accounts-for-73-percent-of-cordillera-tourist-arrivals), [BusinessWorld](https://www.bworldonline.com/?p=459995) |
| `baguio.police-app` | BCPO View Baguio app: traffic status, parking at tourist spots, hotlines. | [App Store](https://apps.apple.com/ph/app/id6751752791) |

Facts still **missing** (research in session 1, official source required): current Baguio coding zone map,
Marcos Highway status, fuel and restroom stops on NLEX/SCTEX/TPLEX, Baguio emergency numbers (hospital,
police, tourism office), PAGASA Baguio temperature range by month, current Kennon status.

## 5. `data/facts.json` schema

```json
{
  "updated": "2026-10-10",
  "facts": [
    {
      "id": "baguio.coding",
      "label": "Baguio number coding",
      "value": "7am–7pm, Mon 1-2, Tue 3-4, Wed 5-6, Thu 7-8, Fri 9-0. Applies to tourists, holidays included.",
      "data": { "hours": "07:00-19:00", "byDay": { "Mon": [1,2], "Tue": [3,4], "Wed": [5,6], "Thu": [7,8], "Fri": [9,0] } },
      "source": { "name": "GMA Regional TV", "url": "https://...", "published": "2024-12-24" },
      "checked": "2026-10-10",
      "status": "ok"
    }
  ]
}
```

`status` is `ok`, `changed` (value updated on the last check) or `stale` (older than 45 days or the source
could not confirm it). Pages show a warning on `stale` facts.

## 6. Repo layout to create

```
gala/
  CLAUDE.md                 ← short version of sections 1–3 + pointers (create from this file)
  GALA-KICKOFF.md           ← this file, kept for history
  data/facts.json
  data/stops-baguio.json    ← each stop: name, type, maps link, why stop, featured:false, source, checked
  data/creators.json        ← vloggers credited: name, channel, video link, what we used it for
  site/index.html           ← GALA home: Tara sa next GALA, list of roadbooks
  site/baguio/index.html    ← Manila → Baguio roadbook (reads data/*.json)
  site/brand.css            ← one shared look; hotel versions override colors and logo only
  docs/feasibility.md       ← summary of the feasibility study
  .claude/skills/gala-fact-check/SKILL.md
  .claude/skills/gala-roadbook/SKILL.md
  .claude/skills/gala-hotel-kit/SKILL.md
  .github/workflows/pages.yml   ← publish site/ to GitHub Pages; link checker
```

## 7. Skills to create

### gala-fact-check
- **When:** before any roadbook build or update, on "check the facts", and monthly.
- **Steps:** for each fact in `data/facts.json`, search the web for the newest official statement, open the
  page (never trust a snippet), compare. Update `value`, `source`, `checked`; set `status`. Do the same for every
  stop in `data/stops-*.json` (still open? moved?). Write a short changelog to `data/CHANGELOG.md`.
  Report to Jed in plain words: what changed, what is stale, what needs his eyes.

### gala-roadbook
- **When:** "build/update the <route> roadbook".
- **Steps:** run gala-fact-check first. Build or update `site/<route>/index.html` from data files only.
  Sections: route and times, tolls and RFID, stops (one-tap Maps), coding checker (plate digit + day, on-device),
  parking, must-sees, weather and packing, emergency numbers, credits to vloggers, last-checked dates.
  Phone-first, co-pilot friendly, fast on weak signal. Then publish and give Jed the link.

### gala-hotel-kit
- **When:** "make a version for <hotel>".
- **Steps:** ask Jed (MCQ) for the hotel's name, logo/colors source, parking details, contact link, arrival
  notes. Create `site/<route>/<hotel-slug>/` that reuses the roadbook with their branding and a "Made by GALA"
  footer. Also draft the Messenger pitch message and a short follow-up. Never invent hotel details.

## 8. Ways of working with Jed

- Ask MCQ questions, one at a time. Recommend an option and say why.
- Use the superpowers workflow (brainstorm, plan, test) for new features; keep messages short and plain.
- Show a clickable preview before big UI changes.
- Never publish an unchecked fact. When unsure, say so and ask.

## 9. First session — do these in order

1. Confirm with Jed (MCQ) that the repo name is `gala` and that GitHub Pages can be turned on.
2. Create the layout in section 6, `CLAUDE.md`, and the three skills in section 7.
3. Seed `data/facts.json` from section 4, then **run gala-fact-check** to re-verify every fact and fill the
   missing ones. Show Jed the changelog.
4. Build `data/stops-baguio.json` from official pages and well-reviewed listings; use vloggers only as leads,
   credit them in `data/creators.json`.
5. Build the Manila → Baguio roadbook preview, publish to GitHub Pages, send Jed the link.
6. Set up a **monthly scheduled task** that runs gala-fact-check and tells Jed what changed.
