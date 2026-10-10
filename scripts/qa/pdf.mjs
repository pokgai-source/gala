// Prints _site/<route>/print.html to the tri-fold PDF.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

export async function makePdf(siteDir, route) {
  const browser = await launch();
  try {
    const page = await browser.newPage({ colorScheme: "light" });
    await page.goto(pathToFileURL(join(siteDir, route, "print.html")).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const out = join(siteDir, route, `${route}-roadbook.pdf`);
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
    return out;
  } finally {
    await browser.close();
  }
}
