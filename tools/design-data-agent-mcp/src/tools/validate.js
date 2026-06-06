// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { validateDataset } from "@adobe/design-data/validate";
import { config } from "../config.js";

export function createValidateTools() {
  return [
    {
      name: "validate_usage",
      description:
        "Validate design token usage in a dataset. Runs Layer-1 JSON-Schema structural " +
        "validation and Layer-2 relational rules. Returns a JSON report of violations and warnings.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Path to dataset to validate (defaults to DESIGN_DATA_PATH)",
          },
          strict: { type: "boolean", description: "Treat warnings as errors" },
          schema_path: {
            type: "string",
            description:
              "Path to schemas directory containing token-types/ and token-file.json. " +
              "Defaults to @adobe/spectrum-tokens schemas. Set DESIGN_DATA_SCHEMAS env var or " +
              "pass explicitly for custom schema sets.",
          },
        },
        additionalProperties: false,
      },
      async handler({ path, strict, schema_path } = {}) {
        const target = path ?? config.dataPath;
        const schemaPath = schema_path ?? config.schemaPath ?? null;
        // NOTE: exceptionsPath (DESIGN_DATA_EXCEPTIONS / --exceptions-path) applies to the
        // SPEC-007 naming rule in the relational layer. The in-process wasm validate() does
        // not consume it. Passing exceptionsPath here would throw an explicit error from
        // validateDataset — omit it and document the limitation.
        return validateDataset(target, { schemaPath, strict: strict ?? false });
      },
    },
  ];
}
