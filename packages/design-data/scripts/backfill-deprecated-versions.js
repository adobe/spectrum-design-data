/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Backfills `deprecated: "unknown"` placeholders (left over from the legacy->cascade
 * migration, see design-data-spec/spec/token-format.md's migration note) with the
 * real `@adobe/spectrum-tokens` release version each token was deprecated in.
 *
 * Recovery has two sources, tried in order per token:
 *   1. `packages/tokens/CHANGELOG.md` "Newly Deprecated (N)" release-note blocks,
 *      matched by the token's legacy name.
 *   2. Git archaeology: the commit that first set `deprecated: true` on the token
 *      in `packages/tokens/src/*.json`, resolved to the earliest containing
 *      `@adobe/spectrum-tokens@X.Y.Z` tag.
 *
 * A cascade token's legacy name is recovered by matching its `uuid` (or, for
 * per-mode set tokens, `set_uuid`) against every `uuid` found anywhere inside each
 * legacy token object (legacy set tokens nest a `uuid` per mode under `sets.*`).
 *
 * Tokens that resolve via neither source are left as `"unknown"` and reported
 * rather than guessed at.
 *
 * Writes are surgical (line-level text substitution of the exact
 * `"deprecated": "unknown"` line for a given uuid), not a full JSON re-serialize —
 * `JSON.stringify` does not round-trip these files byte-for-byte (e.g. it expands
 * single-line arrays), which would otherwise produce a repo-wide formatting diff.
 *
 * Usage: node packages/design-data/scripts/backfill-deprecated-versions.js [--dry-run]
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const cascadeTokensDir = join(repoRoot, "packages", "design-data", "tokens");
const legacyTokensDir = join(repoRoot, "packages", "tokens", "src");
const changelogPath = join(repoRoot, "packages", "tokens", "CHANGELOG.md");

const dryRun = process.argv.includes("--dry-run");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Map every `uuid` found anywhere inside a legacy token object to its top-level name. */
function buildLegacyUuidToNameMap() {
  const map = new Map();
  for (const file of readdirSync(legacyTokensDir).filter((f) =>
    f.endsWith(".json"),
  )) {
    const data = readJson(join(legacyTokensDir, file));
    for (const [name, token] of Object.entries(data)) {
      const stack = [token];
      while (stack.length) {
        const cur = stack.pop();
        if (cur && typeof cur === "object") {
          if (typeof cur.uuid === "string") {
            if (!map.has(cur.uuid)) map.set(cur.uuid, []);
            map.get(cur.uuid).push(name);
          }
          for (const v of Object.values(cur)) {
            if (v && typeof v === "object") stack.push(v);
          }
        }
      }
    }
  }
  return map;
}

/**
 * Parse `Newly Deprecated (N)` / `Newly "Un-deprecated" (N)` blocks from the legacy
 * CHANGELOG, walked newest-to-oldest (the file's natural order), keeping only the
 * first (i.e. most recent) event per legacy token name.
 */
