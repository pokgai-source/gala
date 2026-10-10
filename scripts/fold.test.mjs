import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let hasPlaywright = true;
try { await import("playwright"); } catch { hasPlaywright = false; }
const skip = !hasPlaywright && "playwright not installed";

test("full build makes fold images, shows the unfold on laptop only, and puts photos in the PDF", { skip, timeout: 240000 }, async () => {
  const b = spawnSync(process.execPath, [join(root, "scripts/build.mjs")], { encoding: "utf8" });
  assert.equal(b.status, 0, b.stderr + b.stdout);
  for (const n of [1, 2, 3]) assert.ok(existsSync(join(root, `_site/baguio/fold-${n}.webp`)), `fold-${n}.webp`);
  const pdfKB = statSync(join(root, "_site/baguio/baguio-roadbook.pdf")).size / 1024;
  assert.ok(pdfKB <= 1536, `PDF is ${Math.round(pdfKB)} KB (budget 1.5 MB for weak signal)`);
  const { launch } = await import("./qa/browser.mjs");
  const br = await launch();
  try {
    const shown = async (width) => {
      const p = await br.newPage({ viewport: { width, height: 900 } });
      await p.goto(pathToFileURL(join(root, "_site/baguio/index.html")).href, { waitUntil: "load" });
      const r = await p.evaluate(() => { const u = document.querySelector(".unfold"); return u ? { vis: getComputedStyle(u).display !== "none", imgs: u.querySelectorAll("img").length } : null; });
      await p.close();
      return r;
    };
    const lap = await shown(1280), ph = await shown(390);
    assert.deepEqual(lap, { vis: true, imgs: 3 });
    assert.equal(ph.vis, false);
    const p = await br.newPage();
    await p.goto(pathToFileURL(join(root, "_site/baguio/print.html")).href, { waitUntil: "load" });
    const pr = await p.evaluate(() => ({
      cover: document.querySelectorAll("#pp-cover .polaroid img").length,
      thumbs: document.querySelectorAll("#pp-city .thumbs img").length,
      credits: document.querySelectorAll("#pp-back .photo-credits li").length,
    }));
    assert.equal(pr.cover, 3);
    assert.ok(pr.thumbs >= 2 && pr.thumbs <= 6, `thumbs ${pr.thumbs}`);
    assert.ok(pr.credits >= pr.thumbs, `credits ${pr.credits}`);
  } finally { await br.close(); }
});
