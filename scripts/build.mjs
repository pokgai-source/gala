// Build _site/ for GitHub Pages.
// - copies site/ and data/ into _site/
// - validates data files (every fact needs a source URL and checked date)
// - inlines the route's data into pages that contain <!--GALA:DATA route="..."-->
//   so a roadbook is one request on a weak signal. Facts still live only in data/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_site");
const MAX_AGE_DAYS = 45;
const errors = [];
const warnings = [];

const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const daysOld = (iso) => Math.floor((Date.now() - Date.parse(iso + "T00:00:00+08:00")) / 86400000);

function checkSourced(kind, item) {
  const where = `${kind} ${item.id ?? "?"}`;
  if (!item.id) errors.push(`${where}: missing id`);
  if (!item.source?.url) errors.push(`${where}: missing source.url`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.checked ?? "")) errors.push(`${where}: missing or bad checked date`);
  if (!item.status) errors.push(`${where}: missing status`);
  if (item.checked && daysOld(item.checked) > MAX_AGE_DAYS && item.status !== "stale" && item.status !== "closed")
    warnings.push(`${where}: checked ${daysOld(item.checked)} days ago — run gala-fact-check`);
}

const facts = readJson("data/facts.json");
const ids = new Set();
for (const f of facts.facts) {
  if (!f.label || !f.value) errors.push(`fact ${f.id}: missing label or value`);
  if (ids.has(f.id)) errors.push(`fact ${f.id}: duplicate id`);
  ids.add(f.id);
  checkSourced("fact", f);
}
const creators = readJson("data/creators.json");

const routes = {};
for (const file of readdirSync(join(root, "data")).filter((f) => /^stops-.+\.json$/.test(f))) {
  const route = file.slice(6, -5);
  const stops = readJson(join("data", file));
  for (const s of stops.stops) {
    if (!s.maps?.startsWith("https://")) errors.push(`stop ${s.id}: missing maps link`);
    if (typeof s.featured !== "boolean") errors.push(`stop ${s.id}: featured must be true/false`);
    checkSourced("stop", s);
  }
  routes[route] = stops;
}

if (errors.length) {
  console.error("Data errors:\n  " + errors.join("\n  "));
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "site"), out, { recursive: true });
cpSync(join(root, "data"), join(out, "data"), { recursive: true });

const marker = /<!--GALA:DATA route="([a-z0-9-]+)"-->/;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) inline(p);
  }
}
function inline(p) {
  const html = readFileSync(p, "utf8");
  const m = html.match(marker);
  if (!m) return;
  const route = m[1];
  if (!routes[route]) {
    console.error(`${p}: no data/stops-${route}.json`);
    process.exit(1);
  }
  const payload = { builtAt: new Date().toISOString(), maxAgeDays: MAX_AGE_DAYS, facts, stops: routes[route], creators };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  writeFileSync(p, html.replace(marker, `<script id="gala-data" type="application/json">${json}</script>`));
  console.log(`inlined ${route} data → ${p.slice(root.length + 1)}`);
}
walk(out);

if (warnings.length) console.warn("Warnings:\n  " + warnings.join("\n  "));
console.log(`Built _site/ — ${facts.facts.length} facts, ${Object.values(routes).reduce((n, r) => n + r.stops.length, 0)} stops.`);
