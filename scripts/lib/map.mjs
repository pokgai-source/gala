// Route maps: Natural Earth coastline + route line projected to SVG at build time.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const f1 = (n) => n.toFixed(1);

export function makeProjection(bbox, width) {
  const [w, s, e, n] = bbox;
  const k = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const height = Math.round((width * (n - s)) / ((e - w) * k));
  const project = ([lng, lat]) => [((lng - w) / (e - w)) * width, ((n - lat) / (n - s)) * height];
  return { project, width, height, viewBox: `0 0 ${width} ${height}` };
}

export function linePath(coords, proj) {
  return "M" + coords.map((c) => proj.project(c).map(f1).join(" ")).join("L");
}

let topoCache;
export function coastPath(bbox, proj, country = "Philippines") {
  topoCache ??= JSON.parse(readFileSync(require.resolve("world-atlas/countries-10m.json"), "utf8"));
  const fc = feature(topoCache, topoCache.objects.countries);
  const geom = fc.features.find((f) => f.properties.name === country).geometry;
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  const [w, s, e, n] = bbox;
  const inside = ([x, y]) => x > w - 1 && x < e + 1 && y > s - 1 && y < n + 1;
  let d = "";
  for (const poly of polys) for (const ring of poly) {
    if (!ring.some(inside)) continue;
    d += linePath(ring, proj) + "Z";
  }
  return d;
}

function mountainsPath(points, proj) {
  return points.map((c) => {
    const [x, y] = proj.project(c);
    return `M${f1(x - 8)} ${f1(y + 7)}l8 -14l8 14z`;
  }).join(" ");
}

export function buildMap(route, stopsById, root) {
  const m = route.map;
  const proj = makeProjection(m.bbox, m.width);
  const geoFile = join(root, "data", "routes", `${route.id}.geo.json`);
  let coords = m.waypoints, traced = false;
  if (existsSync(geoFile)) {
    const g = JSON.parse(readFileSync(geoFile, "utf8"));
    coords = g.type === "Feature" ? g.geometry.coordinates : g.coordinates;
    traced = true;
  }
  const pt = (c) => proj.project(c).map((v) => Math.round(v * 10) / 10);
  const stops = {};
  for (const [id, s] of stopsById) if (s.lnglat) stops[id] = pt(s.lnglat);
  for (const t of route.timeline || []) if (t.waypoint && t.lnglat) stops[t.waypoint] = pt(t.lnglat);
  return {
    viewBox: proj.viewBox,
    coast: coastPath(m.bbox, proj),
    line: linePath(coords, proj),
    mountains: mountainsPath(m.mountains || [], proj),
    stops,
    labels: (m.labels || []).map((l) => { const [x, y] = pt(l.at); return { text: l.text, kind: l.kind, x: x + (l.dx || 0), y: y + (l.dy ?? (l.kind === "town" ? 4 : 0)) }; }),
    traced,
  };
}
