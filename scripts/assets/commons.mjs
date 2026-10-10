// Wikimedia Commons: find free-licence photos and read their credit lines.
const API = "https://commons.wikimedia.org/w/api.php";
export const UA = "GALA roadbook builder (https://github.com/pokgai-source/gala)";

const ALLOWED = [/^CC0/i, /^Public domain/i, /^PD\b/i, /^CC BY(-SA)? [234]\.0/i, /^CC BY(-SA)? 2\.5/i];
const BLOCKED = /\b(NC|ND)\b|fair use/i;

export function allowedLicense(shortName) {
  if (!shortName || BLOCKED.test(shortName)) return false;
  return ALLOWED.some((re) => re.test(shortName.trim()));
}

const strip = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function creditFrom(meta) {
  return {
    author: strip(meta.Artist?.value) || "Unknown",
    license: strip(meta.LicenseShortName?.value),
    licenseUrl: strip(meta.LicenseUrl?.value) || null,
  };
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons ${res.status} for ${params.gsrsearch || params.titles}`);
  return res.json();
}

function toInfo(page) {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  return { file: page.title.replace(/^File:/, ""), thumb: ii.thumburl, width: ii.width, height: ii.height, mime: ii.mime,
    sourceUrl: ii.descriptionurl, ...creditFrom(ii.extmetadata || {}) };
}

// Up to n landscape-ish, large-enough, free-licence photos for a search, in search order.
export async function searchCandidates(query, n = 6, thumbWidth = 480) {
  const body = await api({ action: "query", generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6",
    gsrlimit: "30", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: String(thumbWidth) });
  const pages = Object.values(body.query?.pages || {}).sort((a, b) => a.index - b.index);
  return pages.map(toInfo).filter((p) => p && /jpeg|png|webp/.test(p.mime) && p.width >= 1000 && allowedLicense(p.license)).slice(0, n);
}

export async function fileInfo(file, thumbWidth = 1600) {
  const body = await api({ action: "query", titles: `File:${file}`, prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: String(thumbWidth) });
  const page = Object.values(body.query?.pages || {})[0];
  return page ? toInfo(page) : null;
}

export async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
