// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { tokenDialogCatalogAtom } from "../src/features/tokens/dialogState";
import {
  modePairs,
  literalAssignment,
  shadowText,
} from "../src/features/tokens/tokenAssignments";
import {
  canonicalTokenModeKey,
  resolveBrowserTokens,
} from "../src/features/tokens/browserModel";
import { resolveDialogTokens } from "../src/features/tokens/dialogModel";
import { canonicalTaxonomyValue } from "../src/features/taxonomy/export";
import { componentTokenCatalog } from "../src/features/components/references";
import { compareAuthoring } from "../src/features/changelog/registry";
import { restorePath } from "../src/features/changelog/contract";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import { projectSnapshot } from "../src/features/design-data/authoringProjection";
import {
  applyReferenceOverrides,
  applyReferenceOverridesAtom,
  referenceOverrideEligibility,
  type ReferenceOverride,
} from "../src/features/design-data/referenceOverrides";
import type { ColorOpacityRow } from "../src/features/design-data/colorOpacityAssessment";
import type { CanonicalAliasRow } from "../src/features/tokens/aliasTargets";

const store = createStore();
store.set(enterEditModeAtom);
const catalog = store.get(tokenDialogCatalogAtom);
if (catalog.status !== "ready") throw new Error(catalog.error);
const initial = store.get(authoringSnapshotAtom);
const spacing = catalog.rows.find(
  (row) =>
    row.token.type === "spacing" && !row.token.semantic && !row.token.alias,
)!;
const color = catalog.rows.find(
  (row) =>
    row.token.type === "colors" && !row.token.semantic && !row.token.alias,
)!;
const shadow = catalog.rows.find(
  (row) =>
    row.token.type === "elevation" && !row.token.semantic && !row.token.alias,
)!;
assert.ok(
  spacing && color && shadow,
  "The shared token-dialog fixtures are available.",
);
function comparison(row: CanonicalAliasRow, value: unknown): ColorOpacityRow {
  const context = Object.fromEntries(
    modePairs(row.context).map(([axis, mode]) => {
      const set = initial.modeSets.find((set) => set.id === axis)!;
      return [set.key, set.modes.find((item) => item.id === mode)!.key];
    }),
  );
  const record = {
    id: row.rowId,
    identity: row.rowId,
    conceptId: row.id,
    browserTokenId: row.token.id,
    category: "tokens",
    source: "fixture",
    pointer: "",
    classification: "generated" as const,
    name: row.name,
    structuredName: row.token.projection?.flat,
    unit: row.token.unit,
  };
  return {
    id: row.rowId,
    app: record,
    reference: record,
    context,
    appContext: context,
    appValue: row.token.value,
    referenceValue: value,
    verdict: "fail",
    issues: [],
    appChain: [],
    referenceChain: [],
  };
}
const spacingValue = Number(spacing.token.value) + 3;
const spacingComparison = comparison(spacing, spacingValue);
const target = (row: ColorOpacityRow) => {
  const eligibility = referenceOverrideEligibility(
    row,
    catalog.rows,
    initial.modeSets,
  );
  assert.equal(eligibility.reason, undefined, eligibility.reason);
  return eligibility.targets[0]!;
};
const spacingTarget = target(spacingComparison);
assert.equal(spacingTarget.modeKey, spacing.context);
const axes = initial.modeSets.filter((set) => set.modes.length > 1).slice(0, 2);
assert.equal(
  axes.length,
  2,
  "Two authored mode axes are available for the exact-combination fixture.",
);
const contexts = axes[1].modes.slice(0, 2).map((mode) =>
  canonicalTokenModeKey({
    [axes[0].id]: axes[0].modes[0].id,
    [axes[1].id]: mode.id,
  }),
);
const multiRows = contexts.map((context, index) => ({
  ...spacing,
  rowId: `multi-${index}`,
  context,
}));
const multiEligibility = referenceOverrideEligibility(
  comparison(multiRows[0], spacingValue),
  multiRows,
  initial.modeSets,
);
assert.equal(multiEligibility.targets.length, 1);
assert.equal(multiEligibility.targets[0].modeKey, contexts[0]);
const scoped = applyReferenceOverrides(
  multiEligibility.targets,
  multiRows,
  initial,
);
assert.deepEqual(Object.keys(scoped[spacing.token.id].authoring!.assignments), [
  contexts[0],
]);
assert.equal(
  resolveDialogTokens(multiRows, scoped, initial.taxonomy!, contexts[0])[0]
    .value,
  spacingValue,
);
assert.equal(
  resolveDialogTokens(multiRows, scoped, initial.taxonomy!, contexts[1])[0]
    .value,
  spacing.token.generatedValue,
  "Selecting one two-axis combination does not override its sibling combination.",
);
const converted = target({
  ...spacingComparison,
  reference: { ...spacingComparison.reference, unit: "pt" },
  referenceValue: 3,
});
assert.equal(
  converted.assignment.value,
  4,
  "Reference points are converted to native pixels.",
);
assert.equal(
  referenceOverrideEligibility(
    { ...spacingComparison, verdict: "unassessable" },
    catalog.rows,
    initial.modeSets,
  ).targets.length,
  0,
);
assert.equal(
  referenceOverrideEligibility(
    { ...spacingComparison, app: undefined },
    catalog.rows,
    initial.modeSets,
  ).targets.length,
  0,
);
assert.equal(
  referenceOverrideEligibility(
    { ...spacingComparison, referenceValue: undefined },
    catalog.rows,
    initial.modeSets,
  ).targets.length,
  0,
);
assert.equal(
  referenceOverrideEligibility(
    { ...spacingComparison, appContext: { unknown: "mode" } },
    catalog.rows,
    initial.modeSets,
  ).targets.length,
  0,
);
assert.equal(
  referenceOverrideEligibility(
    spacingComparison,
    catalog.rows.map((row) =>
      row === spacing
        ? { ...row, token: { ...row.token, status: "deprecated" } }
        : row,
    ),
    initial.modeSets,
  ).targets.length,
  0,
);
const layers = literalAssignment(shadow.token).shadows!.map((layer) => ({
  ...layer,
  x: "3px",
  spread: "2px",
}));
const targets = [
  spacingTarget,
  target(comparison(color, "#123456")),
  target(comparison(shadow, layers)),
];
let writes = 0;
const unsubscribe = store.sub(browserTokenEditsAtom, () => writes++);
const before = JSON.stringify(initial.browserTokenEdits);
const invalid: ReferenceOverride = {
  ...spacingTarget,
  assignment: { kind: "literal", value: -1 },
};
assert.throws(
  () =>
    store.set(applyReferenceOverridesAtom, {
      expected: initial,
      targets: [targets[1], invalid],
    }),
  /non-negative/,
);
assert.equal(
  writes,
  0,
  "One invalid assignment leaves the whole batch untouched.",
);
assert.equal(JSON.stringify(store.get(browserTokenEditsAtom)), before);
assert.throws(
  () =>
    applyReferenceOverrides(
      [
        spacingTarget,
        {
          ...spacingTarget,
          assignment: { kind: "literal", value: spacingValue + 1 },
        },
      ],
      catalog.rows,
      initial,
    ),
  /conflict/,
);
assert.throws(
  () =>
    applyReferenceOverrides(
      [{ ...spacingTarget, modeKey: '[["removed","mode"]]' }],
      catalog.rows,
      initial,
    ),
  /exact mode combination/,
);
store.set(applyReferenceOverridesAtom, { expected: initial, targets });
assert.equal(
  writes,
  1,
  "The validated mixed-type batch has one observable write.",
);
const working = store.get(authoringSnapshotAtom);
assert.ok(working.browserTokenEdits);
const workingEdits = working.browserTokenEdits;
assertStoredSnapshot(JSON.parse(JSON.stringify(working)));
for (const item of targets) {
  const edit: NonNullable<(typeof workingEdits)[string]["authoring"]> =
    workingEdits[item.tokenId].authoring!;
  assert.deepEqual(edit.assignments[item.modeKey], item.assignment);
  assert.notEqual(edit.baselines?.[item.modeKey], undefined);
}
assert.throws(
  () => store.set(applyReferenceOverridesAtom, { expected: initial, targets }),
  /Source data changed/,
);
const updated = store.get(tokenDialogCatalogAtom);
if (updated.status !== "ready") throw new Error(updated.error);
const emitted = updated.rows.find(
  (row) => row.token.id === spacing.token.id && row.context === spacing.context,
)!;
assert.deepEqual(canonicalTaxonomyValue(emitted, updated.rows), {
  value: spacingValue,
  unit: "px",
});
assert.ok(emitted.token.valueOverridden);
assert.equal(emitted.token.stale, false);
assert.ok(
  componentTokenCatalog(working).some(
    (item) =>
      item.browserId === spacing.token.id && item.value === `${spacingValue}px`,
  ),
);
const authored = compareAuthoring(initial, working);
assert.ok(
  authored.groups
    .flatMap((group) => group.items)
    .flatMap((item) => item.fields)
    .every((field) => !field.address?.path.includes("baselines")),
  "Recovery baselines are not extra authored changes.",
);
const changes = comparePrimitiveTokens(initial, working, authored);
assert.ok(
  changes.records.find((row) => row.tokenId === spacing.token.id)
    ?.manuallyOverridden,
);
const valueChange = changes.items
  .find((item) => item.id === spacing.token.id)!
  .fields.find(
    (field) => field.key === "Value" && field.context?.key === spacing.context,
  )!;
