// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Swift `ColorSet(light: Color(r, g, b, a), dark: none, ...)` slot -> foundation
// mode-set coordinate. `elevated`/`elevatedIncreased` are intentionally absent:
// no `elevated` colorScheme mode exists in the foundation today (only 10 of 742
// rows use it) — see the gap report instead of guessing a mapping.
const SLOT_TO_MODES = {
  light: { colorScheme: "light" },
  dark: { colorScheme: "dark" },
  lightIncreased: { colorScheme: "light", contrast: "high" },
  darkIncreased: { colorScheme: "dark", contrast: "high" },
};

const COLOR_SET_RE = /^ColorSet\((.*)\)$/s;
const SLOT_RE = /(\w+):\s*(none|Color\([^)]*\))/g;

/** True if `value` is a Swift `ColorSet(...)` literal (vs. "Custom token", FontSize, etc). */
export function isColorSet(value) {
  return COLOR_SET_RE.test(value.trim());
}

/**
 * Parse `ColorSet(light: Color(59, 99, 251, 1.0), dark: none, ...)` into
 * `[{ colorScheme, contrast?, value: "rgba(59, 99, 251, 1.0)" }, ...]`,
 * one entry per non-"none" slot that has a known mode mapping (see
 * SLOT_TO_MODES). Unmapped slots (elevated, elevatedIncreased) are returned
 * separately as `skipped` so callers can log them without guessing.
 */
export function parseColorSet(value) {
  const body = COLOR_SET_RE.exec(value.trim())?.[1];
  if (body === undefined) {
    throw new Error(`not a ColorSet literal: ${value}`);
  }
  const modes = [];
  const skipped = [];
  for (const [, slot, raw] of body.matchAll(SLOT_RE)) {
    if (raw === "none") continue;
    const mapping = SLOT_TO_MODES[slot];
    if (!mapping) {
      skipped.push(slot);
      continue;
    }
    modes.push({ ...mapping, value: colorToRgba(raw) });
  }
  return { modes, skipped };
}

const COLOR_RE = /^Color\(([^)]*)\)$/;

function colorToRgba(literal) {
  const args = COLOR_RE.exec(literal)?.[1];
  if (args === undefined) {
    throw new Error(`not a Color literal: ${literal}`);
  }
  const [r, g, b, a] = args.split(",").map((s) => s.trim());
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
