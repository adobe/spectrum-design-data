// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  FOUNDATION_IMPACT_METRICS,
  TOKEN_IMPACT_METRICS,
  visibleMetricRows,
} from "../src/features/impact/metrics";
import type { TokenImpactRecord } from "../src/features/impact/model";
import {
  foundationImpactSegments,
  tokenImpactSegments,
} from "../src/features/impact/segments";
import {
  summarizeFoundationImpact,
  summarizeTokenImpact,
} from "../src/features/impact/summaries";

function record(
  id: string,
  overrides: Partial<TokenImpactRecord> = {},
): TokenImpactRecord {
  return {
    tokenId: id,
    tier: "primitive",
    category: "color",
    modeValues: [
      { valueId: `${id}-light`, changed: false },
      { valueId: `${id}-dark`, changed: false },
    ],
    nameChanged: false,
    manuallyOverridden: false,
    ...overrides,
  };
}

const changedDark = [
  { valueId: "dark", changed: true },
  { valueId: "light", changed: false },
];

// A value change plus a manual override is one affected token, not two.
const overlapping = summarizeTokenImpact([
  record("a", { modeValues: changedDark, manuallyOverridden: true }),
  record("b"),
]);
assert.equal(overlapping.affected.count, 1);
assert.equal(overlapping.manualOverrides.count, 1);
assert.equal(overlapping.affected.fraction, 0.5);
assert.equal(overlapping.tiers[0].valuesChanged.count, 1);
assert.equal(overlapping.tiers[0].valuesChanged.total, 4);

// Each tier contributes affected concepts to the overall denominator.
const renamed = summarizeTokenImpact([
  record("a", { nameChanged: true }),
  record("b", { modeValues: changedDark }),
]);
assert.deepEqual(
  tokenImpactSegments(renamed).map((segment) => [segment.id, segment.fraction]),
  [["primitive", 1]],
);

// Tiers only appear when present; semantic records add their own rows.
const mixed = summarizeTokenImpact([
  record("p", { modeValues: changedDark }),
  record("s", {
    tier: "semantic",
    referencesAffectedToken: true,
    modeValues: changedDark,
  }),
  record("t", { tier: "semantic", category: "typography" }),
]);
assert.deepEqual(
  mixed.tiers.map((tier) => tier.tier),
  ["primitive", "semantic"],
);
const mixedRows = visibleMetricRows(TOKEN_IMPACT_METRICS, mixed).map(
  (row) => row.id,
);
assert.ok(
  mixedRows.includes("semantic-affected") &&
    mixedRows.includes("semantic-values"),
);
assert.ok(
  mixedRows.some((id) => id.endsWith("-references")),
  "reference rows remain explicit even when no references are assessable",
);
assert.ok(mixedRows.includes("category-color"));
assert.ok(
  !mixedRows.includes("category-typography"),
  "0% categories are hidden",
);
assert.ok(
  mixedRows.includes("manual-overrides"),
  "overrides always show, even at 0",
);

const primitiveOnly = visibleMetricRows(
  TOKEN_IMPACT_METRICS,
  summarizeTokenImpact([record("p")]),
).map((row) => row.id);
assert.ok(
  !primitiveOnly.some((id) => id.startsWith("semantic")),
  "absent tiers have no rows",
);

// Foundation category shares stack to the headline.
const foundations = summarizeFoundationImpact([
  { id: "c1", category: "color", edited: true },
  { id: "c2", category: "color", edited: false },
  { id: "m1", category: "modes", edited: true },
  { id: "m2", category: "modes", edited: false },
  { id: "t1", category: "typography", edited: false },
]);
assert.equal(foundations.edited.fraction, 0.4);
const segments = foundationImpactSegments(foundations);
assert.deepEqual(
  segments.map((segment) => segment.id),
  ["color", "modes"],
);
assert.ok(
  Math.abs(
    segments.reduce((total, segment) => total + segment.fraction, 0) - 0.4,
  ) < 1e-12,
);
assert.deepEqual(
  visibleMetricRows(FOUNDATION_IMPACT_METRICS, foundations).map(
    (row) => row.label,
  ),
  ["Color edits", "Mode-related edits"],
);

console.log("impact: summaries, visibility rules, and segments passed");
