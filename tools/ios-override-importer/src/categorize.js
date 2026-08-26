// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { isColorSet, parseColorSet } from "./parse-colorset.js";

/**
 * Bucket one override-log.csv row per the FINDINGS.md categorization
 * (net-new / true-value-change / contrast-addition / out-of-scope, for
 * reporting/stats), AND split its changed modes by whether each one needs
 * an `overrides[]` entry or an `extensions.tokens[]` entry.
 *
 * A single row can need both: e.g. a row that replaces its light/dark base
 * value (→ override, the foundation record exists) while also adding a new
 * lightIncreased/darkIncreased contrast:high slot (→ extension token, no
 * foundation record exists there yet). Splitting per-mode by "did old have a
 * value at this exact (colorScheme, contrast) coordinate" is what makes that
 * correct — a row-level category label alone can't express it.
 *
 * Returns `{ category, overrideModes, extensionModes, skipped }`:
 * - `overrideModes` — modes present in New Value AND in Old Value, with a
 *   different value (the foundation token already exists at this mode).
 * - `extensionModes` — modes present in New Value but absent (or "none") in
 *   Old Value (nothing exists at this mode yet).
 * `skipped` lists any unmapped ColorSet slots (e.g. "elevated") from New Value.
 */
export function categorizeRow(row) {
  const oldValue = row["Old Value"];
  const newValue = row["New Value"];

  if (!isColorSet(newValue)) {
    return {
      category: "out-of-scope",
      overrideModes: [],
      extensionModes: [],
      skipped: [],
    };
  }

  const { modes: newModes, skipped } = parseColorSet(newValue);

  if (oldValue === "Custom token" || !isColorSet(oldValue)) {
    // Either genuinely new, or the old value isn't recognizable as a color —
    // treat as net-new rather than guessing at a "change". Every slot is new.
    return {
      category: "net-new",
      overrideModes: [],
      extensionModes: newModes,
      skipped,
    };
  }

  const { modes: oldModes } = parseColorSet(oldValue);
  const overrideModes = [];
  const extensionModes = [];
  for (const m of newModes) {
    const old = valueFor(oldModes, m.colorScheme, m.contrast, m.variant);
    if (old === undefined) {
      extensionModes.push(m);
    } else if (old !== m.value) {
      overrideModes.push(m);
    }
    // old === m.value: unchanged, nothing to emit.
  }
  // Base light/dark only — `variant` defaults to undefined here, so an
  // elevated slot (colorScheme:"dark", variant:"elevated") can't be mistaken
  // for the plain dark base value even though they share a colorScheme.
  const baseChanged = ["light", "dark"].some(
    (scheme) =>
      valueFor(oldModes, scheme, undefined, undefined) !==
      valueFor(newModes, scheme, undefined, undefined),
  );

  return {
    category: baseChanged ? "true-value-change" : "contrast-addition",
    overrideModes,
    extensionModes,
    skipped,
  };
}

function valueFor(modes, colorScheme, contrast, variant) {
  return modes.find(
    (m) =>
      m.colorScheme === colorScheme &&
      m.contrast === contrast &&
      m.variant === variant,
  )?.value;
}
