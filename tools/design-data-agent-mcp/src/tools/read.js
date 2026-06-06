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
 * query_tokens and resolve_token use @adobe/design-data (loadDataset) + the
 * wasm Dataset to run in-process without spawning the CLI binary.
 *
 * primer and describe_component still invoke the CLI: primer aggregates complex
 * catalog metadata (components, fields) not yet on the wasm surface, and
 * describe_component requires the components catalog path resolution that the CLI
 * handles. These will be ported when those APIs are added to the wasm surface.
 */

import { loadDataset } from "@adobe/design-data/load";
import { runCli } from "../cli.js";
import { config } from "../config.js";

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
        const args = ["primer", config.dataPath, "--format", "json"];
        if (config.componentsDir)
          args.push("--components-dir", config.componentsDir);
        if (config.fieldsDir) args.push("--fields-dir", config.fieldsDir);
        const { exitCode, stdout, stderr } = await runCli(args);
        if (exitCode !== 0)
          throw new Error(stderr || `primer exited ${exitCode}`);
        return JSON.parse(stdout);
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
        const args = ["component", id];
        if (config.componentsDir)
          args.push("--components-dir", config.componentsDir);
        const { exitCode, stdout, stderr } = await runCli(args);
        if (exitCode !== 0)
          throw new Error(stderr || `component exited ${exitCode}`);
        return JSON.parse(stdout);
      },
    },
  ];
}
