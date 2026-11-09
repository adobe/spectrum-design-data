// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  createDefaultSnapshot,
  enterEditModeAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import {
  tokenDialogCatalogAtom,
  saveTokenDialogAtom,
  shippedTokenIdsAtom,
} from "../src/features/tokens/dialogState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  createDialogDraft,
  resolveDialogTokens,
} from "../src/features/tokens/dialogModel";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import { canonicalTaxonomyValue } from "../src/features/taxonomy/export";
import { componentTokenCatalog } from "../src/features/components/references";
import { literalAssignment } from "../src/features/tokens/tokenAssignments";
import { shadowText } from "../src/features/tokens/tokenAssignments";
import { allModeTokenTableRows } from "../src/features/tokens/view/allModeTokenTable";
import { modeSetsAtom, replaceModeSetAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import {
  previewOverridesAtom,
  setPreviewParameterAtom,
} from "../src/features/modes/previewState";
import { createMode } from "../src/features/modes/model";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";

const store = createStore();
store.set(enterEditModeAtom);
const catalog = store.get(tokenDialogCatalogAtom);
assert.equal(
  catalog.status,
  "ready",
  catalog.status === "unavailable" ? catalog.error : "",
);
if (catalog.status !== "ready") throw new Error(catalog.error);
const row = catalog.rows.find(
  (row) => row.token.type === "spacing" && !row.token.semantic,
)!;
assert.ok(row, "The shipped spacing fixture is available.");
const provenance = store.get(shippedTokenIdsAtom);
assert.equal(provenance.status, "ready");
assert.ok(provenance.status === "ready" && provenance.ids.has(row.token.id));
const initial = store.get(authoringSnapshotAtom);
const draft = createDialogDraft(row.token, row.context);
const value = Number(row.token.value) + 1;
draft.assignments[row.context] = { kind: "literal", value };
store.set(saveTokenDialogAtom, { draft, expected: initial });
const working = store.get(authoringSnapshotAtom);
assert.equal(
  store.get(browserTokenEditsAtom)[row.token.id].authoring?.assignments[
    row.context
  ]?.kind,
  "literal",
);
const restored: unknown = JSON.parse(JSON.stringify(working));
assertStoredSnapshot(restored);
assert.deepEqual(restored.browserTokenEdits, working.browserTokenEdits);
assert.throws(
  () => store.set(saveTokenDialogAtom, { draft, expected: initial }),
  /Source data changed/,
);
const updated = store.get(tokenDialogCatalogAtom);
assert.equal(
  updated.status,
  "ready",
  updated.status === "unavailable" ? updated.error : "",
);
if (updated.status !== "ready") throw new Error(updated.error);
assert.equal(
  resolveDialogTokens(
    updated.rows,
    working.browserTokenEdits,
    working.taxonomy!,
    row.context,
  ).find((token) => token.id === row.token.id)?.value,
  value,
);
const emitted = updated.rows.find(
  (candidate) =>
    candidate.token.id === row.token.id && candidate.context === row.context,
)!;
const exportedValue = canonicalTaxonomyValue(emitted, updated.rows);
assert.equal("value" in exportedValue && exportedValue.value, value);
const defaults = createDefaultSnapshot();
const authored = compareAuthoring(defaults, working);
const comparison = comparePrimitiveTokens(defaults, working, authored);
assert.ok(
  comparison.items
    .find((item) => item.id === row.token.id)
    ?.fields.some((field) => field.key === "Value"),
);
assert.ok(
  comparison.records.find((record) => record.tokenId === row.token.id)
    ?.manuallyOverridden,
);
const componentTokens = componentTokenCatalog(working);
assert.ok(
  componentTokens.some(
    (token) => token.browserId === row.token.id && token.value === `${value}px`,
  ),
  "Components resolve the same effective spacing value.",
);
const semantic = updated.rows.find(
  (row) => row.token.semantic && row.token.type === "spacing",
)!;
const semanticDraft = createDialogDraft(semantic.token, semantic.context);
semanticDraft.assignments[semantic.context] = { kind: "literal", value: 21 };
store.set(saveTokenDialogAtom, {
  draft: semanticDraft,
  expected: store.get(authoringSnapshotAtom),
});
const shadowCatalog = store.get(tokenDialogCatalogAtom);
assert.equal(shadowCatalog.status, "ready");
if (shadowCatalog.status !== "ready") throw new Error(shadowCatalog.error);
const shadow = shadowCatalog.rows.find(
  (row) => row.token.type === "elevation" && !row.token.semantic,
)!;
const layers = literalAssignment(shadow.token).shadows!;
assert.ok(layers.length);
const customLayers = layers.map((layer) => ({
  ...layer,
  x: "3px",
  spread: "2px",
}));
const shadowDraft = createDialogDraft(shadow.token, shadow.context);
shadowDraft.assignments[shadow.context] = {
  kind: "literal",
  value: shadowText(customLayers),
  shadows: customLayers,
};
store.set(saveTokenDialogAtom, {
  draft: shadowDraft,
  expected: store.get(authoringSnapshotAtom),
});
const shadowSnapshot = store.get(authoringSnapshotAtom);
assertStoredSnapshot(JSON.parse(JSON.stringify(shadowSnapshot)));
assert.ok(
  componentTokenCatalog(shadowSnapshot).some(
    (token) =>
      token.browserId === shadow.token.id &&
      Array.isArray(token.value) &&
      (token.value[0] as Record<string, unknown>).x === "3px",
  ),
);
const effective = store.get(tokenDialogCatalogAtom);
if (effective.status !== "ready") throw new Error(effective.error);
assert.equal(
  effective.rows.find(
    (row) =>
      row.token.id === semantic.token.id && row.context === semantic.context,
  )?.token.value,
  21,
);
const latestShadow = effective.rows.find(
  (row) => row.token.id === shadow.token.id && row.context === shadow.context,
)!;
assert.deepEqual(canonicalTaxonomyValue(latestShadow, effective.rows), {
  value: customLayers,
});
store.set(cancelEditAtom);
assert.deepEqual(store.get(browserTokenEditsAtom), initial.browserTokenEdits);
console.log(
  "Token dialog atomic Save, conflict, reload, Changes, components and Cancel checks passed.",
);

const modeStore = createStore();
modeStore.set(enterEditModeAtom);
const tableForCatalog = () => {
  const current = modeStore.get(tokenDialogCatalogAtom);
  assert.equal(
    current.status,
    "ready",
    current.status === "unavailable" ? current.error : "",
  );
  if (current.status !== "ready") throw new Error(current.error);
  const table = allModeTokenTableRows(current.rows, current.snapshot.modeSets);
  const catalogTokens = new Map(
    current.rows.map((row) => [
      JSON.stringify([row.token.id, row.context]),
      row.token,
    ]),
  );
  for (const parent of table)
    for (const child of parent.children)
      assert.equal(
        child.token,
        catalogTokens.get(
          JSON.stringify([parent.token?.id, child.modeContext]),
        ),
        "Every displayed value comes directly from the shared catalog.",
      );
  return table;
};
const originalTable = tableForCatalog();
const textScaling = modeStore
  .get(modeSetsAtom)
  .find((set) =>
    set.modes.some(
      (mode) => mode.foundations.typography?.textZoom !== undefined,
    ),
  )!;
assert.ok(textScaling);
const extraTextMode = {
  ...createMode(),
  name: "Extra large",
  key: "extra-large",
  foundations: { typography: { textZoom: 1.75 } },
};
modeStore.set(replaceModeSetAtom, {
  ...textScaling,
  modes: [...textScaling.modes, extraTextMode],
});
const expandedTable = tableForCatalog();
const affected = originalTable.find(
  (parent) => parent.token?.type === "typography",
)!;
const unaffected = originalTable.find(
  (parent) =>
    parent.token?.type === "spacing" && parent.children[0].modeContext === "[]",
)!;
assert.ok(affected);
assert.ok(unaffected);
const affectedAfter = expandedTable.find(
  (parent) => parent.id === affected.id,
)!;
const platformScale = modeStore
  .get(modeSetsAtom)
  .find((axis) => axis.key === "scale")!;
const addedContexts = platformScale.modes.map((mode) =>
  canonicalTokenModeKey({
    [platformScale.id]: mode.id,
    [textScaling.id]: extraTextMode.id,
  }),
);
assert.deepEqual(
  affectedAfter.children.map((child) => child.modeContext).sort(),
  [
    ...affected.children.map((child) => child.modeContext),
    ...addedContexts,
  ].sort(),
  "A text-scaling mode adds exactly one row per platform scale, with no unrelated mode axes.",
);
assert.deepEqual(
  expandedTable.find((parent) => parent.id === unaffected.id),
  unaffected,
  "Unrelated mode-independent tokens do not gain repeated rows.",
);
modeStore.set(replaceModeSetAtom, textScaling);
assert.deepEqual(
  tableForCatalog(),
  originalTable,
  "Removing a mode removes its children and restores the original table.",
);
const snapshotBeforePreview = modeStore.get(authoringSnapshotAtom);
const selectionBeforePreview = modeStore.get(modeSelectionAtom);
modeStore.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 1.5,
});
const previewBeforeTable = modeStore.get(previewOverridesAtom);
assert.deepEqual(
  tableForCatalog(),
  originalTable,
  "All ignores continuous preview values.",
);
assert.deepEqual(modeStore.get(previewOverridesAtom), previewBeforeTable);
assert.deepEqual(modeStore.get(modeSelectionAtom), selectionBeforePreview);
assert.deepEqual(
  modeStore.get(authoringSnapshotAtom),
  snapshotBeforePreview,
  "Reading All does not author data.",
);
console.log(
  "All-mode table catalog agreement, mode add/remove propagation and preview isolation passed.",
);
