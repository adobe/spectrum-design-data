// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createStore } from "jotai";
import {
  authoringSourceSnapshotAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  type EditSessionSnapshot,
} from "../src/features/edit-session/state";
import {
  compareAuthoring,
  createAuthoringComparator,
} from "../src/features/changelog/registry";
import {
  buildStyleArtifacts,
  mergeStyleArtifacts,
  synchronizeStylePublications,
  type StyleContext,
} from "../src/features/styles/generation";
import { EMPTY_STYLES, type StyleRecipe } from "../src/features/styles/model";
import {
  prepareStylePublicationsAtom,
  saveStyleAtom,
  selectedStyleIdAtom,
  styleContextsStateAtom,
  stylePreviewArtifactsAtom,
  styleLibraryArtifactsAtom,
  stylesDocumentAtom,
} from "../src/features/styles/state";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { browserModeContextAtom } from "../src/features/tokens/browserState";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  updateColorStopAtom,
  updateColorSystemSettingsAtom,
} from "../src/features/color-system/state";
import { generatedColorTokensAtom } from "../src/features/tokens/state";
import {
  generateColorTokensForScale,
  generatePaletteTokens,
} from "../src/features/tokens/generation";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import {
  asyncComparisonAtom,
  comparisonPublicationAtom,
  comparisonRequestAtom,
} from "../src/features/changelog/asyncComparisonState";
import { shippedChangeSnapshot } from "../src/features/changelog/comparisonState";
import { sameValue, restorePath } from "../src/features/changelog/contract";
import {
  comparisonProgressMessage,
  restoreComparisonProgress,
} from "../src/features/changelog/comparisonWork";
import { styleContexts } from "../src/features/styles/artifacts";
import { modeSelections } from "../src/features/modes/combinations";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { COLOR_SCHEME_MODE_SET_KEY } from "../src/features/modes/model";
import {
  buildFocusedTshirtArtifacts,
  buildTshirtArtifacts,
} from "../src/features/design-data/tshirtArtifacts";
import { tshirtArtifactPublicationAtom } from "../src/features/design-data/tshirtCacheState";
import { tshirtArtifactSourceAtom } from "../src/features/design-data/artifactSources";
import { workingTshirtArtifactsAtom } from "../src/features/design-data/tshirtState";
import { registerTerm } from "../src/features/taxonomy/model";
import { componentContrastInput } from "../src/features/components/contrastWitness";

