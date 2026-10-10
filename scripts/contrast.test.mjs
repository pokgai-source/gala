import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "./lib/contrast.mjs";

test("dark ink on jeepney yellow passes AA", () => {
  assert.ok(contrastRatio("#1B1606", "#F2B01E") >= 4.5);
});
test("white on pale yellow fails AA", () => {
  assert.ok(contrastRatio("#FFFFFF", "#F6E7A8") < 4.5);
});
test("black on white is 21", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
});
