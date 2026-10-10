// Self-hosted fonts: copy the woff2 files we ship and generate their @font-face rules.
import { readFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Overpass carries the page; latin-ext is needed for the peso sign (U+20B1).
export const FONT_SET = [
  { pkg: "overpass", weights: [400, 800, 900] },
  { pkg: "kalam", weights: [400, 700] },
];
const SUBSETS = ["latin", "latin-ext"];

const pkgDir = (root, pkg) => join(root, "node_modules", "@fontsource", pkg);

export function fontFiles(root) {
  const out = [];
  for (const { pkg, weights } of FONT_SET) for (const w of weights) for (const s of SUBSETS) {
    out.push(join(pkgDir(root, pkg), "files", `${pkg}-${s}-${w}-normal.woff2`));
  }
  return out;
}

export function copyFonts(root, outDir) {
  mkdirSync(outDir, { recursive: true });
  return fontFiles(root).map((f) => { copyFileSync(f, join(outDir, basename(f))); return basename(f); });
}

// @font-face blocks for the shipped files only, with urls under urlPrefix (e.g. "../_design/fonts/").
export function fontFaceCss(root, urlPrefix) {
  const keep = new Set(fontFiles(root).map((f) => basename(f)));
  const blocks = [];
  for (const { pkg, weights } of FONT_SET) for (const w of weights) {
    const css = readFileSync(join(pkgDir(root, pkg), `${w}.css`), "utf8");
    for (const m of css.matchAll(/@font-face\s*{[^}]*}/g)) {
      const file = (m[0].match(/files\/([^)]+\.woff2)/) || [])[1];
      if (!file || !keep.has(file)) continue;
      blocks.push(m[0].replace(/src:[^;]+;/, `src: url(${urlPrefix}${file}) format('woff2');`));
    }
  }
  return blocks.join("\n");
}

export function hasGlyph(woff2Path, codepoint) {
  const fontkit = require("fontkit");
  return fontkit.openSync(woff2Path).hasGlyphForCodePoint(codepoint);
}
