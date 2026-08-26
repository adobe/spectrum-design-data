// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Known iOS-vocabulary gaps that no amount of alias-chain resolution can close
// — foundation/registry-level decisions, tracked for docs/proposals/006 per
// the plan. Static, not derived from the CSV.
const KNOWN_GAPS = [
  '`elevated`/`elevatedIncreased` ColorSet slots import as `variant:"elevated"` ' +
    'extension tokens at `colorScheme:"dark"` (mirrors `background-elevated-color`\'s ' +
    'dark-elevated member). `variant:elevated` combined with `contrast:"high"` ' +
    "(the elevatedIncreased shape) is a new-but-additive combination — not seen " +
    "elsewhere in foundation yet, but not gated on further design work either.",
  '`lightIncreased`/`darkIncreased` naming maps to `contrast:"high"` — modeled ' +
    "here, but the increased→high crosswalk isn't registered anywhere else.",
  "`pressed`/`down` state terms are advisory-only (state isn't hard-enforced by " +
    "registry.rs) — they pass through untouched, not a resolved equivalence.",
  "`FontSize(N)`/`Scale(FontSize(N))` rows import as overrides against the " +
    "`mobile` scale-set member (spectrum-design-data-h890.15); rows with no " +
    "resolvable font-size alias fall through to the unresolved list below.",
  "`letter-spacing-font-size-*` (Measurement) and `letter-spacing-body-*` " +
    "(DynamicTypeSizeSet) rows have no foundation equivalent — no per-size " +
    "letter-spacing scale or DynamicTypeSize mode-set exists yet. Deferred to " +
    "spectrum-design-data-h890.16 pending a foundation naming/units decision.",
];

/**
 * Render `emitManifest`'s `unresolved` array (rows/modes with no clean
 * foundation equivalent) plus the known static vocabulary gaps as markdown.
 */
export function buildGapsReport(unresolved) {
  const lines = [
    "# iOS Override Import — Gap Report",
    "",
    "## Known vocabulary gaps",
    "",
    ...KNOWN_GAPS.map((g) => `- ${g}`),
    "",
    `## Unresolved rows (${unresolved.length})`,
    "",
    "Rows whose target slug (or a specific colorScheme/contrast mode within it) " +
      "has no foundation-token equivalent, so no manifest fragment was emitted.",
    "",
  ];

  for (const { row, candidates } of unresolved) {
    lines.push(
      `### ${row["Token Name"]}`,
      "",
      `- Candidates tried: ${candidates.join(", ")}`,
    );
    if (row["Override Source"])
      lines.push(`- Source: ${row["Override Source"]}`);
    lines.push("");
  }

  return lines.join("\n");
}
