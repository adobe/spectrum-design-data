// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * One-time migration: converts the two legacy component/token linking mechanisms
 * into Component/Token Relationships (CTRs) under relationships/*.json.
 *
 * A. Component `tokenBindings` (component-declares-usage) -> relationship-only CTRs
 *    ({ scope, context?, $ref }, no legacyKey — dropped from legacy output by
 *    sdk/core/src/legacy.rs's `ctr_to_legacy_token`, which is correct here since the
 *    *token*, not the binding, owns the legacy key). `tokenBindings[].token` is
 *    resolved to the target token by computing every token's legacy flat key (via
 *    tools/token-mapping-analyzer/src/decomposer.js's `serialize`, which mirrors
 *    sdk/core/src/naming.rs's `extract_legacy_key`) and matching against it.
 *
 * B. `name.component`-scoped tokens (token-declares-scope) -> value-owning CTRs
 *    ({ scope, value|$ref, legacyKey, uuid, ... }), performing the inverse of
 *    `ctr_to_legacy_token` (sdk/core/src/legacy.rs:582): name.component -> scope.component,
 *    name.anatomy -> scope.part, name.property -> scope.property, remaining name.*
 *    keys -> scope.options.*, set_uuid/set_schema -> setUuid/setSchema. legacyKey is
 *    always pinned (from name.legacyKey, else the computed flat key) so the legacy
 *    generator continues to reproduce these tokens byte-identically.
 *
 * Every migrated CTR lands in relationships/<component>.json (one file per component,
 * matching the components/*.json layout), and the migrated source is removed:
 * `tokenBindings` is stripped from the component file (A), and the token entry is
 * removed from its tokens/*.tokens.json file (B) — legacy.rs's `convert_array` assumes
 * tokens/*.json holds only named tokens and relationships/*.json holds only CTRs.
 *
 * Run `prettier --write` on touched files afterward — this repo's default prettier
 * config reproduces the on-disk token format byte-for-byte, so the resulting diff
 * shows only the intended migration changes.
 *
 * Usage: node packages/design-data/scripts/migrate-to-relationships.mjs [--dry-run]
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serialize } from "../../../tools/token-mapping-analyzer/src/decomposer.js";
import { loadRegistries } from "../../../tools/token-mapping-analyzer/src/registry-index.js";
import { nameToScope } from "../../../tools/token-mapping-analyzer/src/ctr-scope.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const TOKENS_DIR = resolve(REPO_ROOT, "packages/design-data/tokens");
const COMPONENTS_DIR = resolve(REPO_ROOT, "packages/design-data/components");
const RELATIONSHIPS_DIR = resolve(REPO_ROOT, "packages/design-data/relationships");

const dryRun = process.argv.includes("--dry-run");

// The 5 token files carrying name.component entries (confirmed by direct read).
// layout.tokens.json and color-palette.tokens.json are mixed — only their
// name.component entries migrate; everything else in those files stays put.
const TOKEN_FILES_WITH_COMPONENT_SCOPE = [
  "color-component.tokens.json",
  "typography.tokens.json",
  "layout-component.tokens.json",
  "layout.tokens.json",
  "color-palette.tokens.json",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  if (dryRun) return;
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

/** Legacy flat key for a token's `name` field, mirroring sdk/core/src/naming.rs's extract_legacy_key. */
function legacyKeyFor(name, registry) {
  if (typeof name === "string") return name;
  if (!name || typeof name !== "object") return null;
  if (typeof name.legacyKey === "string") return name.legacyKey;
  return serialize(name, registry.tokenNameMap, registry.serializationOrder);
}

/**
 * Load every token across tokens/*.tokens.json, keyed by its computed legacy flat
 * key. A key maps to an ARRAY of matches because mode-set tokens (scale-set,
 * color-set, ...) legitimately share one flat legacy key across several
 * per-mode entries (same set_uuid, distinct uuid) — see color-aliases.tokens.json's
 * established convention of parallel per-mode alias entries.
 *
 * Also returns the parsed tokens keyed by file path, so callers that need to
 * re-walk a subset of files (part B, below) don't re-parse them from disk.
 */
function buildFlatKeyIndex(registry) {
  const index = new Map();
  const tokensByFile = new Map();
  for (const file of readdirSync(TOKENS_DIR).filter((f) =>
    f.endsWith(".tokens.json"),
  )) {
    const filePath = join(TOKENS_DIR, file);
    const tokens = readJson(filePath);
    tokensByFile.set(filePath, tokens);
    tokens.forEach((token, tokenIndex) => {
      const key = legacyKeyFor(token.name, registry);
      if (!key) return;
      const entry = { file, filePath, tokenIndex, token };
      if (index.has(key)) {
        index.get(key).push(entry);
      } else {
        index.set(key, [entry]);
      }
    });
  }
  return { index, tokensByFile };
}

/**
 * Convert one component's tokenBindings[] entries into relationship-only CTRs.
 * A binding matching multiple mode-variant tokens (shared set_uuid) emits one CTR
 * per mode, same scope/context, $ref pointing at that mode's specific uuid —
 * mirroring color-aliases.tokens.json's parallel per-mode alias pattern.
 * Returns { ctrs, unresolved } — unresolved bindings are reported, not guessed.
 */
