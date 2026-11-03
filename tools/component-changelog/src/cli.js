#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.

import { writeFileSync } from "node:fs";
import { generateChangelog } from "./index.js";

const [component, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};
if (!component || component.startsWith("--")) {
  console.error(
    "usage: component-changelog <component> [--from REF] [--to REF] [--out FILE]",
  );
  process.exit(2);
}
const log = generateChangelog({
  component,
  from: opt("from", "@adobe/spectrum-design-data@2.1.0"),
  to: opt("to", "HEAD"),
});
const json = `${JSON.stringify(log, null, 2)}\n`;
const out = opt("out");
if (out) writeFileSync(out, json);
else process.stdout.write(json);
