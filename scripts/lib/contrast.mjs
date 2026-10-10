// WCAG 2.x contrast ratio between two #RRGGBB colours.
function luminance(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA, hexB) {
  const [a, b] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
}
