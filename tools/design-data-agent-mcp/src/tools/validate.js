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

export function createValidateTools() {
  return [
    {
      name: "validate_usage",
      description:
        "Validate design token usage in a dataset. Returns a JSON report of violations and warnings.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Path to dataset to validate (defaults to DESIGN_DATA_PATH)",
          },
          strict: { type: "boolean", description: "Treat warnings as errors" },
        },
        additionalProperties: false,
      },
      async handler({ path, strict } = {}) {
        const target = path ?? config.dataPath;
        const args = ["validate", target, "--format", "json"];
        if (config.schemaPath) args.push("--schema-path", config.schemaPath);
        if (config.exceptionsPath)
          args.push("--exceptions-path", config.exceptionsPath);
        // validate uses --dimensions-path (old flag name, not --dimensions-dir)
        if (config.dimensionsDir)
          args.push("--dimensions-path", config.dimensionsDir);
        if (strict === true) args.push("--strict");
        const { exitCode, stdout, stderr } = await runCli(args);
        if (exitCode !== 0 && !stdout)
          throw new Error(stderr || `validate exited ${exitCode}`);
        return JSON.parse(stdout);
      },
    },
  ];
}