function convertTokenBindings(componentId, tokenBindings, flatKeyIndex) {
  const ctrs = [];
  const unresolved = [];
  for (const binding of tokenBindings) {
    const matches = flatKeyIndex.get(binding.token);
    if (!matches) {
      unresolved.push(binding);
      continue;
    }
    for (const match of matches) {
      const targetName = match.token.name;
      const property =
        typeof targetName === "object" ? targetName.property : undefined;
      ctrs.push({
        scope: {
          component: componentId,
          ...(property !== undefined ? { property } : {}),
        },
        ...(binding.context ? { context: binding.context } : {}),
        $ref: match.token.uuid,
      });
    }
  }
  return { ctrs, unresolved };
}

/**
 * Convert one name.component-scoped token into a value-owning CTR, performing
 * the inverse of sdk/core/src/legacy.rs's ctr_to_legacy_token.
 */
function convertScopedToken(token, registry) {
  const name = token.name;
  const scope = nameToScope(name);
  const legacyKey = legacyKeyFor(name, registry);

  const ctr = {
    scope,
    ...(token.$schema ? { $schema: token.$schema } : {}),
    ...("value" in token ? { value: token.value } : {}),
    ...("$ref" in token ? { $ref: token.$ref } : {}),
    uuid: token.uuid,
    ...(legacyKey ? { legacyKey } : {}),
    ...(token.set_uuid ? { setUuid: token.set_uuid } : {}),
    ...(token.set_schema ? { setSchema: token.set_schema } : {}),
    ...(token.private !== undefined ? { private: token.private } : {}),
    ...(token.lifecycle ? { lifecycle: token.lifecycle } : {}),
  };
  return ctr;
}

function appendRelationships(componentId, ctrs, relationshipsByComponent) {
  if (ctrs.length === 0) return;
  const existing = relationshipsByComponent.get(componentId) ?? [];
  relationshipsByComponent.set(componentId, existing.concat(ctrs));
}

function main() {
  mkdirSync(RELATIONSHIPS_DIR, { recursive: true });
  const registry = loadRegistries();
  const { index: flatKeyIndex, tokensByFile } = buildFlatKeyIndex(registry);

  const relationshipsByComponent = new Map();
  let componentsChanged = 0;
  let bindingsConverted = 0;
  const unresolvedBindings = [];

  // A. tokenBindings -> relationship-only CTRs
  for (const file of readdirSync(COMPONENTS_DIR).filter((f) =>
    f.endsWith(".json"),
  )) {
    const filePath = join(COMPONENTS_DIR, file);
    const component = readJson(filePath);
    if (!Array.isArray(component.tokenBindings)) continue;

    const { ctrs, unresolved } = convertTokenBindings(
      component.name,
      component.tokenBindings,
      flatKeyIndex,
    );
    unresolved.forEach((binding) =>
      unresolvedBindings.push({ component: component.name, binding }),
    );
    appendRelationships(component.name, ctrs, relationshipsByComponent);
    bindingsConverted += ctrs.length;

    // Leave unresolved bindings in place rather than silently dropping them.
    if (unresolved.length > 0) {
      component.tokenBindings = unresolved;
    } else {
      delete component.tokenBindings;
    }
    componentsChanged++;
    writeJson(filePath, component);
  }

  // B. name.component tokens -> value-owning CTRs
  let tokensConverted = 0;
  const tokenFilesChanged = [];
  for (const file of TOKEN_FILES_WITH_COMPONENT_SCOPE) {
    const filePath = join(TOKENS_DIR, file);
    const tokens = tokensByFile.get(filePath);
    const remaining = [];
    let changedInFile = 0;

    for (const token of tokens) {
      const name = token.name;
      if (!name || typeof name !== "object" || !name.component) {
        remaining.push(token);
        continue;
      }
      const ctr = convertScopedToken(token, registry);
      appendRelationships(name.component, [ctr], relationshipsByComponent);
      tokensConverted++;
      changedInFile++;
    }

    if (changedInFile > 0) {
      tokenFilesChanged.push(filePath);
      writeJson(filePath, remaining);
    }
  }

  // Write relationships/<component>.json files
  let relationshipFilesWritten = 0;
  for (const [componentId, ctrs] of relationshipsByComponent) {
    writeJson(join(RELATIONSHIPS_DIR, `${componentId}.json`), ctrs);
    relationshipFilesWritten++;
  }

  console.log(`Components with tokenBindings stripped: ${componentsChanged}`);
  console.log(`tokenBindings converted to relationship-only CTRs: ${bindingsConverted}`);
  console.log(`name.component tokens converted to value-owning CTRs: ${tokensConverted}`);
  console.log(`Token files touched: ${tokenFilesChanged.length}`);
  console.log(`relationships/*.json files written: ${relationshipFilesWritten}`);
  if (unresolvedBindings.length > 0) {
    console.warn(`\nUNRESOLVED tokenBindings (left in place, NOT migrated): ${unresolvedBindings.length}`);
    for (const { component, binding } of unresolvedBindings) {
      console.warn(`  ${component}: "${binding.token}" (context: "${binding.context}")`);
    }
  }
  if (dryRun) {
    console.log("\n(dry run — no files written)");
  } else {
    console.log(
      "\nRun `npx prettier --write` on touched files to normalize formatting.",
    );
  }
}

main();
