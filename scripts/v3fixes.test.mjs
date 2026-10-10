// Tests for the v3 final-review fixes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { photoErrors } from "./lib/photos.mjs";
import { creditFrom } from "./assets/commons.mjs";
import { pickOnRoute } from "./assets/osm.mjs";
import { pinWarnings } from "./lib/route.mjs";
import { shortDriftWarnings } from "./lib/facts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let hasPlaywright = true;
try { await import("playwright"); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";
const okPhoto = { id: "x", file: "X.jpg", prepared: "X.jpg|v2", author: "A", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:X.jpg" };

// I4
test("Commons credit with no artist leaves author empty, never 'Unknown'", () => {
  assert.equal(creditFrom({ LicenseShortName: { value: "CC BY 4.0" } }).author, null);
});
test("photo checks refuse a missing author, a non-free licence and a non-https source", () => {
  assert.deepEqual(photoErrors({ photos: [okPhoto] }), []);
  assert.ok(photoErrors({ photos: [{ ...okPhoto, author: null }] }).some((e) => /photo x: missing author/.test(e)));
  assert.ok(photoErrors({ photos: [{ ...okPhoto, license: "CC BY-NC 4.0" }] }).some((e) => /photo x: licence "CC BY-NC 4.0" is not allowed/.test(e)));
  assert.ok(photoErrors({ photos: [{ ...okPhoto, sourceUrl: "javascript:alert(1)" }] }).some((e) => /photo x: sourceUrl must be https/.test(e)));
});

// I5
test("a station far from the hint is not taken as the stop's pin", () => {
  const line = [[120.60, 15.00], [120.60, 15.20]];
  const far = { id: "way/1", lnglat: [120.6005, 15.15] }; // beside the road, ~5.5 km from the hint
  assert.equal(pickOnRoute([far], line, [120.6, 15.10], { maxOff: 150, maxNear: 1500 }), null);
  const near = { id: "way/2", lnglat: [120.6005, 15.105] };
  assert.equal(pickOnRoute([far, near], line, [120.6, 15.10], { maxOff: 150, maxNear: 1500 }).id, "way/2");
});
test("the build warns about approximate stop pins", () => {
  const w = pinWarnings({ stops: [{ id: "a", lnglatSource: "approximate", lnglat: [1, 2] }, { id: "b", lnglatSource: "OpenStreetMap way/1", lnglat: [1, 2] }] });
  assert.deepEqual(w, ["stop a: map pin is approximate (OpenStreetMap had no match near the hint)"]);
});

// I6
test("the assets job rebases before pushing and then runs the publish workflow", () => {
  const y = readFileSync(join(root, ".github/workflows/assets.yml"), "utf8");
  assert.match(y, /git pull --rebase/);
  assert.match(y, /gh workflow run pages\.yml/);
  assert.match(y, /actions: write/);
});

// I8
test("a short line whose number isn't in the fact is flagged", () => {
  const facts = { facts: [
    { id: "t", value: "Total ₱981 one way.", data: { class1: 981 }, short: "₱981 one way" },
    { id: "u", value: "Total ₱1,020 one way.", data: { class1: 1020 }, short: "₱981 one way" },
  ] };
  assert.deepEqual(shortDriftWarnings(facts), ['fact u: short line has 981, which is not in the value or data — rewrite "short"']);
});

// I1, I3, I7 via the design check on the real build
test("built page: 3x first screen within budget, 48px More taps, a source on every fact", { skip, timeout: 240000 }, async () => {
  const b = spawnSync(process.execPath, [join(root, "scripts/build.mjs"), "--no-qa"], { encoding: "utf8" });
  assert.equal(b.status, 0, b.stderr);
  const { checkDesign } = await import("./qa/check-design.mjs");
  assert.deepEqual(await checkDesign(join(root, "_site"), "baguio"), []);
});
test("rounded numbers in a short line still count as matching", () => {
  const facts = { facts: [{ id: "v", value: "1,586,890 tourists. 72.92% chose Baguio.", data: {}, short: "1.59M tourists; 73% went to Baguio." }] };
  assert.deepEqual(shortDriftWarnings(facts), []);
});
