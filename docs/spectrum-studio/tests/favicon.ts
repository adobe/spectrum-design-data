// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const sourceHtml = await readFile(new URL("index.html", root), "utf8");
const logo = await readFile(new URL("src/assets/Adobe_logo.svg", root), "utf8");
const iconPattern =
  /<link rel="icon" type="image\/svg\+xml" href="([^"]+)"\s*\/?>/;

assert.equal(sourceHtml.match(iconPattern)?.[1], "/src/assets/Adobe_logo.svg");
assert.match(logo, /<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);

const builtHtml = await readFile(new URL("dist/index.html", root), "utf8");
const builtHref = builtHtml.match(iconPattern)?.[1];
assert.ok(builtHref, "The production page must declare its SVG favicon.");
assert.ok(
  !builtHref.includes("/src/"),
  "The production favicon must not depend on source files.",
);

let builtLogo: string;
if (builtHref.startsWith("data:image/svg+xml")) {
  const comma = builtHref.indexOf(",");
  const metadata = builtHref.slice(0, comma);
  const payload = builtHref.slice(comma + 1);
  builtLogo = metadata.endsWith(";base64")
    ? Buffer.from(payload, "base64").toString("utf8")
    : decodeURIComponent(payload);
} else {
  builtLogo = await readFile(
    new URL(`dist/${builtHref.replace(/^\//, "")}`, root),
    "utf8",
  );
}
assert.equal(
  builtLogo,
  logo,
  "The production favicon must contain the Adobe logo.",
);
console.log("Adobe favicon source and production asset checks passed.");
