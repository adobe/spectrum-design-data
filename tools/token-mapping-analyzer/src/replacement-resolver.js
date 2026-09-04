// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Follows a token's `lifecycle.replacedBy` chain to the live token it ultimately
 * points to. Used wherever a `$ref` is emitted for a token, so relationship-only
 * CTRs (component/token bindings) never pin a deprecated UUID that a live
 * semantic replacement already exists for (see PR fixing #1330's carried-over
 * deprecated accordion refs).
 *
 * Stops and returns the current token when `replacedBy` is missing, is an array
 * (ambiguous — multiple candidate replacements, none of them clearly "the" target),
 * or points at a UUID not present in `uuidToToken`. A `seen` set guards against
 * cycles in hand-authored `replacedBy` data.
 *
 * @param {object} token - token object with `uuid` and optional `lifecycle.replacedBy`.
 * @param {Map<string, object>} uuidToToken - every known token/CTR, keyed by uuid.
 * @returns {string} the resolved (possibly unchanged) uuid.
 */
export function resolveReplacementUuid(token, uuidToToken) {
  let current = token;
  const seen = new Set();
  while (
    current?.lifecycle?.replacedBy &&
    typeof current.lifecycle.replacedBy === "string" &&
    !seen.has(current.uuid)
  ) {
    seen.add(current.uuid);
    const next = uuidToToken.get(current.lifecycle.replacedBy);
    if (!next) break;
    current = next;
  }
  return current.uuid;
}
