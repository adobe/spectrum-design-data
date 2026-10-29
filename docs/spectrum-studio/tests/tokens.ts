// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import "./token-table-presentation";
import { performance } from "node:perf_hooks";
import { createStore } from "jotai";
import { isColorSystemDocument } from "../src/features/color-system/model";
import {
  generatedSpacingAtom,
  spacingDocumentAtom,
  updateSpacingScaleAtom,
} from "../src/features/spacing/state";
import {
  sizeDocumentAtom,
  updateSizeScaleAtom,
} from "../src/features/size/state";
import {
  generatedRadiusAtom,
  radiusDocumentAtom,
  updateRadiusScaleAtom,
} from "../src/features/radius/state";
import { isSpacingDocument } from "../src/features/spacing/model";
import {
  generatedTypographyAtom,
  typographyDocumentAtom,
  updateTypographyAtom,
} from "../src/features/typography/state";
import { isTypographyDocument } from "../src/features/typography/model";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import { savedBrowserTokensAtom } from "../src/features/tokens/browserSavedState";
import { sanitizeTokenName } from "../src/features/color-system/cssLibrary";
import { scaleContrasts } from "../src/features/color-system/contrastSteps";
import {
  colorSystemDocumentAtom,
  updateColorStopAtom,
  updateColorScaleNameAtom,
} from "../src/features/color-system/state";
import { tokenStableKey, tokenUuid } from "../src/features/tokens/model";
import {
  buildColorPrimitiveTable,
  parseColorTokenDisplayName,
  temporaryTokenPrimitiveAdapter,
} from "../src/features/tokens/view/tokenPrimitiveAdapters";
import { buildSemanticTokenTable } from "../src/features/tokens/view/tokenSemanticAdapters";
import { filterTokenTableData } from "../src/features/tokens/view/tokenTableModel";
import { tokenPanelViewSelectionAtom } from "../src/state/view/tokenPanels";
import {
  browserTokensAtom,
  browserModeContextAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  browserTokenImpactRecordsAtom,
  savedBrowserConceptIdsAtom,
} from "../src/features/tokens/browserSavedState";
import {
  applyBrowserTokenEdits,
  canonicalTokenModeKey,
  canBulkEditValue,
  filterBrowserTokens,
  groupBrowserCards,
  isBrowserTokenEdits,
  resolveBrowserTokens,
  type BrowserTokenSource,
} from "../src/features/tokens/browserModel";
import {
  colorTokenSetAtom,
  generatedColorTokensAtom,
  overriddenTokenCountAtom,
  resetAllTokenOverridesAtom,
  resetStaleTokenOverridesAtom,
  resetTokenAtom,
  setTokenNameAtom,
  setTokenValueAtom,
  staleTokenCountAtom,
} from "../src/features/tokens/state";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const store = createStore();
const document = store.get(colorSystemDocumentAtom);

// UUIDs are derived, so they must be stable and RFC-shaped without any registry.
const sampleKey = tokenStableKey(
  document.scales[2].id,
  document.contrasts[3].id,
);
assert.match(tokenUuid(sampleKey), UUID_PATTERN);
assert.equal(tokenUuid(sampleKey), tokenUuid(sampleKey));
assert.notEqual(
  tokenUuid(sampleKey),
  tokenUuid(tokenStableKey(document.scales[2].id, document.contrasts[4].id)),
);

const generated = store.get(generatedColorTokensAtom);
assert.equal(
  generated.length,
  document.scales.reduce(
    (count, scale) => count + scaleContrasts(document, scale).length,
    0,
  ) + document.palette.length,
  "scale-specific tokens plus one per palette color",
);
assert.equal(
  new Set(generated.map((token) => token.uuid)).size,
  generated.length,
);

store.set(colorSystemDocumentAtom, {
  ...document,
  scales: document.scales.map((scale, index) =>
    index === 0 ? { ...scale, hideFromPublishing: true } : scale,
  ),
});
assert.equal(
  store.get(generatedColorTokensAtom).length,
  generated.length - scaleContrasts(document, document.scales[0]).length,
);
assert.ok(
  store
    .get(generatedColorTokensAtom)
    .every((token) => token.source.scaleId !== document.scales[0].id),
);
store.set(colorSystemDocumentAtom, document);
assert.deepEqual(store.get(generatedColorTokensAtom), generated);

