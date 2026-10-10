// One-off: trace the real road line for a route (normally done by the GitHub assets job).
// Usage: node scripts/trace-route.mjs baguio
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { traceRoute } from "./assets/osm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id) { console.error("usage: node scripts/trace-route.mjs <route>"); process.exit(2); }
const route = JSON.parse(readFileSync(join(root, "data", "routes", `${id}.json`), "utf8"));
const geo = await traceRoute(route.map.waypoints);
writeFileSync(join(root, "data", "routes", `${id}.geo.json`), JSON.stringify(geo) + "\n");
console.log(`traced ${id}: ${geo.coordinates.length} points`);
