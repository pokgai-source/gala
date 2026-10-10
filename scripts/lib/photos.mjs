// Photos from data/photos.json: who took them, their licence, and where the prepared WebP files live.
export function photoErrors(photos) {
  const errors = [];
  for (const p of photos?.photos || []) {
    if (!p.file) continue; // waiting for a pick
    if (!p.prepared) continue; // picked, not prepared yet by the assets job: the page falls back to art
    if (!p.license) errors.push(`photo ${p.id}: missing license`);
    if (!p.author) errors.push(`photo ${p.id}: missing author`);
    if (!p.sourceUrl) errors.push(`photo ${p.id}: missing sourceUrl`);
  }
  return errors;
}

export function photoMap(photos, route = "baguio") {
  const map = {};
  for (const p of photos?.photos || []) {
    map[p.place] = p.prepared && p.license
      ? { id: p.id, src640: `img/${p.route || route}/${p.id}-640.webp`, src1280: `img/${p.route || route}/${p.id}-1280.webp`,
          size: p.w640 || [640, 480], caption: p.caption || null,
          credit: { author: p.author, license: p.license, licenseUrl: p.licenseUrl || null, sourceUrl: p.sourceUrl } }
      : null;
  }
  return map;
}
