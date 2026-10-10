import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let hasPlaywright = true;
try { await import("playwright"); } catch { hasPlaywright = false; }

test("the tri-fold PDF is 2 landscape pages at 11.25 x 8.75 in", { skip: !hasPlaywright && "playwright not installed" }, async () => {
  const b = spawnSync(process.execPath, [join(root, "scripts/build.mjs"), "--no-qa"], { encoding: "utf8" });
  assert.equal(b.status, 0, b.stderr);
  const { makePdf } = await import("./qa/pdf.mjs");
  const out = await makePdf(join(root, "_site"), "baguio");
  assert.ok(existsSync(out));
  const pdf = readFileSync(out, "latin1");
  assert.ok(pdf.startsWith("%PDF"));
  assert.equal((pdf.match(/\/Type\s*\/Page(?!s)/g) || []).length, 2);
  assert.match(pdf, /\/MediaBox\s*\[\s*0 0 810 630\s*\]/);
});
