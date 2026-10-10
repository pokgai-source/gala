import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the home page lists each roadbook with its PDF and drops the old stylesheet", () => {
  const b = spawnSync(process.execPath, [join(root, "scripts/build.mjs"), "--no-qa"], { encoding: "utf8" });
  assert.equal(b.status, 0, b.stderr);
  const html = readFileSync(join(root, "_site/index.html"), "utf8");
  assert.ok(html.includes('href="baguio/"'));
  assert.ok(html.includes('href="baguio/baguio-roadbook.pdf"'));
  assert.ok(!html.includes("brand.css"));
  assert.ok(html.includes("Checked 10 Oct 2026"));
  assert.ok(!html.includes("<!--GALA:"));
});
