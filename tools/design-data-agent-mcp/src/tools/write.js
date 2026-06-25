// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { join } from "path";
import { runCli } from "../cli.js";
import { config } from "../config.js";

export function createWriteTools() {
  return [
    {
      name: "write",
      description:
        "Write agent-generated design context to the dataset (e.g. product-context.json). Returns a confirmation message.",
      inputSchema: {
        type: "object",
        properties: {
          output: {
            type: "string",
            description:
              "Output file path (defaults to product-context.json inside DESIGN_DATA_PATH)",
          },
          rationale: {
            type: "string",
            description: "Rationale or summary to embed in the written file",
          },
        },
        additionalProperties: false,
      },
      async handler({ output, rationale } = {}) {
        const resolvedOutput =
          output ?? join(config.dataPath, "product-context.json");
        const args = ["write", "--output", resolvedOutput];
        if (rationale) args.push("--rationale", rationale);
        const { exitCode, stdout, stderr } = await runCli(args);
        if (exitCode !== 0)
          throw new Error(stderr || `design-data write exited ${exitCode}`);
        return stdout;
      },
    },
  ];
}