function buildChangelogEventsByName() {
  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const events = new Map();
  let currentVersion = null;
  let block = null; // "deprecated" | "undeprecated" | null
  for (const line of lines) {
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+(?:-[\w.]+)?)/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      block = null;
      continue;
    }
    if (/Newly Deprecated \(\d+\)/.test(line)) {
      block = "deprecated";
      continue;
    }
    if (/Newly .Un-deprecated. \(\d+\)/.test(line)) {
      block = "undeprecated";
      continue;
    }
    if (/<\/details>/.test(line)) {
      block = null;
      continue;
    }
    const tokenMatch = line.match(/^\s*-\s*`([^`]+)`\s*$/);
    if (tokenMatch && currentVersion && block && !events.has(tokenMatch[1])) {
      events.set(tokenMatch[1], { version: currentVersion, action: block });
    }
  }
  return events;
}

/**
 * Find the commit that first set `deprecated: true` on `legacyName` inside `file`,
 * then resolve it to the earliest `@adobe/spectrum-tokens@X.Y.Z` tag whose commit
 * timestamp is >= that commit's timestamp. Returns null if no transition is found.
 */
function resolveViaGitForensics(legacyName, file, sortedTags) {
  const relPath = `packages/tokens/src/${file}`;
  let commits;
  try {
    commits = execFileSync(
      "git",
      ["log", "--format=%H", "--diff-filter=M", "--", relPath],
      { cwd: repoRoot, encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return null;
  }

  const isDeprecated = (commit) => {
    let content;
    try {
      content = execFileSync("git", ["show", `${commit}:${relPath}`], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      return null; // token/file didn't exist at this commit (e.g. pre-rename)
    }
    try {
      const token = JSON.parse(content)[legacyName];
      return token ? Boolean(token.deprecated) : false;
    } catch {
      return null;
    }
  };

  for (let i = commits.length - 1; i >= 0; i--) {
    const commit = commits[i];
    const older = commits[i + 1];
    if (isDeprecated(commit) && !(older && isDeprecated(older))) {
      const ts = parseInt(
        execFileSync("git", ["log", "-1", "--format=%ct", commit], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim(),
        10,
      );
      const tag = sortedTags.find((t) => t.ts >= ts);
      return tag ? tag.version : null;
    }
  }
  return null;
}

function buildSortedSpectrumTokensTags() {
  const tagNames = execFileSync(
    "git",
    ["tag", "-l", "@adobe/spectrum-tokens@*"],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  return tagNames
    .map((tag) => ({
      version: tag.split("@").pop(),
      ts: parseInt(
        execFileSync("git", ["log", "-1", "--format=%ct", tag], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim(),
        10,
      ),
    }))
    .sort((a, b) => a.ts - b.ts);
}

/** Build a map of legacy name -> file, for locating a token's source file. */
function buildLegacyNameToFileMap() {
  const map = new Map();
  for (const file of readdirSync(legacyTokensDir).filter((f) =>
    f.endsWith(".json"),
  )) {
    const data = readJson(join(legacyTokensDir, file));
    for (const name of Object.keys(data)) map.set(name, file);
  }
  return map;
}

/** Surgically replace the `"deprecated": "unknown"` line belonging to `uuid` in-place. */
function applySurgicalReplacement(filePath, uuid, version) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split("\n");
  const uuidLineIdx = lines.findIndex((l) => l.includes(`"uuid": "${uuid}"`));
  if (uuidLineIdx === -1) return false;
  for (
    let i = uuidLineIdx + 1;
    i < Math.min(uuidLineIdx + 10, lines.length);
    i++
  ) {
    if (/"uuid":/.test(lines[i])) break; // reached the next token object
    if (/"deprecated":\s*"unknown"/.test(lines[i])) {
      lines[i] = lines[i].replace(/"unknown"/, `"${version}"`);
      writeFileSync(filePath, lines.join("\n"));
      return true;
    }
  }
  return false;
}

function main() {
  const legacyUuidToName = buildLegacyUuidToNameMap();
  const legacyNameToFile = buildLegacyNameToFileMap();
  const changelogEvents = buildChangelogEventsByName();
  let sortedTags = null; // built lazily — expensive, only needed on changelog misses

  const cascadeFiles = readdirSync(cascadeTokensDir).filter((f) =>
    f.endsWith(".tokens.json"),
  );

  const report = { changelog: 0, gitForensic: 0, unresolved: [] };

  for (const file of cascadeFiles) {
    const filePath = join(cascadeTokensDir, file);
    const tokens = readJson(filePath);
    for (const token of tokens) {
      if (token.deprecated !== "unknown") continue;

      const names =
        legacyUuidToName.get(token.uuid) ??
        (token.set_uuid ? legacyUuidToName.get(token.set_uuid) : undefined) ??
        [];

      let version = null;
      let source = null;
      for (const name of names) {
        const event = changelogEvents.get(name);
        if (event && event.action !== "undeprecated") {
          version = event.version;
          source = "changelog";
          break;
        }
      }

      if (!version) {
        sortedTags ??= buildSortedSpectrumTokensTags();
        for (const name of names) {
          const legacyFile = legacyNameToFile.get(name);
          if (!legacyFile) continue;
          const resolved = resolveViaGitForensics(name, legacyFile, sortedTags);
          if (resolved) {
            version = resolved;
            source = "git-forensic";
            break;
          }
        }
      }

      if (!version) {
        report.unresolved.push({ file, uuid: token.uuid, names });
        continue;
      }

      report[source === "changelog" ? "changelog" : "gitForensic"]++;
      if (!dryRun) {
        const applied = applySurgicalReplacement(filePath, token.uuid, version);
        if (!applied) {
          report.unresolved.push({
            file,
            uuid: token.uuid,
            names,
            note: "resolved a version but surgical replacement failed",
          });
        }
      }
    }
  }

  console.log(`Resolved via CHANGELOG:   ${report.changelog}`);
  console.log(`Resolved via git history: ${report.gitForensic}`);
  console.log(`Unresolved:               ${report.unresolved.length}`);
  if (report.unresolved.length > 0) {
    console.log(JSON.stringify(report.unresolved, null, 2));
  }
  if (dryRun) console.log("\n(dry run — no files written)");
}

main();
