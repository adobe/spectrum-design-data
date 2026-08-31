#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * CLI: node src/cli.js --component accordion [--out path/to/spec.json]
 * Prototype scope: one component at a time. Multi-component/--all comes after the
 * accordion prototype validates the pipeline (see plan).
 */
import { writeFileSync } from "node:fs";
import { generateComponentSpec } from "./index.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--component") args.component = argv[++i];
    if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

async function main() {
  const { component, out } = parseArgs(process.argv.slice(2));
  if (!component) {
    console.error("Usage: node src/cli.js --component <name> [--out <path>]");
    process.exit(1);
  }

  const spec = await generateComponentSpec(component);
  const output = { [component]: spec };
  const json = JSON.stringify(output, null, 2);

  if (out) {
    writeFileSync(out, json);
    console.log(`Wrote ${out}`);
  } else {
    console.log(json);
  }

  console.log(
    `[component-spec-generator] ${component}: ${spec.groups.length} groups, ${spec.unmapped.length} unmapped rows`,
  );
}

main().catch((err) => {
  console.error("[component-spec-generator] Fatal error:", err);
  process.exit(1);
});
