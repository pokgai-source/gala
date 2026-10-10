import { allowedLicense } from "../assets/commons.mjs";

// Photos from data/photos.json: who took them, their licence, and where the prepared WebP files live.
export function photoErrors(photos) {
  const errors = [];
  for (const p of photos?.photos || []) {
    if (!p.file) continue; // waiting for a pick
    if (!p.prepared) continue; // picked, not prepared yet by the assets job: the page falls back to art
    if (!p.license) errors.push(`photo ${p.id}: missing license`);
    else if (!allowedLicense(p.license)) errors.push(`photo ${p.id}: licence "${p.license}" is not allowed (CC0, public domain, CC BY, CC BY-SA only)`);
    if (!p.author) errors.push(`photo ${p.id}: missing author`);
    if (!p.sourceUrl) errors.push(`photo ${p.id}: missing sourceUrl`);
    else if (!/^https:\/\//.test(p.sourceUrl)) errors.push(`photo ${p.id}: sourceUrl must be https`);
    if (p.licenseUrl && !/^https?:\/\//.test(p.licenseUrl)) errors.push(`photo ${p.id}: licenseUrl must be a web address`);
  }
  return errors;
}

export function photoMap(photos, route = "baguio") {
  const map = {};
  for (const p of photos?.photos || []) {
    map[p.place] = p.prepared && p.license
      ? { id: p.id, src320: `img/${p.route || route}/${p.id}-320.webp`, src640: `img/${p.route || route}/${p.id}-640.webp`, src1280: `img/${p.route || route}/${p.id}-1280.webp`, srcPrint: `img/${p.route || route}/${p.id}-print.jpg`,
          size: p.w640 || [640, 480], caption: p.caption || null,
          credit: { author: p.author, license: p.license, licenseUrl: p.licenseUrl || null, sourceUrl: p.sourceUrl } }
      : null;
  }
  return map;
}

// Print copies: small JPEGs (Chromium embeds JPEG as-is in a PDF but stores WebP losslessly, which made the PDF 6 MB).
export async function makePrintCopies(photos, siteDir, route = "baguio") {
  let sharp;
  try { sharp = (await import("sharp")).default; } catch { return { made: 0, skipped: "sharp not installed" }; }
  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  let made = 0;
  for (const p of photos?.photos || []) {
    if (!p.prepared || !p.license) continue;
    const src = join(siteDir, "img", p.route || route, `${p.id}-640.webp`);
    if (!existsSync(src)) continue;
    await sharp(src).resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 68, mozjpeg: true }).toFile(join(siteDir, "img", p.route || route, `${p.id}-print.jpg`));
    made++;
  }
  return { made };
}
