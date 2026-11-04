// Copyright 2026 Adobe. All rights reserved.
// Run after `pnpm build`: checks the installable-app output in dist/.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const manifestUrl = new URL("manifest.webmanifest", dist);
assert.ok(
  existsSync(manifestUrl),
  "dist/manifest.webmanifest exists (run pnpm build first)",
);

const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
assert.equal(manifest.name, "Spectrum Studio");
assert.equal(manifest.short_name, "Spectrum Studio");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");

const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
assert.ok(sizes.includes("192x192"), "192x192 icon");
assert.ok(sizes.includes("512x512"), "512x512 icon");
assert.ok(
  manifest.icons.some(
    (icon: { purpose?: string }) => icon.purpose === "maskable",
  ),
  "maskable icon",
);
for (const icon of manifest.icons as { src: string }[]) {
  assert.ok(existsSync(new URL(icon.src, dist)), `${icon.src} exists`);
}
assert.ok(
  existsSync(new URL("apple-touch-icon-180x180.png", dist)),
  "apple-touch-icon exists",
);

const sw = new URL("sw.js", dist);
assert.ok(existsSync(sw), "dist/sw.js exists");
const swSource = readFileSync(sw, "utf8");
assert.match(swSource, /index\.html/, "service worker precaches index.html");
assert.doesNotMatch(
  swSource,
  /url:"[^"]+\.map"/,
  "service worker skips source maps",
);

const html = readFileSync(new URL("index.html", dist), "utf8");
assert.match(html, /<title>Spectrum Studio<\/title>/);
assert.match(html, /rel="manifest"/, "manifest link injected");

console.log("pwa checks passed");
