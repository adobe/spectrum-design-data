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
 * create/edit tools for non-token data categories (components, fields, registry,
 * mode-sets, guidelines) — Phase C authoring surface.
 *
 * All operations delegate to `design-data data create|edit`, which validates
 * against the JSON schema before writing. Output is byte-identical to the CLI.
 *
 * CLI surface used:
 *   design-data data create --category <c> --file -  [--dataset <dir>] [--spec-schemas <dir>]
 *   design-data data edit   --category <c> --file -  [--dataset <dir>] [--spec-schemas <dir>]
 */

import { resolve } from "path";
import { runCli } from "../cli.js";
import { config } from "../config.js";

const CATEGORIES = [
  "components",
  "fields",
  "registry",
  "mode-sets",
  "guidelines",
];

/** Run CLI, throw on non-zero exit, return parsed JSON. */
async function runJson(args, stdin, { timeout = 30_000 } = {}) {
  const { exitCode, stdout, stderr } = await runCli(args, { timeout, stdin });
  if (exitCode !== 0)
    throw new Error(stderr || `design-data ${args[0]} exited ${exitCode}`);
  return JSON.parse(stdout);
}

/**
 * Build the base args for a data create/edit call, resolving dataset root and
 * spec schemas dir from config / env.
 */
function baseArgs(subcommand, category, datasetOverride, specSchemasOverride) {
  // Only use config.dataPath when it ends in /tokens — the bare-cwd fallback
  // (anchorPath(".")) does not end in tokens and must not be stripped.
  const dataPathTokens = config.dataPath?.match(/^(.*?)\/tokens\/?$/)
    ? config.dataPath.replace(/\/tokens\/?$/, "")
    : null;
  const dataset =
    datasetOverride ??
    dataPathTokens ??
    resolve(config.dataRoot, "packages/design-data");

  const args = [
    "data",
    subcommand,
    "--category",
    category,
    "--file",
    "-",
    "--dataset",
    dataset,
  ];

  const specSchemas =
    specSchemasOverride ??
    (process.env.DESIGN_DATA_SPEC_SCHEMAS
      ? resolve(process.env.DESIGN_DATA_SPEC_SCHEMAS)
      : null);
  if (specSchemas) args.push("--spec-schemas", specSchemas);

  return { args, dataset };
}

export function createDataTools() {
  return [
    {
      name: "data_create",
      description:
        "Create a new non-token data object (component, field, registry entry, mode-set, or " +
        "guideline). Validates the JSON document against the category schema before writing. " +
        "Fails if the file already exists — use data_edit to overwrite.",
      inputSchema: {
        type: "object",
        required: ["category", "document"],
        properties: {
          category: {
            type: "string",
            enum: CATEGORIES,
            description: "Data category to create in.",
          },
          document: {
            type: "object",
            description:
              "Full JSON document to write. Must include the category's required fields " +
              "(e.g. `name`, `$schema`, `specVersion`). The filename is derived from the `name` field.",
            additionalProperties: true,
          },
          dataset: {
            type: "string",
            description:
              "Path to the dataset root (packages/design-data). Defaults to DESIGN_DATA_PATH minus /tokens.",
          },
          spec_schemas: {
            type: "string",
            description:
              "Path to the design-data-spec schemas dir. Defaults to DESIGN_DATA_SPEC_SCHEMAS or auto-probed.",
          },
        },
        additionalProperties: false,
      },
      async handler({ category, document, dataset, spec_schemas }) {
        const { args } = baseArgs("create", category, dataset, spec_schemas);
        return runJson(args, JSON.stringify(document));
      },
    },

    {
      name: "data_edit",
      description:
        "Replace an existing non-token data object with a new JSON document. Validates the " +
        "document against the category schema before writing. Fails if the file does not exist " +
        "— use data_create to create it. Edit is a full document replace, not a patch.",
      inputSchema: {
        type: "object",
        required: ["category", "document"],
        properties: {
          category: {
            type: "string",
            enum: CATEGORIES,
            description: "Data category to edit in.",
          },
          document: {
            type: "object",
            description:
              "Full replacement JSON document. The `name` field must match the existing file.",
            additionalProperties: true,
          },
          dataset: {
            type: "string",
            description:
              "Path to the dataset root (packages/design-data). Defaults to DESIGN_DATA_PATH minus /tokens.",
          },
          spec_schemas: {
            type: "string",
            description:
              "Path to the design-data-spec schemas dir. Defaults to DESIGN_DATA_SPEC_SCHEMAS or auto-probed.",
          },
        },
        additionalProperties: false,
      },
      async handler({ category, document, dataset, spec_schemas }) {
        const { args } = baseArgs("edit", category, dataset, spec_schemas);
        return runJson(args, JSON.stringify(document));
      },
    },
  ];
}
