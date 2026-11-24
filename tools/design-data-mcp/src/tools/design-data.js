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
 * MCP tool definitions for @adobe/design-data-mcp.
 *
 * All tools run in-process via @adobe/design-data-wasm — no CLI binary or npx
 * required. Dataset.embedded() provides the canonical Spectrum snapshot with
 * zero configuration.
 */

import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve, sep } from "path";

import { searchComponents } from "@adobe/design-data/component";
import { listGuidelines, loadGuideline } from "@adobe/design-data/guideline";

import { checkDatasetFreshness } from "../dataset-freshness.js";
import { findFont } from "../fonts.js";

let _wasm;
/** Lazy-load and cache the wasm module (nodejs target, no init() required). */
async function getWasm() {
  if (!_wasm) _wasm = await import("@adobe/design-data-wasm");
  return _wasm;
}

let _dataset;
/**
 * Return the embedded Spectrum dataset, caching it after first access.
 *
 * Dataset.embedded() clones the in-memory graph on every call; caching here
 * avoids that per-request cost.
 */
async function getDataset() {
  if (!_dataset) {
    const wasm = await getWasm();
    _dataset = wasm.Dataset.embedded();
  }
  return _dataset;
}

/** Return the @adobe/spectrum-design-data package root directory, or null. */
function resolveSpectrumDataPackage() {
  try {
    const req = createRequire(import.meta.url);
    return dirname(req.resolve("@adobe/spectrum-design-data/package.json"));
  } catch {
    return null;
  }
}

/**
 * Load a JSON file from a subdirectory of the design-data package.
 * Throws descriptive errors when the package or file is absent.
 *
 * Path safety: the resolved absolute path is asserted to stay within
 * `<pkgRoot>/<subdir>/` so that a crafted `id` value (e.g. `../../etc/passwd`)
 * cannot read files outside the intended data directory.
 *
 * @param {string} subdir - e.g. "components" or "guidelines"
 * @param {string} id - kebab-case slug, e.g. "button" or "colors"
 */
