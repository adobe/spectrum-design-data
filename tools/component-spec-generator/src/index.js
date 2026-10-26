// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Generates a per-component token spec: for each CTR-bound property, the live token(s)
 * that back it and their resolved values across theme (light/dark/wireframe) and
 * platform (desktop/mobile) contexts.
 *
 * This is the deterministic, always-accurate replacement for the hand-maintained
 * S2 Tokens spec Figma file — Stage 1 of that pipeline (see the plan in
 * .claude/plans, or the design-data-tooling changeset for context). Stage 2 (a Figma
 * plugin) renders this JSON onto a canvas.
 *
 * Reuses the resolution pattern from docs/s2-tokens-viewer/scripts/resolve.mjs
 * (Dataset.fromTokens + CTX_MAP + resolveReference) — the only new part is joining
 * CTR relationship rows (relationships/<component>.json) into that resolution, grouped
 * by the human-readable `context` label (already Figma-spec-style, e.g.
 * "Spacing (top edge to text)").
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const TOKENS_DIR = join(REPO_ROOT, "packages/design-data/tokens");
const RELATIONSHIPS_DIR = join(REPO_ROOT, "packages/design-data/relationships");
const COMPONENTS_DIR = join(REPO_ROOT, "packages/design-data/components");

// Context key -> cascade name-object field mapping. Same mapping resolve.mjs uses.
export const CTX_MAP = {
  light: { colorScheme: "light" },
  dark: { colorScheme: "dark" },
  wireframe: { colorScheme: "wireframe" },
  desktop: { scale: "desktop" },
  mobile: { scale: "mobile" },
};

// Longest-suffix-first so "-extra-large" is matched before the "-large" it contains.
const SIZE_SUFFIXES = [
  "3x-large",
  "2x-large",
  "extra-large",
  "extra-small",
  "large",
  "medium",
  "small",
];
const DENSITY_WORDS = ["compact", "spacious", "regular"];

/**
 * Parse the compact/spacious/default density and size out of a property or legacyKey
 * name string. Density/size aren't first-class token fields post-CTR — they're baked
 * into the name (e.g. `top-to-text-compact-medium`) — so this is pure string parsing,
 * not a lookup. Covers the suffix shapes seen on accordion; not guaranteed exhaustive
 * across all 51 components (see plan's "Density parsing coverage" follow-up).
 * @param {string} name
 * @returns {{ density: string, size: string | null }}
 */
export function parseDensitySize(name) {
  for (const density of DENSITY_WORDS) {
    for (const size of SIZE_SUFFIXES) {
      if (name.endsWith(`-${density}-${size}`)) return { density, size };
    }
  }
  for (const size of SIZE_SUFFIXES) {
    if (name.endsWith(`-${size}`)) return { density: "default", size };
  }
  return { density: "default", size: null };
}

/**
 * Load every cascade-format token file under packages/design-data/tokens/ into one
 * array, ready for `Dataset.fromTokens()`. Unlike docs/s2-tokens-viewer/scripts/resolve.mjs,
 * no conversion step is needed here — these files are already cascade (name-object)
 * shaped, not the legacy spectrum-tokens object-map format that script starts from.
 * @returns {object[]}
 */
export function loadCascadeTokens(tokensDir = TOKENS_DIR) {
  const tokens = [];
  for (const file of readdirSync(tokensDir)
    .filter((f) => f.endsWith(".tokens.json"))
    .sort()) {
    const data = JSON.parse(readFileSync(join(tokensDir, file), "utf-8"));
    if (Array.isArray(data)) tokens.push(...data);
  }
  return tokens;
}

/**
 * Load a component's CTR relationship rows.
 * @returns {object[]}
 */
export function loadRelationships(
  component,
  relationshipsDir = RELATIONSHIPS_DIR,
) {
  const file = join(relationshipsDir, `${component}.json`);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf-8"));
}

/**
 * Load a component's displayName from its schema file.
 * @returns {string}
 */
export function loadDisplayName(component, componentsDir = COMPONENTS_DIR) {
  const file = join(componentsDir, `${component}.json`);
  if (!existsSync(file)) return component;
  const data = JSON.parse(readFileSync(file, "utf-8"));
  return data.displayName || component;
}

