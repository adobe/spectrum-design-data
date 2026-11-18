// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { migrationTokensFixture } from "./fixtures/migration-tokens";
import {
  comparisonModeSets,
  comparisonRowIndex,
  comparisonSelectionIndex,
  comparisonTokenCount,
  counterpartSample,
  inventoryComparisonRows,
  modeResultSegments,
  sortedComparisonTree,
  tokenComparisonRows,
  visibleComparisonTree,
} from "../src/views/analysis/tokenComparisonPresentation";
import {
  resolveTokenTableSelection,
  selectedTokenTableRows,
  tokenSelectionState,
  toggleTokenSelection,
} from "../src/features/tokens/view/tokenTablePresentation";
import { comparisonValuePreview } from "../src/views/analysis/tokenComparisonPreview";
import { differenceText } from "../src/features/design-data/foundationValues";
import { summarizeModeResults } from "../src/features/design-data/modeResults";
import type { ColorOpacityEnhancement } from "../src/features/design-data/colorOpacityAssessment";
import type { TokenInventoryEntry } from "../src/features/design-data/tokenInventory";

const assessment = migrationTokensFixture();
const before = JSON.stringify(assessment);
const tree = tokenComparisonRows(
  assessment.concepts,
  "",
  "all",
  {},
  "all",
  "all",
);
assert.equal(tree.length, 4);
assert.ok(tree.every((row) => row.children.length === 2 && !row.value));
const flat = tokenComparisonRows(
  assessment.concepts,
  "",
  "all",
  { colorScheme: "light" },
  "all",
  "all",
);
assert.equal(flat.length, 4);
assert.ok(
  flat.every(
    (row) => row.value?.context.colorScheme === "light" && !row.children.length,
  ),
);
assert.ok(
  flat.every(
    (row) =>
      row.label.includes(row.concept.label) && row.label.includes("Light"),
  ),
);
assert.equal(
  tokenComparisonRows(assessment.concepts, "", "all", {}, "all", "spacing")
    .length,
  1,
);
assert.equal(
  tokenComparisonRows(
    assessment.concepts,
    "not-present",
    "all",
    {},
    "all",
    "all",
  ).length,
  0,
);
assert.equal(
  tokenComparisonRows(
    assessment.concepts,
    "",
    "all",
    { colorScheme: "light" },
    "fail",
    "spacing",
  ).length,
  1,
);
const eligible = new Set(
  assessment.concepts.flatMap((concept) =>
    concept.rows
      .filter((row) => row.verdict !== "unassessable")
      .map((row) => row.id),
  ),
);
const index = comparisonSelectionIndex(tree, eligible);
const selection = { rows: index.rows, eligibleIds: index.all, parents: [] };
const parent = tree.find((row) => row.concept.id === "gray-100")!;
const first = parent.children[0];
let selected = toggleTokenSelection(new Set(), index.rows.get(first.id)!, true);
assert.equal(selected.size, 1);
assert.equal(
  tokenSelectionState(index.rows.get(parent.id)!, selected).isIndeterminate,
  true,
);
selected = resolveTokenTableSelection(
  new Set([parent.id]),
  selection,
  selected,
);
assert.equal(
  selected.size,
  2,
  "Selecting a parent selects each eligible required mode instance.",
);
assert.ok(selectedTokenTableRows(selection, selected).has(parent.id));
const filteredIndex = comparisonSelectionIndex(flat, eligible);
assert.equal(
  filteredIndex.all.size,
  3,
  "The hidden Dark instances and unavailable Motion values are excluded.",
);
assert.ok([...filteredIndex.all].every((id) => !id.includes('"dark"')));
assert.equal(
  resolveTokenTableSelection(
    "all",
    { rows: filteredIndex.rows, eligibleIds: filteredIndex.all, parents: [] },
    new Set(),
  ).size,
  3,
);
const disabled = tree.find((row) => row.concept.type === "motion")!;
assert.equal(
  tokenSelectionState(index.rows.get(disabled.id)!, selected).isDisabled,
  true,
);
const dark = assessment.modeBreakdown.find((row) => row.mode === "dark")!;
const segments = modeResultSegments(dark);
assert.equal(
  segments.reduce((sum, segment) => sum + segment.fraction, 0),
  1,
);
assert.equal(segments.find((segment) => segment.id === "pass")?.tone, "green");
assert.equal(segments.find((segment) => segment.id === "fail")?.tone, "red");
assert.equal(
  segments.find((segment) => segment.id === "unassessable")?.tone,
  "gray",
);
const light = assessment.modeBreakdown.find((row) => row.mode === "light")!;
assert.equal(
  modeResultSegments(light).find((segment) => segment.id === "acceptable")
    ?.tone,
  "orange",
);
assert.deepEqual(modeResultSegments({ ...dark, values: 0 }), []);
const unavailable = summarizeModeResults(assessment.concepts, false);
assert.ok(
  unavailable.every(
    (row) =>
      modeResultSegments(row).length === 1 &&
      modeResultSegments(row)[0].fraction === 1 &&
      modeResultSegments(row)[0].tone === "gray",
  ),
);
const controls = comparisonModeSets(assessment, []);
assert.deepEqual(controls[0].modes.map((mode) => mode.id).sort(), [
  '"dark"',
  '"light"',
]);
const spacing = assessment.concepts.find(
  (concept) => concept.type === "spacing",
)!;
assert.equal(
  comparisonValuePreview(spacing, spacing.rows[0], "reference").kind,
  "block",
);
const motion = assessment.concepts.find(
  (concept) => concept.type === "motion",
)!;
assert.equal(
  comparisonValuePreview(motion, motion.rows[0], "reference").kind,
  "unavailable",
);
assert.equal(differenceText({ verdict: "unassessable" }), "Unavailable");
const extraContext = { colorScheme: "dark", contrast: "high" };
const requiredApp = assessment.concepts.find(
  (concept) => concept.type === "color",
)!.rows[0].app!;
function inventoryEntry(
  id: string,
  overrides: Partial<TokenInventoryEntry> = {},
): TokenInventoryEntry {
  return {
    id,
    side: "app",
    record: { ...requiredApp, id, conceptId: id, context: extraContext },
    label: requiredApp.name,
    type: "color",
    presence: "app-only",
    requiredRowIds: [],
    counterparts: [],
    values: [{ context: extraContext, value: "#123", issue: null }],
    ...overrides,
  };
}
const confirmedExtra = inventoryEntry("confirmed-extra");
const enhancement: ColorOpacityEnhancement = {
  id: "confirmed-extra-context",
  conceptId: "gray-100",
  label: requiredApp.name,
  type: "color",
  context: extraContext,
  app: confirmedExtra.record,
  value: "#123",
  issue: null,
  reason: "Additional app token variant; not required by this reference token.",
};
const extraRows = (
  entries: TokenInventoryEntry[],
  enhancements = [enhancement],
  modes = {},
) =>
  inventoryComparisonRows(
    entries,
    "",
    "all",
    modes,
    "all",
    "all",
    enhancements,
  );
