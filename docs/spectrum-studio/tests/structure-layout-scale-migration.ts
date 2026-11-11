// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { createStore } from "jotai";
import { upgradeLayoutScalesSnapshot } from "../src/features/edit-session/layoutScalesUpgrade";
import { isTshirtRule } from "../src/features/logic/model";
import {
  assignStructure,
  structureBinding,
  structureSlot,
} from "../src/features/structures/model";
import {
  buildTshirtArtifacts,
  selectedTshirtRows,
  tshirtPreview,
} from "../src/features/design-data/tshirtArtifacts";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { createLocalVariantProperty } from "../src/features/option-groups/model";
import { structureEditor } from "../src/features/structures/variants";
import { generateDimensionScale } from "../src/features/scales/foundation";
import { modeSelections } from "../src/features/modes/combinations";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";

const legacy = createDefaultSnapshot();
const ruleId = "279534c2-f430-480b-b408-6d0ed765f97a";
legacy.rules = legacy.rules!.map((rule) =>
  rule.id !== ruleId
    ? rule
    : {
        ...rule,
        movement: "ratio",
        roundingRuleId: "rule-whole-numbers",
        ratio: {
          kind: "parameter",
          scaleTypeId: "scale-type-typography",
          parameterId: "ratio",
        },
      },
);
const base = legacy.structures!.structures.find(
  (item) => item.name === "Base",
)!;
assert(base);
const literal = {
  value: { kind: "number" as const, value: 12, unit: "px" as const },
};
legacy.structures!.structures = legacy.structures!.structures.map(
  (structure) =>
    structure.conceptId === base.conceptId
      ? assignStructure(structure, {
          paddingLeft: literal,
          paddingRight: literal,
        })
      : structure,
);
const before = structuredClone(legacy);
const allocations = new Map<string, string>();
const upgraded = upgradeLayoutScalesSnapshot(legacy, allocations);
assert.deepEqual(
  legacy,
  before,
  "Migration never mutates the previous record.",
);
assertStoredSnapshot(upgraded);
assert.equal(
  upgraded.spacing!.scales.length,
  legacy.spacing!.scales.length + 1,
);
const previousScaleIds = new Set(
  legacy.spacing!.scales.map((scale) => scale.id),
);
const migratedScale = (source: typeof legacy) =>
  source.spacing!.scales.find((scale) => !previousScaleIds.has(scale.id))!;
const scale = migratedScale(upgraded);
assert.equal(scale.scaleTypeId, "scale-type-typography");
assert.equal(scale.componentSizeScaling, true);
assert.equal(scale.base, 12);
assert.deepEqual(
  upgraded.styles,
  legacy.styles,
  "Concurrent Styles data survives conversion.",
);
assert(
  upgraded.rules!.every(
    (rule) => !isTshirtRule(rule) || rule.movement !== "ratio",
  ),
);
assert.equal(
  upgradeLayoutScalesSnapshot(upgraded),
  upgraded,
  "Conversion is idempotent.",
);

