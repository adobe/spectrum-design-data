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
 *
 * Note: authoring_session_step_intent in authoring.js still uses the CLI because
 * the NLP suggest ranking is not yet on the wasm surface.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { loadDataset } from "@adobe/design-data/load";
import { config } from "../config.js";

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

/**
 * Validate a component ID against the same rule as the Rust SDK.
 * See sdk/core/src/component.rs:validate_id — prevents path traversal.
 */
const COMPONENT_ID_RE = /^[a-z][a-z0-9-]*$/;
function validateComponentId(id) {
  if (!COMPONENT_ID_RE.test(id)) {
    throw new Error(
      `Invalid component ID "${id}". IDs must be kebab-case: start with a lowercase ` +
        `letter and contain only lowercase letters, digits, and hyphens.`,
    );
  }
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
        // taxonomyFields.{indexed,advisory}. CLI-only fields (specVersion, manifest,
        // provenance) are not present — no SKILL.md reference or consumer relies on them.
        const wasm = await getWasm();
        const ds = await getDataset();
        return {
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
        };
      },
    },

    {
      name: "resolve_token",
      description:
        "Resolve a design token property to its final value for a given color scheme, scale, and contrast level.",
      inputSchema: {
        type: "object",
        required: ["property"],
        properties: {
          property: {
            type: "string",
            description:
              "Token property name, e.g. accent-background-color-default",
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
        },
        additionalProperties: false,
      },
      async handler({ property, colorScheme, scale, contrast }) {
        const ds = await loadDataset(config.dataPath);
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
            description: 'Filter expression, e.g. "category=color"',
          },
        },
        additionalProperties: false,
      },
      async handler({ filter }) {
        const ds = await loadDataset(config.dataPath);
        return ds.query(filter);
      },
    },

    {
      name: "describe_component",
      description:
        "Return the JSON schema and token bindings for a design system component by its ID.",
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
        const componentsDir = config.componentsDir;
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
        return JSON.parse(readFileSync(componentFile, "utf-8"));
      },
    },
  ];
}