const source = createDefaultSnapshot();
let publicationReads = 0;
const proofSource = {
  ...source,
  styles: {
    ...source.styles!,
    get publications() {
      publicationReads++;
      return source.styles!.publications;
    },
  },
};
assert(
  sameValue(
    componentContrastInput(proofSource),
    componentContrastInput({
      ...proofSource,
      colorSystem: {
        ...proofSource.colorSystem,
        contrasts: proofSource.colorSystem.contrasts.map((contrast, index) =>
          index ? contrast : { ...contrast, value: contrast.value + 0.01 },
        ),
      },
    }),
  ),
);
assert.equal(
  publicationReads,
  0,
  "Proof scheduling does not serialize unchanged identity documents.",
);
const colorCategory = source.taxonomy!.categories.find(
  (category) => category.key === "colorFamily",
)!;
const knownTerm = source.taxonomy!.terms.find(
  (term) => term.categoryId === colorCategory.id,
)!;
const allocateTerm = mock.fn(() => crypto.randomUUID());
assert.equal(
  registerTerm(
    source.taxonomy!,
    knownTerm.categoryId,
    knownTerm.value,
    allocateTerm,
  ),
  source.taxonomy,
);
assert.equal(
  allocateTerm.mock.callCount(),
  0,
  "Known vocabulary does not allocate discarded UUIDs.",
);
const extendedVocabulary = registerTerm(
  source.taxonomy!,
  knownTerm.categoryId,
  "performance-scope-check",
  allocateTerm,
);
assert.notEqual(extendedVocabulary, source.taxonomy);
assert.equal(allocateTerm.mock.callCount(), 1);
let reads = 0;
const immutable = {
  get value() {
    reads++;
    return 42;
  },
};
assert(sameValue(immutable, immutable));
assert.equal(
  reads,
  0,
  "Identical immutable values do not need a recursive walk.",
);
assert(sameValue({ value: 42 }, { value: 42 }));
assert(!sameValue([1, 2], [2, 1]));
assert(!sameValue(Number.NaN, Number.NaN));
const example = source.styles!.recipes[0];
const recipe: StyleRecipe = {
  ...example,
  kind: "background",
  appearance: { color: { kind: "single", binding: { value: "#123456" } } },
  options: [],
  differences: {},
  applications: [],
};
const context: StyleContext = { selection: {}, modes: {}, references: [] };
const document = synchronizeStylePublications(
  { ...EMPTY_STYLES, recipes: [recipe], publications: [] },
  [context],
  [],
);
const before = structuredClone(document);
const allocate = mock.method(crypto, "randomUUID");
try {
  assert.equal(synchronizeStylePublications(document, [context], []), document);
  assert.equal(allocate.mock.callCount(), 0, "A no-op allocates no identity.");
  const valueEdit = {
    ...document,
    recipes: [
      {
        ...recipe,
        appearance: {
          color: { kind: "single" as const, binding: { value: "#654321" } },
        },
      },
    ],
  };
  assert.equal(
    synchronizeStylePublications(valueEdit, [context], []),
    valueEdit,
  );
  assert.equal(allocate.mock.callCount(), 0);
  const selection = { axis: "another-mode" };
  const expanded = synchronizeStylePublications(
    document,
    [context, { ...context, selection }],
    [],
  );
  assert.equal(allocate.mock.callCount(), 1);
  assert.equal(expanded.recipes, document.recipes);
  assert.equal(expanded.publications[0].id, document.publications[0].id);
  assert.equal(
    expanded.publications[0].rows[canonicalTokenModeKey({})],
    document.publications[0].rows[canonicalTokenModeKey({})],
  );
  assert(expanded.publications[0].rows[canonicalTokenModeKey(selection)]);
  assert.deepEqual(
    document,
    before,
    "Reconciliation does not mutate its input.",
  );
  assert.equal(
    synchronizeStylePublications(expanded, [context], []),
    expanded,
    "Inactive identities are retained.",
  );
} finally {
  allocate.mock.restore();
}

const compare = createAuthoringComparator();
const baseline = compare(source, source);
let working = {
  ...source,
  spacing: {
    ...source.spacing!,
    scales: source.spacing!.scales.map((scale, index) =>
      index ? scale : { ...scale, base: (scale.base ?? 0) + 1 },
    ),
  },
};
const edited = compare(source, working);
assert.deepEqual(edited, compareAuthoring(source, working));
const oldSlots = new Map(baseline.slots.map((slot) => [slot.id, slot]));
const unaffected = edited.slots.filter((slot) => slot.category === "styles");
assert(unaffected.length > 0);
assert.deepEqual(
  unaffected
    .filter((slot) => slot !== oldSlots.get(slot.id))
    .map((slot) => slot.id),
  [],
  "Unchanged owners retain their comparison slots, not merely equal counts.",
);
assert.deepEqual(compare(source, source), compareAuthoring(source, source));
working = { ...working, scaleTypes: structuredClone(source.scaleTypes) };
assert.deepEqual(
  compare(source, working),
  compareAuthoring(source, working),
  "Formula changes invalidate manual-classification evidence.",
);
const reversed = {
  ...source,
  opacity: {
    ...source.opacity!,
    levels: [...source.opacity!.levels].reverse(),
  },
};
assert.deepEqual(
  compare(source, reversed),
  compareAuthoring(source, reversed),
  "Positional swatch indices are not reused across reordering.",
);
const modeEdit = {
  ...source,
  modeSets: source.modeSets.map((axis, index) =>
    index ? axis : { ...axis, name: "Changed mode set" },
  ),
};
assert.deepEqual(compare(source, modeEdit), compareAuthoring(source, modeEdit));
assert.deepEqual(
  compare(source, modeEdit),
  compareAuthoring(source, modeEdit),
  "Mode-parent cleanup remains exact when its comparison is reused.",
);
for (const count of [10, 100]) {
  const grown = {
    ...source,
    platforms: [
      ...source.platforms,
      ...Array.from({ length: count }, (_, index) => ({
        ...source.platforms[0],
        id: crypto.randomUUID(),
        name: `Unrelated platform ${index}`,
      })),
    ],
  };
  const scoped = createAuthoringComparator();
  const originalComparison = scoped(source, grown);
  const result = scoped(source, { ...grown, spacing: working.spacing });
  assert.deepEqual(
    result,
    compareAuthoring(source, { ...grown, spacing: working.spacing }),
  );
  const unchanged = new Map(
    originalComparison.slots.map((slot) => [slot.id, slot]),
  );
  assert(
    result.slots
      .filter((slot) => slot.category === "platforms")
      .every((slot) => slot === unchanged.get(slot.id)),
    "Increasing unrelated data does not increase deep comparison work for that data.",
  );
}

