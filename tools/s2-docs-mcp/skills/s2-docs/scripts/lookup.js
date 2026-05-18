#!/usr/bin/env node
/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Thin wrapper around the s2-docs CLI bin.
 * Used by the SKILL.md via ${CLAUDE_SKILL_DIR}/scripts/lookup.js
 *
 * Usage:
 *   node lookup.js <subcommand> [args...]          # Claude Code (full output)
 *   node lookup.js <subcommand> [args...] --cursor # Cursor (trimmed, delimited)
 */

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const cursorMode = args.includes("--cursor");
const cleanArgs = args.filter((a) => a !== "--cursor");

// Resolve the bin — works whether the skill is inside the published package
// (skills/ is a sibling of bin/) or installed elsewhere via npx.
const localBin = resolve(__dirname, "../../../bin/s2-docs.js");
const binPath = existsSync(localBin) ? localBin : null;

if (!binPath) {
  console.error(
    "s2-docs bin not found. Run: npm install @adobe/s2-docs-mcp or moon run s2-docs-mcp:bundle",
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [binPath, ...cleanArgs], {
  encoding: "utf8",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr || "");
  process.exit(result.status);
}

let output = result.stdout;

if (cursorMode) {
  // Parse JSON and reformat as readable markdown for Cursor sessions
  try {
    const data = JSON.parse(output);
    const subcommand = cleanArgs[0];
    const label = cleanArgs.slice(1).join(" ") || subcommand;

    output = `=== S2 DOCS: ${label.toUpperCase()} ===\n`;

    if (subcommand === "get" && data.documentation) {
      // Trim to first 3000 chars to avoid context bloat in Cursor
      const doc = data.documentation.slice(0, 3000);
      const trimmed =
        data.documentation.length > 3000
          ? doc +
            "\n\n[...truncated — see full docs at " +
            (data.component?.url ?? "") +
            "]"
          : doc;
      output += `Component: ${data.component?.name} (${data.component?.category})\nURL: ${data.component?.url}\n\n${trimmed}`;
    } else {
      // For list/search/use-case/stats, compact JSON is fine
      output += JSON.stringify(data, null, 2);
    }

    output += `\n=== END S2 DOCS ===\n`;
  } catch {
    // Not JSON — pass through as-is with delimiters
    const label = cleanArgs.slice(1).join(" ") || cleanArgs[0] || "result";
    output = `=== S2 DOCS: ${label.toUpperCase()} ===\n${output}\n=== END S2 DOCS ===\n`;
  }
}

process.stdout.write(output);
