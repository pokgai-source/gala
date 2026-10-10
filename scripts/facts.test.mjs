import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData, indexFacts, fillPlaceholders, formatPeso, latestChecked, isStale, fmtDate, getPath } from "./lib/facts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadData(root);
const F = indexFacts(data.facts);

test("fillPlaceholders fills a fact path with the peso filter", () => {
  assert.equal(fillPlaceholders("Top up ({rfid:data.easytripMin|peso}+)", F), "Top up (₱670+)");
});
test("fillPlaceholders leaves text without placeholders alone", () => {
  assert.equal(fillPlaceholders("Read the advisory.", F), "Read the advisory.");
});
test("fillPlaceholders throws on an unknown fact", () => {
  assert.throws(() => fillPlaceholders("{nope:data.x}", F), /Unknown fact nope/);
});
test("fillPlaceholders throws on an unknown path", () => {
  assert.throws(() => fillPlaceholders("{rfid:data.missing}", F), /Unknown path data\.missing in rfid/);
});
test("getPath walks dotted paths", () => {
  assert.equal(getPath({ a: { b: 3 } }, "a.b"), 3);
});
test("formatPeso uses PH thousands separators", () => {
  assert.equal(formatPeso(2337), "₱2,337");
});
test("latestChecked returns the newest date", () => {
  assert.equal(latestChecked([{ checked: "2026-09-01" }, { checked: "2026-10-10" }]), "2026-10-10");
});
test("isStale is true after 45 days and false at 45", () => {
  const now = new Date("2026-10-10T12:00:00+08:00");
  assert.equal(isStale("2026-08-25", now), true);
  assert.equal(isStale("2026-08-26", now), false);
});
test("fmtDate prints D Mon YYYY", () => {
  assert.equal(fmtDate("2026-10-10"), "10 Oct 2026");
});
test("loadData finds facts, Baguio stops and creators", () => {
  assert.ok(data.facts.facts.length > 10);
  assert.ok(data.stopsByRoute.baguio.stops.length > 5);
  assert.ok(Array.isArray(data.creators.creators));
});
test("every fact has a one-line short of at most 90 characters", () => {
  for (const f of data.facts.facts) {
    assert.ok(typeof f.short === "string" && f.short.length > 0, `${f.id} has no short`);
    assert.ok(f.short.length <= 90, `${f.id} short is ${f.short.length} chars`);
  }
});
