#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseCsv } from "./parse-csv.js";
import { emitManifest } from "./emit-manifest.js";
import { buildGapsReport } from "./gaps-report.js";

// Carried over from the existing hand-authored POC manifest
// (GarthDB/spectrum-ios-design-data/manifest.json) — the importer only adds
// overrides/extensions, it doesn't decide scope filtering.
const DEFAULT_INCLUDE = [
  "property=color",
  "property=size",
  "property=line-height",
  "property=font-weight",
  "property=font-family",
  "property=text-align",
  "property=corner-radius",
  "property=border-width",
  "property=opacity",
  "property=background-color",
];
const DEFAULT_EXCLUDE = ["colorScheme=wireframe"];

function parseArgs(argv) {
  const args = { gaps: "gaps.md", foundation: "@adobe/spectrum-tokens@15.0.0" };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--csv") args.csv = argv[++i];
    else if (flag === "--out") args.out = argv[++i];
    else if (flag === "--foundation") args.foundation = argv[++i];
    else if (flag === "--gaps") args.gaps = argv[++i];
    else throw new Error(`unknown flag: ${flag}`);
  }
  if (!args.csv || !args.out) {
    throw new Error(
      "usage: cli.js --csv <override-log.csv> --out <manifest.json> [--foundation <pkg@version>] [--gaps <gaps.md>]",
    );
  }
  return args;
}

export function run(argv) {
  const args = parseArgs(argv);
  const rows = parseCsv(readFileSync(args.csv, "utf8"));
  const { overrides, extensionTokens, unresolved } = emitManifest(rows);

  // Preserve an existing manifest's include/exclude if one is already at
  // --out (re-running the importer shouldn't clobber hand-tuned scope
  // filters), otherwise fall back to the POC's known-good defaults.
  const existing = existsSync(args.out)
    ? JSON.parse(readFileSync(args.out, "utf8"))
    : {};

  const manifest = {
    specVersion: "1.0.0-draft",
    foundationVersion: args.foundation,
    include: existing.include ?? DEFAULT_INCLUDE,
    exclude: existing.exclude ?? DEFAULT_EXCLUDE,
    overrides,
    extensions: {
      tokens: extensionTokens,
      formatting: { casing: "camelCase" },
    },
  };

  writeFileSync(args.out, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(args.gaps, buildGapsReport(unresolved));

  console.log(
    `wrote ${args.out} (${overrides.length} overrides, ${extensionTokens.length} extension tokens) ` +
      `and ${args.gaps} (${unresolved.length} unresolved rows)`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv.slice(2));
}
