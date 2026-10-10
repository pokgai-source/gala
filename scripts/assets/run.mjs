// The assets job: everything that needs the internet, run on GitHub (this sandbox can't reach these hosts).
// 1. traces real road lines (OSRM) when waypoints change
// 2. pins stops with an `osm` hint at their real OpenStreetMap station
// 3. saves photo candidates from Wikimedia Commons for review, and prepares chosen photos as small WebP files
// Writes docs/assets-report.md so a person can check what changed.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { traceRoute, waypointHash, findStation } from "./osm.mjs";
import { searchCandidates, fileInfo, download } from "./commons.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const today = new Date().toISOString().slice(0, 10);
const report = [`# Assets report (${today})`, ""];
const log = (s) => { console.log(s); report.push(`- ${s}`); };
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const km = (a, b) => Math.round(Math.hypot((a[0] - b[0]) * 107, (a[1] - b[1]) * 111) * 100) / 100;

// 1. road lines
const routesDir = join(root, "data", "routes");
for (const f of readdirSync(routesDir).filter((f) => f.endsWith(".json") && !f.endsWith(".geo.json"))) {
  const id = f.slice(0, -5), route = readJson(join(routesDir, f)), geoFile = join(routesDir, `${id}.geo.json`);
  const hash = waypointHash(route.map.waypoints);
  if (existsSync(geoFile) && readJson(geoFile).hash === hash) { log(`map ${id}: road line up to date`); continue; }
  try { const geo = await traceRoute(route.map.waypoints); writeJson(geoFile, geo); log(`map ${id}: traced ${geo.coordinates.length} points`); }
  catch (e) { log(`map ${id}: trace failed (${e.message}); keeping the old line`); }
}

// 2. stop pins
for (const f of readdirSync(join(root, "data")).filter((f) => /^stops-.+\.json$/.test(f))) {
  const p = join(root, "data", f), file = readJson(p);
  for (const s of file.stops.filter((s) => s.osm)) {
    if (s.lnglatSource?.startsWith("OpenStreetMap") && s.osmFor === JSON.stringify(s.osm)) continue;
    try {
      const hit = await findStation(s.osm);
      if (hit) {
        s.lnglat = hit.lnglat.map((v) => +v.toFixed(5));
        s.lnglatSource = `OpenStreetMap ${hit.type}/${hit.id}`;
        s.osmFor = JSON.stringify(s.osm);
        log(`pin ${s.id}: ${s.lnglatSource}, ${km(hit.lnglat, s.osm.near)} km from the hint`);
      } else { s.lnglatSource = "approximate"; log(`pin ${s.id}: no ${s.osm.brand} station within ${s.osm.radius} m — kept approximate`); }
    } catch (e) { log(`pin ${s.id}: lookup failed (${e.message})`); }
    await sleep(1500);
  }
  writeJson(p, file);
}

// 3. photos
const photosFile = join(root, "data", "photos.json");
if (existsSync(photosFile)) {
  const photos = readJson(photosFile);
  let sharp = null;
  try { sharp = (await import("sharp")).default; } catch { log("photos: sharp not installed, skipping photo prep"); }
  for (const ph of photos.photos) {
    if (!ph.file) {
      const dir = join(root, "docs", "photo-candidates", ph.id);
      if (existsSync(join(dir, "candidates.json"))) continue;
      try {
        const c = await searchCandidates(ph.query, 6);
        mkdirSync(dir, { recursive: true });
        for (const [i, cand] of c.entries()) writeFileSync(join(dir, `${i + 1}.jpg`), await download(cand.thumb));
        writeJson(join(dir, "candidates.json"), c.map((x, i) => ({ n: i + 1, ...x })));
        log(`photo ${ph.id}: ${c.length} candidates for "${ph.query}"`);
      } catch (e) { log(`photo ${ph.id}: search failed (${e.message})`); }
      await sleep(500);
      continue;
    }
    if (!sharp || ph.prepared === ph.file) continue;
    try {
      const info = await fileInfo(ph.file, 1600);
      const buf = await download(info.thumb);
      const outDir = join(root, "site", "img", ph.route || "baguio");
      mkdirSync(outDir, { recursive: true });
      for (const w of [640, 1280]) {
        await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: w === 640 ? 68 : 72 }).toFile(join(outDir, `${ph.id}-${w}.webp`));
      }
      const meta = await sharp(join(outDir, `${ph.id}-640.webp`)).metadata();
      Object.assign(ph, { author: info.author, license: info.license, licenseUrl: info.licenseUrl, sourceUrl: info.sourceUrl,
        w640: [meta.width, meta.height], checked: today, prepared: ph.file });
      log(`photo ${ph.id}: prepared ${ph.file} (${info.license}, ${info.author})`);
    } catch (e) { log(`photo ${ph.id}: prep failed (${e.message})`); }
    await sleep(500);
  }
  writeJson(photosFile, photos);
}

mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "assets-report.md"), report.join("\n") + "\n");
