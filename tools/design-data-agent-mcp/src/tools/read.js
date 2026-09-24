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
 * Read tools for design-data-agent-mcp.
 *
 * All read tools run fully in-process via @adobe/design-data-wasm — no CLI binary
 * required. primer and describe_component were migrated in issue m1r.
 * describe_guideline (spectrum-design-data-9fe.7) is the read-back counterpart to
 * data_create/data_edit's "guidelines" category, closing the same read/write
 * asymmetry describe_component already closes for components. Its guideline
 * loading and listing logic is shared with the sibling
 * @adobe/design-data-mcp package's `design-data-guideline` tool via the
 * `@adobe/design-data/guideline` module, rather than duplicated here.
 *
 * Note: authoring_session_step_intent in authoring.js still uses the CLI because
 * the NLP suggest ranking is not yet on the wasm surface.
 *
 * Cascade scope (see cascade-bootstrap.js / spectrum-design-data-h890.14): once a
 * `.design-data.toml` cascade is resolved, primer/resolve_token/query_tokens/
 * validate_usage all reflect it (they read config.cascadeDataPath instead of
 * config.dataPath when config.cascadeActive). Cascade bootstrap copies the
 * fallback component/relationship/guideline catalogs into that snapshot and
 * overlays manifest extensions, so describe_component/describe_guideline/list_guidelines
 * read the same active cascade while preserving the embedded fallback for inactive
 * cascades.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { loadDataset } from "@adobe/design-data/load";
import { listGuidelines, loadGuideline } from "@adobe/design-data/guideline";
import { config } from "../config.js";
import { checkDatasetFreshness } from "../dataset-freshness.js";

// Note: this module intentionally never spawns the native binary — primer and
// describe_component must keep working with no CLI on PATH at all (see the
// structural test in read.test.js). Cascade resolution happens once at startup
// in cascade-bootstrap.js (which does spawn the binary); by the time these
// handlers run, a cascade dataset is just another local directory at
// config.dataPath.

let _wasm;
/** Lazy-load and cache the wasm module (nodejs target, no init() required). */
async function getWasm() {
  if (!_wasm) _wasm = await import("@adobe/design-data-wasm");
  return _wasm;
}

let _dataset;
/**
 * Return the active dataset, caching it after first access.
 *
 * When cascade-bootstrap.js resolved a `.design-data.toml` platform source at
 * startup (config.cascadeActive), config.cascadeDataPath is a local dir holding
 * the resolved cascade — load that instead of the embedded Spectrum snapshot,
 * the same way resolve_token/query_tokens already do. cascadeActive is decided
 * once at startup before any request runs, so caching here is safe.
 *
 * Dataset.embedded() clones the in-memory graph on every call; caching here
 * avoids that per-request cost either way.
 */
async function getDataset() {
  if (!_dataset) {
    _dataset = config.cascadeActive
      ? await loadDataset(config.cascadeDataPath)
      : (await getWasm()).Dataset.embedded();
  }
  return _dataset;
}

/**
 * Validate a kebab-case ID against the same rule as the Rust SDK.
 * See sdk/core/src/component.rs:validate_id — prevents path traversal.
 */
const KEBAB_ID_RE = /^[a-z][a-z0-9-]*$/;
function validateKebabId(id, kind) {
  if (!KEBAB_ID_RE.test(id)) {
    throw new Error(
      `Invalid ${kind} ID "${id}". IDs must be kebab-case: start with a lowercase ` +
        `letter and contain only lowercase letters, digits, and hyphens.`,
    );
  }
}

function validateComponentId(id) {
  validateKebabId(id, "component");
}

function validateGuidelineId(id) {
  validateKebabId(id, "guideline");
}

function getCascadeAwareDir(baseDir, subdir) {
  if (!baseDir || !config.cascadeActive || !config.cascadeDataPath) {
    return baseDir;
  }

  const cascadeDir = join(config.cascadeDataPath, subdir);
  return existsSync(cascadeDir) ? cascadeDir : baseDir;
}