{
  const publishingStore = createStore();
  const spacing = publishingStore.get(spacingDocumentAtom);
  const typography = publishingStore.get(typographyDocumentAtom);
  const spacingOutput = publishingStore.get(generatedSpacingAtom);
  const typographyOutput = publishingStore.get(generatedTypographyAtom);
  const radiusOutput = publishingStore.get(generatedRadiusAtom);
  const typographyCss = buildTypographyCss(typography);
  const tokens = publishingStore.get(browserTokensAtom);
  const savedConcepts = publishingStore.get(savedBrowserConceptIdsAtom);
  publishingStore.set(enterEditModeAtom);
  publishingStore.set(updateSpacingScaleAtom, {
    id: spacing.scales[0].id,
    patch: { hideFromPublishing: true },
  });
  publishingStore.set(updateTypographyAtom, { hideFromPublishing: true });
  publishingStore.set(updateSizeScaleAtom, {
    id: publishingStore.get(sizeDocumentAtom).scales[0].id,
    patch: { hideFromPublishing: true },
  });
  publishingStore.set(updateRadiusScaleAtom, {
    id: publishingStore.get(radiusDocumentAtom).scales[0].id,
    patch: { hideFromPublishing: true },
  });
  const published = publishingStore.get(browserTokensAtom);
  assert.ok(
    published
      .filter((token) => !token.semantic)
      .every(
        (token) =>
          token.type === "colors" ||
          token.type === "typography" ||
          token.type === "elevation",
      ),
  );
  const semantics = published.filter((token) => token.semantic);
  assert.equal(
    semantics.length,
    20,
    "Base and Text semantics remain published when their primitive sources are hidden.",
  );
  assert.equal(
    semantics.filter(
      (token) =>
        token.semantic!.structureId === "308a6950-fb02-4e75-bf54-046a7c5f2fa6",
    ).length,
    15,
  );
  assert.ok(
    semantics.every(
      (token) =>
        token.semantic &&
        "value" in token.semantic.token &&
        !("$ref" in token.semantic.token),
    ),
  );
  assert.deepEqual(
    publishingStore
      .get(browserTokensAtom)
      .filter((token) => token.type === "typography")
      .map((token) => token.id),
    tokens
      .filter((token) => token.type === "typography")
      .map((token) => token.id),
  );
  assert.ok(
    publishingStore
      .get(savedBrowserTokensAtom)
      .every((combination) =>
        combination.tokens.some((token) => token.type === "typography"),
      ),
  );
  assert.deepEqual(
    publishingStore.get(savedBrowserConceptIdsAtom),
    savedConcepts,
    "unsaved publishing edits do not change saved concept counts",
  );
  assert.deepEqual(
    publishingStore.get(generatedSpacingAtom).map((entry) => entry.values),
    spacingOutput.map((entry) => entry.values),
  );
  assert.deepEqual(
    publishingStore.get(generatedTypographyAtom),
    typographyOutput,
  );
  assert.deepEqual(
    publishingStore.get(generatedRadiusAtom).map((entry) => entry.values),
    radiusOutput.map((entry) => entry.values),
  );
  assert.equal(
    buildTypographyCss(publishingStore.get(typographyDocumentAtom)),
    "",
  );
  assert.equal(
    buildTypographyCss(publishingStore.get(typographyDocumentAtom), {
      purpose: "authoring",
    }),
    typographyCss,
  );
  assert.ok(
    isSpacingDocument(
      JSON.parse(JSON.stringify(publishingStore.get(spacingDocumentAtom))),
    ),
  );
  assert.ok(
    isTypographyDocument(
      JSON.parse(JSON.stringify(publishingStore.get(typographyDocumentAtom))),
    ),
  );
  const publishingChanges = publishingStore
    .get(changeGroupsAtom)
    .find((group) => group.id === "foundations")!;
  for (const kind of [
    "spacing-scale",
    "size-scale",
    "radius-scale",
    "typography",
  ]) {
    const item = publishingChanges.items.find(
      (candidate) => candidate.sourceKind === kind,
    )!;
    assert.ok(
      item.fields.some((field) => field.key === "Hide from publishing"),
    );
    publishingStore.set(revertChangeItemAtom, item);
  }
  assert.deepEqual(publishingStore.get(browserTokensAtom), tokens);
  assert.equal(publishingStore.get(changeGroupsAtom).length, 0);
  publishingStore.set(updateTypographyAtom, { hideFromPublishing: true });
  publishingStore.set(cancelEditAtom);
  assert.deepEqual(publishingStore.get(browserTokensAtom), tokens);
  publishingStore.set(enterEditModeAtom);
  publishingStore.set(updateTypographyAtom, { hideFromPublishing: true });
  publishingStore.set(saveEditAtom);
  assert.ok(
    publishingStore
      .get(savedBrowserTokensAtom)
      .every((combination) =>
        combination.tokens.some((token) => token.type === "typography"),
      ),
  );
  assert.deepEqual(
    publishingStore.get(savedBrowserConceptIdsAtom),
    savedConcepts,
  );
  publishingStore.set(updateTypographyAtom, { hideFromPublishing: false });
  assert.equal(
    publishingStore.get(changeGroupsAtom).length,
    0,
    "explicit false matches legacy metadata defaults",
  );
  assert.ok(
    isColorSystemDocument({
      ...document,
      scales: document.scales.map((scale) => ({
        ...scale,
        hideFromPublishing: true,
      })),
    }),
  );
  assert.equal(
    isColorSystemDocument({
      ...document,
      scales: document.scales.map((scale) => ({
        ...scale,
        hideFromPublishing: "true",
      })),
    }),
    false,
  );
  assert.equal(
    isSpacingDocument({
      ...spacing,
      scales: spacing.scales.map((scale) => ({
        ...scale,
        hideFromPublishing: "true",
      })),
    }),
    false,
  );
  assert.equal(
    isTypographyDocument({ ...typography, hideFromPublishing: "true" }),
    false,
  );
}

