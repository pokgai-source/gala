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
2. Create `data/hotels/<hotel-slug>.json`:
   ```json
   { "name": "…", "route": "baguio",
     "theme": { "brand": "#…", "brand2": "#…", "accent": "#…", "onAccent": "#…" },
     "logo": "img/<hotel-slug>.webp", "contact": { "type": "messenger", "url": "…" },
     "parking": "…", "arrival": "…", "phase": "free-testimonial",
     "source": "who or where it came from", "checked": "YYYY-MM-DD" }
   ```
   - The 4 colours come from the hotel's own brand (Facebook page, website or files from Jed).
   - Put the logo file in `data/hotels/img/` (square, ≤40 KB WebP or SVG). The build copies it next to the page and fails if it's missing.
   - Partners change **only** these 4 colours plus the logo and name. Fonts and road-sign colours stay GALA's
     (see `gala-design`).
3. Build: `node scripts/build.mjs` makes `_site/<route>/<hotel-slug>/` with their name in the header, their
   colours, a contact button and "Made by GALA" in the footer.
   - The **contrast gate** must pass (text on their colours ≥4.5:1, readable in sunlight).
   - If it fails, propose the nearest passing shade to Jed as an MCQ. Never publish a failing theme.
4. Look at the screenshots in `_site/<route>/<hotel-slug>/check/` and show Jed the phone one.
5. Draft in `docs/hotel-pitches/<hotel-slug>.md`:
   - **Messenger pitch** (Taglish OK, < 90 words): who Jed is (vlogger), what it is (a free trip guide branded
     for their guests), the preview link, one ask (can we send it to your guests?).
   - **Follow-up** (< 50 words) for 3–4 days later.
   Jed sends these himself. Never send messages on his behalf.
