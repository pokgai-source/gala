import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { copyFonts, hasGlyph, fontFiles } from "./lib/fonts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("copyFonts puts the self-hosted woff2 files in place", () => {
  const out = mkdtempSync(join(tmpdir(), "gala-fonts-"));
  copyFonts(root, out);
  assert.ok(readdirSync(out).filter((f) => f.endsWith(".woff2")).length >= 6);
});
test("the peso sign renders from a shipped Overpass file", () => {
  const files = fontFiles(root).filter((f) => f.includes("overpass") && f.includes("-400-"));
  assert.ok(files.some((f) => hasGlyph(f, 0x20b1)), `no shipped Overpass 400 file has ₱: ${files.join(", ")}`);
});
test("gala.css has no pill, chip or badge selectors", () => {
  const css = readFileSync(join(root, "site/_design/gala.css"), "utf8");
  assert.ok(!/\.(pill|chip|badge)\b/.test(css));
});
test("sign and art sheets define every symbol the template uses", () => {
  const signs = readFileSync(join(root, "site/_design/signs.svg"), "utf8");
  for (const id of ["i-gas", "i-food", "i-wc", "i-bag", "s-warn", "s-go", "s-stop", "s-ask", "i-pin", "u-line"]) assert.ok(signs.includes(`id="${id}"`), id);
  const art = readFileSync(join(root, "site/_design/art.svg"), "utf8");
  for (const id of ["art-kennon-zigzag", "art-strawberries", "art-pines-fog", "head-way", "head-city", "head-weather"]) assert.ok(art.includes(`id="${id}"`), id);
});
