import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedLicense, creditFrom } from "./assets/commons.mjs";
import { overpassQuery, nearest, waypointHash } from "./assets/osm.mjs";

test("allowed licences are the free ones with credit", () => {
  for (const ok of ["CC BY-SA 4.0", "CC BY 2.0", "CC BY-SA 3.0", "CC0", "Public domain"]) assert.ok(allowedLicense(ok), ok);
  for (const bad of ["CC BY-NC 2.0", "Fair use", "CC BY-ND 4.0", "", undefined]) assert.ok(!allowedLicense(bad), String(bad));
});
test("credit strips HTML from the artist", () => {
  const c = creditFrom({ Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Juan">Juan dela Cruz</a>' }, LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" } });
  assert.deepEqual(c, { author: "Juan dela Cruz", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" });
});
test("overpass query looks for fuel stations of a brand around a point", () => {
  const q = overpassQuery({ brand: "Shell", near: [120.49, 16.23], radius: 1500 });
  assert.match(q, /"amenity"="fuel"/);
  assert.match(q, /around:1500,16.23,120.49/);
  assert.match(q, /Shell/);
});
test("nearest picks the closer element and handles none", () => {
  const els = [{ type: "node", id: 1, lat: 16.3, lon: 120.5 }, { type: "way", id: 2, center: { lat: 16.231, lon: 120.491 } }];
  assert.deepEqual(nearest(els, [120.49, 16.23]), { id: 2, type: "way", lnglat: [120.491, 16.231] });
  assert.equal(nearest([], [120.49, 16.23]), null);
});
test("waypoint hash is stable and changes with the points", () => {
  const a = [[121, 14.6], [120.6, 16.4]];
  assert.equal(waypointHash(a), waypointHash(structuredClone(a)));
  assert.notEqual(waypointHash(a), waypointHash([[121, 14.6], [120.6, 16.41]]));
});

import { pickOnRoute } from "./assets/osm.mjs";
test("pickOnRoute keeps stations beside the route on the requested side, nearest to the hint", () => {
  const line = [[120.0, 15.0], [120.0, 16.0]]; // heading north
  const stations = [
    { id: "way/1", lnglat: [120.001, 15.5] },   // ~107 m east (right side going north)
    { id: "way/2", lnglat: [119.999, 15.5] },   // ~107 m west (left side)
    { id: "way/3", lnglat: [120.05, 15.5] },    // 5 km off the road
    { id: "way/4", lnglat: [120.001, 15.9] },   // right side but far from the hint
  ];
  assert.equal(pickOnRoute(stations, line, [120.0, 15.5], { side: "right" }).id, "way/1");
  assert.equal(pickOnRoute(stations, line, [120.0, 15.5], { side: "left" }).id, "way/2");
  assert.equal(pickOnRoute([stations[2]], line, [120.0, 15.5], {}), null);
});
