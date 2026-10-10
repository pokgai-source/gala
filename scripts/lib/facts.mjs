// Data loading and fact helpers shared by the build and tests.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function loadData(root, { hotelsDir } = {}) {
  const dataDir = join(root, "data");
  const facts = readJson(join(dataDir, "facts.json"));
  const creators = readJson(join(dataDir, "creators.json"));
  const stopsByRoute = {};
  for (const f of readdirSync(dataDir).filter((f) => /^stops-.+\.json$/.test(f))) {
    stopsByRoute[f.slice(6, -5)] = readJson(join(dataDir, f));
  }
  const routes = {};
  const routesDir = join(dataDir, "routes");
  if (existsSync(routesDir)) {
    for (const f of readdirSync(routesDir).filter((f) => f.endsWith(".json") && !f.endsWith(".geo.json"))) {
      routes[f.slice(0, -5)] = readJson(join(routesDir, f));
    }
  }
  const hDir = hotelsDir || join(dataDir, "hotels");
  const hotels = existsSync(hDir)
    ? readdirSync(hDir).filter((f) => f.endsWith(".json")).map((f) => ({ slug: f.slice(0, -5), ...readJson(join(hDir, f)) }))
    : [];
  const photosFile = join(dataDir, "photos.json");
  const photos = existsSync(photosFile) ? readJson(photosFile) : { photos: [] };
  return { facts, creators, stopsByRoute, routes, hotels, photos };
}

export function indexFacts(facts) {
  return new Map(facts.facts.map((f) => [f.id, f]));
}

export function getPath(obj, dotPath) {
  let cur = obj;
  for (const k of dotPath.split(".")) {
    if (cur == null || !(k in Object(cur))) throw new Error(`Unknown path ${dotPath}`);
    cur = cur[k];
  }
  return cur;
}

export function formatPeso(n) {
  return "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

const FILTERS = { peso: formatPeso, plain: (v) => String(v) };

// {factId:dot.path|filter}  e.g. {rfid:data.easytripMin|peso}
export function fillPlaceholders(text, factsById) {
  return String(text).replace(/\{([a-z0-9.-]+):([A-Za-z0-9_.]+)(?:\|([a-z]+))?\}/g, (_, id, path, filter) => {
    const fact = factsById.get(id);
    if (!fact) throw new Error(`Unknown fact ${id}`);
    let v;
    try { v = getPath(fact, path); } catch { throw new Error(`Unknown path ${path} in ${id}`); }
    const fn = FILTERS[filter || "plain"];
    if (!fn) throw new Error(`Unknown filter ${filter} in ${id}`);
    return fn(v);
  });
}

export function latestChecked(items) {
  return items.map((i) => i.checked).filter(Boolean).sort().pop();
}

export function daysOld(iso, now = new Date()) {
  return Math.floor((now.getTime() - Date.parse(iso + "T00:00:00+08:00")) / DAY);
}

export function isStale(checked, now = new Date(), maxAgeDays = 45) {
  return daysOld(checked, now) > maxAgeDays;
}

export function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// The short line is what people see; flag any number in it that the fact's value and data no longer contain.
// Rounding is fine ("1.59M" for 1,586,890; "73%" for 72.92%).
export function shortDriftWarnings(facts) {
  const out = [];
  const nums = (t) => (String(t).replace(/(\d),(?=\d{3})/g, "$1").match(/\d+(?:\.\d+)?/g) || []).map(Number);
  for (const f of facts.facts || []) {
    if (!f.short) continue;
    const hay = [...nums(f.value), ...nums(JSON.stringify(f.data || {}))];
    const shown = String(f.short).replace(/(\d),(?=\d{3})/g, "$1").matchAll(/(\d+(?:\.(\d+))?)\s*([MK])?/g);
    for (const m of shown) {
      const mult = m[3] === "M" ? 1e6 : m[3] === "K" ? 1e3 : 1, n = Number(m[1]) * mult;
      const tol = 0.5 * 10 ** -(m[2] ? m[2].length : 0) * mult;
      if (!hay.some((h) => Math.abs(h - n) <= tol)) { out.push(`fact ${f.id}: short line has ${m[1]}, which is not in the value or data — rewrite "short"`); break; }
    }
  }
  return out;
}
