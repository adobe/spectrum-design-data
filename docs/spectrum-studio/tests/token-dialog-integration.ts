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