/**
 * Resolve one CTR row's `$ref` token uuid to its resolved values across every context
 * in CTX_MAP. Returns null if the uuid isn't a live token (dangling/deprecated ref) —
 * callers should bucket those as unmapped rather than silently drop them, mirroring
 * SPEC-058's "ctr-ref-not-deprecated" spirit.
 *
 * Density/size is parsed from the CTR `property` name, not the resolved token's
 * legacyKey — a size/density variant (e.g. `top-to-text-compact-small` vs.
 * `top-to-text-spacious-small`) can bind to a shared base token
 * (`base-padding-vertical-small`) that carries no density suffix itself. Fall back to
 * the legacyKey only when the property name doesn't carry a size suffix (e.g. a bare
 * `corner-radius` CTR bound straight to `corner-radius-medium-size-small`).
 */
function resolveLiveUuid(uuid, legacyByUuid) {
  const seen = new Set();
  let current = uuid;
  while (legacyByUuid.has(current) && !seen.has(current)) {
    seen.add(current);
    const replacedBy = legacyByUuid.get(current)?.lifecycle?.replacedBy;
    if (!replacedBy) break;
    current = replacedBy;
  }
  return current;
}

function resolveRow(ds, uuid, property, legacyByUuid) {
  const liveUuid = resolveLiveUuid(uuid, legacyByUuid);
  const results = ds.query(`uuid=${liveUuid}`);
  const token = results[0]?.raw;
  const legacyKey = token?.name?.legacyKey;
  if (!legacyKey) return null;

  const values = {};
  for (const [ctx, ctxMap] of Object.entries(CTX_MAP)) {
    const r = ds.resolveReference(`{${legacyKey}}`, ctxMap);
    if (r && r.value !== undefined) values[ctx] = r.value;
  }
  if (Object.keys(values).length === 0) return null;

  const fromProperty = parseDensitySize(property || "");
  const { density, size } = fromProperty.size
    ? fromProperty
    : parseDensitySize(legacyKey);
  return { tokenName: legacyKey, density, size, values };
}

/**
 * Generate the token spec for one component: CTR relationship rows joined to resolved
 * token values, grouped by their `context` label (the Figma-spec-style property
 * description).
 * @param {string} component - component id, e.g. "accordion"
 * @param {{ ds?: import("@adobe/design-data-wasm").Dataset }} [opts] - pass a
 *   pre-built Dataset when generating specs for many components, to avoid rebuilding
 *   it (and re-parsing every token file) per call.
 * @returns {Promise<{ displayName: string, groups: object[], unmapped: object[] }>}
 */
export async function generateComponentSpec(component, opts = {}) {
  let ds = opts.ds;
  if (!ds) {
    const wasm = await import("@adobe/design-data-wasm");
    ds = wasm.Dataset.fromTokens(loadCascadeTokens());
  }

  const relationships = loadRelationships(component);
  const displayName = loadDisplayName(component);

  // relationships/<component>.json mixes pure CTR rows ({scope, context, $ref}) with
  // embedded legacy/deprecated token records ({uuid, value, lifecycle.replacedBy, ...}).
  // A CTR row's $ref can point at one of these legacy uuids instead of a live cascade
  // token directly, so build an index to follow that replacedBy chain in resolveRow.
  const legacyByUuid = new Map(
    relationships.filter((r) => r.uuid).map((r) => [r.uuid, r]),
  );

  const groupsByContext = new Map();
  const unmapped = [];

  for (const row of relationships) {
    const context = row.context;
    const property = row.scope?.property;
    const ref = row.$ref;
    if (!context || !ref) {
      unmapped.push({
        property,
        reason: "no context/$ref (Shape B or malformed row)",
        row,
      });
      continue;
    }

    const resolved = resolveRow(ds, ref, property, legacyByUuid);
    if (!resolved) {
      unmapped.push({
        property,
        context,
        ref,
        reason: "$ref does not resolve to a live token",
      });
      continue;
    }

    if (!groupsByContext.has(context)) {
      groupsByContext.set(context, {
        label: context,
        property,
        rows: [],
        seen: new Set(),
      });
    }
    const group = groupsByContext.get(context);
    const dedupeKey = `${resolved.tokenName}|${resolved.density}|${resolved.size}|${JSON.stringify(resolved.values)}`;
    if (!group.seen.has(dedupeKey)) {
      group.seen.add(dedupeKey);
      group.rows.push(resolved);
    }
  }

  const groups = [...groupsByContext.values()].map(
    ({ label, property, rows }) => ({
      label,
      property,
      rows,
    }),
  );

  return { displayName, groups, unmapped };
}
