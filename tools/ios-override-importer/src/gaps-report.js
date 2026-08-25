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
  "`elevated`/`elevatedIncreased` ColorSet slots: no foundation colorScheme " +
    "or contrast mode maps to iOS's elevated surface concept (10 CSV rows skipped).",
  '`lightIncreased`/`darkIncreased` naming maps to `contrast:"high"` — modeled ' +
    "here, but the increased→high crosswalk isn't registered anywhere else.",
  "`pressed`/`down` state terms are advisory-only (state isn't hard-enforced by " +
    "registry.rs) — they pass through untouched, not a resolved equivalence.",
  "Typography/size rows (`Scale(FontSize(...))`, 155 rows) are out of scope for " +
    "this importer; see the follow-up bead for font-size/letter-spacing import.",
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
