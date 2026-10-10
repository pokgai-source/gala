// Route files: validation, timeline resolution and road-sign rules.
import { fillPlaceholders } from "./facts.mjs";

const SERVICES = ["gas", "food", "restroom", "pasalubong"];

export function indexStops(stopsFile) {
  return new Map(stopsFile.stops.map((s) => [s.id, s]));
}

function factIdsOf(route) {
  const c = route.city || {};
  return [
    ...(route.plates || []).map((p) => p.fact),
    ...(route.roadCheck || []),
    ...((route.tollsReceipt || {}).facts || []),
    route.wayNote?.fact,
    c.codingFact, c.zoneFact, ...(c.parkingFacts || []),
    route.weatherFact,
    ...(route.emergencyFacts || []),
  ].filter(Boolean);
}

function stopIdsOf(route) {
  return [...(route.timeline || []).filter((t) => t.stopId).map((t) => t.stopId), ...(route.wayHome || [])];
}

function strings(node, out = []) {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => strings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => strings(n, out));
  return out;
}

export function validateRoute(route, factsById, stopsById) {
  const errors = [];
  const at = `route ${route.id}`;
  for (const id of new Set(factIdsOf(route))) if (!factsById.has(id)) errors.push(`${at}: unknown fact ${id}`);
  for (const id of new Set(stopIdsOf(route))) if (!stopsById.has(id)) errors.push(`${at}: unknown stop ${id}`);
  for (const s of strings(route)) {
    try { fillPlaceholders(s, factsById); } catch (e) { errors.push(`${at}: ${e.message}`); }
  }
  return errors;
}

export function signFor(fact) {
  const d = fact.data || {};
  if ((Array.isArray(d.closed) && d.closed.length) || d.open === false) return "stop";
  if (d.maxTons || (d.oneLaneSections || []).length) return "warn";
  return "go";
}

export function stopItem(s) {
  const km = typeof s.km === "number" ? s.km : null;
  const place = String(s.where || "").replace(/^Km \d+,\s*/, "");
  return {
    kind: "stop",
    id: s.id,
    title: s.name,
    body: s.why,
    note: s.note || null,
    post: km != null ? { km } : { label: String(s.segment || "").split(/[\s–-]/)[0].toUpperCase() },
    services: SERVICES.filter((t) => (s.type || []).includes(t)),
    types: s.type || [],
    status: s.status,
    featured: !!s.featured,
    mapsUrl: s.maps,
    lnglat: s.lnglat || null,
    checked: s.checked,
    source: s.source,
    short: km != null ? `Km ${km}, ${s.name}` : s.name,
    sub: `${s.segment}, ${place}`,
  };
}

export function resolveTimeline(route, stopsById, factsById) {
  return (route.timeline || []).map((t) => {
    if (t.stopId) return stopItem(stopsById.get(t.stopId));
    return {
      kind: "waypoint",
      id: t.waypoint,
      title: fillPlaceholders(t.title, factsById),
      body: fillPlaceholders(t.body || "", factsById),
      post: { label: t.post },
      services: [],
      status: "ok",
      lnglat: t.lnglat || null,
      short: t.short || t.title,
      sub: fillPlaceholders(t.sub || "", factsById),
    };
  });
}

// A copied route file must get its own id, or it would load another route's map line and mislabel errors.
export function routeIdErrors(routes) {
  return Object.entries(routes).filter(([file, r]) => r.id !== file)
    .map(([file, r]) => `route file data/routes/${file}.json has id "${r.id}" (must be "${file}")`);
}
