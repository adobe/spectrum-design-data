#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import { parseArgs } from "node:util";
import { DEFAULT_KIT, rasterize } from "./index.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    scale: { type: "string" },
    platform: { type: "string" },
    engine: { type: "string", default: "chrome" },
    kit: { type: "string", default: DEFAULT_KIT },
    "no-kit": { type: "boolean", default: false },
    background: { type: "string" },
    "fonts-dir": { type: "string" },
  },
});

if (!values.out || positionals.length === 0) {
  console.error(
    "usage: node cli.mjs <svg|dir>... --out <dir> [--scale N] [--platform ios|web] [--engine chrome|resvg] [--no-kit] [--background css] [--fonts-dir dir]\n" +
      "  default scale: 3 for ios, 2 otherwise. Write --out outside the repo (for example ~/Spectrum/platform-compare/...).",
  );
  process.exit(2);
}
const results = await rasterize(positionals, {
  outDir: values.out,
  engine: values.engine,
  scale: values.scale ? Number(values.scale) : undefined,
  platform: values.platform,
  kit: values["no-kit"] ? null : values.kit,
  background: values.background,
  fontsDir: values["fonts-dir"],
});
for (const r of results) console.log(`${r.id}\t${r.scale}x\t${r.png}${r.warnings.length ? `\tWARN ${r.warnings}` : ""}`);
