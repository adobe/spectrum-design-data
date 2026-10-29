// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createColorDefaults } from "../src/data/defaults";
import {
  isColorSystemDocument,
  migrateColorSystemDocument,
} from "../src/features/color-system/model";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  isDataVisContrastOverrides,
  isDataVisScale,
  isDataVisSourceOverrides,
  type ContinuousDataVisScale,
} from "../src/features/color-system/data-vis/model";
import {
  blockedUiSourceRemoval,
  dataVisSourceIssues,
} from "../src/features/color-system/data-vis/references";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { createMode, type ModeSet } from "../src/features/modes/model";
import { normalizeModeState } from "../src/features/modes/integrity";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
} from "../src/features/edit-session/state";
import { upgradeDataVisSnapshot } from "../src/features/edit-session/dataVisUpgrade";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { sequentialDefaults } from "./fixtures/sequentialDefaults";

const base = createColorDefaults();
assert.deepEqual(
  base.dataVisScales.map((scale) => [scale.name, scale.kind]),
  sequentialDefaults.map((scale) => [scale.name, "sequential"]),
);
assert.equal(base.scales[0].name, "Gray");
assert.equal(base.scales[0].customContrasts!.steps.length, 13);
assert.equal(
  base.scales[0].customContrasts!.baseContrastId,
  base.scales[0].customContrasts!.steps[3].id,
);
const recipe: ContinuousDataVisScale = {
  id: "data-vis-test",
  name: "Test sequence",
  kind: "sequential",
  points: [
    {
      id: "low",
      position: 0,
      source: { kind: "ui-scale", scaleId: base.scales[1].id },
      contrast: { value: 1.2 },
    },
    {
      id: "high",
      position: 1,
      source: {
        kind: "key-color",
        color: { lightness: 0.5, hue: 250, chroma: 30 },
      },
      contrast: { value: 8.47, oppositeValue: 13.638 },
    },
  ],
};
assert.ok(isDataVisScale(recipe));
assert.ok(isColorSystemDocument({ ...base, dataVisScales: [recipe] }));
assert.equal(
  buildColorLibrary({ ...base, dataVisScales: [recipe] }),
  buildColorLibrary(base),
  "Continuous definitions cannot change the existing UI CSS library.",
);
for (const points of [
  [],
  [recipe.points[0]],
  [...recipe.points].reverse(),
  [{ ...recipe.points[0], position: Number.NaN }, recipe.points[1]],
  [recipe.points[0], { ...recipe.points[1], id: "low" }],
  [recipe.points[0], { ...recipe.points[1], contrast: { value: 22 } }],
  [
    recipe.points[0],
    {
      ...recipe.points[1],
      source: {
        kind: "key-color",
        color: { lightness: 0.5, hue: Infinity, chroma: 10 },
      },
    },
  ],
])
  assert.ok(!isDataVisScale({ ...recipe, points }));
assert.ok(!isDataVisScale({ ...recipe, kind: "diverging" }));
assert.ok(
  isDataVisScale({
    ...recipe,
    kind: "diverging",
    points: [
      recipe.points[0],
      { ...recipe.points[0], id: "center", position: 0.5 },
      recipe.points[1],
    ],
  }),
);
const linked = {
  ...recipe.points[0],
  source: {
    kind: "ui-swatch" as const,
    scaleId: base.scales[0].id,
    contrastId: base.scales[0].customContrasts!.steps[4].id,
  },
};
assert.ok(
  !isDataVisScale({ ...recipe, points: [linked, recipe.points[1]] }),
  "Named swatches cannot own another contrast recipe.",
);
const categorical = {
  id: "categories",
  name: "Categories",
  kind: "categorical",
  preferences: DEFAULT_CATEGORICAL_PREFERENCES,
  members: [{ id: "member-a", source: linked.source }],
};
assert.ok(isDataVisScale(categorical));
assert.ok(!isDataVisScale({ ...categorical, members: [] }));
assert.ok(
  !isDataVisScale({
    ...categorical,
    members: [categorical.members[0], categorical.members[0]],
  }),
);
assert.ok(
  !isDataVisScale({
    ...categorical,
    preferences: {
      ...DEFAULT_CATEGORICAL_PREFERENCES,
      cvdProfiles: ["normal"],
    },
  }),
);
assert.ok(
  isDataVisSourceOverrides({ [recipe.id]: { high: { color: { hue: 300 } } } }),
);
assert.ok(
  !isDataVisSourceOverrides({ [recipe.id]: { high: { position: 0.5 } } }),
);
assert.ok(isDataVisContrastOverrides({ [recipe.id]: { low: 2.4 } }));
assert.ok(!isDataVisContrastOverrides({ [recipe.id]: { low: Number.NaN } }));

