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

export function renderPage({ root, payload, fontPrefix, templateFile, theme = payload.theme }) {
  const d = join(root, "site", "_design");
  const tpl = read(templateFile || join(d, "roadbook.html"));
  const t = payload.route.title;
  const slots = {
    TITLE: esc(`${t.from} ${t.to}, GALA Roadbook`),
    DESCRIPTION: esc(`Self-drive roadbook, ${t.from} ${t.to}: route, tolls, stops, coding, weather and emergency numbers. Every fact shows its source and when it was last checked.`),
    CSS: `<style>${fontFaceCss(root, fontPrefix)}\n${read(join(d, "gala.css"))}</style>`,
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
