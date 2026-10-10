import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData, indexFacts } from "./lib/facts.mjs";
import { validateRoute, resolveTimeline, signFor, indexStops } from "./lib/route.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const data = loadData(join(here, ".."));
const F = indexFacts(data.facts);
const S = indexStops(data.stopsByRoute.baguio);
const route = data.routes.baguio;

test("the Baguio route file is valid", () => {
  assert.deepEqual(validateRoute(route, F, S), []);
});
test("a route naming a missing fact and stop fails with both named", () => {
  const bad = JSON.parse(readFileSync(join(here, "fixtures/route-bad.json"), "utf8"));
  assert.deepEqual(validateRoute(bad, F, S).sort(), [
    "route bad: unknown fact kennon.statuz",
    "route bad: unknown stop nlex-x",
  ]);
});
test("signFor reads road status from fact data", () => {
  assert.equal(signFor(F.get("kennon.status")), "warn");
  assert.equal(signFor(F.get("marcos.status")), "go");
  assert.equal(signFor(F.get("baguio.road-closures")), "stop");
  assert.equal(signFor({ data: { open: false } }), "stop");
});
test("timeline stop with km gets a km post and service icons", () => {
  const t = resolveTimeline(route, S, F).find((i) => i.id === "nlex-caltex-mega");
  assert.equal(t.kind, "stop");
  assert.equal(t.post.km, 55);
  assert.deepEqual(t.services, ["gas", "food", "restroom"]);
  assert.equal(t.status, "check");
});
test("timeline stop without km uses the road name as its post", () => {
  const t = resolveTimeline(route, S, F).find((i) => i.id === "tplex-ptt-victoria");
  assert.equal(t.post.label, "TPLEX");
  assert.ok(t.services.includes("pasalubong"));
});
test("must-see is never a service icon", () => {
  for (const t of resolveTimeline(route, S, F)) assert.ok(!t.services.includes("must-see"));
});
test("waypoint text has placeholders filled", () => {
  const t = resolveTimeline(route, S, F);
  assert.equal(t[0].kind, "waypoint");
  assert.ok(!/\{[a-z0-9.-]+:/.test(JSON.stringify(t)));
});
