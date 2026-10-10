import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "./lib/facts.mjs";
import { buildPayload } from "./lib/payload.mjs";
import { renderPage } from "./lib/render.mjs";
import { copyFonts } from "./lib/fonts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let hasPlaywright = true;
try { await import("playwright"); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";

function tempSite(mutate) {
  const data = structuredClone(loadData(root));
  mutate?.(data);
  const site = mkdtempSync(join(tmpdir(), "gala-qa-"));
  copyFonts(root, join(site, "_design", "fonts"));
  mkdirSync(join(site, "baguio"));
  const html = renderPage({ root, payload: buildPayload(data, "baguio", { root }), fontPrefix: "../_design/fonts/" });
  writeFileSync(join(site, "baguio", "index.html"), html);
  return site;
}

test("the built Baguio roadbook passes every design check", { skip }, async () => {
  const b = spawnSync(process.execPath, [join(root, "scripts/build.mjs"), "--no-qa"], { encoding: "utf8" });
  assert.equal(b.status, 0, b.stderr);
  const { checkDesign } = await import("./qa/check-design.mjs");
  assert.deepEqual(await checkDesign(join(root, "_site"), "baguio"), []);
});

test("very long names still fit a 360px phone", { skip }, async () => {
  const site = tempSite((d) => {
    const s = d.stopsByRoute.baguio.stops.find((x) => x.id === "nlex-caltex-mega");
    s.name = "Caltex Mega Station and Very Long Named Food Court Annex North";
    s.segment = "NLEX–SCTEX–TPLEX interchange approach";
    const c = d.facts.facts.find((f) => f.id === "baguio.road-closures");
    c.label = "Roads closed around Baguio, La Trinidad, Tuba and Itogon municipalities";
    c.data.closed.push("Benguet–Nueva Vizcaya Road (Beckel–Lamtang–Ambiong segment)");
  });
  const { checkDesign } = await import("./qa/check-design.mjs");
  assert.deepEqual(await checkDesign(site, "baguio"), []);
});

test("a status pill is reported as a banned class", { skip }, async () => {
  const site = tempSite();
  const p = join(site, "baguio", "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace("<main", '<span class="pill">Open</span><main'));
  const { checkDesign } = await import("./qa/check-design.mjs");
  const errs = await checkDesign(site, "baguio");
  assert.ok(errs.some((e) => e.includes("banned class")), errs.join("; "));
});

test("screenshots are written for phone and laptop in both themes", { skip }, async () => {
  const site = tempSite();
  const { shots } = await import("./qa/shots.mjs");
  const files = await shots(site, "baguio");
  assert.deepEqual(files.map((f) => f.split("/").pop()).sort(), ["laptop-dark.png", "laptop-light.png", "phone-dark.png", "phone-light.png"]);
});

test("an image without width and height is reported", { skip }, async () => {
  const site = tempSite();
  const p = join(site, "baguio", "index.html");
  writeFileSync(p, readFileSync(p, "utf8").replace("<main", '<img src="x.webp" alt=""><main'));
  const { checkDesign } = await import("./qa/check-design.mjs");
  const errs = await checkDesign(site, "baguio");
  assert.ok(errs.some((e) => e.includes("image without width/height")), errs.join("; "));
});