// Naming must match the CSS library so both outputs describe the same token.
const redScale = document.scales.find((scale) => scale.name === "Red")!;
const redTokens = generated.filter(
  (token) => token.source.scaleId === redScale.id,
);
assert.equal(redTokens[0].name.colorName, sanitizeTokenName("Red"));
assert.equal(redTokens[0].name.contrastValue, "100");
assert.equal(redTokens[1].name.contrastValue, "200");
assert.ok(redTokens.every((token) => token.value.length > 0));

// A value override survives regeneration and is reported as an edit.
const target = redTokens[4];
store.set(setTokenValueAtom, { uuid: target.uuid, value: "#123456" });
const afterValueEdit = store
  .get(colorTokenSetAtom)
  .tokens.find((token) => token.uuid === target.uuid)!;
assert.ok(afterValueEdit.valueOverridden);
assert.equal(afterValueEdit.stale, false);
assert.notEqual(afterValueEdit.value, afterValueEdit.generated.value);
assert.equal(store.get(overriddenTokenCountAtom), 1);
assert.equal(store.get(staleTokenCountAtom), 0);

const primitiveTable = buildColorPrimitiveTable(
  store.get(colorTokenSetAtom).tokens,
);
assert.equal(
  primitiveTable.groups.length,
  document.scales.length + (document.palette.length > 0 ? 1 : 0),
  "one group per scale plus the palette group",
);
assert.equal(filterTokenTableData(primitiveTable, "   "), primitiveTable);
const nameMatches = filterTokenTableData(primitiveTable, "  ReD   500 ");
assert.deepEqual(
  nameMatches.groups.map((group) => group.id),
  [redScale.id],
);
assert.ok(nameMatches.groups[0].rows.some((row) => row.id === target.uuid));
assert.ok(
  nameMatches.groups[0].rows.every((row) =>
    row.cells.name.text.includes("500"),
  ),
);
assert.equal(
  nameMatches.groups[0].rows.find((row) => row.id === target.uuid)!.cells.value
    .edit?.tokenId,
  target.uuid,
);
assert.equal(
  filterTokenTableData(primitiveTable, "#123456").groups[0].rows[0].id,
  target.uuid,
);
const noMatches = filterTokenTableData(primitiveTable, "not-a-token");
assert.deepEqual(noMatches.groups, []);
assert.match(noMatches.emptyMessage!, /No tokens match "not-a-token"/);
assert.equal(
  primitiveTable.groups.length,
  document.scales.length + (document.palette.length > 0 ? 1 : 0),
);
const redGroup = primitiveTable.groups.find(
  (group) => group.id === redScale.id,
)!;
assert.equal(redGroup.rows.length, document.contrasts.length);
const editedRow = redGroup.rows.find((row) => row.id === target.uuid)!;
assert.equal(
  editedRow.cells.name.text,
  `${target.name.colorName}-${target.name.contrastValue}`,
);
assert.equal(editedRow.cells.name.swatch, afterValueEdit.value);
assert.equal(editedRow.cells.name.edit?.kind, "color-name");
assert.equal(editedRow.cells.value.edit?.kind, "color-value");
assert.equal(editedRow.cells.value.text, "#123456");
assert.equal(editedRow.cells.value.status?.isStale, false);
assert.equal(editedRow.cells.name.status, undefined);
assert.deepEqual(parseColorTokenDisplayName("my-color-500"), {
  colorName: "my-color",
  contrastValue: "500",
});

