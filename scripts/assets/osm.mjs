// OpenStreetMap: real road lines (OSRM) and real stop pins (Overpass).
import { createHash } from "node:crypto";
import { UA } from "./commons.mjs";

export function waypointHash(waypoints) {
  return createHash("sha1").update(JSON.stringify(waypoints)).digest("hex").slice(0, 12);
}

export function overpassQuery({ brand, near, radius = 1500 }) {
  const [lng, lat] = near;
  const re = brand.replace(/[^A-Za-z0-9 &.-]/g, "");
  return `[out:json][timeout:25];(nwr["amenity"="fuel"]["brand"~"${re}",i](around:${radius},${lat},${lng});nwr["amenity"="fuel"]["name"~"${re}",i](around:${radius},${lat},${lng}););out center tags;`;
}

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

export function nearest(elements, near) {
  let best = null, bd = Infinity;
  for (const e of elements || []) {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null) continue;
    const d = dist2([lon, lat], near);
    if (d < bd) { bd = d; best = { id: e.id, type: e.type, lnglat: [lon, lat] }; }
  }
  return best;
}

const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
export async function overpass(q) {
  let last;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(url, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
      if (res.ok) return (await res.json()).elements || [];
      last = new Error(`Overpass ${res.status} at ${url}`);
    } catch (e) { last = e; }
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  throw last;
}
export async function findStation(hint) {
  return nearest(await overpass(overpassQuery(hint)), hint.near);
}
export async function brandStations(hint) {
  // The tag-regex query returned nothing on Overpass, while the plain fuel query works; filter by brand here.
  const want = new RegExp(hint.brand.replace(/[^A-Za-z0-9 ]/g, ""), "i");
  const all = await listStations(hint.near, hint.searchRadius || 8000);
  return all.filter((s) => want.test(s.brand) || want.test(s.name));
}

export async function traceRoute(waypoints) {
  const step = Math.max(1, Math.ceil(waypoints.length / 24));
  const via = waypoints.filter((_, i) => i % step === 0 || i === waypoints.length - 1);
  const url = `https://router.project-osrm.org/route/v1/driving/${via.map((c) => c.join(",")).join(";")}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  let coords = (await res.json()).routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error("OSRM returned no route");
  const keep = Math.ceil(coords.length / 500);
  coords = coords.filter((_, i) => i % keep === 0 || i === coords.length - 1).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
  return { type: "LineString", source: "OSRM / OpenStreetMap contributors", hash: waypointHash(waypoints),
    traced: new Date().toISOString().slice(0, 10), coordinates: coords };
}

// Every fuel station near a point, for the report when a brand lookup finds nothing.
export async function listStations(near, radius) {
  const [lng, lat] = near;
  const q = `[out:json][timeout:25];nwr["amenity"="fuel"](around:${radius},${lat},${lng});out center tags;`;
  return (await overpass(q)).map((e) => ({ id: `${e.type}/${e.id}`, name: e.tags?.name || "", brand: e.tags?.brand || "",
    lnglat: [e.lon ?? e.center?.lon, e.lat ?? e.center?.lat] }));
}

// Expressway stops sit right beside the road. Keep brand stations within maxOff metres of the route line
// (on the given side when asked: "right" = northbound side when the line runs Manila → north), nearest to the hint.
const M_LAT = 110540, mLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
function offset(p, line) {
  let best = { d: Infinity, side: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const [a, b] = [line[i], line[i + 1]], k = mLng(p[1]);
    const ax = a[0] * k, ay = a[1] * M_LAT, bx = b[0] * k, by = b[1] * M_LAT, px = p[0] * k, py = p[1] * M_LAT;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx, cy = ay + t * dy, d = Math.hypot(px - cx, py - cy);
    if (d < best.d) best = { d, side: Math.sign(dx * (py - ay) - dy * (px - ax)) }; // >0 left, <0 right
  }
  return best;
}
export function pickOnRoute(stations, line, near, { maxOff = 150, side } = {}) {
  const want = side === "right" ? -1 : side === "left" ? 1 : 0;
  const ok = stations.filter((s) => s.lnglat?.[0] != null).map((s) => ({ s, o: offset(s.lnglat, line) }))
    .filter(({ o }) => o.d <= maxOff && (!want || o.side === want));
  ok.sort((x, y) => Math.hypot(x.s.lnglat[0] - near[0], x.s.lnglat[1] - near[1]) - Math.hypot(y.s.lnglat[0] - near[0], y.s.lnglat[1] - near[1]));
  return ok[0]?.s || null;
}
