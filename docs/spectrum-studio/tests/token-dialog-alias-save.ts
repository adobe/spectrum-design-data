// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  enterEditModeAtom,
  assertStoredSnapshot,
  cancelEditAtom,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  saveTokenDialogAtom,
  tokenDialogCatalogAtom,
} from "../src/features/tokens/dialogState";
import {
  createDialogDraft,
  dialogClassification,
} from "../src/features/tokens/dialogModel";
import { categoryAllowsTier } from "../src/features/tokens/tier";
import type { Classification } from "../src/features/taxonomy/model";
import { canonicalTaxonomyValue } from "../src/features/taxonomy/export";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";
import {
  browserTokensAtom,
  resetBrowserTokenAtom,
} from "../src/features/tokens/browserState";
import { staleTokenCountAtom } from "../src/features/tokens/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { componentTokenCatalog } from "../src/features/components/references";
import type { CanonicalAliasRow } from "../src/features/tokens/aliasTargets";

const store = createStore();
store.set(enterEditModeAtom);
const catalog = store.get(tokenDialogCatalogAtom);
if (catalog.status !== "ready") throw new Error(catalog.error);
const taxonomy = catalog.snapshot.taxonomy!;
const initial = store.get(authoringSnapshotAtom);
const row = catalog.rows.find(
  (row) =>
    row.token.type === "colors" &&
    !row.token.manual &&
    !row.token.semantic &&
    !row.token.projection?.issues.length,
)!;
assert.ok(row, "A classified generated color is available.");
const names = new Set(catalog.rows.map((row) => row.token.name));
let classification: Classification | undefined;
for (const category of taxonomy.categories) {
  if (
    !category.scopes.includes("colors") ||
    !categoryAllowsTier(category, row.token.tier)
  )
    continue;
  for (const term of taxonomy.terms.filter(
    (term) => term.categoryId === category.id,
  )) {
    const candidate = {
      ...row.token.projection!.classification,
      [category.id]: term.id,
    };
    const projection = dialogClassification(row.token, candidate, taxonomy);
    if (!projection.issues.length && !names.has(projection.name)) {
      classification = candidate;
      break;
    }
  }
  if (classification) break;
}
assert.ok(
  classification,
  "An unused, valid registered alias name is available.",
);
const id = "46bc0308-82dd-4566-a67c-7c865b441df4";
const draft = createDialogDraft(row.token, row.context);
draft.aliases = [{ id, classification }];
store.set(saveTokenDialogAtom, {
  draft,
  expected: store.get(authoringSnapshotAtom),
});
const updated = store.get(tokenDialogCatalogAtom);
if (updated.status !== "ready") throw new Error(updated.error);
const aliases = updated.rows.filter((row) => row.token.id === id);
assert.ok(aliases.length, "Save creates actual alias rows.");
assert.ok(aliases.every((alias) => alias.token.referenceId === row.token.id));
for (const alias of aliases) {
  const target: CanonicalAliasRow | undefined = updated.rows.find(
    (candidate) =>
      candidate.token.id === row.token.id &&
      candidate.context === alias.context,
  );
  assert.ok(target);
  assert.deepEqual(canonicalTaxonomyValue(alias, updated.rows), {
    $ref: target.rowId,
  });
}
const savedAliasSnapshot: unknown = JSON.parse(
  JSON.stringify(store.get(authoringSnapshotAtom)),
);
assertStoredSnapshot(savedAliasSnapshot);
const reloaded = createStore();
reloaded.set(restoreAuthoringSnapshotAtom, savedAliasSnapshot);
const reloadedAliases = reloaded.get(tokenDialogCatalogAtom);
if (reloadedAliases.status !== "ready") throw new Error(reloadedAliases.error);
assert.ok(
  reloadedAliases.rows.some(
    (alias) =>
      alias.token.id === id && alias.token.referenceId === row.token.id,
  ),
  "Reload retains the alias identity and reference.",
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(browserTokenEditsAtom), initial.browserTokenEdits);
console.log("Classified generated-token alias Save retains its reference.");

store.set(enterEditModeAtom);
const colors = store.get(tokenDialogCatalogAtom);
if (colors.status !== "ready") throw new Error(colors.error);
const color = colors.rows.find((row) => {
  const source = row.token.colorSource;
  const scale = colors.snapshot.colorSystem.scales.find(
    (scale) => scale.id === source?.scaleId,
  );
  return (
    source &&
    row.token.type === "colors" &&
    !row.token.manual &&
    scale?.customContrasts?.steps.some(
      (step) => step.id === source.contrastId && step.value >= 10,
    ) &&
    !row.token.projection?.issues.length
  );
});
assert.ok(color, "A generated color with a contrast target is available.");
const baseline = store.get(authoringSnapshotAtom);
const colorDraft = createDialogDraft(color.token, color.context);
colorDraft.assignments[color.context] = { kind: "literal", value: "#888888" };
store.set(saveTokenDialogAtom, { draft: colorDraft, expected: baseline });
const effective = store.get(tokenDialogCatalogAtom);
if (effective.status !== "ready") throw new Error(effective.error);
const changed = effective.rows.find(
  (row) => row.token.id === color.token.id && row.context === color.context,
)!;
assert.ok(
  changed.token.contrastWarning,
  "The real canonical row retains its contrast diagnostic.",
);
assert.equal(changed.outputError, undefined);
assert.equal(changed.token.value, "#888888");
assert.deepEqual(canonicalTaxonomyValue(changed, effective.rows), {
  value: "#888888",
});
const savedOverrideSnapshot: unknown = JSON.parse(
  JSON.stringify(store.get(authoringSnapshotAtom)),
);
assertStoredSnapshot(savedOverrideSnapshot);
reloaded.set(restoreAuthoringSnapshotAtom, savedOverrideSnapshot);
const reloadedColors = reloaded.get(tokenDialogCatalogAtom);
if (reloadedColors.status !== "ready") throw new Error(reloadedColors.error);
const reloadedColor = reloadedColors.rows.find(
  (row) => row.token.id === color.token.id && row.context === color.context,
);
assert.equal(reloadedColor?.token.value, "#888888");
assert.ok(
  reloadedColor?.token.contrastWarning,
  "Reload reassesses the chosen override.",
);
assert.equal(typeof store.get(staleTokenCountAtom), "number");
assert.ok(
  store.get(browserTokensAtom).length,
  "The Tokens page catalog remains available.",
);
assert.ok(componentTokenCatalog(store.get(authoringSnapshotAtom)).length);
const authored = compareAuthoring(baseline, store.get(authoringSnapshotAtom));
const comparison = comparePrimitiveTokens(
  baseline,
  store.get(authoringSnapshotAtom),
  authored,
);
assert.ok(
  comparison.records.some(
    (record) => record.tokenId === color.token.id && record.manuallyOverridden,
  ),
);
const identity = structuredClone(
  store.get(browserTokenEditsAtom)[color.token.id].authoring?.identity,
);
store.set(resetBrowserTokenAtom, color.token.id);
assert.deepEqual(
  store.get(browserTokenEditsAtom)[color.token.id].authoring?.identity,
  identity,
);
const reset = store.get(tokenDialogCatalogAtom);
if (reset.status !== "ready") throw new Error(reset.error);
assert.equal(
  reset.rows.find(
    (row) => row.token.id === color.token.id && row.context === color.context,
  )?.token.contrastWarning,
  undefined,
);
store.set(cancelEditAtom);
console.log(
  "Below-target override Save, canonical export, reload, Changes, stale assessment, consumers and reset remain available.",
);
