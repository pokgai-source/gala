// Screenshots for review: phone and laptop, light and dark, saved under <page>/check/.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

const SIZES = { phone: { width: 390, height: 900 }, laptop: { width: 1280, height: 900 } };

export async function shots(siteDir, pagePath) {
  const dir = join(siteDir, pagePath, "check");
  mkdirSync(dir, { recursive: true });
  const browser = await launch();
  const files = [];
  try {
    for (const [name, viewport] of Object.entries(SIZES)) for (const colorScheme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport, colorScheme, reducedMotion: "reduce" }); // still frames, not mid-animation
      await page.goto(pathToFileURL(join(siteDir, pagePath, "index.html")).href, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      // full-page shots: load lazy photos too, so the review shows what a scrolling reader sees
      await page.evaluate(() => Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }); })));
      await page.waitForTimeout(300);
      const out = join(dir, `${name}-${colorScheme}.png`);
      await page.screenshot({ path: out, fullPage: true });
      files.push(out);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return files;
}
