// Tests for the final-review fixes (Important 1-7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "./lib/facts.mjs";
import { buildPayload } from "./lib/payload.mjs";
import { renderPage } from "./lib/render.mjs";
import { copyFonts } from "./lib/fonts.mjs";
import { validateRoute, indexStops, routeIdErrors } from "./lib/route.mjs";
import { indexFacts } from "./lib/facts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let hasPlaywright = true;
try { await import("playwright"); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";

function site({ mutateData, mutatePayload, theme } = {}) {
  const data = structuredClone(loadData(root));
  mutateData?.(data);
  const dir = mkdtempSync(join(tmpdir(), "gala-fix-"));
  copyFonts(root, join(dir, "_design", "fonts"));
  mkdirSync(join(dir, "baguio"));
  const payload = buildPayload(data, "baguio", { root, theme });
  mutatePayload?.(payload);
  writeFileSync(join(dir, "baguio", "index.html"), renderPage({ root, payload, fontPrefix: "../_design/fonts/" }));
  return dir;
}
async function pageText(dir, selector = "body") {
  const { launch } = await import("./qa/browser.mjs");
  const b = await launch();
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 900 } });
    const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(pathToFileURL(join(dir, "baguio", "index.html")).href, { waitUntil: "load" });
    return { text: await p.evaluate((sel) => document.querySelector(sel).innerText, selector), errs };
  } finally { await b.close(); }
}

// Important 1
test("a fact that goes stale after the build is flagged on the phone", { skip }, async () => {
  const dir = site({ mutatePayload: (P) => { P.plates[1].checked = "2026-01-02"; P.plates[1].stale = false; } });
  const { text } = await pageText(dir, '.plate[data-fact="route.drive-time"]');
  assert.match(text, /Needs re-check/);
});

// Important 2
test("a route without coding, tolls receipt, way note or weather still builds and renders", { skip }, async () => {
  const strip = (d) => {
    const r = d.routes.baguio;
    delete r.tollsReceipt; delete r.wayNote; delete r.weatherFact; delete r.city;
    r.plates = r.plates.filter((p) => p.kind !== "coding-today");
  };
  const data = structuredClone(loadData(root)); strip(data);
  assert.deepEqual(validateRoute(data.routes.baguio, indexFacts(data.facts), indexStops(data.stopsByRoute.baguio)), []);
  const dir = site({ mutateData: strip });
  const { errs } = await pageText(dir);
  assert.deepEqual(errs, []);
  const { checkDesign } = await import("./qa/check-design.mjs");
  assert.deepEqual(await checkDesign(dir, "baguio"), []);
});

// Important 3
test("a route file whose id doesn't match its file name is rejected", () => {
  assert.deepEqual(routeIdErrors({ "la-union": { id: "baguio" }, baguio: { id: "baguio" } }),
    ["route file data/routes/la-union.json has id \"baguio\" (must be \"la-union\")"]);
});

// Important 4
test("the shared template has no Baguio-only text or hard-coded facts", () => {
  const js = readFileSync(join(root, "site/_design/roadbook.js"), "utf8");
  const pr = readFileSync(join(root, "site/_design/print.html"), "utf8");
  for (const [name, src] of [["roadbook.js", js], ["print.html", pr]]) {
    for (const bad of ["135000", "Jacket or hoodie", "Closed shoes", "7am", "Weekends are coding-free", "No coding on weekends"]) {
      assert.ok(!src.includes(bad), `${name} contains "${bad}"`);
    }
  }
});

// Important 5
test("the footer disclosure tells the truth when a stop is Featured", { skip }, async () => {
  const dir = site({ mutateData: (d) => { d.stopsByRoute.baguio.stops.find((s) => s.id === "nlex-caltex-mega").featured = true; } });
  const { text } = await pageText(dir);
  assert.ok(!text.includes("Nothing here is featured yet"));
  assert.match(text, /Places marked Featured are paid placements/);
});

// Important 6
test("a partner logo is copied next to the partner page, and a missing logo fails the build", () => {
  const hotels = mkdtempSync(join(tmpdir(), "gala-hotels-"));
  mkdirSync(join(hotels, "img"));
  writeFileSync(join(hotels, "img", "pine-inn.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  const base = { route: "baguio", theme: { brand: "#1D3352", brand2: "#2E4C74", accent: "#F28C6B", onAccent: "#2A0F06" }, source: "test", checked: "2026-10-10" };
  writeFileSync(join(hotels, "pine-inn.json"), JSON.stringify({ ...base, name: "Pine Inn", logo: "img/pine-inn.svg" }));
  let r = spawnSync(process.execPath, [join(root, "scripts/build.mjs"), "--no-qa"], { env: { ...process.env, GALA_HOTELS_DIR: hotels }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(root, "_site/baguio/pine-inn/pine-inn.svg")));
  assert.ok(readFileSync(join(root, "_site/baguio/pine-inn/index.html"), "utf8").includes('"logo":"pine-inn.svg"'));
  writeFileSync(join(hotels, "pine-inn.json"), JSON.stringify({ ...base, name: "Pine Inn", logo: "img/missing.png" }));
  r = spawnSync(process.execPath, [join(root, "scripts/build.mjs"), "--no-qa"], { env: { ...process.env, GALA_HOTELS_DIR: hotels }, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /hotel pine-inn: logo img\/missing\.png not found/);
});

// Important 7
test("a long partner name doesn't run into the fact-check stamp", { skip }, async () => {
  const dir = site({ theme: { brand: "#1D3352", brand2: "#2E4C74", accent: "#F28C6B", onAccent: "#2A0F06", name: "Casa de los Pinos Mountain View Transient House and Café" } });
  const { checkDesign } = await import("./qa/check-design.mjs");
  assert.deepEqual(await checkDesign(dir, "baguio"), []);
});