const presentationBefore = JSON.stringify({ confirmedExtra, enhancement });
assert.deepEqual(
  extraRows([confirmedExtra]),
  [],
  "Confirmed enhancement samples belong only in Enhancements.",
);
assert.equal(
  extraRows([confirmedExtra], []).length,
  1,
  "An App-only record without confirmed enhancement evidence stays visible.",
);
assert.equal(
  extraRows([inventoryEntry("same-name-other-source")]).length,
  1,
  "Equal display names do not identify enhancements.",
);
for (const presence of [
  "reference-only",
  "unconfirmed",
  "ambiguous",
  "matched",
] as const)
  assert.equal(
    extraRows([
      {
        ...confirmedExtra,
        presence,
        side: presence === "reference-only" ? "reference" : "app",
      },
    ]).length,
    1,
    `${presence} inventory must not be hidden as a confirmed extra.`,
  );
for (const unresolvedEnhancement of [
  { ...enhancement, app: undefined },
  { ...enhancement, issue: "Resolution is unavailable." },
])
  assert.equal(
    extraRows([confirmedExtra], [unresolvedEnhancement]).length,
    1,
    "Unresolved enhancement evidence cannot suppress inventory.",
  );
const unresolvedSample = {
  context: { colorScheme: "light", contrast: "high" },
  value: undefined,
  issue: "Resolution is unavailable.",
};
const mixed = {
  ...confirmedExtra,
  values: [...confirmedExtra.values, unresolvedSample],
};
const mixedRows = extraRows([mixed]);
assert.equal(mixedRows.length, 1);
assert.deepEqual(
  mixedRows[0].children.map((row) => row.sample),
  [unresolvedSample],
  "Mixed groups retain every sample not confirmed as an enhancement.",
);
assert.equal(
  extraRows([mixed], [enhancement], { colorScheme: "dark" }).length,
  0,
);
assert.equal(
  extraRows([mixed], [enhancement], { colorScheme: "light" }).length,
  1,
);
assert.equal(
  extraRows([
    {
      ...confirmedExtra,
      values: [{ ...confirmedExtra.values[0], issue: "Invalid source." }],
    },
  ]).length,
  1,
  "An inventory resolution error must remain visible.",
);
assert.equal(
  JSON.stringify({ confirmedExtra, enhancement }),
  presentationBefore,
  "De-duplication preserves source inventory and enhancement evidence.",
);
const sorted = sortedComparisonTree(tree, []);
assert.deepEqual(
  sorted.map((row) => row.label),
  [...tree].map((row) => row.label).sort((a, b) => a.localeCompare(b)),
  "Sorting once keeps the existing label order.",
);
const collapsed = visibleComparisonTree(sorted, new Set());
assert.ok(
  collapsed.every((row) => row.children.length === 1),
  "Collapsed rows keep one child so they stay expandable.",
);
assert.deepEqual(
  collapsed.map((row) => row.id),
  sorted.map((row) => row.id),
  "Collapsing never changes which rows are shown or their order.",
);
const opened = visibleComparisonTree(sorted, new Set([sorted[1].id]));
assert.equal(opened[1], sorted[1], "An expanded row shows all its children.");
assert.equal(opened[1].children.length, 2);
assert.ok(
  opened.every(
    (row, position) => position === 1 || row === collapsed[position],
  ),
  "Expanding one row reuses every other row unchanged.",
);
const page = visibleComparisonTree(sorted, new Set([sorted[1].id]), 2);
assert.ok(
  page.length === 2 && page.every((row, position) => row === opened[position]),
  "A page shows only the first rows, reusing the same row objects.",
);
const lookup = comparisonRowIndex(sorted);
assert.equal(lookup.get(first.id), first, "Details find child rows by ID.");
assert.equal(lookup.size, sorted.length + sorted.length * 2);
assert.equal(comparisonTokenCount([...lookup.values()]), 4);
const counterpartEntry = inventoryEntry("counterpart", {
  values: [
    { context: { colorScheme: "light" }, value: "#111", issue: null },
    { context: { colorScheme: "dark" }, value: "#222", issue: null },
  ],
});
assert.equal(
  counterpartSample(counterpartEntry, { colorScheme: "dark" })?.value,
  "#222",
);
assert.equal(
  counterpartSample(counterpartEntry, { contrast: "high" }),
  undefined,
);
assert.equal(
  JSON.stringify(assessment),
  before,
  "Presentation and selection never mutate the assessment.",
);
console.log(
  "Migration token filters, scoped selection, previews and confirmed enhancement separation pass.",
);