assert.deepEqual(valueChange.address?.path, [
  "browserTokenEdits",
  spacing.token.id,
  "authoring",
  "assignments",
  spacing.context,
]);
const reset = restorePath(working, initial, valueChange.address!);
assert.equal(
  reset.browserTokenEdits?.[spacing.token.id].authoring?.assignments[
    spacing.context
  ],
  undefined,
);
assert.deepEqual(
  reset.browserTokenEdits?.[color.token.id],
  working.browserTokenEdits?.[color.token.id],
);
assert.equal(
  resolveDialogTokens(
    updated.rows,
    reset.browserTokenEdits ?? {},
    reset.taxonomy!,
    spacing.context,
  ).find((row) => row.id === spacing.token.id)?.value,
  spacing.token.generatedValue,
);
const generatedValue = Number(spacing.token.generatedValue) + 10;
const stale = resolveBrowserTokens(
  [
    {
      ...spacing.token,
      originalSource: undefined,
      value: generatedValue,
      generatedValue,
    },
  ],
  working.browserTokenEdits ?? {},
  spacing.context,
)[0];
assert.equal(stale.value, spacingValue);
assert.equal(
  stale.stale,
  true,
  "An upstream change preserves the override and marks its captured baseline stale.",
);
const projection = projectSnapshot(working, "working");
assert.ok(
  projection.records.some(
    (row) =>
      row.browserTokenId === spacing.token.id &&
      row.value === `${spacingValue}px`,
  ),
  `Analysis must expose the same overridden value. ${projection.errors.join("\n")}`,
);
const emittedShadow = updated.rows.find(
  (row) => row.token.id === shadow.token.id && row.context === shadow.context,
)!;
assert.deepEqual(canonicalTaxonomyValue(emittedShadow, updated.rows), {
  value: layers,
});
assert.equal(emittedShadow.token.value, shadowText(layers));
const repeat = applyReferenceOverrides(targets, updated.rows, working);
assert.deepEqual(
  repeat,
  working.browserTokenEdits,
  "Applying the same values is idempotent.",
);
const replacement = applyReferenceOverrides(
  [
    {
      ...spacingTarget,
      assignment: { kind: "literal", value: spacingValue + 1 },
    },
  ],
  updated.rows,
  working,
);
assert.equal(
  replacement[spacing.token.id].authoring?.assignments[spacing.context]?.kind,
  "literal",
);
const replacementAssignment =
  replacement[spacing.token.id].authoring?.assignments[spacing.context];
