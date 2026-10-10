// Turns data files into the one JSON payload a roadbook page renders from.
import { indexFacts, fillPlaceholders, latestChecked, isStale } from "./facts.mjs";
import { indexStops, resolveTimeline, stopItem, signFor } from "./route.mjs";
import { buildMap } from "./map.mjs";

export const MAX_AGE_DAYS = 45;

function deepFill(node, F) {
  if (typeof node === "string") return fillPlaceholders(node, F);
  if (Array.isArray(node)) return node.map((n) => deepFill(n, F));
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deepFill(v, F)]));
  return node;
}

export function buildPayload(data, routeId, { root, now = new Date(), theme = null } = {}) {
  const route = deepFill(data.routes[routeId], indexFacts(data.facts));
  const F = indexFacts(data.facts);
  const stopsFile = data.stopsByRoute[routeId];
  const S = indexStops(stopsFile);
  const stale = (item) => item.status === "stale" || (item.status !== "closed" && isStale(item.checked, now, MAX_AGE_DAYS));
  const meta = (item) => ({ checked: item.checked, source: item.source, stale: stale(item), staleText: stale(item) ? item.note || null : null });
  const fact = (id) => { const f = F.get(id); return { id, label: f.label, value: f.value, data: f.data || {}, ...meta(f) }; };
  const stop = (s) => ({ ...stopItem(s), ...meta(s) });

  const plates = route.plates.map((p) => {
    const f = F.get(p.fact);
    if (p.kind === "coding-today") return { kind: "coding-today", label: p.label, factId: p.fact, byDay: f.data.byDay, hours: f.data.hours, ...meta(f) };
    return { kind: "fact", label: p.label, value: p.value, note: p.note || "", style: p.style || "", factId: p.fact, ...meta(f) };
  });

  const roadCheck = route.roadCheck.map((id) => {
    const f = F.get(id), sign = signFor(f);
    const state = sign === "stop" ? "Not passable" : sign === "warn" ? (f.data.maxTons ? `Open to light vehicles, max ${f.data.maxTons} tons` : "Open, with one-lane sections") : "Passable";
    return { ...fact(id), sign, tons: f.data.maxTons || null, state };
  });

  const timeline = resolveTimeline(route, S, F).map((t) => (t.kind === "stop" ? { ...t, ...meta(S.get(t.id)) } : t));
  const c = route.city || null;
  const cityRe = new RegExp((c && c.cityMatch) || "^$");
  const places = stopsFile.stops
    .filter((s) => cityRe.test(s.segment) && s.type.some((t) => t === "must-see" || t === "pasalubong"))
    .map(stop);

  const allChecked = [...data.facts.facts, ...stopsFile.stops];
  const routeStopIds = new Set([...timeline.map((t) => t.id), ...(route.wayHome || []), ...places.map((p) => p.id)]);
  const anyFeatured = stopsFile.stops.some((s) => s.featured && routeStopIds.has(s.id));
  return {
    builtAt: now.toISOString(),
    maxAgeDays: MAX_AGE_DAYS,
    routeId,
    latestChecked: latestChecked(allChecked),
    route: { title: route.title, tagline: route.tagline, polaroids: route.polaroids, routeStrip: route.routeStrip },
    plates,
    roadCheck,
    receipt: route.tollsReceipt ? { ...route.tollsReceipt, facts: route.tollsReceipt.facts.map(fact) } : null,
    wayNote: route.wayNote ? { text: route.wayNote.text, ...meta(F.get(route.wayNote.fact)) } : null,
    timeline,
    wayHome: (route.wayHome || []).map((id) => stop(S.get(id))),
    map: buildMap(data.routes[routeId], S, root),
    city: c ? {
      coding: c.codingFact ? fact(c.codingFact) : null,
      zone: c.zoneFact ? fact(c.zoneFact) : null,
      parking: (c.parkingFacts || []).map(fact),
      note: c.note || "",
      places,
    } : null,
    weather: route.weatherFact ? fact(route.weatherFact) : null,
    emergency: (route.emergencyFacts || []).map(fact),
    missingEmergency: (data.facts.missing || []).filter((m) => /^emergency\./.test(m.id)).map((m) => m.what),
    morningCheck: route.morningCheck || [],
    pack: route.pack || [],
    creators: data.creators.creators || [],
    theme,
    anyFeatured,
    pdfHref: `${routeId}-roadbook.pdf`,
  };
}
