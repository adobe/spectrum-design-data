// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Migrate component-scoped compound color properties to atomic fields.
 *
 * Usage: node src/migrate-color-role.js [--write]
 *
 * Tokens whose name.property matches "color-<hue>-<role>" or "color-<role>"
 * (where hue ∈ color-families registry, role ∈ color-roles registry) are
 * rewritten to:
 *   property: "color", colorFamily: hue (if present), colorRole: role
 *
 * The JS serialize() (which mirrors the Rust color-domain branch) must
 * reproduce the original legacy key for every migrated token — fail loud if not.
 * Edge cases (color-inverse, color-area-margin) are reported and skipped.
 * Dry-run by default; --write to persist.
 *
 * ponytail: dedicated script because apply.js is one-field-per-run and the
 * intermediate state (color-blue after pulling colorFamily) is not a registered
 * property term, so sequential apply runs can't do the 3-field split atomically.
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadRegistries } from "./registry-index.js";
import { serialize } from "./decomposer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const CASCADE_DIR = resolve(REPO_ROOT, "packages/design-data/tokens");

const CASCADE_FILES = readdirSync(CASCADE_DIR)
  .filter((f) => f.endsWith(".tokens.json"))
  .sort();

function parseArgs() {
  return { write: process.argv.includes("--write") };
}

/**
 * Decompose "color-<hue>-<role>" or "color-<role>" from property.
 * Returns { colorFamily, colorRole } or null if it doesn't match.
 * Fails loudly if the pattern matches but hue/role aren't registered.
 */
function parseColorProperty(property, hueSet, roleSet) {
  if (!property.startsWith("color-")) return null;
  const rest = property.slice("color-".length);
  const segs = rest.split("-");

  if (segs.length === 1) {
    // color-<role>  (no hue — e.g. color-primary)
    const role = segs[0];
    if (!roleSet.has(role)) return null; // not a registered role → skip
    return { colorFamily: null, colorRole: role };
  }

  if (segs.length === 2) {
    // color-<hue>-<role>  (e.g. color-blue-primary)
    const [hue, role] = segs;
    if (!hueSet.has(hue)) return null; // not a registered hue → edge case, skip
    if (!roleSet.has(role)) {
      // hue matched but role is unrecognized — warn (could be a gap in the registry)
      process.stderr.write(
        `WARN: recognized hue "${hue}" but unrecognized role "${role}" in "${property}" — skipping\n`,
      );
      return null;
    }
    return { colorFamily: hue, colorRole: role };
  }

  return null; // 3+ segments (e.g. color-inverse-background) — skip
}

export function migrateColorRole(tokens, hueSet, roleSet, registry, filename) {
  let applied = 0;
  const skipped = [];

  for (const token of tokens) {
    if (!token.name || typeof token.name !== "object") continue;
    if (!token.name.component) continue; // only component-scoped tokens
    if (
      token.name.colorFamily !== undefined ||
      token.name.colorRole !== undefined
    )
      continue; // already migrated

    const property = token.name.property;
    if (!property || !property.startsWith("color-")) continue;

    const parsed = parseColorProperty(property, hueSet, roleSet);
    if (!parsed) {
      // Unrecognized compound: flag as skipped for reporting
      skipped.push({
        file: filename,
        property,
        name: JSON.stringify(token.name),
      });
      continue;
    }

    const { colorFamily, colorRole } = parsed;

    // Build the patched name object
    const patched = { ...token.name, property: "color", colorRole };
    if (colorFamily) patched.colorFamily = colorFamily;

    // Safety: JS serialize() must reproduce the original legacy key exactly.
    // This mirrors the Rust extract_legacy_key gate.
    const originalKey = serialize(
      token.name,
      registry.tokenNameMap,
      registry.serializationOrder,
    );
    const patchedKey = serialize(
      patched,
      registry.tokenNameMap,
      registry.serializationOrder,
    );
    if (originalKey !== patchedKey) {
      throw new Error(
        `Roundtrip mismatch in ${filename}:\n` +
          `  original: ${JSON.stringify(token.name)} → "${originalKey}"\n` +
          `  patched:  ${JSON.stringify(patched)} → "${patchedKey}"\n` +
          `  Aborting — fix the JS serialize() color-domain branch first.`,
      );
    }

    // Apply
    token.name.property = "color";
    token.name.colorRole = colorRole;
    if (colorFamily) token.name.colorFamily = colorFamily;
    applied++;
  }

  return { applied, skipped };
}

async function main() {
  const { write } = parseArgs();
  const registry = loadRegistries();

  // Build hue and role sets from the registries
  const hueSet = registry.byField["colorFamily"] || new Set();
  const roleSet = registry.byField["colorRole"] || new Set();

  if (hueSet.size === 0) {
    console.error("colorFamily registry is empty — run sdk:codegen");
    process.exit(1);
  }
  if (roleSet.size === 0) {
    console.error(
      "colorRole registry is empty — ensure colorRole.json + color-roles.json exist",
    );
    process.exit(1);
  }

  let totalApplied = 0;
  const allSkipped = [];
  const hueSeen = new Map(),
    roleSeen = new Map();

  for (const filename of CASCADE_FILES) {
    const filePath = resolve(CASCADE_DIR, filename);
    const tokens = JSON.parse(readFileSync(filePath, "utf-8"));

    const { applied, skipped } = migrateColorRole(
      tokens,
      hueSet,
      roleSet,
      registry,
      filename,
    );
    totalApplied += applied;
    allSkipped.push(...skipped);

    // Track distinct hues/roles actually migrated
    for (const token of tokens) {
      if (!token.name?.colorRole) continue;
      const cf = token.name.colorFamily;
      const cr = token.name.colorRole;
      if (cf) hueSeen.set(cf, (hueSeen.get(cf) || 0) + 1);
      roleSeen.set(cr, (roleSeen.get(cr) || 0) + 1);
    }

    if (write && applied > 0) {
      writeFileSync(filePath, JSON.stringify(tokens, null, 2) + "\n");
    }
    if (applied > 0) {
      console.log(`  ${filename}: ${applied} applied`);
    }
  }

  console.log(
    `\n=== colorFamily + colorRole migration${write ? " (WROTE)" : " (dry run)"} ===`,
  );
  console.log(`  Applied: ${totalApplied}`);
  if (hueSeen.size > 0) {
    console.log(
      `  Hues:    ${[...hueSeen.entries()].map(([k, n]) => `${k}:${n}`).join("  ")}`,
    );
  }
  if (roleSeen.size > 0) {
    console.log(
      `  Roles:   ${[...roleSeen.entries()].map(([k, n]) => `${k}:${n}`).join("  ")}`,
    );
  }
  if (allSkipped.length > 0) {
    console.log(
      `\n  Skipped (unrecognized compound, manual follow-up needed): ${allSkipped.length}`,
    );
    for (const s of allSkipped) {
      console.log(`    [${s.file}] property="${s.property}" — ${s.name}`);
    }
  }
  if (!write && totalApplied > 0) {
    console.log("\nRun with --write to persist.");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
