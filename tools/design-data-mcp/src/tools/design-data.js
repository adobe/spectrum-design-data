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
        const { provenance, modeSets } = ds.primer();
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
        "Filterable fields: property, component, variant, state, colorScheme, scale, contrast, uuid. " +
        "`key=value` pairs join with `,` (AND) or `|` (OR); `!=` negates and `*` is a wildcard. " +
        "`component` matches tokens bound to that component by its relationships. " +
        "Examples: `component=button`, `component=button,state=hover`, " +
        "`property=*color*`, `colorScheme=dark`. " +
        "Property names are exact or wildcard (e.g. `*color*`); variant values are " +
        "listed in the dataset, so `variant=accent` matches nothing. " +
        "Returns an array of matching token objects.",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description:
              'Query expression, e.g. "component=button" or "property=color-*,component=action-button"',
          },
        },
        required: ["filter"],
        additionalProperties: false,
      },
      async handler({ filter }) {
        const ds = await getDataset();
        return ds.query(filter);
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
        "Returns matches ranked by confidence with token name, layer, value, and name object. " +
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
        return ds.suggest(intent, undefined, limit);
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
        "category, and a snippet per match. Use the id with design-data-component " +
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
        "(see design-data-visual-recipe). PNG text uses Adobe Clean Spectrum VF when it is " +
        "installed on this machine (found automatically, or set with the fontPath argument " +
        "or the DESIGN_DATA_FONT environment variable), otherwise a bundled open font. The " +
        "result includes a font status: when font.fallback is true, tell the user the text " +
        "may differ slightly and pass on font.help (it says how to install the font); do " +
        "not call the image exact. When font.found is true, do not tell the user to " +
        "download anything.",
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
        if (format === "svg") return ds.renderComponentSvg(request);

        if (!(pixelRatio >= 1 && pixelRatio <= 4)) {
          throw new Error("pixelRatio must be between 1 and 4");
        }
        const wasm = await getWasm();
        const { fonts, status } = findFont(wasm, { fontPath });
        const out = ds.renderComponentPng(request, fonts, { pixelRatio });
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
        "Spectrum VF if it is installed on this machine, otherwise a bundled open font. " +
        "Returns { found, fallback, using, rejected, related, searched, help }. When " +
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
