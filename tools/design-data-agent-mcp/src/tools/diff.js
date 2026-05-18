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

export function createDiffTools() {
  return [
    {
      name: "diff_datasets",
      description:
        "Compare two design data datasets and return a JSON diff of added, removed, and changed tokens.",
      inputSchema: {
        type: "object",
        required: ["oldPath", "newPath"],
        properties: {
          oldPath: {
            type: "string",
            description: "Path to the old/baseline dataset",
          },
          newPath: {
            type: "string",
            description: "Path to the new/updated dataset",
          },
          filter: {
            type: "string",
            description: "Optional filter expression to narrow results",
          },
        },
        additionalProperties: false,
      },
      async handler({ oldPath, newPath, filter }) {
        const args = ["diff", oldPath, newPath, "--format", "json"];
        if (filter) args.push("--filter", filter);
        const { exitCode, stdout, stderr } = await runCli(args);
        // exit code 1 means differences found — that is a valid result, not an error
        if (exitCode > 1) throw new Error(stderr || `diff exited ${exitCode}`);
        return JSON.parse(stdout);
      },
    },
  ];
}
