// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Guardrail: packages/tokens (@adobe/spectrum-tokens) is generated legacy output.
 * Tooling must read canonical data from packages/design-data instead. This script
 * fails when a source, workflow, or package.json file references the legacy package
 * and is not covered by an entry in legacy-consumers.allowlist.json.
 *
 * Usage: node scripts/check-legacy-consumers.mjs [--list]
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCANNED = /\.(?:[cm]?js|[cm]?ts|tsx|rs|ya?ml)$|(?:^|\/)package\.json$/;
const SKIPPED = [
  /(?:^|\/)CHANGELOG\.md$/,
  /^pnpm-lock\.yaml$/,
  /^packages\/tokens\//,
  /^packages\/design-data\/tokens\//,
  /^docs\/markdown\//,
  /^\.beads\//,
  /^\.changeset\//,
];

export const LEGACY_PATTERN =
  /@adobe\/spectrum-tokens|packages\/tokens\/|\.\.\/tokens\/(?:src|schemas)|spectrum-tokens\/(?:src|schemas)/;

/** Convert a glob (`**`, `*`) to an anchored RegExp. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i += 1;
      if (glob[i + 1] === "/") i += 1;
    } else if (c === "*") re += "[^/]*";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function loadAllowlist(
  path = join(ROOT, "scripts/legacy-consumers.allowlist.json"),
) {
  const entries = JSON.parse(readFileSync(path, "utf8")).entries;
  return entries.map((e) => ({ ...e, regex: globToRegExp(e.path) }));
}

export function findViolations(files, readFile, allowlist) {
  const violations = [];
  for (const file of files) {
    if (!SCANNED.test(file) || SKIPPED.some((s) => s.test(file))) continue;
    if (allowlist.some((e) => e.regex.test(file))) continue;
    const lines = readFile(file).split("\n");
    lines.forEach((line, i) => {
      if (LEGACY_PATTERN.test(line)) {
        violations.push({ file, line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
  }
  return violations;
}

function main() {
  const files = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const allowlist = loadAllowlist();
  const readFile = (f) => {
    try {
      return readFileSync(join(ROOT, f), "utf8");
    } catch {
      return "";
    }
  };
  const violations = findViolations(files, readFile, allowlist);
  const stale = allowlist.filter((e) => !files.some((f) => e.regex.test(f)));

  if (process.argv.includes("--list")) {
    for (const e of allowlist) console.log(`${e.path}  (${e.reason})`);
  }
  for (const e of stale) {
    console.warn(`warning: allowlist entry matches no files: ${e.path}`);
  }
  if (violations.length > 0) {
    console.error(
      "Legacy @adobe/spectrum-tokens / packages/tokens references outside the allowlist:\n",
    );
    for (const v of violations)
      console.error(`  ${v.file}:${v.line}  ${v.text}`);
    console.error(
      "\npackages/tokens is generated legacy output. Read packages/design-data instead,\n" +
        "or (if the use is intentional) add an entry with a reason to\n" +
        "scripts/legacy-consumers.allowlist.json. See .ai/rules/legacy-tokens.md.",
    );
    process.exit(1);
  }
  console.log("No unallowlisted legacy token consumers.");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