assert.ok(replacementAssignment?.kind === "literal");
assert.equal(replacementAssignment.value, spacingValue + 1);
const otherContexts = updated.rows.filter(
  (row) => row.token.id === spacing.token.id && row.context !== spacing.context,
);
assert.ok(
  otherContexts.every(
    (row) =>
      row.token.value ===
      catalog.rows.find(
        (original) =>
          original.token.id === row.token.id &&
          original.context === row.context,
      )!.token.value,
  ),
  "Unselected contexts retain their original values.",
);
unsubscribe();
store.set(cancelEditAtom);
assert.deepEqual(store.get(browserTokenEditsAtom), initial.browserTokenEdits);
store.set(enterEditModeAtom);
store.set(applyReferenceOverridesAtom, {
  expected: store.get(authoringSnapshotAtom),
  targets,
});
store.set(saveEditAtom);
const saved = store.get(editSessionSnapshotAtom)!;
const reloaded: unknown = JSON.parse(JSON.stringify(saved));
assertStoredSnapshot(reloaded);
store.set(restoreAuthoringSnapshotAtom, reloaded);
assert.deepEqual(store.get(browserTokenEditsAtom), saved.browserTokenEdits);
store.set(applyReferenceOverridesAtom, {
  expected: store.get(authoringSnapshotAtom),
  targets: [
    {
      ...spacingTarget,
      assignment: { kind: "literal", value: spacingValue + 2 },
    },
  ],
});
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(browserTokenEditsAtom),
  saved.browserTokenEdits,
  "Cancel returns to the saved override, not shipped output.",
);
store.set(resetAllAuthoringAtom);
assert.deepEqual(store.get(browserTokenEditsAtom), initial.browserTokenEdits);
console.log(
  "Reference override eligibility, exact modes, mixed atomic batches, replacement and shared lifecycle pass.",
);
