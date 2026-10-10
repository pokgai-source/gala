// One-off: trace the real road line for a route through its waypoints (OSRM demo server),
// simplify it, and save data/routes/<route>.geo.json. Run once per route; the file is committed.
// Usage: node scripts/trace-route.mjs baguio
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id) { console.error("usage: node scripts/trace-route.mjs <route>"); process.exit(2); }
const route = JSON.parse(readFileSync(join(root, "data", "routes", `${id}.json`), "utf8"));
const wps = route.map.waypoints;
// OSRM accepts up to ~100 points; take a spread of waypoints so the line follows the expressways.
const step = Math.max(1, Math.ceil(wps.length / 24));
const via = wps.filter((_, i) => i % step === 0 || i === wps.length - 1);
const url = `https://router.project-osrm.org/route/v1/driving/${via.map((c) => c.join(",")).join(";")}?overview=full&geometries=geojson`;
const res = await fetch(url, { headers: { "User-Agent": "GALA roadbook builder (github.com/pokgai-source/gala)" } });
if (!res.ok) { console.error(`OSRM ${res.status}`); process.exit(1); }
const body = await res.json();
let coords = body.routes?.[0]?.geometry?.coordinates;
if (!coords?.length) { console.error("OSRM returned no route"); process.exit(1); }
const keep = Math.ceil(coords.length / 400);
coords = coords.filter((_, i) => i % keep === 0 || i === coords.length - 1).map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
writeFileSync(join(root, "data", "routes", `${id}.geo.json`),
  JSON.stringify({ type: "LineString", source: "OSRM / OpenStreetMap contributors", traced: new Date().toISOString().slice(0, 10), coordinates: coords }) + "\n");
console.log(`traced ${id}: ${coords.length} points`);