const oldBundle = buildTshirtArtifacts(legacy);
const bundle = buildTshirtArtifacts(upgraded);
assert.equal(
  bundle.semantics.length,
  oldBundle.semantics.length,
  "Moving progressions into Foundations does not add semantic tokens.",
);
const rowValues = (output: typeof bundle, selection: Record<string, string>) =>
  ["xs", "s", "m", "l", "xl"]
    .flatMap((size) =>
      selectedTshirtRows(output, base.conceptId, size, selection).flatMap(
        (row) => row.bindingIds.map((id) => [id, size, row.target.value]),
      ),
    )
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
for (const selection of modeSelections(legacy.modeSets)) {
  assert.deepEqual(
    rowValues(bundle, selection),
    rowValues(oldBundle, selection),
    `Migration preserves every Base layout value for ${JSON.stringify(selection)}.`,
  );
}
const scaleAxis = upgraded.modeSets.find((axis) => axis.key === "scale")!;
const mobile = {
  [scaleAxis.id]: scaleAxis.modes.find((mode) => mode.key === "mobile")!.id,
};
const mobileSmall = selectedTshirtRows(
  bundle,
  base.conceptId,
  "s",
  mobile,
).find((row) =>
  row.bindingIds.some((id) =>
    base.properties.some(
      (binding) =>
        binding.id === id && structureSlot(binding) === "paddingLeft",
    ),
  ),
)!;
assert.equal(
  mobileSmall.target.value,
  13,
  "Component size is applied before rounding, exactly once.",
);
assert("$ref" in mobileSmall.token);
assert.equal(
  bundle.tokens.find((token) => token.uuid === mobileSmall.token.$ref)?.value,
  "13px",
  "Published aliases resolve to the same value as semantic generation.",
);
const previewStore = createStore();
previewStore.set(restoreAuthoringSnapshotAtom, upgraded);
previewStore.set(modeSelectionAtom, {
  ...Object.fromEntries(
    upgraded.modeSets.map((axis) => [axis.key, axis.defaultModeId]),
  ),
  [scaleAxis.key]: mobile[scaleAxis.id],
});
const preview = tshirtPreview(
  upgraded.structures!.structures.find(
    (structure) => structure.conceptId === base.conceptId,
  )!,
  "s",
  bundle,
  mobile,
  previewStore.get(primitiveReferencesAtom),
);
assert.equal(
  preview.rows.find((row) => row.conceptId === mobileSmall.conceptId)?.target
    .value,
  13,
  "The Structure preview and published token agree.",
);

const withOption = structuredClone(legacy);
const optionBase = withOption.structures!.structures.find(
  (structure) => structure.conceptId === base.conceptId,
)!;
const property = createLocalVariantProperty("Layout");
const alternate = property.options[1].id;
const editor = structureEditor(optionBase);
optionBase.editor = {
  ...editor,
  properties: [...editor.properties, property],
  overrides: {
    ...editor.overrides,
    [alternate]: {
      slots: {
        paddingLeft: { value: { kind: "number", value: 11, unit: "px" } },
        paddingRight: { value: { kind: "number", value: 11, unit: "px" } },
      },
    },
  },
};
const optionUpgrade = upgradeLayoutScalesSnapshot(withOption);
assertStoredSnapshot(optionUpgrade);
const optionSlots = optionUpgrade.structures!.structures.find(
  (structure) => structure.conceptId === base.conceptId,
)!.editor!.overrides[alternate].slots!;
assert.deepEqual(
  optionSlots.paddingLeft,
  optionSlots.paddingRight,
  "One shared option override has one scale.",
);
assert(optionSlots.paddingLeft && "$ref" in optionSlots.paddingLeft);
assert.equal(
  optionUpgrade.spacing!.scales.length,
  withOption.spacing!.scales.length + 2,
  "The default and the distinct option base each become an explicit scale.",
);

const working = structuredClone(legacy);
working.structures!.structures = working.structures!.structures.map(
  (structure) =>
    structure.conceptId === base.conceptId
      ? assignStructure(structure, {
          paddingLeft: { value: { kind: "number", value: 13, unit: "px" } },
          paddingRight: { value: { kind: "number", value: 13, unit: "px" } },
        })
      : structure,
);
const changed = upgradeLayoutScalesSnapshot(working, allocations);
assert.equal(
  migratedScale(changed).id,
  scale.id,
  "Saved and working allocations share stable scale identities.",
);
assert.equal(migratedScale(changed).base, 13);
assert.equal(
  migratedScale(upgraded).base,
  12,
  "Saved and working bases remain independent.",
);

