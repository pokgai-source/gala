// Assembles one roadbook page: template + inlined CSS/JS/SVG + payload (+ partner theme).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fontFaceCss } from "./fonts.mjs";

const read = (p) => readFileSync(p, "utf8");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function themeStyle(theme) {
  if (!theme) return "";
  return `<style>:root{--brand:${theme.brand};--brand-2:${theme.brand2};--accent:${theme.accent};--on-accent:${theme.onAccent}}</style>`;
}

export function renderPage({ root, payload, fontPrefix, templateFile, theme = payload.theme, extraCss = "" }) {
  const d = join(root, "site", "_design");
  const tpl = read(templateFile || join(d, "roadbook.html"));
  const t = payload.route.title;
  const slots = {
    TITLE: esc(`${t.from} ${t.to}, GALA Roadbook`),
    DESCRIPTION: esc(`Self-drive roadbook, ${t.from} ${t.to}: route, tolls, stops, coding, weather and emergency numbers. Every fact shows its source and when it was last checked.`),
    CSS: `<style>${fontFaceCss(root, fontPrefix)}\n${read(join(d, "gala.css"))}\n${extraCss}</style>`,
    THEME: themeStyle(theme),
    SIGNS: read(join(d, "signs.svg")),
    ART: read(join(d, "art.svg")),
    DATA: `<script id="gala-data" type="application/json">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>`,
    JS: `<script>${read(join(d, "roadbook.js"))}</script>`,
  };
  let html = tpl;
  for (const [k, v] of Object.entries(slots)) {
    const marker = `<!--GALA:${k}-->`;
    if (!html.includes(marker)) throw new Error(`template is missing slot GALA:${k}`);
    html = html.split(marker).join(v);
  }
  return html;
}

// Home page: one card per roadbook.
export function renderHome({ root, cards }) {
  const d = join(root, "site", "_design");
  let html = read(join(root, "site", "index.html"));
  const list = cards.map((c) => `    <article class="book">
      <h2><span class="from">${esc(c.from)}</span>${esc(c.to)}</h2>
      <p class="checked">Checked ${esc(c.checked)}</p>
      <div class="row"><a class="btn" href="${esc(c.id)}/">Open the roadbook</a><a class="btn alt" href="${esc(c.id)}/${esc(c.id)}-roadbook.pdf">Printable PDF</a></div>
    </article>`).join("\n");
  const slots = { CSS: `<style>${fontFaceCss(root, "_design/fonts/")}\n${read(join(d, "gala.css"))}</style>`, ROUTES: list };
  for (const [k, v] of Object.entries(slots)) {
    if (!html.includes(`<!--GALA:${k}-->`)) throw new Error(`home is missing slot GALA:${k}`);
    html = html.split(`<!--GALA:${k}-->`).join(v);
  }
  return html;
}
