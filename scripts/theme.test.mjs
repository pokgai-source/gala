import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { themeErrors } from "./lib/theme.mjs";
import { themeStyle } from "./lib/render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (n) => ({ slug: n, ...JSON.parse(readFileSync(join(here, "fixtures/hotels", `${n}.json`), "utf8")) });

test("a pale accent with white text fails the contrast gate", () => {
  const errs = themeErrors(fx("low-contrast"));
  assert.ok(errs.some((e) => e.startsWith("hotel low-contrast: on-accent on accent")), errs.join("; "));
});
test("a readable partner palette passes", () => {
  assert.deepEqual(themeErrors(fx("sample-inn")), []);
});
test("a malformed colour is reported", () => {
  const bad = fx("sample-inn"); bad.theme = { ...bad.theme, accent: "orange" };
  assert.ok(themeErrors(bad).some((e) => /accent must be #RRGGBB/.test(e)));
});
test("theme style overrides brand tokens only", () => {
  const css = themeStyle(fx("sample-inn").theme);
  assert.ok(css.includes("--accent:#F28C6B"));
  assert.ok(!css.includes("--sign-"));
});
test("the build refuses a low-contrast partner", () => {
  const r = spawnSync(process.execPath, [join(here, "build.mjs"), "--no-qa"], {
    env: { ...process.env, GALA_HOTELS_DIR: "scripts/fixtures/hotels" }, encoding: "utf8",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /hotel low-contrast: on-accent on accent/);
});
