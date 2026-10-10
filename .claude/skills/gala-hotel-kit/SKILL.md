---
name: gala-hotel-kit
description: Use when Jed says "make a version for <hotel>" (hotel, inn, transient house). Creates a hotel-branded copy of a GALA roadbook with their logo, colors, parking and contact button plus a "Made by GALA" footer, and drafts the Messenger pitch and a follow-up.
---

# GALA hotel kit

**Never invent hotel details.** Everything about the hotel comes from Jed or from the hotel's own public page.

## Steps

1. Ask Jed, one MCQ question at a time (recommend an option each time):
   1. Which roadbook (Baguio / La Union / …)?
   2. Hotel name, and where to get the logo and colors (their FB page, website, Jed sends files, or plain GALA
      colors for now).
   3. Parking details (on-site / nearby pay parking / none — and any notes Jed has).
   4. Contact button: Messenger link, phone, or website.
   5. Arrival notes (check-in time, landmark, gate, steep road, etc.) — or none.
   6. Is this Phase 1 (free for a testimonial) or paid? (Affects nothing on the page; record it in the notes.)
2. Create `data/hotels/<hotel-slug>.json` with what Jed gave you, plus `source` (who/where it came from) and
   `checked` date.
3. Create `site/<route>/<hotel-slug>/index.html` that reuses the route roadbook and adds:
   - hotel logo + name in the header, their colors via CSS variables overriding `site/brand.css` only
     (`--brand`, `--brand-ink`, `--accent`), parking section first under "Arriving", a big contact button,
     arrival notes;
   - footer: "Made by GALA · Tara sa next GALA" linking to the GALA home page.
4. Build, preview at phone width, show Jed.
5. Draft in `docs/hotel-pitches/<hotel-slug>.md`:
   - **Messenger pitch** (Taglish OK, < 90 words): who Jed is (vlogger), what it is (a free trip guide branded
     for their guests), the preview link, one ask (can we send it to your guests?).
   - **Follow-up** (< 50 words) for 3–4 days later.
   Jed sends these himself. Never send messages on his behalf.