const store = createStore();
store.set(enterEditModeAtom);
const initialStyles = store.get(stylesDocumentAtom);
const selected =
  initialStyles.recipes.find((item) => item.options.length > 0) ??
  initialStyles.recipes[0];
// Existing first-use vocabulary adoption is separate from an ordinary value edit.
store.set(saveStyleAtom, selected);
const original = store.get(stylesDocumentAtom);
const contexts = store.get(styleContextsStateAtom);
assert.equal(contexts.error, "");
store.set(selectedStyleIdAtom, selected.id);
const initialPreview = store.get(stylePreviewArtifactsAtom);
const modeKey = store.get(browserModeContextAtom).key;
const coldPreview = buildStyleArtifacts(
  { ...original, recipes: [selected] },
  store.get(authoringSourceSnapshotAtom).taxonomy!,
  store.get(authoringSourceSnapshotAtom).rules!,
  store.get(authoringSourceSnapshotAtom).modeSets,
  contexts.contexts.filter(
    (entry) => canonicalTokenModeKey(entry.selection) === modeKey,
  ),
  undefined,
  true,
);
assert.deepEqual(initialPreview, coldPreview);
assert(
  initialPreview.rows.every(
    (row) => row.recipeId === selected.id && row.modeKey === modeKey,
  ),
);
const library = store.get(styleLibraryArtifactsAtom);
assert(
  library.rows.some((row) => row.recipeId !== selected.id),
  "Focusing the editor must not remove other recipes' library thumbnails.",
);
assert(library.rows.every((row) => row.modeKey === modeKey));
const allContexts = styleContexts(store.get(authoringSourceSnapshotAtom));
for (const selection of [
  modeSelections(store.get(authoringSourceSnapshotAtom).modeSets)[0],
  modeSelections(store.get(authoringSourceSnapshotAtom).modeSets).at(-1)!,
]) {
  const focusedContexts = styleContexts(
    store.get(authoringSourceSnapshotAtom),
    [selection],
  );
  const expectedContexts = allContexts.filter(
    (entry) =>
      canonicalTokenModeKey(entry.selection) ===
      canonicalTokenModeKey(selection),
  );
  const byIdentity = (
    references: (typeof focusedContexts)[number]["references"],
  ) => [...references].sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(
    byIdentity(focusedContexts[0].references),
    byIdentity(expectedContexts[0].references),
    "Focused and cold contexts contain the same reference records.",
  );
  assert.deepEqual(
    focusedContexts.map((context) => ({
      ...context,
      references: byIdentity(context.references),
    })),
    expectedContexts.map((context) => ({
      ...context,
      references: byIdentity(context.references),
    })),
    "Focused mode evaluation preserves owning-mode fallback, values and identities.",
  );
  const authoring = store.get(authoringSourceSnapshotAtom);
  assert.deepEqual(
    buildStyleArtifacts(
      original,
      authoring.taxonomy!,
      authoring.rules!,
      authoring.modeSets,
      focusedContexts,
    ),
    buildStyleArtifacts(
      original,
      authoring.taxonomy!,
      authoring.rules!,
      authoring.modeSets,
      expectedContexts,
    ),
    "Focused evaluation preserves the exact generated Style rows, including their order.",
  );
  assert.deepEqual(
    mergeStyleArtifacts(
      original.recipes.map((recipe) =>
        buildStyleArtifacts(
          { ...original, recipes: [recipe] },
          authoring.taxonomy!,
          authoring.rules!,
          authoring.modeSets,
          expectedContexts,
          undefined,
          false,
          false,
        ),
      ),
    ),
    buildStyleArtifacts(
      original,
      authoring.taxonomy!,
      authoring.rules!,
      authoring.modeSets,
      expectedContexts,
    ),
    "Per-recipe reuse preserves full-library output and cross-recipe validation.",
  );
}
const collision = coldPreview.rows[0];
assert(collision);
assert(
  mergeStyleArtifacts([
    { rows: [collision], issues: [] },
    {
      rows: [
        {
          ...collision,
          conceptId: "another-concept",
          recipeId: "another-recipe",
        },
      ],
      issues: [],
    },
  ]).issues.some(
    (issue) =>
      issue.recipeId === "another-recipe" && issue.message.includes("collides"),
  ),
  "Partitioning previews does not remove cross-recipe name collision checks.",
);
const originalSelection = store.get(modeSelectionAtom);
const originalSource = store.get(authoringSourceSnapshotAtom);
const originalLibrary = store.get(styleLibraryArtifactsAtom);
store.set(modeSelectionAtom, modeSelections(originalSource.modeSets).at(-1)!);
const alternateLibrary = store.get(styleLibraryArtifactsAtom);
assert(
  alternateLibrary.rows.every(
    (row) => row.modeKey === store.get(browserModeContextAtom).key,
  ),
);
assert.equal(
  store.get(authoringSourceSnapshotAtom),
  originalSource,
  "Preview mode selection is not an authored edit.",
);
store.set(modeSelectionAtom, originalSelection);
const restoredLibrary = store.get(styleLibraryArtifactsAtom);
assert.deepEqual(restoredLibrary, originalLibrary);
assert.notEqual(
  restoredLibrary.rows[0],
  originalLibrary.rows[0],
  "Mode switching replaces bounded preview entries rather than retaining mode history.",
);
const editedStyle = {
  ...selected,
  appearance: {
    ...selected.appearance,
    color:
      selected.appearance.color.kind === "families"
        ? { ...selected.appearance.color, scaleIndex: 400 }
        : { kind: "single" as const, binding: { value: "#456789" } },
  },
};
const beforeStyleEdit = store.get(authoringSourceSnapshotAtom);
store.set(saveStyleAtom, editedStyle);
const afterStyleEdit = store.get(authoringSourceSnapshotAtom);
assert.deepEqual(
  Object.keys(beforeStyleEdit).filter(
    (key) =>
      key !== "styles" &&
      beforeStyleEdit[key as keyof typeof beforeStyleEdit] !==
        afterStyleEdit[key as keyof typeof afterStyleEdit],
  ),
  [],
  "The membership-preserving Style pilot only changes its owner.",
);
assert(
  store.get(styleContextsStateAtom) === contexts,
  "A Style appearance edit does not rebuild Foundation contexts.",
);
assert.equal(store.get(stylesDocumentAtom).publications, original.publications);
const nextLibrary = store.get(styleLibraryArtifactsAtom);
const originalRows = new Map(
  restoredLibrary.rows.map((row) => [row.token.uuid, row]),
);
assert(
  nextLibrary.rows
    .filter((row) => row.recipeId !== selected.id)
    .every((row) => row === originalRows.get(row.token.uuid)),
  "Editing one Style does not regenerate the other library recipes.",
);
store.set(prepareStylePublicationsAtom);
assert.equal(store.get(styleContextsStateAtom), contexts);
const variantProperty = selected.options.find(
  (property) => property.kind === "variant",
);
if (variantProperty?.kind === "variant") {
  const changedOption = {
    ...editedStyle,
    options: editedStyle.options.map((property) =>
      property.id !== variantProperty.id || property.kind !== "variant"
        ? property
        : {
            ...property,
            options: property.options.map((option, index) =>
              index ? option : { ...option, name: `${option.name} edited` },
            ),
          },
    ),
  };
  const before = store.get(authoringSourceSnapshotAtom);
  const after = {
    ...before,
    styles: {
      ...before.styles!,
      recipes: before.styles!.recipes.map((item) =>
        item.id === changedOption.id ? changedOption : item,
      ),
    },
  };
  const result = compareAuthoring(before, after);
  const fields = result.groups.flatMap((group) =>
    group.items.flatMap((item) => item.fields),
  );
  assert.equal(
    fields.length,
    1,
    "A Style option label does not become an aggregate options JSON edit.",
  );
  assert(
    fields[0].address!.path.some(
      (part) =>
        typeof part === "object" &&
        "id" in part &&
        part.id === variantProperty.id,
    ),
  );
  assert.deepEqual(
    restorePath<EditSessionSnapshot>(after, before, fields[0].address!),
    before,
  );
}