// Moving the underlying scale marks the override out of date but never discards it.
store.set(updateColorStopAtom, {
  scaleId: redScale.id,
  stopId: redScale.stops[0].id,
  lightness: 0.4,
});
const afterFoundationEdit = store
  .get(colorTokenSetAtom)
  .tokens.find((token) => token.uuid === target.uuid)!;
assert.ok(afterFoundationEdit.valueOverridden);
assert.ok(afterFoundationEdit.stale);
assert.equal(afterFoundationEdit.value, afterValueEdit.value);
assert.equal(store.get(staleTokenCountAtom), 1);
const staleTable = buildColorPrimitiveTable(
  store.get(colorTokenSetAtom).tokens,
);
assert.equal(
  staleTable.groups
    .find((group) => group.id === redScale.id)!
    .rows.find((row) => row.id === target.uuid)!.cells.value.status?.isStale,
  true,
);

// Renaming the scale re-labels generated tokens without touching the override.
store.set(updateColorScaleNameAtom, { scaleId: redScale.id, name: "Crimson" });
const renamed = store
  .get(colorTokenSetAtom)
  .tokens.filter((token) => token.source.scaleId === redScale.id);
assert.ok(renamed.every((token) => token.name.colorName === "crimson"));
assert.equal(
  store
    .get(colorSystemDocumentAtom)
    .scales.find((scale) => scale.id === redScale.id)!.name,
  "Crimson",
);

// Name overrides are independent of value overrides.
const nameTarget = renamed[6];
store.set(setTokenNameAtom, {
  uuid: nameTarget.uuid,
  name: { ...nameTarget.name, contrastValue: "650" },
});
const afterNameEdit = store
  .get(colorTokenSetAtom)
  .tokens.find((token) => token.uuid === nameTarget.uuid)!;
assert.ok(afterNameEdit.nameOverridden);
assert.equal(afterNameEdit.valueOverridden, false);
assert.equal(afterNameEdit.name.contrastValue, "650");
const nameRow = buildColorPrimitiveTable(store.get(colorTokenSetAtom).tokens)
  .groups.find((group) => group.id === redScale.id)!
  .rows.find((row) => row.id === nameTarget.uuid)!;
assert.equal(nameRow.cells.name.text, "crimson-650");
assert.equal(nameRow.cells.name.status?.isStale, false);
assert.equal(store.get(overriddenTokenCountAtom), 2);

// Bulk update clears only the out-of-date edits.
store.set(resetStaleTokenOverridesAtom);
assert.equal(store.get(staleTokenCountAtom), 0);
assert.equal(store.get(overriddenTokenCountAtom), 1);

store.set(resetTokenAtom, nameTarget.uuid);
assert.equal(store.get(overriddenTokenCountAtom), 0);

store.set(setTokenValueAtom, { uuid: target.uuid, value: "#654321" });
store.set(resetAllTokenOverridesAtom);
assert.equal(store.get(overriddenTokenCountAtom), 0);

