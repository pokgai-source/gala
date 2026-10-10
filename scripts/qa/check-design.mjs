// Design checks for a built page. Returns a list of plain-language errors; the build fails on any.
import { statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

export const BUDGET = { htmlKB: 150, totalKB: 300, minTap: 48, phone: 360 };

export async function checkDesign(siteDir, pagePath) {
  const file = join(siteDir, pagePath, "index.html");
  const errors = [];
  const at = `design ${pagePath}`;
  const htmlBytes = statSync(file).size;
  if (htmlBytes > BUDGET.htmlKB * 1024) errors.push(`${at}: HTML is ${Math.round(htmlBytes / 1024)} KB (budget ${BUDGET.htmlKB} KB)`);

  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: BUDGET.phone, height: 780 } });
    const fontBytes = new Map();
    page.on("requestfinished", (req) => {
      const u = req.url();
      if (u.endsWith(".woff2")) try { fontBytes.set(u, statSync(new URL(u)).size); } catch { /* not a local file */ }
    });
    const jsErrors = [];
    page.on("pageerror", (e) => jsErrors.push(String(e)));
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    for (const e of jsErrors) errors.push(`${at}: script error ${e}`);

    const total = htmlBytes + [...fontBytes.values()].reduce((a, b) => a + b, 0);
    if (total > BUDGET.totalKB * 1024) errors.push(`${at}: HTML + fonts is ${Math.round(total / 1024)} KB (budget ${BUDGET.totalKB} KB)`);

    const found = await page.evaluate(({ phone, minTap }) => {
      const out = [];
      const sw = document.documentElement.scrollWidth;
      if (sw > phone) out.push(`page is ${sw}px wide at a ${phone}px phone (sideways scroll)`);
      document.querySelectorAll("[data-fact]").forEach((el) => {
        if (!el.querySelector(".checked")) out.push(`fact ${el.dataset.fact} has no "Checked" line`);
      });
      document.querySelectorAll(".pill, .chip, .badge").forEach((el) => out.push(`banned class on "${el.textContent.trim().slice(0, 30)}"`));
      document.querySelectorAll("a, button, summary").forEach((el) => {
        if (/→\s*$/.test(el.textContent)) out.push(`arrow at end of "${el.textContent.trim().slice(0, 30)}"`);
      });
      document.querySelectorAll("main a.btn, main button, main summary.btn, footer a.btn").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.height < minTap) out.push(`tap target "${el.textContent.trim().slice(0, 30)}" is ${Math.round(r.height)}px tall`);
      });
      return out;
    }, BUDGET);
    for (const f of found) errors.push(`${at}: ${f}`);
  } finally {
    await browser.close();
  }
  return errors;
}
