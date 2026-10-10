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

// Traces the real road with OSRM. `trace` = { from, to, via: [] }; with no via points OSRM picks the real fastest
// road on its own, so the line can't detour through a hand-placed point that sits off the expressway.
export async function traceRoute(trace) {
  const pts = [trace.from, ...(trace.via || []), trace.to];
  const url = `https://router.project-osrm.org/route/v1/driving/${pts.map((c) => c.join(",")).join(";")}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const r = (await res.json()).routes?.[0];
  let coords = r?.geometry?.coordinates;
  if (!coords?.length) throw new Error("OSRM returned no route");
  const keep = Math.ceil(coords.length / 600);
  coords = coords.filter((_, i) => i % keep === 0 || i === coords.length - 1).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
  return { type: "LineString", source: "OSRM / OpenStreetMap contributors", hash: waypointHash(trace),
    roads: r.legs.map((l) => l.summary).join(" | "), km: Math.round(r.distance / 1000), minutes: Math.round(r.duration / 60),
    traced: new Date().toISOString().slice(0, 10), coordinates: coords };
}