const input = store.get(comparisonRequestAtom);
const pending = store.get(asyncComparisonAtom);
assert.equal(pending.status, "pending");
if (pending.status === "pending") {
  assert(
    pending.partial,
    "Accepted source Changes are visible before worker progress.",
  );
  assert.deepEqual(
    pending.partial.authored,
    compareAuthoring(shippedChangeSnapshot, input.working, input.attachments),
  );
  const message = comparisonProgressMessage(pending.partial);
  assert(
    !("working" in message),
    "Progress does not transport a full authoring snapshot.",
  );
  assert.deepEqual(restoreComparisonProgress(input, message), pending.partial);
}
store.set(comparisonPublicationAtom, {
  status: "ready",
  input,
  value: {
    working: input.working,
    authored: compareAuthoring(input.shipped, input.working, input.attachments),
    groups: [],
    tokens: { status: "ready", comparison: { items: [], records: [] } },
    componentImpact: {
      status: "unavailable",
      error: "Not requested in this check.",
    },
  },
});
const colorDocument = store.get(colorSystemDocumentAtom);
const scale = colorDocument.scales.find(
  (entry) =>
    entry.id !== colorDocument.backgroundScaleId && entry.stops.length > 0,
)!;
const colorBefore = store.get(generatedColorTokensAtom);
const previousColors = new Map(colorBefore.map((token) => [token.uuid, token]));
const previousColorSources = store.get(authoringSourceSnapshotAtom);
const colorAllocations = mock.method(crypto, "randomUUID");
try {
  store.set(updateColorStopAtom, {
    scaleId: scale.id,
    stopId: scale.stops[0].id,
    chroma: scale.stops[0].chroma + 0.1,
  });
  assert.equal(
    colorAllocations.mock.callCount(),
    0,
    "A membership-preserving Color edit allocates no UUIDs.",
  );
} finally {
  colorAllocations.mock.restore();
}
const colorAfter = store.get(generatedColorTokensAtom);
assert(
  colorAfter.some(
    (token) =>
      token.source.scaleId === scale.id &&
      token !== previousColors.get(token.uuid),
  ),
);
assert(
  colorAfter
    .filter((token) => token.source.scaleId !== scale.id)
    .every((token) => token === previousColors.get(token.uuid)),
  "A non-background Color stop leaves other scales' generated objects unchanged.",
);
const colorSources = store.get(authoringSourceSnapshotAtom);
assert.deepEqual(
  Object.keys(previousColorSources).filter(
    (key) =>
      key !== "colorSystem" &&
      previousColorSources[key as keyof typeof previousColorSources] !==
        colorSources[key as keyof typeof colorSources],
  ),
  [],
  "An ordinary Color edit does not rewrite Registry or unrelated owners.",
);
assert.equal(
  colorSources.browserTokenEdits,
  previousColorSources.browserTokenEdits,
);
assert.equal(
  colorSources.styles!.publications,
  previousColorSources.styles!.publications,
);
const resolvedColor = store.get(resolvedColorSystemDocumentAtom);
const originalScaleData = buildScaleData(
  resolvedColor.scales.find((entry) => entry.id === scale.id)!,
);
const renamedScale = {
  ...originalScaleData.scale,
  name: "Renamed without new color math",
};
const renamedScaleData = buildScaleData(renamedScale);
assert.equal(renamedScaleData.ramp, originalScaleData.ramp);
assert.equal(renamedScaleData.anchors, originalScaleData.anchors);
assert.equal(renamedScaleData.scale, renamedScale);
assert.deepEqual(
  colorAfter,
  [
    ...generatePaletteTokens(
      resolvedColor.palette,
      resolvedColor.settings.colorOutput,
    ),
    ...resolvedColor.scales.flatMap((entry) =>
      generateColorTokensForScale(
        entry,
        resolvedColor.contrasts,
        resolvedBackgroundLinear(resolvedColor),
        resolvedColor.settings,
        resolvedColor.settings.colorOutput,
        colorSources.rules,
      ),
    ),
  ],
  "Scoped Color generation equals the cold shared generator.",
);
store.set(updateColorSystemSettingsAtom, {
  backgroundBlend: resolvedColor.settings.backgroundBlend === 0.5 ? 0.6 : 0.5,
});
assert(
  store
    .get(generatedColorTokensAtom)
    .filter(
      (token) =>
        token.source.scaleId !== scale.id && previousColors.has(token.uuid),
    )
    .some((token) => token !== previousColors.get(token.uuid)),
  "Shared Color settings legitimately invalidate broader generated output.",
);
const colorSelection = store.get(modeSelectionAtom);
const colorAxis = colorSources.modeSets.find(
  (axis) => axis.key === COLOR_SCHEME_MODE_SET_KEY,
)!;
for (const mode of colorAxis.modes.filter(
  (mode) => mode.id !== colorAxis.defaultModeId,
)) {
  store.set(modeSelectionAtom, { ...colorSelection, [colorAxis.id]: mode.id });
  const warm = store.get(generatedColorTokensAtom);
  const byId = new Map(warm.map((token) => [token.uuid, token]));
  const currentScale = store
    .get(colorSystemDocumentAtom)
    .scales.find((entry) => entry.id === scale.id)!;
  store.set(updateColorStopAtom, {
    scaleId: scale.id,
    stopId: currentScale.stops[0].id,
    chroma: currentScale.stops[0].chroma + 0.01,
  });
  const output = store.get(generatedColorTokensAtom);
  assert(
    output
      .filter((token) => token.source.scaleId !== scale.id)
      .every((token) => token === byId.get(token.uuid)),
    `${mode.name}: resolved mode projections do not regenerate unrelated Color scales.`,
  );
  const resolved = store.get(resolvedColorSystemDocumentAtom);
  assert.deepEqual(output, [
    ...generatePaletteTokens(resolved.palette, resolved.settings.colorOutput),
    ...resolved.scales.flatMap((entry) =>
      generateColorTokensForScale(
        entry,
        resolved.contrasts,
        resolvedBackgroundLinear(resolved),
        resolved.settings,
        resolved.settings.colorOutput,
        store.get(authoringSourceSnapshotAtom).rules,
      ),
    ),
  ]);
}
store.set(modeSelectionAtom, colorSelection);
assert.equal(
  store.get(asyncComparisonAtom).status,
  "pending",
  "Old results never authorize a current action.",
);
assert.equal(store.get(stylesDocumentAtom).publications, original.publications);
const spacing = store.get(spacingDocumentAtom);
store.set(spacingDocumentAtom, {
  ...spacing,
  scales: spacing.scales.map((entry) =>
    entry.id === "5d3d6a7a-36c9-4a53-9f15-447f2a1e68f6"
      ? { ...entry, base: entry.base! + 1 }
      : entry,
  ),
});
const current = store.get(asyncComparisonAtom);
assert.equal(current.status, "pending");
if (current.status === "pending")
  assert.deepEqual(
    current.partial!.authored,
    compareAuthoring(
      shippedChangeSnapshot,
      store.get(authoringSourceSnapshotAtom),
    ),
  );

