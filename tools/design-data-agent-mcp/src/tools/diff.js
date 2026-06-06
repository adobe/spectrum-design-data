// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { loadDataset } from "@adobe/design-data/load";

/**
 * Filter a diff result by a substring match against token names.
 *
 * The diff() return shape uses camelCase (per wasm serde rename_all = "camelCase"):
 *   - renamed entries: { oldName, newName, ... }
 *   - all other entries: { name, ... }
 *
 * @param {object} diff - DiffResult from Dataset.diff().
 * @param {string} filter - Substring to match (case-insensitive).
 * @returns {object} Filtered diff with the same top-level keys.
 */
export function filterDiffByName(diff, filter) {
  const f = filter.toLowerCase();
  const matchName = (t) =>
    [t.name, t.oldName, t.newName].some((n) => n?.toLowerCase().includes(f));
  return {
    renamed: diff.renamed.filter(matchName),
    deprecated: diff.deprecated.filter(matchName),
    reverted: diff.reverted.filter(matchName),
    added: diff.added.filter(matchName),
    deleted: diff.deleted.filter(matchName),
    updated: diff.updated.filter(matchName),
  };
}

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
        const [oldDs, newDs] = await Promise.all([
          loadDataset(oldPath),
          loadDataset(newPath),
        ]);
        const diff = oldDs.diff(newDs);
        if (!filter) return diff;
        return filterDiffByName(diff, filter);
      },
    },
  ];
}
