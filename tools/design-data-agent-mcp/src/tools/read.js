// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

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
        if (config.dimensionsDir)
          args.push("--dimensions-dir", config.dimensionsDir);
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
        const args = ["resolve", property, config.dataPath, "--format", "json"];
        // resolve uses --dimensions-path (old flag name, not --dimensions-dir)
        if (config.dimensionsDir)
          args.push("--dimensions-path", config.dimensionsDir);
        if (colorScheme) args.push("--color-scheme", colorScheme);
        if (scale) args.push("--scale", scale);
        if (contrast) args.push("--contrast", contrast);
        const { exitCode, stdout, stderr } = await runCli(args);
        if (exitCode !== 0)
          throw new Error(stderr || `resolve exited ${exitCode}`);
        return JSON.parse(stdout);
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
        const args = [
          "query",
          config.dataPath,
          "--filter",
          filter,
          "--format",
          "json",
        ];
        const { exitCode, stdout, stderr } = await runCli(args);
        // exit code 1 means no matches — still valid JSON []
        if (exitCode > 1) throw new Error(stderr || `query exited ${exitCode}`);
        return JSON.parse(stdout);
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