for (const categoryLabel of [
  "Colors",
  "Typography",
  "Spacing",
  "Size",
  "Corner radius",
  "Elevation",
  "Motion",
]) {
  const semantic = buildSemanticTokenTable(categoryLabel);
  assert.deepEqual(semantic.groups, []);
  assert.match(semantic.emptyMessage!, /Semantic .*not available yet/);
  assert.equal(filterTokenTableData(semantic, "anything"), semantic);
  if (categoryLabel !== "Colors") {
    const temporary = temporaryTokenPrimitiveAdapter(categoryLabel);
    assert.deepEqual(temporary.groups, []);
    assert.match(
      temporary.emptyMessage!,
      /not connected to Foundations output/,
    );
  }
}
store.set(tokenPanelViewSelectionAtom, {
  colors: "primitive",
  typography: "semantic",
});
assert.deepEqual(store.get(tokenPanelViewSelectionAtom), {
  colors: "primitive",
  typography: "semantic",
});

// Editing one scale must not cost a full-document regeneration.
const freshStore = createStore();
freshStore.get(generatedColorTokensAtom);
const scales = freshStore.get(colorSystemDocumentAtom).scales;
const start = performance.now();
for (let iteration = 0; iteration < 20; iteration += 1) {
  const scale = scales[iteration % scales.length];
  freshStore.set(updateColorStopAtom, {
    scaleId: scale.id,
    stopId: scale.stops[0].id,
    chroma: 20 + (iteration % 10),
  });
  freshStore.get(generatedColorTokensAtom);
}
const averageMs = (performance.now() - start) / 20;
assert.ok(
  averageMs < 16,
  `single-scale token regeneration averaged ${averageMs.toFixed(2)}ms, budget is 16ms`,
);

console.log(
  `tokens: ${generated.length} color tokens, ${averageMs.toFixed(2)}ms average regeneration`,
);

const browserSources: BrowserTokenSource[] = [
  {
    id: "spacing-1",
    type: "spacing",
    groupId: "scale",
    groupLabel: "Spacing",
    name: "spacing-100",
    generatedName: "spacing-100",
    value: 8,
    generatedValue: 8,
    unit: "px",
  },
  {
    id: "spacing-2",
    type: "spacing",
    groupId: "scale",
    groupLabel: "Spacing",
    name: "spacing-200",
    generatedName: "spacing-200",
    value: 16,
    generatedValue: 16,
    unit: "px",
  },
  {
    id: "color-1",
    type: "colors",
    groupId: "blue",
    groupLabel: "Blue",
    name: "blue-100",
    generatedName: "blue-100",
    value: "#00f",
    generatedValue: "#00f",
    unit: "",
  },
];
const lightKey = canonicalTokenModeKey({ scheme: "light", zoom: "default" });
assert.equal(
  lightKey,
  canonicalTokenModeKey({ zoom: "default", scheme: "light" }),
);
const darkKey = canonicalTokenModeKey({ scheme: "dark", zoom: "default" });
const browserEdits = applyBrowserTokenEdits(
  browserSources,
  {},
  ["spacing-1"],
  lightKey,
  {
    value: 24,
    name: "custom-100",
    description: "A custom gap",
    status: "deprecated",
  },
);
assert.ok(isBrowserTokenEdits(browserEdits));
assert.equal(
  resolveBrowserTokens(browserSources, browserEdits, lightKey)[0].value,
  24,
);
assert.equal(
  resolveBrowserTokens(browserSources, browserEdits, darkKey)[0].value,
  8,
);
assert.equal(
  resolveBrowserTokens(browserSources, browserEdits, darkKey)[0].status,
  "deprecated",
);
assert.equal(
  resolveBrowserTokens(browserSources, browserEdits, darkKey)[0].name,
  "custom-100",
);
assert.equal(
  filterBrowserTokens(
    resolveBrowserTokens(browserSources, {}, lightKey),
    "all",
    "spacing 8px",
  ).length,
  1,
);
assert.equal(
  filterBrowserTokens(
    resolveBrowserTokens(browserSources, {}, lightKey),
    "colors",
    "spacing",
  ).length,
  0,
);
const unresolvedCards = groupBrowserCards(
  resolveBrowserTokens(browserSources, browserEdits, lightKey),
);
assert.deepEqual(
  unresolvedCards.map((group) => group.label),
  ["Unresolved classification"],
);
assert.deepEqual(
  unresolvedCards[0].tokens.map((token) => token.id),
  browserSources.map((source) => source.id),
);
assert.equal(
  canBulkEditValue(resolveBrowserTokens(browserSources, {}, lightKey)),
  false,
);
assert.throws(
  () =>
    applyBrowserTokenEdits(
      browserSources,
      {},
      ["spacing-1", "color-1"],
      lightKey,
      { value: 3 },
    ),
  /incompatible/,
);
assert.throws(
  () =>
    applyBrowserTokenEdits(browserSources, {}, ["spacing-1"], lightKey, {
      name: "SPACING-200",
    }),
  /already exists/,
);
assert.throws(
  () =>
    applyBrowserTokenEdits(browserSources, {}, ["spacing-1"], lightKey, {
      value: -1,
    }),
  /non-negative/,
);
assert.throws(
  () =>
    applyBrowserTokenEdits(browserSources, {}, ["color-1"], lightKey, {
      value: "not-a-color",
    }),
  /valid color/,
);
assert.throws(
  () =>
    applyBrowserTokenEdits(browserSources, {}, ["missing"], lightKey, {
      status: "deprecated",
    }),
  /no longer/,
);
const bulkEdits = applyBrowserTokenEdits(
  browserSources,
  {},
  ["spacing-1", "spacing-2"],
  lightKey,
  { value: 32 },
);
assert.deepEqual(
  resolveBrowserTokens(browserSources, bulkEdits, lightKey)
    .slice(0, 2)
    .map((token) => token.value),
  [32, 32],
);
assert.equal(
  isBrowserTokenEdits({
    broken: { values: { invalid: { value: 1, baseline: 2 } } },
  }),
  false,
);
assert.equal(
  resolveBrowserTokens(
    [{ ...browserSources[0], generatedValue: 12 }],
    browserEdits,
    lightKey,
  )[0].stale,
  true,
);

