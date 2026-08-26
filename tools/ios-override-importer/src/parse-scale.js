// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Swift `FontSize(N)` / `Scale(FontSize(N))` literal -> foundation font-size
// value. iOS's font-size scale is unconditionally the `mobile` member of the
// foundation scale-set (see find-token-uuid.js for why `scale` disambiguates
// mobile/desktop). ponytail: only FontSize/Scale(FontSize) handled here —
// Measurement (letter-spacing) and DynamicTypeSizeSet have no foundation
// equivalent yet (h890.16) and stay unresolved/out-of-scope.
const FONT_SIZE_RE = /^(?:Scale\()?FontSize\(([\d.]+)\)\)?$/;

/** True if `value` is a Swift `FontSize(...)` or `Scale(FontSize(...))` literal. */
export function isFontSizeValue(value) {
  return FONT_SIZE_RE.test(value.trim());
}

/** Parse `FontSize(14.0)` / `Scale(FontSize(14.0))` into `"14px"`. */
export function parseFontSize(value) {
  const match = FONT_SIZE_RE.exec(value.trim());
  if (!match) {
    throw new Error(`not a FontSize literal: ${value}`);
  }
  const n = Number(match[1]);
  return `${n}px`;
}
