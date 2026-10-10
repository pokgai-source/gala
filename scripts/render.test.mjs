import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "./lib/facts.mjs";
import { buildPayload } from "./lib/payload.mjs";
import { renderPage } from "./lib/render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadData(root);
const NOW = new Date("2026-10-10T12:00:00+08:00");
const P = buildPayload(data, "baguio", { root, now: NOW });

test("plates carry filled values from facts", () => {
  assert.equal(P.plates[0].value, "₱981");
  assert.equal(P.plates[0].checked, "2026-10-10");
  assert.equal(P.plates[3].kind, "coding-today");
  assert.deepEqual(P.plates[3].byDay.Mon, [1, 2]);
});
test("road check signs come from fact data", () => {
  assert.deepEqual(P.roadCheck.map((r) => r.sign), ["warn", "go", "stop"]);
  assert.equal(P.roadCheck[0].tons, 5);
});
test("a closed must-see stays in the city list with closed status", () => {
  const pma = P.city.places.find((p) => p.id === "baguio-pma");
  assert.ok(pma, "PMA listed");
  assert.equal(pma.status, "closed");
});
test("facts with status stale are flagged", () => {
  assert.equal(P.city.parking.find((f) => f.id === "baguio.parking").stale, true);
});
test("facts older than 45 days are flagged stale", () => {
  const later = buildPayload(data, "baguio", { root, now: new Date("2026-11-30T12:00:00+08:00") });
  assert.equal(later.plates[0].stale, true);
  assert.equal(P.plates[0].stale, false);
});
test("no placeholder survives into the payload", () => {
  assert.ok(!/\{[a-z0-9.-]+:[A-Za-z]/.test(JSON.stringify(P)));
});
test("the stamp date is the newest checked date", () => {
  assert.equal(P.latestChecked, "2026-10-10");
});

const html = renderPage({ root, payload: P, fontPrefix: "../_design/fonts/" });
test("the rendered page inlines parseable data", () => {
  const m = html.match(/<script id="gala-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m);
  assert.equal(JSON.parse(m[1]).routeId, "baguio");
});
test("the rendered page has the route title and no banned markup", () => {
  assert.ok(html.includes("<title>Manila to Baguio, GALA Roadbook</title>"));
  assert.ok(!/class="[^"]*\b(pill|chip|badge)\b/.test(html));
  assert.ok(!/\.(pill|chip|badge)\b/.test(html));
  assert.ok(!html.includes("→</a>"));
});
test("renderPage throws when a slot is missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "gala-tpl-"));
  const tpl = readFileSync(join(root, "site/_design/roadbook.html"), "utf8").replace("<!--GALA:JS-->", "");
  writeFileSync(join(dir, "t.html"), tpl);
  assert.throws(() => renderPage({ root, payload: P, fontPrefix: "", templateFile: join(dir, "t.html") }), /slot GALA:JS/);
});
test("stop and plate notes are not overwritten by stale metadata", () => {
  assert.equal(P.plates[0].note, "Class 1 car");
  assert.match(P.city.places.find((p) => p.id === "baguio-pma").note, /not passable/i);
});
