#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// usage: node mapping-cli.mjs <mapping.json> <matrix.json> --out <dir> [--layout <name>]
// Writes <dir>/states.json (design-data render --batch), <dir>/capture.json (Storybook adapter)
// and <dir>/unmapped.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { expand } from "./mapping.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, layout: { type: "string" } } });
if (!values.out || positionals.length !== 2) {
  console.error("usage: node mapping-cli.mjs <mapping.json> <matrix.json> --out <dir>");
  process.exit(2);
}
const [mapping, matrix] = positionals.map((p) => JSON.parse(readFileSync(p, "utf8")));
const { render, capture, unmapped } = expand(mapping, matrix, values.layout);
mkdirSync(values.out, { recursive: true });
writeFileSync(join(values.out, "states.json"), JSON.stringify(render, null, 2) + "\n");
writeFileSync(join(values.out, "capture.json"), JSON.stringify({ states: capture }, null, 2) + "\n");
writeFileSync(join(values.out, "unmapped.json"), JSON.stringify(unmapped, null, 2) + "\n");
console.log(`${render.length} state(s), ${unmapped.length} unmapped -> ${values.out}`);
