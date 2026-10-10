// Build _site/ for GitHub Pages.
// - validates data (every fact and stop needs a source URL and checked date; route files must name real facts/stops)
// - renders one roadbook per data/routes/<route>.json from the shared template in site/_design/
// - copies self-hosted fonts and the data files
// Usage: node scripts/build.mjs [--no-qa]
import { writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, indexFacts, daysOld } from "./lib/facts.mjs";
import { validateRoute, indexStops } from "./lib/route.mjs";
import { buildPayload, MAX_AGE_DAYS } from "./lib/payload.mjs";
import { renderPage } from "./lib/render.mjs";
import { copyFonts } from "./lib/fonts.mjs";
import { themeErrors } from "./lib/theme.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_site");
const args = new Set(process.argv.slice(2));
const errors = [];
const warnings = [];

const data = loadData(root, { hotelsDir: process.env.GALA_HOTELS_DIR && join(root, process.env.GALA_HOTELS_DIR) });

function checkSourced(kind, item) {
  const where = `${kind} ${item.id ?? "?"}`;
  if (!item.id) errors.push(`${where}: missing id`);
  if (!item.source?.url) errors.push(`${where}: missing source.url`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.checked ?? "")) errors.push(`${where}: missing or bad checked date`);
  if (!item.status) errors.push(`${where}: missing status`);
  if (item.checked && daysOld(item.checked) > MAX_AGE_DAYS && item.status !== "stale" && item.status !== "closed")
    warnings.push(`${where}: checked ${daysOld(item.checked)} days ago — run gala-fact-check`);
}

const ids = new Set();
for (const f of data.facts.facts) {
  if (!f.label || !f.value) errors.push(`fact ${f.id}: missing label or value`);
  if (ids.has(f.id)) errors.push(`fact ${f.id}: duplicate id`);
  ids.add(f.id);
  checkSourced("fact", f);
}
for (const stops of Object.values(data.stopsByRoute)) for (const s of stops.stops) {
  if (!s.maps?.startsWith("https://")) errors.push(`stop ${s.id}: missing maps link`);
  if (typeof s.featured !== "boolean") errors.push(`stop ${s.id}: featured must be true/false`);
  checkSourced("stop", s);
}
const F = indexFacts(data.facts);
for (const [id, route] of Object.entries(data.routes)) {
  if (!data.stopsByRoute[id]) { errors.push(`route ${id}: no data/stops-${id}.json`); continue; }
  errors.push(...validateRoute(route, F, indexStops(data.stopsByRoute[id])));
}

for (const h of data.hotels) {
  if (!data.routes[h.route]) errors.push(`hotel ${h.slug}: unknown route ${h.route}`);
  errors.push(...themeErrors(h));
}

if (errors.length) {
  console.error("Data errors:\n  " + errors.join("\n  "));
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "site"), out, { recursive: true, filter: (src) => !src.includes(`${join("site", "_design")}`) });
cpSync(join(root, "data"), join(out, "data"), { recursive: true });
copyFonts(root, join(out, "_design", "fonts"));

for (const routeId of Object.keys(data.routes)) {
  const payload = buildPayload(data, routeId, { root });
  if (!payload.map.traced) warnings.push(`map ${routeId}: using waypoints (run node scripts/trace-route.mjs ${routeId})`);
  mkdirSync(join(out, routeId), { recursive: true });
  writeFileSync(join(out, routeId, "index.html"), renderPage({ root, payload, fontPrefix: "../_design/fonts/" }));
  console.log(`built ${routeId} → _site/${routeId}/index.html`);
}

for (const h of data.hotels) {
  const theme = { ...h.theme, name: h.name, logo: h.logo || null, contact: h.contact || null };
  const payload = { ...buildPayload(data, h.route, { root, theme }), pdfHref: `../${h.route}-roadbook.pdf` };
  mkdirSync(join(out, h.route, h.slug), { recursive: true });
  writeFileSync(join(out, h.route, h.slug, "index.html"), renderPage({ root, payload, fontPrefix: "../../_design/fonts/" }));
  console.log(`built ${h.route}/${h.slug} → _site/${h.route}/${h.slug}/index.html`);
}

if (warnings.length) console.warn("Warnings:\n  " + warnings.join("\n  "));
console.log(`Built _site/ — ${data.facts.facts.length} facts, ${Object.keys(data.routes).length} roadbook(s).`);