const document = { ...base, dataVisScales: [recipe] };
const normal = createMode(),
  changed = createMode();
changed.foundations.color = {
  dataVisSources: { [recipe.id]: { high: { color: { hue: 320 } } } },
  dataVisContrasts: { [recipe.id]: { low: 2.4 } },
};
const axis: ModeSet = {
  id: "data-vis-axis",
  key: "source",
  name: "Sources",
  description: "",
  modes: [normal, changed],
  defaultModeId: normal.id,
  authoringCapabilities: ["color.scales", "color.contrastMultiplier"],
};
const resolved = resolveColorDocument(document, [changed], undefined, {
  modeSets: [axis],
});
const sequence = resolved.dataVisScales[0];
assert.equal(sequence.kind, "sequential");
if (sequence.kind === "categorical")
  throw new Error("Expected a continuous scale.");
assert.equal(sequence.points[0].contrast?.value, 2.4);
assert.equal(sequence.points[1].source.kind, "key-color");
if (sequence.points[1].source.kind !== "key-color")
  throw new Error("Expected a key source.");
assert.equal(sequence.points[1].source.color.hue, 320);
assert.deepEqual(
  document.dataVisScales,
  [recipe],
  "Mode resolution cannot mutate shared authored inputs.",
);
assert.equal(dataVisSourceIssues(document, [axis]).length, 0);
assert.match(
  blockedUiSourceRemoval(document, [axis], base.scales[1].id)!,
  /replacement colors first/,
);
assert.match(
  dataVisSourceIssues(
    {
      ...document,
      scales: base.scales.filter((scale) => scale.id !== base.scales[1].id),
    },
    [axis],
  )[0],
  /unavailable/,
);
const wrongPatch = structuredClone(axis);
wrongPatch.modes[1].foundations.color!.dataVisSources![recipe.id].low = {
  color: { hue: 20 },
};
assert.ok(
  dataVisSourceIssues(document, [wrongPatch]).some((issue) =>
    issue.includes("changes its source kind"),
  ),
);
const normalized = normalizeModeState({
  modeSets: [{ ...axis, authoringCapabilities: [] }],
  selection: {},
  claims: {},
});
assert.deepEqual(normalized.modeSets[0].authoringCapabilities, [
  "color.contrastMultiplier",
  "color.scales",
]);

const { colorOutput, ...legacySettings } = base.settings;
void colorOutput;
const legacyColor = {
  ...base,
  schemaVersion: 2,
  settings: { ...legacySettings, outputGamut: "srgb" },
};
Reflect.deleteProperty(legacyColor, "dataVisScales");
const migrated = migrateColorSystemDocument(legacyColor, 2)!;
assert.deepEqual(
  migrated,
  { ...base, dataVisScales: [] },
  "Older saved designs do not receive new shipped scales.",
);
const olderWorking = { ...createDefaultSnapshot(), colorSystem: legacyColor };
const olderSaved = {
  ...createDefaultSnapshot(),
  colorSystem: structuredClone(legacyColor),
};
olderWorking.colorSystem.scales = structuredClone(base.scales);
olderWorking.colorSystem.scales[1].stops[0].hue = 123;
const working = upgradeDataVisSnapshot(olderWorking, 7),
  saved = upgradeDataVisSnapshot(olderSaved, 7);
assert.equal(working.colorSystem.scales[1].stops[0].hue, 123);
assert.notEqual(saved.colorSystem.scales[1].stops[0].hue, 123);
assert.deepEqual(working.colorSystem.dataVisScales, []);
assert.deepEqual(saved.colorSystem.dataVisScales, []);
assertStoredSnapshot(working);
assertStoredSnapshot(saved);
assert.throws(
  () => upgradeDataVisSnapshot({ ...olderWorking, colorSystem: null }, 7),
  /unavailable/,
);
console.log(
  "Data vis contracts: strict recipes, ownership, references, shipped sequential scales and preserved migration passed.",
);
