import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "./lib/facts.mjs";
import { indexStops } from "./lib/route.mjs";
import { makeProjection, linePath, coastPath, buildMap } from "./lib/map.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BBOX = [119.75, 14.35, 121.45, 16.75];
const near = (a, b, tol = 0.2) => Math.abs(a - b) <= tol;

test("projection keeps the approved preview's frame", () => {
  const p = makeProjection(BBOX, 340);
  assert.equal(p.height, 498);
  assert.equal(p.viewBox, "0 0 340 498");
  const [x1, y1] = p.project([121.0, 14.657]);
  assert.ok(near(x1, 250.0) && near(y1, 434.3), `${x1},${y1}`);
  const [x2, y2] = p.project([120.6, 16.41]);
  assert.ok(near(x2, 170.0) && near(y2, 70.5), `${x2},${y2}`);
});
test("linePath starts at the first projected point", () => {
  const p = makeProjection(BBOX, 340);
  assert.ok(linePath([[121, 14.657], [120.6, 16.41]], p).startsWith("M250.0 434.3L"));
});
test("coastPath draws Luzon's coastline", () => {
  const d = coastPath(BBOX, makeProjection(BBOX, 340));
  assert.ok(d.startsWith("M") && d.length > 10000, String(d.length));
});
test("buildMap falls back to waypoints and places every stop with coordinates", () => {
  const data = loadData(root);
  const stops = indexStops(data.stopsByRoute.baguio);
  const route = { ...data.routes.baguio, id: "no-geo-fixture" };
  const m = buildMap(route, stops, root);
  assert.equal(m.traced, false);
  for (const s of data.stopsByRoute.baguio.stops.filter((s) => s.lnglat)) assert.ok(m.stops[s.id], s.id);
  assert.ok(m.stops.start && m.stops.end);
  assert.ok(m.labels.find((l) => l.text === "Baguio"));
});
