// OpenStreetMap: real road lines (OSRM) and real stop pins (Overpass).
import { createHash } from "node:crypto";
import { UA } from "./commons.mjs";

export function waypointHash(waypoints) {
  return createHash("sha1").update(JSON.stringify(waypoints)).digest("hex").slice(0, 12);
}

export function overpassQuery({ brand, near, radius = 1500 }) {
  const [lng, lat] = near;
  const re = brand.replace(/[^A-Za-z0-9 &.-]/g, "");
  return `[out:json][timeout:25];(nwr["amenity"="fuel"]["brand"~"${re}",i](around:${radius},${lat},${lng});nwr["amenity"="fuel"]["name"~"${re}",i](around:${radius},${lat},${lng}););out center;`;
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

export async function findStation(hint) {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(overpassQuery(hint)),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return nearest((await res.json()).elements, hint.near);
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
