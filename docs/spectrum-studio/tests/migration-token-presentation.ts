// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { migrationTokensFixture } from "./fixtures/migration-tokens";
import {
  comparisonModeSets,
  comparisonSelectionIndex,
  modeResultSegments,
  tokenComparisonRows,
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
assert.equal(
  JSON.stringify(assessment),
  before,
  "Presentation and selection never mutate the assessment.",
);
console.log(
  "Migration token tree/flat filters, scoped selection, chart proportions and typed previews pass.",
);
