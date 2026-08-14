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
 * Shared name.* <-> scope.* field mapping for Component/Token Relationships (CTRs).
 * Used by both the one-time migration script (packages/design-data/scripts/migrate-to-relationships.mjs)
 * and tests that need to reconstruct a pre-migration name object from a CTR's scope.
 */

/** name.* keys folded into a dedicated scope.* key rather than scope.options. */
export const SCOPE_TOP_LEVEL_KEYS = new Set([
  "component",
  "anatomy",
  "property",
]);
/** name.* keys that carry legacy-reconstruction metadata, not scope narrowing. */
export const NAME_NON_SCOPE_KEYS = new Set(["legacyKey"]);

/** Convert a name-shaped object's scope-relevant keys into a CTR `scope` object. */
export function nameToScope(name) {
  const scope = { component: name.component };
  if (name.anatomy !== undefined) scope.part = name.anatomy;
  if (name.property !== undefined) scope.property = name.property;

  const options = {};
  for (const [key, value] of Object.entries(name)) {
    if (SCOPE_TOP_LEVEL_KEYS.has(key) || NAME_NON_SCOPE_KEYS.has(key)) continue;
    if (key === "state") {
      scope.options ??= {};
      scope.options.state = value;
      continue;
    }
    options[key] = value;
  }
  if (Object.keys(options).length > 0) {
    scope.options = { ...(scope.options ?? {}), ...options };
  }
  return scope;
}

/** Inverse of `nameToScope`: reconstruct a name-shaped object's scope-relevant keys from a CTR `scope` object. */
export function scopeToName(scope) {
  const name = { ...(scope.options ?? {}) };
  if (scope.component !== undefined) name.component = scope.component;
  if (scope.part !== undefined) name.anatomy = scope.part;
  if (scope.property !== undefined) name.property = scope.property;
  return name;
}
