// Copyright 2026 Adobe. All rights reserved.
// Copies the light-DOM Button and Action button stylesheets from the published
// @adobe/spectrum-wc package into src/swc/ and renames the token custom properties
// from --swc-* to --spectrum-*, so they read the variables in spectrum-theme.json.
// Component hooks such as --swc-button-gap keep their name. The copies are generated
// at setup time and gitignored; they are not redistributed from this repository.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const dist = "node_modules/@adobe/spectrum-wc/dist";
const files = ["global-button.css", "global-action-button.css"];
const tokenNames = new Set(
  [...readFileSync(`${dist}/tokens.css`, "utf8").matchAll(/--swc-([a-z0-9-]+):/g)].map((m) => m[1]),
);

mkdirSync("src/swc", { recursive: true });
const used = new Set();
for (const file of files) {
  const css = readFileSync(`${dist}/${file}`, "utf8").replace(/var\(--swc-([a-z0-9-]+)/g, (all, name) => {
    if (!tokenNames.has(name)) return all;
    used.add(name);
    return `var(--spectrum-${name}`;
  });
  writeFileSync(`src/swc/${file}`, css);
}
console.log(`${files.length} files, ${used.size} token variables renamed`);