function loadDataFile(subdir, id) {
  const pkgRoot = resolveSpectrumDataPackage();
  if (!pkgRoot) {
    throw new Error(
      `@adobe/spectrum-design-data is not installed — cannot load ${subdir}/${id}. ` +
        `Install it with: pnpm add @adobe/spectrum-design-data`,
    );
  }

  // Guideline loading (path-traversal guard included) is shared with
  // @adobe/design-data-agent-mcp's describe_guideline tool via
  // @adobe/design-data/guideline — reuse it here instead of duplicating the
  // same containment check.
  if (subdir === "guidelines") {
    try {
      return loadGuideline(resolve(pkgRoot, subdir), id);
    } catch (err) {
      if (err.message.startsWith("Not found:")) {
        throw new Error(
          `${err.message} Call design-data-guideline-list to see available guideline IDs.`,
        );
      }
      throw err;
    }
  }

  const baseDir = resolve(pkgRoot, subdir);
  const filePath = resolve(baseDir, `${id}.json`);
  // Containment check: reject any path that escapes the intended subdirectory.
  if (!filePath.startsWith(baseDir + sep)) {
    throw new Error(`Invalid ${subdir} id: "${id}"`);
  }
  if (!existsSync(filePath)) {
    throw new Error(
      `Not found: "${id}" in ${subdir}/. ` +
        `Call design-data-primer to see available component IDs.`,
    );
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * Load the guidelines/manifest.json catalog.
 * Returns null when the package or manifest does not exist.
 */
function loadGuidelineManifest() {
  const pkgRoot = resolveSpectrumDataPackage();
  if (!pkgRoot) return null;
  const guidelinesDir = join(pkgRoot, "guidelines");
  if (!existsSync(guidelinesDir)) return null;
  return { guidelines: listGuidelines(guidelinesDir) };
}

/**
 * The font status as sent to the model. `searched` (long) only when asked for, and `related`
 * capped: a machine with Creative Cloud can list nineteen Adobe Clean families, none used.
 */
export function fontSummary(status, full = false) {
  const { searched, related, ...rest } = status;
  const out = { ...rest, related: related.slice(0, RELATED_SHOWN) };
  if (related.length > RELATED_SHOWN) {
    out.relatedMore = related.length - RELATED_SHOWN;
  }
  return full ? { ...out, searched } : out;
}

const RELATED_SHOWN = 5;

const DEFAULT_QUERY_LIMIT = 25;
const MAX_QUERY_LIMIT = 200;
const DEFAULT_COMPONENT_TOKENS_LIMIT = 40;
const MODE_FIELDS = ["colorScheme", "scale", "contrast"];

let _uuidIndex;
/** uuid -> token record, built once; used to follow alias chains by $ref. */
function uuidIndex(ds) {
  if (!_uuidIndex) _uuidIndex = new Map(ds.query("").map((t) => [t.uuid, t]));
  return _uuidIndex;
}

const isDeprecated = (token) => Boolean(token.raw?.lifecycle?.deprecatedIn);

let _modeSets;
/** The dataset's mode-sets as [{ name, modes }], read once. */
function modeSets(ds) {
  if (!_modeSets) _modeSets = ds.primer().modeSets;
  return _modeSets;
}

/**
 * The final value of a token, as `{ value }`, or `{ values }` when it depends on a mode the
 * token's own name does not pin. Following the alias chain saves an agent one query per hop,
 * but an alias like `accent-content-color-default` has no `colorScheme` of its own while its
 * target does: a single value would silently be the light one.
 */
function tokenValue(ds, token) {
  if (token.raw.value !== undefined) return { value: token.raw.value };
  const name = token.raw.name ?? {};
  if (name.legacyKey) {
    const ref = `{${name.legacyKey}}`;
    const pinned = {};
    for (const mode of MODE_FIELDS) if (name[mode]) pinned[mode] = name[mode];
    const base = ds.resolveReference(ref, pinned);
    if (base?.value !== undefined) {
      const values = {};
      for (const { name: set, modes } of modeSets(ds)) {
        if (pinned[set]) continue;
        const byMode = {};
        for (const mode of modes) {
          byMode[mode] = ds.resolveReference(ref, {
            ...pinned,
            [set]: mode,
          })?.value;
        }
        if (new Set(Object.values(byMode)).size > 1) values[set] = byMode;
      }
      return Object.keys(values).length ? { values } : { value: base.value };
    }
  }
  let current = token;
  for (let hop = 0; hop < 8; hop++) {
    const ref = current.aliasTarget ?? current.raw.$ref;
    const next = ref && uuidIndex(ds).get(ref);
    if (!next) return {};
    if (next.raw.value !== undefined) return { value: next.raw.value };
    current = next;
  }
  return {};
}

let _conceptRows;
/** conceptId -> every mode row of that token, built once; a relationship may $ref a concept. */
function conceptRows(ds) {
  if (!_conceptRows) {
    _conceptRows = new Map();
    for (const t of ds.query("")) {
      const id = t.raw.conceptId;
      if (id) _conceptRows.set(id, [...(_conceptRows.get(id) ?? []), t]);
    }
  }
  return _conceptRows;
}

/** Every mode row of the token that `text` names: a uuid, conceptId, legacy name or token label. */
function findTokenRows(ds, text) {
  const name = String(text).replace(/^\{|\}$/g, "");
  const byUuid = uuidIndex(ds).get(name);
  const concept =
    byUuid?.raw.conceptId ??
    (conceptRows(ds).has(name) ? name : undefined) ??
    ds
      .query("")
      .find((t) => t.raw.name?.legacyKey === name || tokenLabel(t) === name)
      ?.raw.conceptId;
  if (concept) return conceptRows(ds).get(concept) ?? [];
  return byUuid ? [byUuid] : [];
}

/** Parse `#rgb`, `#rrggbb`, `rgb(r, g, b)` or `rgba(r, g, b, a)` to { r, g, b, a }, or undefined. */
function parseColor(text) {
  const value = String(text).trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (hex) {
    const h =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(
      value,
    );
  if (rgb) {
    const a =
      rgb[4] === undefined
        ? 1
        : rgb[4].endsWith("%")
          ? parseFloat(rgb[4]) / 100
          : parseFloat(rgb[4]);
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a };
  }
}

/** WCAG 2 relative luminance of an opaque color. */
function luminance({ r, g, b }) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** A token's name without its mode fields, e.g. `property=color colorFamily=gray scaleIndex=300`. */
function tokenLabel(token) {
  const { legacyKey, ...fields } = token.raw.name ?? {};
  if (legacyKey) return legacyKey;
  return Object.entries(fields)
    .filter(([key]) => !MODE_FIELDS.includes(key))
    .map(([key, value]) => `${key}=${[value].flat().join("+")}`)
    .join(" ");
}

/** The rows a relationship `$ref` points at: every mode row of the token, or just that row. */
function refRows(ds, ref) {
  const row = uuidIndex(ds).get(ref);
  const concept = row?.raw.conceptId ?? ref;
  return conceptRows(ds).get(concept) ?? (row ? [row] : []);
}

/** One value, or values by mode-set then mode, from the rows of one token. */
function rowsValue(ds, rows) {
  const byMode = {};
  let plain;
  for (const row of rows) {
    const result = tokenValue(ds, row);
    if (result.values) {
      for (const [set, modes] of Object.entries(result.values)) {
        byMode[set] = { ...byMode[set], ...modes };
      }
      continue;
    }
    const pinned = MODE_FIELDS.filter((mode) => row.raw.name?.[mode]);
    if (!pinned.length) plain = result.value;
    for (const set of pinned) {
      byMode[set] = { ...byMode[set], [row.raw.name[set]]: result.value };
    }
  }
  for (const [set, modes] of Object.entries(byMode)) {
    if (
      new Set(Object.values(modes).map((v) => JSON.stringify(v))).size === 1
    ) {
      plain = Object.values(modes)[0];
      delete byMode[set];
    }
  }
  return Object.keys(byMode).length ? { values: byMode } : { value: plain };
}

const TYPOGRAPHY_SCHEMA = "token-types/typography.json";
const STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
];

/**
 * A typography composite as `style`: each sub-value is `{ value }`, or `{ values }` by mode-set
 * then mode when its `{alias}` has rows that differ by mode (font-size-100 is 14px on desktop and
 * 17px on mobile). The raw composite holds unresolved `{font-size-100}` strings.
 */
function typeStyle(ds, composite) {
  const style = {};
  for (const key of STYLE_KEYS) {
    const raw = composite[key];
    if (raw === undefined) continue;
    const alias = /^\{(.+)\}$/.exec(raw)?.[1];
    if (!alias) {
      style[key] = { value: raw };
      continue;
    }
    const ref = `{${alias}}`;
    const values = {};
    for (const { name: set, modes } of modeSets(ds)) {
      const byMode = {};
      for (const mode of modes) {
        byMode[mode] = ds.resolveReference(ref, { [set]: mode })?.value;
      }
      if (new Set(Object.values(byMode)).size > 1) values[set] = byMode;
    }
    style[key] = Object.keys(values).length
      ? { values }
      : { value: ds.resolveReference(ref, {})?.value };
  }
  return style;
}

/** Whether a relationship's `state` pin (ids, or `{ anyOf: [...] }`) includes `state`. */
function appliesInState(pin, state) {
  return [pin].flat().some((s) => s === state || s?.anyOf?.includes(state));
}

/**
 * A component's relationship records as bindings: which token it uses for what (`context`,
 * `property`, `part`), under which options (`when`), with the token's final value. Records
 * that differ only by the mode row they point at are one binding.
 */
function componentBindings(ds, component) {
  const bindings = new Map();
  for (const record of ds.componentRelationships(component)) {
    const { part, property, options } = record.scope ?? {};
    const rows = record.$ref ? refRows(ds, record.$ref) : [];
    const token = rows[0] ? tokenLabel(rows[0]) : record.legacyKey;
    const key = JSON.stringify([
      record.context,
      property,
      part,
      options,
      token,
    ]);
    if (bindings.has(key)) continue;
    const binding = { context: record.context, property };
    if (part) binding.part = part;
    if (options && Object.keys(options).length) binding.when = options;
    if (token) binding.token = token;
    if (rows[0]) binding.tier = rows[0].tier;
    const composite = rows[0]?.raw.$schema?.endsWith(TYPOGRAPHY_SCHEMA)
      ? tokenValue(ds, rows[0]).value
      : undefined;
    if (composite && typeof composite === "object") {
      binding.style = typeStyle(ds, composite);
    } else {
      Object.assign(
        binding,
        rows.length ? rowsValue(ds, rows) : { value: record.value },
      );
    }
    bindings.set(key, binding);
  }
  return [...bindings.values()];
}

/** Collapse a binding's per-mode `values` to one `value` for the requested modes. */
function pickMode(binding, modes) {
  let out = binding;
  for (const [mode, wanted] of Object.entries(modes)) {
    const byMode = out.values?.[mode];
    if (!wanted || !byMode || !(wanted in byMode)) continue;
    const { [mode]: _picked, ...rest } = out.values;
    out = {
      ...out,
      values: undefined,
      ...(Object.keys(rest).length
        ? { values: rest }
        : { value: byMode[wanted] }),
    };
    if (out.values === undefined) delete out.values;
  }
  return out;
}

const TIER_RANK = { primitive: 0, semantic: 1, component: 2 };

/** Most specific first: tier, then purpose-field count (both from the token's name). */
function bySpecificity(a, b) {
  return (
    TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.purposeCount - a.purposeCount
  );
}

/** Name, final value, layer and modes: what an agent needs, without `raw` or file paths. */
function compactToken(ds, token) {
  const { legacyKey, ...fields } = token.raw.name ?? {};
  const out = {
    name:
      legacyKey ??
      Object.entries(fields)
        .map(([key, value]) => `${key}=${[value].flat().join("+")}`)
        .join(" "),
    ...tokenValue(ds, token),
    layer: token.layer,
    tier: token.tier,
    uuid: token.uuid,
  };
  if (token.purposeFields?.length) out.purposeFields = token.purposeFields;
  for (const mode of MODE_FIELDS) if (fields[mode]) out[mode] = fields[mode];
  if (isDeprecated(token)) out.deprecated = true;
  return out;
}

export function createDesignDataTools() {
  return [
    // ── primer ─────────────────────────────────────────────────────────────
    {
      name: "design-data-primer",
      annotations: {
        title: "Design Data: Primer",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Get a structural overview of the Spectrum design dataset: token count, " +
        "available mode-sets (color-scheme, scale, contrast), component list, " +
        "taxonomy fields, guideline categories, and data provenance. Call this at the " +
        "start of a design-token session to understand what data is available.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      async handler() {
        const [wasm, ds] = await Promise.all([getWasm(), getDataset()]);

        const manifest = loadGuidelineManifest();
        const guidelinesSummary = manifest
          ? {
              count: manifest.guidelines.length,
              categories: [
                ...new Set(
                  manifest.guidelines.map((g) => g.category).filter(Boolean),
                ),
              ].sort(),
            }
          : null;

        // Provenance carries source + designDataVersion (the @adobe/spectrum-design-data
        // package version baked into the wasm at build time via EMBEDDED_DATA_VERSION).
        const {
          provenance,
          modeSets,
          tokenTiers,
          semanticSpecificity,
          taxonomyFields: coreFields,
        } = ds.primer();
        const modesOf = (name) =>
          modeSets.find((m) => m.name === name)?.modes ?? [];
        // Best-effort staleness check (spectrum-design-data-9fe.5) — silent on
        // failure, never blocks the primer response.
        const datasetStatus = await checkDatasetFreshness(
          provenance.designDataVersion,
        );

        return {
          // top-level source is the legacy skill-contract field; provenance.source
          // duplicates it intentionally — provenance is the richer metrics object
          // and consumers should prefer it going forward.
          source: "embedded",
          tokenCount: ds.tokenCount(),
          modeSets: {
            colorScheme: modesOf("colorScheme"),
            scale: modesOf("scale"),
            contrast: modesOf("contrast"),
          },
          taxonomyFields: {
            indexed: wasm.getIndexedFields(),
            advisory: wasm.getAdvisoryFields() ?? [],
          },
          tokenTiers,
          semanticSpecificity,
          fieldTiers: Object.fromEntries(
            (coreFields ?? [])
              .filter((f) => f.allowedTokenTiers || f.impliesTokenTier)
              .map((f) => [
                f.name,
                {
                  allowedTokenTiers: f.allowedTokenTiers,
                  impliesTokenTier: f.impliesTokenTier,
                },
              ]),
          ),
          components: wasm.getFieldValues("component") ?? [],
          properties: wasm.getFieldValues("property") ?? [],
          guidelines: guidelinesSummary,
          provenance: datasetStatus
            ? { ...provenance, datasetStatus }
            : provenance,
        };
      },
    },

    // ── query ───────────────────────────────────────────────────────────────
    {
      name: "design-data-query",
      annotations: {
        title: "Design Data: Query Tokens",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Filter Spectrum tokens by a query expression. " +
        "Filterable fields: property, component, variant, state, colorScheme, scale, contrast, uuid, tier, " +
        "and the purpose fields object (background, border, ...), anatomy and colorRole, which narrow " +
        "to tokens for a part or role, e.g. `tier=semantic,object=background,colorRole=accent`. " +
        "`tier` is primitive, semantic or component, declared by the token or derived from its name and value; " +
        "e.g. `tier=semantic,property=color`. " +
        "`key=value` pairs join with `,` (AND) or `|` (OR); `!=` negates and `*` is a wildcard. " +
        "`component` matches tokens bound to that component by its relationships. " +
        "Examples: `component=button`, `component=button,state=hover`, " +
        "`property=*color*`, `colorScheme=dark`. " +
        "Property names are exact or wildcard (e.g. `*color*`); variant values are " +
        "listed in the dataset, so `variant=accent` matches nothing. " +
        "Returns { total, shown, tokens }: each token has its name, final value (aliases " +
        "already followed; `values` by mode instead when it differs by colorScheme, scale or " +
        "contrast), layer, tier, purposeFields (the name fields that give it a semantic role; " +
        "more means more specific), uuid and modes, active tokens first. At most `limit` " +
        "(default 25) are shown; when `total` is larger, narrow the filter " +
        "(state=, property=, colorScheme=) instead of raising the limit. " +
        'Pass detail "full" for the complete token objects.',
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description:
              'Query expression, e.g. "component=button" or "property=color-*,component=action-button"',
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: MAX_QUERY_LIMIT,
            description: `Maximum tokens to return (default ${DEFAULT_QUERY_LIMIT}, max ${MAX_QUERY_LIMIT})`,
            default: DEFAULT_QUERY_LIMIT,
          },
          sort: {
            type: "string",
            enum: ["name", "specificity"],
            description:
              "name (default): as matched. specificity: most specific first (tier, then purposeFields), deprecated last.",
            default: "name",
          },
          detail: {
            type: "string",
            enum: ["compact", "full"],
            description:
              "compact (default): name, value, layer, uuid, modes. full: the complete token objects (large).",
            default: "compact",
          },
        },
        required: ["filter"],
        additionalProperties: false,
      },
      async handler({
        filter,
        limit = DEFAULT_QUERY_LIMIT,
        detail = "compact",
        sort = "name",
      }) {
        const ds = await getDataset();
        const found = ds.query(filter);
        const matches =
          sort === "specificity" ? [...found].sort(bySpecificity) : found;
        const ordered = [
          ...matches.filter((t) => !isDeprecated(t)),
          ...matches.filter(isDeprecated),
        ];
        const cap = Math.min(
          Math.max(Math.trunc(Number(limit)) || DEFAULT_QUERY_LIMIT, 1),
          MAX_QUERY_LIMIT,
        );
        const shown = ordered.slice(0, cap);
        const out = {
          total: matches.length,
          shown: shown.length,
          tokens:
            detail === "full" ? shown : shown.map((t) => compactToken(ds, t)),
        };
        if (matches.length > shown.length) {
          out.hint =
            `Showing ${shown.length} of ${matches.length}. Narrow the filter ` +
            "(state=, property=, colorScheme=, scale=) instead of raising limit.";
        }
        return out;
      },
    },

    // ── suggest ─────────────────────────────────────────────────────────────
    {
      name: "design-data-suggest",
      annotations: {
        title: "Design Data: Suggest Tokens",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Suggest Spectrum tokens matching a natural-language intent using Jaccard similarity " +
        "scoring over token name segments, name-object fields, and description text. " +
        "Returns matches ranked by confidence, each with its token name, final value (aliases " +
        "already followed; `values` by mode when it differs by mode), layer, uuid and modes. " +
        "Use when the user describes what they need rather than knowing the token name.",
      inputSchema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description:
              'Natural-language description of the design need, e.g. "primary CTA button background color"',
          },
          limit: {
            type: "number",
            description: "Maximum number of suggestions to return (default: 5)",
            default: 5,
          },
        },
        required: ["intent"],
        additionalProperties: false,
      },
      async handler({ intent, limit = 5 }) {
        const ds = await getDataset();
        return ds.suggest(intent, undefined, limit).map((match) => {
          const token = uuidIndex(ds).get(match.tokenUuid);
          return {
            ...(token ? compactToken(ds, token) : { name: match.tokenName }),
            confidence: match.confidence,
          };
        });
      },
    },

    // ── refinements ─────────────────────────────────────────────────────────
    {
      name: "design-data-refinements",
      annotations: {
        title: "Design Data: Token Specificity and Refinements",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Show how specific a token is and which same-property tokens are narrower or broader. " +
        "Specificity is tier, then the number of purpose fields (name fields that give a " +
        "semantic role, such as colorRole, object, state); it is derived from the name, not " +
        "stored. `narrower` tokens have every field of this token plus more purpose fields; " +
        "`broader` tokens lack some of its purpose fields. `fields` lists what a neighbor adds " +
        "(narrower) or lacks (broader). `valueMatch` is `drop-in` when the resolved value is " +
        "the same in every mode, `consider` when it differs (`differingModes`, or `all`). " +
        "Specificity only orders tokens: check that the added fields (for example " +
        "variant=subtle) fit what you are building before using a narrower token, and treat " +
        "`consider` as a design question. Use it to pick among tokens for a custom component " +
        "or to check whether a more specific token exists for a state or part. " +
        "Uses the embedded field catalog.",
      inputSchema: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description:
              "Token name (e.g. neutral-content-color-hover), uuid or conceptId. A token without a name shown by query as `property=corner-radius scaleIndex=500` can be passed as that text.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            description:
              "Maximum narrower and broader tokens to list, each (default 10)",
            default: 10,
          },
        },
        required: ["token"],
        additionalProperties: false,
      },
      async handler({ token, limit = 10 }) {
        const ds = await getDataset();
        const result = ds.refinements(token, limit);
        if (!result)
          throw new Error(
            `No token found for "${token}". Use a token name, uuid or conceptId, or the name shown by design-data-query.`,
          );
        return result;
      },
    },

    // ── component tokens ────────────────────────────────────────────────────
    {
      name: "design-data-component-tokens",
      annotations: {
        title: "Design Data: Component Token Bindings",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Which tokens a component uses for what. Returns the component's relationship records as " +
        "bindings: `context` (e.g. Background, Border, Label), `property`, `part`, `when` (the " +
        "options and `state` the binding applies under), the `token` and its `tier`, and its " +
        "final value (`values` by mode when it differs). Use this to answer 'what does X use for " +
        "its border in the hover state' in one call, instead of querying tokens by component, " +
        "which does not say what each token is for. A binding without `when` is the default; one " +
        "with `when` replaces it under those options. Filter with `context`, `property` or " +
        "`state`, which matches the component's declared state ids exactly (text-field has both " +
        "`focus-+-not-hover` and `keyboard-focus`; they are different states) and lists the other " +
        "states that have bindings in `otherStates`, so a state with no binding of its own is " +
        "visible without a second call; at most `limit` (default 40) are shown, so narrow the filter when `total` is " +
        'larger. Narrow by option values with `options` (e.g. {"variant":"accent","style":"fill"}) and ' +
        "collapse per-mode values to one with `colorScheme` and `scale`. Options like isDisabled are not " +
        "states: pass them in `options`. If the component has no binding for something, the data has none: say so " +
        "instead of guessing.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description:
              "Component ID in kebab-case, e.g. text-field, action-button",
          },
          context: {
            type: "string",
            description:
              'Only bindings whose context contains this text (case-insensitive), e.g. "border"',
          },
          property: {
            type: "string",
            description:
              'Only bindings for this property, e.g. "color" or "corner-radius"',
          },
          state: {
            type: "string",
            description:
              'Only bindings that apply in this state, e.g. "hover" (bindings with no state are included)',
          },
          options: {
            type: "object",
            description:
              'Only bindings that apply under these option values, e.g. {"variant":"accent","style":"fill","isSelected":true}. A binding that does not pin an option is kept; one that pins it to other values is dropped.',
            additionalProperties: true,
          },
          colorScheme: {
            type: "string",
            description:
              'Collapse `values.colorScheme` to the single `value` for this scheme, e.g. "dark"',
          },
          scale: {
            type: "string",
            description:
              'Collapse `values.scale` to the single `value` for this scale, "desktop" or "mobile"',
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: MAX_QUERY_LIMIT,
            description: `Maximum bindings to return (default ${DEFAULT_COMPONENT_TOKENS_LIMIT})`,
            default: DEFAULT_COMPONENT_TOKENS_LIMIT,
          },
        },
        required: ["component"],
        additionalProperties: false,
      },
      async handler({
        component,
        context,
        property,
        state,
        options,
        colorScheme,
        scale,
        limit = DEFAULT_COMPONENT_TOKENS_LIMIT,
      }) {
        const ds = await getDataset();
        let bindings = componentBindings(ds, component);
        if (!bindings.length) {
          throw new Error(
            `No relationships for "${component}". Call design-data-component-search or design-data-primer for component IDs.`,
          );
        }
        if (context) {
          const text = String(context).toLowerCase();
          bindings = bindings.filter((b) =>
            String(b.context ?? "")
              .toLowerCase()
              .includes(text),
          );
        }
        if (property)
          bindings = bindings.filter((b) => b.property === property);
        if (options) {
          bindings = bindings.filter((b) =>
            Object.entries(options).every(([key, value]) => {
              const pinned = b.when?.[key];
              return pinned === undefined || [pinned].flat().includes(value);
            }),
          );
        }
        let otherStates;
        let unpinnedState = false;
        if (state) {
          const applies = (b) =>
            !b.when?.state || appliesInState(b.when.state, state);
          otherStates = [
            ...new Set(
              bindings
                .filter((b) => !applies(b))
                .flatMap((b) => [b.when.state].flat())
                .flatMap((s) =>
                  typeof s === "string" ? [s] : (s?.anyOf ?? []),
                ),
            ),
          ];
          unpinnedState =
            state !== "default" &&
            !bindings.some(
              (b) => b.when?.state && appliesInState(b.when.state, state),
            );
          bindings = bindings.filter(applies);
        }
        const cap = Math.min(
          Math.max(
            Math.trunc(Number(limit)) || DEFAULT_COMPONENT_TOKENS_LIMIT,
            1,
          ),
          MAX_QUERY_LIMIT,
        );
        const out = {
          component,
          total: bindings.length,
          shown: Math.min(bindings.length, cap),
          bindings: bindings
            .slice(0, cap)
            .map((b) => pickMode(b, { colorScheme, scale })),
        };
        if (otherStates?.length) out.otherStates = otherStates;
        if (unpinnedState) {
          out.stateHint = `No binding pins state "${state}", so only bindings that apply in every state are shown. Options such as isDisabled or isSelected are not states: pass them in \`options\`.`;
        }
        if (bindings.length > cap) {
          out.hint = `Showing ${cap} of ${bindings.length}. Narrow with context, property or state.`;
        }
        return out;
      },
    },

    // ── contrast ────────────────────────────────────────────────────────────
    {
      name: "design-data-contrast",
      annotations: {
        title: "Design Data: Contrast Ratio",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "WCAG 2 contrast ratio between two colors, each a hex or rgb() value or a token name, uuid or " +
        "conceptId (resolved for `colorScheme`, default light). Returns the ratio and whether it meets " +
        "3:1 (non-text, large text), 4.5:1 (text) and 7:1. A semi-transparent color is flattened over the " +
        "background (when the foreground is transparent) and the result says so. This reports a fact; " +
        "whether a combination is acceptable is the author's call.",
      inputSchema: {
        type: "object",
        properties: {
          foreground: { type: "string", description: "Hex, rgb() or token" },
          background: { type: "string", description: "Hex, rgb() or token" },
          colorScheme: {
            type: "string",
            description:
              'Mode to resolve tokens in, "light" (default), "dark" or "wireframe"',
          },
        },
        required: ["foreground", "background"],
        additionalProperties: false,
      },
      async handler({ foreground, background, colorScheme = "light" }) {
        const ds = await getDataset();
        const resolve = (input) => {
          const direct = parseColor(input);
          if (direct) return { color: direct, from: String(input) };
          const rows = findTokenRows(ds, input);
          if (!rows.length) {
            throw new Error(
              `"${input}" is not a color (hex or rgb()) or a known token.`,
            );
          }
          const result = rowsValue(ds, rows);
          const value =
            result.value ?? result.values?.colorScheme?.[colorScheme];
          const color =
            typeof value === "string" ? parseColor(value) : undefined;
          if (!color) {
            throw new Error(
              `Token "${input}" has no color value for colorScheme "${colorScheme}".`,
            );
          }
          return { color, from: tokenLabel(rows[0]), value };
        };
        const fg = resolve(foreground);
        const bg = resolve(background);
        const notes = [];
        if (bg.color.a < 1)
          notes.push(
            "Background is semi-transparent; it was treated as opaque.",
          );
        let top = fg.color;
        if (top.a < 1) {
          const over = (c, b) => Math.round(c * top.a + b * (1 - top.a));
          top = {
            r: over(top.r, bg.color.r),
            g: over(top.g, bg.color.g),
            b: over(top.b, bg.color.b),
            a: 1,
          };
          notes.push(
            "Foreground is semi-transparent; it was flattened over the background.",
          );
        }
        const [hi, lo] = [luminance(top), luminance(bg.color)].sort(
          (a, b) => b - a,
        );
        const ratio = Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
        const out = {
          ratio,
          meets: {
            "3:1": ratio >= 3,
            "4.5:1": ratio >= 4.5,
            "7:1": ratio >= 7,
          },
          foreground: fg.value ? { token: fg.from, value: fg.value } : fg.from,
          background: bg.value ? { token: bg.from, value: bg.value } : bg.from,
          colorScheme,
        };
        if (notes.length) out.notes = notes;
        return out;
      },
    },

    // ── component ───────────────────────────────────────────────────────────
    {
      name: "design-data-component",
      annotations: {
        title: "Design Data: Get Component",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Get the full component declaration for a Spectrum component by ID. " +
        "Returns the component's displayName, description, and all available options " +
        "(variants, sizes, states, boolean props, etc.). " +
        "Component IDs are kebab-case, e.g. button, action-button, text-field, picker.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Component ID in kebab-case, e.g. button, action-button, picker, text-field",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      async handler({ id }) {
        return loadDataFile("components", id);
      },
    },

    // ── component search ────────────────────────────────────────────────────
    {
      name: "design-data-component-search",
      annotations: {
        title: "Design Data: Search Components",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Search Spectrum components by name, description, or documentation text " +
        '(e.g. "date", "form input", "navigation"). Returns id, displayName, ' +
        "category, and a snippet per match; a component that exists only inside another " +
        "carries subcomponent: true and usedIn (its derived hosts). Use the id with design-data-component " +
        "for the full declaration.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Words to look for, e.g. 'select from a list'",
          },
          category: {
            type: "string",
            description: "Optional component category filter, e.g. actions",
          },
          limit: {
            type: "integer",
            minimum: 1,
            description: "Maximum number of results (default: 10)",
            default: 10,
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
      async handler({ query, category, limit = 10 }) {
        const pkgRoot = resolveSpectrumDataPackage();
        if (!pkgRoot) {
          throw new Error(
            "@adobe/spectrum-design-data is not installed — cannot search components. " +
              "Install it with: pnpm add @adobe/spectrum-design-data",
          );
        }
        const results = searchComponents(
          resolve(pkgRoot, "components"),
          query,
          {
            category,
            limit,
          },
        );
        return { results, total: results.length };
      },
    },

    // ── resolve ─────────────────────────────────────────────────────────────
    {
      name: "design-data-resolve",
      annotations: {
        title: "Design Data: Resolve Token",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Resolve the concrete value of a Spectrum token property for a given " +
        "mode-set context (color-scheme, scale, contrast). " +
        "Optionally narrow by component, variant, state, or colorRole; a property " +
        "name is shared by many tokens, so narrowing is usually needed. " +
        "Returns the winning token (active tokens rank above deprecated ones) with its " +
        "resolved value. `ambiguous: true` means several tokens still match: " +
        "see `candidateCount` and `alternatives`, and narrow further.",
      inputSchema: {
        type: "object",
        properties: {
          property: {
            type: "string",
            description:
              "Token property name, e.g. background-color-default, accent-color",
          },
          colorScheme: {
            type: "string",
            description: 'Color scheme mode, e.g. "light" or "dark"',
          },
          scale: {
            type: "string",
            description: 'Scale mode, e.g. "desktop" or "mobile"',
          },
          contrast: {
            type: "string",
            description: 'Contrast mode, e.g. "regular" or "high"',
          },
          component: {
            type: "string",
            description: 'Narrow to tokens bound to a component, e.g. "button"',
          },
          variant: {
            type: "string",
            description: 'Narrow by variant, e.g. "negative" or "subdued"',
          },
          state: {
            type: "string",
            description: 'Narrow by state, e.g. "hover" or "down"',
          },
          colorRole: {
            type: "string",
            description: 'Narrow by color role, e.g. "accent"',
          },
          excludeDeprecated: {
            type: "boolean",
            description: "Ignore deprecated tokens entirely (default: false)",
          },
        },
        required: ["property"],
        additionalProperties: false,
      },
      async handler({
        property,
        colorScheme,
        scale,
        contrast,
        component,
        variant,
        state,
        colorRole,
        excludeDeprecated,
      }) {
        const ds = await getDataset();
        const context = {};
        if (colorScheme) context.colorScheme = colorScheme;
        if (scale) context.scale = scale;
        if (contrast) context.contrast = contrast;
        const narrowing = {};
        if (component) narrowing.component = component;
        if (variant) narrowing.variant = variant;
        if (state) narrowing.state = state;
        if (colorRole) narrowing.colorRole = colorRole;
        if (excludeDeprecated) narrowing.excludeDeprecated = true;
        const result = ds.resolve(property, context, narrowing);
        if (!result) {
          throw new Error(
            `No token found for property "${property}" in context ${JSON.stringify(context)}` +
              (Object.keys(narrowing).length
                ? ` with narrowing ${JSON.stringify(narrowing)}`
                : ""),
          );
        }
        return result;
      },
    },

    // ── guideline-list ──────────────────────────────────────────────────────
    {
      name: "design-data-guideline-list",
      annotations: {
        title: "Design Data: List Guidelines",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "List available Spectrum design guideline pages. " +
        "Returns catalog entries with slug, title, category, status, and sourceUrl. " +
        "Use this to discover guideline IDs before calling design-data-guideline. " +
        "Optionally filter by category: designing, fundamentals, developing, or support.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["designing", "fundamentals", "developing", "support"],
            description:
              "Filter results to a specific category (optional). " +
              "Omit to return all guidelines.",
          },
        },
        additionalProperties: false,
      },
      async handler({ category } = {}) {
        const manifest = loadGuidelineManifest();
        if (!manifest) {
          throw new Error(
            `guidelines/manifest.json not found in @adobe/spectrum-design-data. ` +
              `Run: node tools/s2-docs-to-document-blocks/src/cli.js guideline`,
          );
        }
        const entries = category
          ? manifest.guidelines.filter((g) => g.category === category)
          : manifest.guidelines;
        return { guidelines: entries, total: entries.length };
      },
    },

    // ── guideline ───────────────────────────────────────────────────────────
    {
      name: "design-data-guideline",
      annotations: {
        title: "Design Data: Get Guideline",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Get the full guideline document for a Spectrum design page by ID. " +
        "Returns the guideline's title, category, metadata, and documentBlocks body " +
        "(purpose, guideline, accessibility, do-dont, and examples blocks). " +
        "Call design-data-guideline-list first to discover available guideline IDs. " +
        "The `id` is the `slug` value returned by design-data-guideline-list.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Guideline ID (kebab-case slug) as returned by design-data-guideline-list, " +
              "e.g. colors, motion, typography-fundamentals",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      async handler({ id }) {
        return loadDataFile("guidelines", id);
      },
    },

    // ── visual recipe ───────────────────────────────────────────────────────
    {
      name: "design-data-visual-recipe",
      annotations: {
        title: "Design Data: Get Visual Recipe",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Get the visual recipe (parts, layout, and token bindings used to draw it) for a " +
        "Spectrum component by ID, e.g. button, action-button, badge. Only components " +
        "with a recipe are available; use design-data-render to draw one as SVG.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Component ID in kebab-case, e.g. action-button",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      async handler({ id }) {
        const ds = await getDataset();
        const recipe = ds.visualRecipe(id);
        if (!recipe) {
          throw new Error(
            `No visual recipe for "${id}". Available: ${ds.visualRecipes().join(", ")}`,
          );
        }
        return recipe;
      },
    },

    // ── render ──────────────────────────────────────────────────────────────
    {
      name: "design-data-render",
      annotations: {
        title: "Design Data: Render Component",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Render a Spectrum component from its visual recipe, resolving token values for the " +
        "given size, states, options, and mode. Returns SVG markup as text by default, or " +
        'a PNG image with format "png". Only components with a recipe can be rendered ' +
        "(see design-data-visual-recipe). SVG label boxes are sized with Adobe Clean Spectrum VF when " +
        "it is installed on this machine (not with fontPath), otherwise with Source Sans 3 widths. PNG text uses Adobe Clean Spectrum VF when it is " +
        "installed on this machine (found automatically, or set with the fontPath argument " +
        "or the DESIGN_DATA_FONT environment variable), else Adobe Clean VF (Roman .ttf), " +
        "else a bundled open font. The result includes a font status: when font.fallback is " +
        "true, tell the user which font was used (font.using, font.family), that its " +
        "metrics, spacing and wrapping may differ, and pass on font.help; do not call the " +
        "image exact. When font.found is true, do not tell the user to download anything.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "Component ID in kebab-case, e.g. action-button",
          },
          size: {
            type: "string",
            description: 'Size, e.g. "s", "m", "l" (default: "m")',
            default: "m",
          },
          states: {
            type: "array",
            items: { type: "string" },
            description: 'Interaction states, e.g. ["hover"] or ["focus-ring"]',
          },
          options: {
            type: "object",
            description:
              "Component options from the recipe, e.g. { isSelected: true, variant: 'accent' }",
          },
          icon: {
            description:
              'Replace the component\'s content icon (e.g. a button\'s icon): { "set": "workflow", "name": "edit" }, ' +
              'or "none" to hide an optional one. Do not use options.icon: it is ignored. ' +
              "A name the catalog lacks is reported in diagnostics.",
            oneOf: [
              { type: "string", enum: ["none"] },
              {
                type: "object",
                properties: {
                  set: { type: "string" },
                  name: { type: "string" },
                },
                required: ["set", "name"],
                additionalProperties: false,
              },
            ],
          },
          colorScheme: {
            type: "string",
            description:
              'Color scheme mode, e.g. "light" or "dark" (default: light)',
          },
          scale: {
            type: "string",
            description:
              'Scale mode, e.g. "desktop" or "mobile" (default: desktop)',
          },
          label: {
            type: "string",
            description:
              'Label text for components that show one (default: "Label")',
          },
          width: {
            type: "number",
            description: "Demo width in px for the root (optional)",
          },
          format: {
            type: "string",
            enum: ["svg", "png"],
            description:
              'Output format: "svg" (default, text) or "png" (an image, with a font status)',
            default: "svg",
          },
          pixelRatio: {
            type: "number",
            minimum: 1,
            maximum: 4,
            description: "Pixels per unit for PNG output (default: 2)",
          },
          fontPath: {
            type: "string",
            description:
              "Path to a TrueType (.ttf) font file for PNG text, e.g. a copy of " +
              "AdobeCleanSpectrumVF-Roman.ttf. Optional: an installed copy is found automatically.",
          },
        },
        required: ["component"],
        additionalProperties: false,
      },
      async handler({
        component,
        size = "m",
        states = [],
        options = {},
        icon,
        colorScheme = "light",
        scale = "desktop",
        label = "Label",
        width,
        format = "svg",
        pixelRatio = 2,
        fontPath,
      }) {
        if (format !== "svg" && format !== "png") {
          throw new Error('format must be "svg" or "png"');
        }
        const ds = await getDataset();
        const request = {
          component,
          size,
          states,
          options,
          mode: { colorScheme, scale },
          label,
        };
        if (width !== undefined) request.width = width;
        if (icon !== undefined) request.icon = icon;
        if (format === "svg") {
          // Size the layout with the installed Adobe Clean Spectrum VF when there is one, so
          // the boxes fit the text a viewer with that font draws. A font named with fontPath
          // or DESIGN_DATA_FONT is not used: the SVG stack still asks for Adobe Clean, so
          // sizing for another font would mismatch. Source Sans 3 is the built-in table.
          const { fonts } = findFont(await getWasm(), {
            env: { ...process.env, DESIGN_DATA_FONT: undefined },
          });
          try {
            return ds.renderComponentSvg(
              request,
              fonts.filter((f) => !f.fallback),
            );
          } catch (e) {
            // A font found on the machine that will not parse must not stop the SVG.
            if (!/^font /.test(String(e?.message ?? e))) throw e;
            return ds.renderComponentSvg(request);
          }
        }

        if (!(pixelRatio >= 1 && pixelRatio <= 4)) {
          throw new Error("pixelRatio must be between 1 and 4");
        }
        const wasm = await getWasm();
        // A font the user named must work. One found on the machine should never keep the
        // picture from being drawn: if it will not parse, say so, skip it and choose again.
        const skipped = [];
        let found;
        let out;
        for (;;) {
          found = findFont(wasm, {
            fontPath,
            exclude: skipped.map((s) => s.origin),
            skipped,
          });
          try {
            out = ds.renderComponentPng(request, found.fonts, { pixelRatio });
            break;
          } catch (e) {
            const message = String(e?.message ?? e);
            if (
              found.explicit ||
              found.fonts[0].fallback ||
              !/^font /.test(message)
            ) {
              throw e;
            }
            skipped.push({
              origin: found.status.using,
              reason: `cannot be drawn (${message.replace(/^font [^:]*: /, "")})`,
            });
          }
        }
        const { status } = found;
        return {
          content: [
            {
              type: "image",
              data: Buffer.from(out.png).toString("base64"),
              mimeType: "image/png",
            },
            {
              type: "text",
              text: JSON.stringify(
                { font: fontSummary(status), diagnostics: out.diagnostics },
                null,
                2,
              ),
            },
          ],
        };
      },
    },

    // ── font status ─────────────────────────────────────────────────────────
    {
      name: "design-data-font-status",
      annotations: {
        title: "Design Data: Font Status",
        readOnlyHint: true,
        openWorldHint: false,
      },
      description:
        "Check which font draws text in PNG renders from design-data-render: Adobe Clean " +
        "Spectrum VF if it is installed on this machine, else Adobe Clean VF (Roman .ttf), else " +
        "a bundled open font. Returns { found, fallback, using, family, installed, rejected, " +
        "related, searched, help }; found means Adobe Clean Spectrum VF (or a font you chose), " +
        "installed means a font file on this machine is used. When " +
        "fallback is true, tell the user and pass on help (Adobe employees can download the " +
        "font from the Brand Center; they install the .ttf, or point DESIGN_DATA_FONT or " +
        "fontPath at it). If the user says it is installed but found is false, ask for the " +
        "file path and pass it as fontPath. Do not tell the user to download anything when " +
        "found is true. Never offer or attach the font file.",
      inputSchema: {
        type: "object",
        properties: {
          fontPath: {
            type: "string",
            description:
              "Path to a TrueType (.ttf) font file to check instead of searching",
          },
        },
        additionalProperties: false,
      },
      async handler({ fontPath }) {
        const wasm = await getWasm();
        return fontSummary(findFont(wasm, { fontPath }).status, true);
      },
    },
  ];
}
