// Cuts PDF page 2's three inside panels from print.html into fold-1/2/3.webp for the laptop unfold.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { launch } from "./browser.mjs";

export const FOLD_PANELS = ["#pp-way", "#pp-city", "#pp-before"];
export const FOLD_SCALE = 1.5;

export async function makeFoldImages(siteDir, route) {
  const browser = await launch();
  try {
    // 11.25in x 8.75in sheet at 96 css px per inch
    const page = await browser.newPage({ viewport: { width: 1080, height: 840 }, deviceScaleFactor: FOLD_SCALE, colorScheme: "light", reducedMotion: "reduce" });
    await page.goto(pathToFileURL(join(siteDir, route, "print.html")).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const out = [];
    let size = null;
    for (const [i, sel] of FOLD_PANELS.entries()) {
      const png = await page.locator(sel).screenshot({ type: "png" });
      const file = join(siteDir, route, `fold-${i + 1}.webp`);
      const info = await sharp(png).webp({ quality: 72 }).toFile(file);
      size = [Math.round(info.width / FOLD_SCALE), Math.round(info.height / FOLD_SCALE)];
      out.push(file);
    }
    return { files: out, size };
  } finally {
    await browser.close();
  }
}
