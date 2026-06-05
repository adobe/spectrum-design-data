// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { loadDataset } from '@adobe/design-data-js/load';

export function createDiffTools() {
  return [
    {
      name: 'diff_datasets',
      description:
        'Compare two design data datasets and return a JSON diff of added, removed, and changed tokens.',
      inputSchema: {
        type: 'object',
        required: ['oldPath', 'newPath'],
        properties: {
          oldPath: { type: 'string', description: 'Path to the old/baseline dataset' },
          newPath: { type: 'string', description: 'Path to the new/updated dataset' },
          filter: { type: 'string', description: 'Optional filter expression to narrow results' },
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
        // Apply filter post-diff by name prefix if provided.
        const f = filter.toLowerCase();
        const filterArr = (arr) => arr.filter((t) => (t.name ?? t.old_name ?? '').toLowerCase().includes(f));
        return {
          renamed: filterArr(diff.renamed),
          deprecated: filterArr(diff.deprecated),
          reverted: filterArr(diff.reverted),
          added: filterArr(diff.added),
          deleted: filterArr(diff.deleted),
          updated: filterArr(diff.updated),
        };
      },
    },
  ];
}
