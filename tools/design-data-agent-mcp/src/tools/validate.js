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
import { config } from '../config.js';

export function createValidateTools() {
  return [
    {
      name: 'validate_usage',
      description:
        'Validate design token usage in a dataset. Returns a JSON report of violations and warnings.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to dataset to validate (defaults to DESIGN_DATA_PATH)',
          },
          strict: { type: 'boolean', description: 'Treat warnings as errors' },
        },
        additionalProperties: false,
      },
      async handler({ path, strict } = {}) {
        const target = path ?? config.dataPath;
        const ds = await loadDataset(target);
        const result = ds.validate();
        if (strict && result.warnings.length > 0) {
          return {
            valid: false,
            errors: [...result.errors, ...result.warnings],
            warnings: [],
          };
        }
        return result;
      },
    },
  ];
}