const ratioChanged = structuredClone(upgraded);
const formula = ratioChanged.scaleTypes!.find(
  (item) => item.id === scale.scaleTypeId,
)!;
formula.parameters = formula.parameters.map((parameter) =>
  parameter.id === "ratio" ? { ...parameter, default: 1.2 } : parameter,
);
const changedBundle = buildTshirtArtifacts(ratioChanged);
assert.notDeepEqual(
  rowValues(changedBundle, mobile),
  rowValues(bundle, mobile),
  "Formula edits propagate through generated semantic output.",
);
const unrelated = upgraded.spacing!.scales.find(
  (item) => item.scaleTypeId !== scale.scaleTypeId,
)!;
assert.deepEqual(
  generateDimensionScale(
    "spacing",
    unrelated,
    upgraded.rules,
    upgraded.scaleTypes,
  ),
  generateDimensionScale(
    "spacing",
    unrelated,
    ratioChanged.rules,
    ratioChanged.scaleTypes,
  ),
  "Unrelated scales do not follow the Type scale formula.",
);

const scalingChanged = structuredClone(upgraded);
migratedScale(scalingChanged).componentSizeScaling = false;
const authored = compareAuthoring(upgraded, scalingChanged);
assert(
  authored.groups
    .flatMap((group) => group.items)
    .some((item) =>
      item.fields.some(
        (field) => field.address?.path.at(-1) === "componentSizeScaling",
      ),
    ),
  "The Foundation setting has a Changes reset address.",
);
const tokenChanges = comparePrimitiveTokens(upgraded, scalingChanged, authored);
assert.equal(
  tokenChanges.items.length,
  5,
  "Exactly the five values on this scale change.",
);
assert.equal(
  tokenChanges.records.filter((record) =>
    record.modeValues.some((value) => value.changed),
  ).length,
  5,
  "Impact counts each changed primitive once.",
);
assert.equal(
  tokenChanges.records
    .flatMap((record) => record.modeValues)
    .filter((value) => value.changed).length,
  5,
  "Only the five mobile primitive values change.",
);
const resetWorking = createDefaultSnapshot();
const shippedScale = resetWorking.spacing!.scales.find(
  (item) => item.componentSizeScaling,
)!;
shippedScale.componentSizeScaling = false;
const restored = prepareChangeReset(
  { ...resetWorking, attachments: {} },
  sourceResetPlan("Follow component size", [
    {
      path: [
        "spacing",
        "scales",
        { key: "id", id: shippedScale.id },
        "componentSizeScaling",
      ],
      expected: false,
    },
  ]),
);
assert.equal(
  restored.spacing!.scales.find((item) => item.id === shippedScale.id)!
    .componentSizeScaling,
  true,
);

const values = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  },
});
values.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 30,
    working,
    saved: legacy,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
const record = readAuthoringRecord(assertStoredSnapshot, (value) => value)!;
assert.equal(record.version, AUTHORING_RECORD_VERSION);
assert.equal(migratedScale(record.working).id, migratedScale(record.saved).id);
assert.equal(migratedScale(record.working).base, 13);
assert.equal(migratedScale(record.saved).base, 12);
assert.deepEqual(record.working.styles, legacy.styles);
writeAuthoringRecord(record);
const reloaded = readAuthoringRecord(assertStoredSnapshot, (value) => value)!;
assert.deepEqual(
  reloaded,
  record,
  "Version 31 round-trips through the portable Structure codec.",
);
const migratedBase = reloaded.saved.structures!.structures.find(
  (item) => item.conceptId === base.conceptId,
)!;
assert.deepEqual(
  structureBinding(migratedBase, "paddingLeft"),
  structureBinding(
    reloaded.working.structures!.structures.find(
      (item) => item.conceptId === base.conceptId,
    )!,
    "paddingLeft",
  ),
  "Migration identities are stable within each read pair.",
);
delete (globalThis as { window?: unknown }).window;
console.log(
  "Legacy ratio conversion, linked formula propagation, mobile rounding, Changes, reset, and v31 persistence passed.",
);
