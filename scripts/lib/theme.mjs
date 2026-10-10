// Partner themes: four brand colours, checked for sunlight-readable contrast before any page is built.
import { contrastRatio } from "./contrast.mjs";

export const ON_BRAND = "#F3F6F1";
const KEYS = ["brand", "brand2", "accent", "onAccent"];
const NAMES = { brand: "brand", brand2: "brand-2", accent: "accent", onAccent: "on-accent" };

export function themeErrors(hotel) {
  const at = `hotel ${hotel.slug}`, t = hotel.theme || {}, errors = [];
  for (const k of KEYS) if (!/^#[0-9a-f]{6}$/i.test(t[k] || "")) errors.push(`${at}: ${NAMES[k]} must be #RRGGBB`);
  if (errors.length) return errors;
  const pairs = [["on-accent on accent", t.onAccent, t.accent], ["on-brand on brand", ON_BRAND, t.brand], ["on-brand on brand-2", ON_BRAND, t.brand2]];
  for (const [label, fg, bg] of pairs) {
    const r = contrastRatio(fg, bg);
    if (r < 4.5) errors.push(`${at}: ${label} ${r} < 4.5`);
  }
  return errors;
}
