#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { capture } from "./index.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    source: { type: "string" },
    sha: { type: "string" },
    base: { type: "string" },
    out: { type: "string" },
    scale: { type: "string", default: "2" },
  },
});
if (!values.out || !values.source || positionals.length !== 1) {
  console.error(
    "usage: node cli.mjs <capture.json> --source rsp --sha <full SHA> --out <dir> [--scale 2]\n" +
      "       node cli.mjs <capture.json> --source swc --out <dir> [--base url]\n" +
      "  capture.json: { states: [{ id, story, args?, colorScheme?, selector, parts? }] }\n" +
      "  Write --out outside the repo, e.g. ~/Spectrum/platform-compare/<run>/rsp.",
  );
  process.exit(2);
}
const file = JSON.parse(readFileSync(positionals[0], "utf8"));
const doc = await capture(file.states ?? file, {
  source: values.source,
  sha: values.sha,
  base: values.base,
  outDir: values.out,
  scale: Number(values.scale),
});
console.log(`captured ${doc.states.length} state(s) to ${values.out} (measured.json, details.json, shots/)`);
