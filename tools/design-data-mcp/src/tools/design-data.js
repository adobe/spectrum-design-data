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
import { join, dirname } from "path";

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
  const filePath = join(pkgRoot, subdir, `${id}.json`);
  if (!existsSync(filePath)) {
    throw new Error(
      `Not found: "${id}" in ${subdir}/. ` +
        (subdir === "components"
          ? `Call design-data-primer to see available component IDs.`
          : `Call design-data-guideline-list to see available guideline IDs.`),
    );
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * Load the guidelines/manifest.json catalog.
 * Returns null when the file does not exist (guidelines not yet generated).
 */
function loadGuidelineManifest() {
  const pkgRoot = resolveSpectrumDataPackage();
  if (!pkgRoot) return null;
  const manifestPath = join(pkgRoot, "guidelines", "manifest.json");
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, "utf-8"));
}

export function createDesignDataTools() {
  return [
    // ── primer ─────────────────────────────────────────────────────────────
    {
      name: "design-data-primer",
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
                ...new Set(manifest.guidelines.map((g) => g.category)),
              ].sort(),
            }
          : null;

        // Provenance carries source + designDataVersion (the @adobe/spectrum-design-data
        // package version baked into the wasm at build time via EMBEDDED_DATA_VERSION).
        const { provenance } = ds.primer();

        return {
          // top-level source is the legacy skill-contract field; provenance.source
          // duplicates it intentionally — provenance is the richer metrics object
          // and consumers should prefer it going forward.
          source: "embedded",
          tokenCount: ds.tokenCount(),
          modeSets: {
            colorScheme: wasm.getFieldValues("colorScheme") ?? [],
            scale: wasm.getFieldValues("scale") ?? [],
            contrast: wasm.getFieldValues("contrast") ?? [],
          },
          taxonomyFields: {
            indexed: wasm.getIndexedFields(),
            advisory: wasm.getAdvisoryFields() ?? [],
          },
          components: wasm.getFieldValues("component") ?? [],
          properties: wasm.getFieldValues("property") ?? [],
          guidelines: guidelinesSummary,
          provenance,
        };
      },
    },

    // ── query ───────────────────────────────────────────────────────────────
    {
      name: "design-data-query",
      description:
        "Filter Spectrum tokens by a query expression. " +
        "Expression syntax: `component=button`, `component=button,state=hover`, " +
        "`property=color-*`, `colorScheme=dark`. " +
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

    // ── resolve ─────────────────────────────────────────────────────────────
    {
      name: "design-data-resolve",
      description:
        "Resolve the concrete value of a Spectrum token property for a given " +
        "mode-set context (color-scheme, scale, contrast). " +
        "Returns the winning token with its resolved value.",
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
        },
        required: ["property"],
        additionalProperties: false,
      },
      async handler({ property, colorScheme, scale, contrast }) {
        const ds = await getDataset();
        const context = {};
        if (colorScheme) context.colorScheme = colorScheme;
        if (scale) context.scale = scale;
        if (contrast) context.contrast = contrast;
        const result = ds.resolve(property, context);
        if (!result) {
          throw new Error(
            `No token found for property "${property}" in context ${JSON.stringify(context)}`,
          );
        }
        return result;
      },
    },

    // ── guideline-list ──────────────────────────────────────────────────────
    {
      name: "design-data-guideline-list",
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
  ];
}