const browserStore = createStore();
assert.ok(
  browserStore
    .get(browserTokensAtom)
    .some((token) => token.type === "typography"),
);
assert.ok(
  browserStore.get(browserTokensAtom).some((token) => token.type === "spacing"),
);
const editableToken = browserStore
  .get(browserTokensAtom)
  .find((token) => token.type === "spacing")!;
const contextKey = browserStore.get(browserModeContextAtom).key;
assert.throws(
  () =>
    browserStore.set(editBrowserTokensAtom, {
      ids: [editableToken.id],
      modeKey: contextKey,
      patch: { value: 100 },
    }),
  /edit mode/,
);
browserStore.set(enterEditModeAtom);
browserStore.set(editBrowserTokensAtom, {
  ids: [editableToken.id],
  modeKey: contextKey,
  patch: { value: 100 },
});
assert.equal(
  browserStore
    .get(browserTokensAtom)
    .find((token) => token.id === editableToken.id)!.value,
  100,
);
browserStore.set(cancelEditAtom);
assert.deepEqual(browserStore.get(browserTokenEditsAtom), {});
browserStore.set(enterEditModeAtom);
browserStore.set(editBrowserTokensAtom, {
  ids: [editableToken.id],
  modeKey: contextKey,
  patch: { description: "Saved description" },
});
browserStore.set(saveEditAtom);
browserStore.set(editBrowserTokensAtom, {
  ids: [editableToken.id],
  modeKey: contextKey,
  patch: { description: "Unsaved description" },
});
browserStore.set(cancelEditAtom);
assert.equal(
  browserStore.get(browserTokenEditsAtom)[editableToken.id].description,
  "Saved description",
);
const metadataImpact = browserStore
  .get(browserTokenImpactRecordsAtom)
  .find((record) => record.tokenId === editableToken.id)!;
assert.equal(metadataImpact.metadataChanged, true);
assert.equal(metadataImpact.manuallyOverridden, false);
assert.equal(
  browserStore.get(savedBrowserConceptIdsAtom).size,
  browserStore.get(browserTokensAtom).length,
);
