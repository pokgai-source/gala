import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "./lib/facts.mjs";
import { buildPayload } from "./lib/payload.mjs";
import { photoErrors } from "./lib/photos.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = loadData(root);
const P = buildPayload(data, "baguio", { root });

test("prepared photos reach the payload with size and credit", () => {
  const b = P.photos["baguio-burnham-park"];
  assert.equal(b.src640, "img/baguio/burnham-park-640.webp");
  assert.equal(b.src320, "img/baguio/burnham-park-320.webp");
  assert.deepEqual(b.size, [640, 480]);
  assert.equal(b.credit.license, "CC BY-SA 4.0");
  assert.ok(b.credit.sourceUrl.startsWith("https://commons.wikimedia.org/"));
});
test("a photo still waiting for a pick is null and doesn't break the build", () => {
  assert.equal(P.photos["baguio-public-market"], null);
  assert.deepEqual(photoErrors(data.photos), []);
});
test("a used photo without a licence fails, naming the photo", () => {
  const bad = structuredClone(data.photos);
  delete bad.photos.find((p) => p.id === "bencab").license;
  assert.deepEqual(photoErrors(bad), ["photo bencab: missing license"]);
});
test("stops carry a one-sentence short text and city places their photos", () => {
  const lake = P.city.places.find((p) => p.id === "baguio-burnham-park");
  assert.equal(lake.photo.src640, "img/baguio/burnham-park-640.webp");
  assert.ok(!lake.shortText.includes(". "), lake.shortText);
});