const latest = store.get(authoringSourceSnapshotAtom);
const cold = buildTshirtArtifacts(latest);
const baseId = "308a6950-fb02-4e75-bf54-046a7c5f2fa6";
const focused = buildFocusedTshirtArtifacts(latest, baseId);
const ids = new Set(focused.semantics.map((row) => row.structureId));
assert(ids.has(baseId));
assert.deepEqual(
  focused.semantics,
  cold.semantics.filter((row) => ids.has(row.structureId)),
  "Focused Base semantics agree with a cold whole-system build after the linked padding scale changes.",
);
for (const structure of latest.structures!.structures) {
  const selectedArtifacts = buildFocusedTshirtArtifacts(
    latest,
    structure.conceptId,
  );
  const included = new Set(
    selectedArtifacts.semantics.map((row) => row.structureId),
  );
  assert.deepEqual(
    selectedArtifacts.semantics,
    cold.semantics.filter((row) => included.has(row.structureId)),
    `Focused ${structure.name} output preserves composition, owned layouts and variants.`,
  );
}
assert.throws(
  () => buildFocusedTshirtArtifacts(latest, "missing-structure"),
  /no longer available/,
);
const artifactSource = store.get(tshirtArtifactSourceAtom);
store.set(tshirtArtifactPublicationAtom, {
  source: artifactSource,
  bundle: cold,
});
const reused = store.get(workingTshirtArtifactsAtom);
assert.equal(reused.status, "ready");
if (reused.status === "ready")
  assert.equal(
    reused.bundle,
    cold,
    "Matching worker output is reused, not synchronously rebuilt.",
  );

console.log(
  "Scoped authoring: publication sharing, exact allocations, current-mode Style preview, immutable comparison reuse and immediate pilot Changes passed.",
);
