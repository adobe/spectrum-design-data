// Copyright 2026 Adobe. All rights reserved.
// Assembles the deployable site into dist/: fills the button template with data.json and copies
// the Switch sheet and the index. Run extract-button-ios.mjs first.
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
rmSync(dist, { recursive: true, force: true });
cpSync(join(here, "site"), dist, { recursive: true });
mkdirSync(join(dist, "button-ios"), { recursive: true });
mkdirSync(join(dist, "switch"), { recursive: true });
const tpl = readFileSync(join(here, "templates/button-ios.tpl.html"), "utf8");
const data = readFileSync(join(here, "data.json"), "utf8");
writeFileSync(
  join(dist, "button-ios/index.html"),
  tpl.replace("__DATA__", () => data),
);
cpSync(join(here, "templates/switch.html"), join(dist, "switch/index.html"));
console.log(`built ${dist}`);