export function createReadTools() {
  return [
    {
      name: "primer",
      description:
        "Load the design data primer: full token taxonomy, resolved values, component list, and field definitions. Call this at the start of an agent session.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      async handler() {
        // Shape note: this response intentionally diverges from the CLI PrimerData
        // struct (sdk/core/src/primer.rs). The CLI emits modeSets as an array of
        // {name, values} objects and taxonomyFields as a flat array. This in-process
        // shape uses keyed objects (matching the sibling design-data-mcp), which agents
        // and the SKILL.md skill prompt consume by key name. Skill contract:
        // tokenCount, modeSets.{colorScheme,scale,contrast}, components[],
        // taxonomyFields.{indexed,advisory}. provenance is included for metrics:
        // for the embedded dataset it carries designDataVersion (@adobe/spectrum-design-data
        // version baked in at wasm build time); for custom datasets the source differs.
        const wasm = await getWasm();
        const ds = await getDataset();
        const { provenance } = ds.primer();
        // Best-effort staleness check (spectrum-design-data-9fe.5) — silent on
        // failure, never blocks the primer response.
        const datasetStatus = await checkDatasetFreshness(
          provenance.designDataVersion,
        );
        return {
          // top-level source is the legacy skill-contract field; provenance.source
          // duplicates it intentionally — provenance is the richer metrics object
          // and consumers should prefer it going forward.
          source: config.cascadeActive ? "cascade" : "embedded",
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
          provenance: datasetStatus
            ? { ...provenance, datasetStatus }
            : provenance,
        };
      },
    },

    {
      name: "resolve_token",
      description:
        "Resolve a design token property to its final value for a given context. " +
        "Use component, variant, state, or colorRole to disambiguate shared properties; " +
        "inspect ambiguous and deprecated in the result.",
      inputSchema: {
        type: "object",
        required: ["property"],
        properties: {
          property: {
            type: "string",
            description:
              "Bare token property name (the name.property segment, e.g. " +
              '"background-color", "corner-radius" — see primer().properties for ' +
              "the full list). Not a flattened legacyKey.",
          },
          colorScheme: {
            type: "string",
            description: "Color scheme: light or dark",
          },
          scale: {
            type: "string",
            enum: ["desktop", "mobile"],
            description: "Scale: desktop or mobile",
          },
          contrast: {
            type: "string",
            enum: ["regular", "high"],
            description: "Contrast: regular or high",
          },
          component: {
            type: "string",
            description:
              "Optional component name-object field. It is sparsely populated; " +
              "prefer variant, state, or colorRole when available.",
          },
          variant: {
            type: "string",
            description:
              "Optional token variant used to narrow shared properties.",
          },
          state: {
            type: "string",
            description:
              "Optional token state used to narrow shared properties (including array-valued state).",
          },
          colorRole: {
            type: "string",
            description:
              "Optional color role such as accent, negative, or positive.",
          },
          excludeDeprecated: {
            type: "boolean",
            description:
              "Exclude tokens with lifecycle.deprecatedIn from candidate resolution.",
          },
        },
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
        const ds = await loadDataset(
          config.cascadeActive ? config.cascadeDataPath : config.dataPath,
        );
        const context = {};
        if (colorScheme) context.colorScheme = colorScheme;
        if (scale) context.scale = scale;
        if (contrast) context.contrast = contrast;
        const result = ds.resolve(property, context, {
          component,
          variant,
          state,
          colorRole,
          excludeDeprecated: excludeDeprecated ?? false,
        });
        if (!result) {
          const deprecatedHint = excludeDeprecated
            ? " Only deprecated matches may exist; retry without excludeDeprecated to inspect them."
            : "";
          throw new Error(
            `No token found for property "${property}" in context ${JSON.stringify(context)}.${deprecatedHint}`,
          );
        }
        return result;
      },
    },

    {
      name: "query_tokens",
      description:
        "Query design tokens using a filter expression. Returns matching token entries.",
      inputSchema: {
        type: "object",
        required: ["filter"],
        properties: {
          filter: {
            type: "string",
            description:
              'Filter expression, e.g. "property=background-color". Valid keys: ' +
              "property, component, variant, state, colorScheme, scale, contrast, " +
              'uuid, $schema. Note: "component" is not currently populated on ' +
              "tokens — component=<id> always returns []; use describe_component instead.",
          },
        },
        additionalProperties: false,
      },
      async handler({ filter }) {
        const ds = await loadDataset(
          config.cascadeActive ? config.cascadeDataPath : config.dataPath,
        );
        return ds.query(filter);
      },
    },

    {
      name: "describe_component",
      description:
        "Return the JSON schema and token relationships (bindings) for a design system component by its ID.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Component ID, e.g. button" },
        },
        additionalProperties: false,
      },
      async handler({ id }) {
        validateComponentId(id);
        const componentsDir = getCascadeAwareDir(
          config.componentsDir,
          "components",
        );
        if (!componentsDir) {
          throw new Error(
            `@adobe/spectrum-design-data is not installed — cannot load component "${id}". ` +
              `Install it with: pnpm add @adobe/spectrum-design-data`,
          );
        }
        const componentFile = join(componentsDir, `${id}.json`);
        if (!existsSync(componentFile)) {
          let available;
          try {
            available = readdirSync(componentsDir)
              .filter((f) => f.endsWith(".json"))
              .map((f) => f.replace(/\.json$/, ""))
              .sort()
              .join(", ");
          } catch {
            available = null;
          }
          const hint = available
            ? `Available components: ${available}`
            : `Call primer to see available component IDs.`;
          throw new Error(`Component not found: "${id}". ${hint}`);
        }
        const component = JSON.parse(readFileSync(componentFile, "utf-8"));

        // Component/Token Relationships (CTRs) migrated most tokenBindings out
        // of the component file into relationships/<id>.json — merge them back
        // in so callers relying on this tool for a component's token bindings
        // still see them (see spectrum-design-data-x29.4).
        const relationshipsDir = getCascadeAwareDir(
          config.relationshipsDir,
          "relationships",
        );
        const relationshipFile = relationshipsDir
          ? join(relationshipsDir, `${id}.json`)
          : null;
        if (relationshipFile && existsSync(relationshipFile)) {
          component.relationships = JSON.parse(
            readFileSync(relationshipFile, "utf-8"),
          );
        }

        return component;
      },
    },

    {
      name: "describe_guideline",
      description:
        "Return the full documentBlocks content and metadata for a Spectrum design " +
        "guideline by its slug ID — the read-back counterpart to data_create/data_edit " +
        "for the guidelines category. Guideline IDs are kebab-case, e.g. colors, motion, " +
        "typography-fundamentals.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: {
            type: "string",
            description: "Guideline ID (kebab-case slug), e.g. colors, motion",
          },
        },
        additionalProperties: false,
      },
      async handler({ id }) {
        validateGuidelineId(id);
        const guidelinesDir = getCascadeAwareDir(
          config.guidelinesDir,
          "guidelines",
        );
        if (!guidelinesDir) {
          throw new Error(
            `@adobe/spectrum-design-data is not installed — cannot load guideline "${id}". ` +
              `Install it with: pnpm add @adobe/spectrum-design-data`,
          );
        }
        try {
          return loadGuideline(guidelinesDir, id);
        } catch (err) {
          if (err.message.startsWith("Not found:")) {
            let available;
            try {
              available = listGuidelines(guidelinesDir)
                .map((guideline) => guideline.slug)
                .sort()
                .join(", ");
            } catch {
              available = null;
            }
            const hint = available
              ? `Available guidelines: ${available}`
              : `Check packages/design-data/guidelines/manifest.json for available IDs.`;
            throw new Error(`Guideline not found: "${id}". ${hint}`);
          }
          throw err;
        }
      },
    },

    {
      name: "list_guidelines",
      description:
        "List available Spectrum design guidelines and their metadata. Optionally " +
        "filter the catalog by category before calling describe_guideline.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Optional guideline category, e.g. designing or implementing",
          },
        },
        additionalProperties: false,
      },
      async handler({ category } = {}) {
        const guidelinesDir = getCascadeAwareDir(
          config.guidelinesDir,
          "guidelines",
        );
        if (!guidelinesDir) {
          throw new Error(
            `@adobe/spectrum-design-data is not installed — cannot list guidelines. ` +
              `Install it with: pnpm add @adobe/spectrum-design-data`,
          );
        }
        const guidelines = listGuidelines(guidelinesDir);
        return category
          ? guidelines.filter((guideline) => guideline.category === category)
          : guidelines;
      },
    },
  ];
}
