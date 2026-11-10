// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  colorSystemDocumentAtom,
  removeColorScaleAtom,
} from "../src/features/color-system/state";
import {
  colorTokenSetAtom,
  setTokenValueAtom,
} from "../src/features/tokens/state";
import { tokenOverridesAtom } from "../src/features/tokens/overrides";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { setPreviewParameterAtom } from "../src/features/modes/previewState";
import {
  defaultColorDocument,
  buildChangeGroups,
} from "../src/features/changelog/changes";
import {
  legacyChangeGroupsAtom as changeGroupsAtom,
  changeGroupsAtom as canonicalChangeGroupsAtom,
  resetAllChangeDataAtom,
  revertChangeItemAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import {
  authoredComparisonAtom,
  tokenComparisonResultAtom,
} from "../src/features/changelog/comparisonState";
import {
  foundationImpactSummaryAtom,
  tokenImpactSummaryAtom,
} from "../src/features/impact/state";
import { summarizeTokenImpact } from "../src/features/impact/summaries";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  browserTokenImpactRecordsAtom,
  savedBrowserConceptIdsAtom,
} from "../src/features/tokens/browserSavedState";
import { taxonomyColorSourceId } from "../src/features/taxonomy/model";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { componentsDocumentAtom } from "../src/features/components/documentState";
import { COLOR_PARAMETERS } from "../src/features/color-system/resolution";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";
import { elevationDocumentAtom } from "../src/features/elevation/state";
import { editModeAtom } from "../src/state/view/editMode";

type Store = ReturnType<typeof createStore>;
const impact = (target: Store) => target.get(tokenImpactSummaryAtom);
const edits = (target: Store, category: string) =>
  target
    .get(foundationImpactSummaryAtom)
    .categories.find((item) => item.category === category)?.affected.count ?? 0;

const store = createStore();
const original = store.get(colorSystemDocumentAtom);
assert.deepEqual(
  buildChangeGroups(original, store.get(colorTokenSetAtom).tokens),
  [],
);
assert.deepEqual(
  original.scales.map((scale) => scale.id),
  defaultColorDocument.scales.map((scale) => scale.id),
);
assert.equal(impact(store).affected.count, 0);
assert.equal(impact(store).affected.fraction, 0);
assert.equal(store.get(foundationImpactSummaryAtom).edited.count, 0);
assert.equal(
  summarizeTokenImpact([]).affected.fraction,
  null,
  "an empty token set has no percentage",
);

const broadStore = createStore();
const broadDocument = broadStore.get(colorSystemDocumentAtom);
broadStore.set(colorSystemDocumentAtom, {
  ...broadDocument,
  backgroundLightness: 0.5,
});
assert.equal(
  broadStore.get(tokenComparisonResultAtom).status,
  "ready",
  "Unreachable targets still have assessable closest-achievable output.",
);
assert.ok(impact(broadStore).affected.count > 0);

const broken = broadStore
  .get(browserTokensAtom)
  .find((token) => token.paletteColorId)!;
assert.ok(broken);
const broadEdits = broadStore.get(browserTokenEditsAtom);
const brokenEdits = {
  ...broadEdits,
  [broken.id]: {
    ...broadEdits[broken.id],
    authoring: {
      ...broadEdits[broken.id].authoring!,
      assignments: {
        "[]": { kind: "reference" as const, targetId: crypto.randomUUID() },
      },
    },
  },
};
assert.throws(
  () => broadStore.set(browserTokenEditsAtom, brokenEdits),
  /referenced token is unavailable/,
  "Existing component dependencies reject broken output before committing.",
);
assert.equal(broadStore.get(browserTokenEditsAtom), broadEdits);
broadStore.set(componentsDocumentAtom, {
  ...broadStore.get(componentsDocumentAtom),
  components: [],
});
broadStore.set(browserTokenEditsAtom, brokenEdits);
const unavailable = broadStore.get(tokenComparisonResultAtom);
assert.ok(unavailable.status === "unavailable");
assert.match(unavailable.error, /referenced token is unavailable/);
assert.ok(
  broadStore.get(authoredComparisonAtom).groups.length > 0,
  "known source edits remain assessable when output is unavailable",
);
assert.throws(() => impact(broadStore), {
  name: unavailable.failure.name,
  message: unavailable.error,
});

const renamedStore = createStore();
const red = original.scales.find((scale) => scale.name === "red")!;
assert.ok(red);
renamedStore.set(editModeAtom, true);
renamedStore.set(editFoundationNameAtom, {
  id: taxonomyColorSourceId(red.id),
  value: "scarlet",
});
assert.ok(
  impact(renamedStore).affected.count > 0,
  "generated token name changes contribute to impact",
);
assert.equal(
  impact(renamedStore).valueChanged.count,
  0,
  "a rename changes no output values",
);
assert.equal(impact(renamedStore).manualOverrides.count, 0);

store.set(editModeAtom, true);
const target = store
  .get(colorTokenSetAtom)
  .tokens.find((token) => token.source.scaleId === red.id)!;
store.set(setTokenValueAtom, { uuid: target.uuid, value: "#123456" });
let tokenGroup = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!;
assert.equal(
  tokenGroup.items.length,
  1,
  "one overridden concept remains one Log item",
);
const declaredColorValues = store
  .get(modeSetsAtom)
  .filter((axis) =>
    COLOR_PARAMETERS.some((parameter) =>
      axis.authoringCapabilities?.includes(parameter),
    ),
  )
  .reduce((count, axis) => count * axis.modes.length, 1);
assert.equal(
  tokenGroup.count,
  declaredColorValues,
  "One overridden concept has one changed value per declared color context.",
);
const targetIdentity = tokenIdentity(
  store.get(browserTokenEditsAtom),
  target.uuid,
)!;
assert.ok(targetIdentity);
const targetImpact = store
  .get(browserTokenImpactRecordsAtom)
  .find((record) => record.tokenId === targetIdentity.conceptId)!;
assert.ok(targetImpact);
assert.equal(targetImpact.modeValues.length, declaredColorValues);
assert.ok(targetImpact.modeValues.every((value) => value.changed));
assert.equal(tokenGroup.items[0].fields[0].generated, false);
assert.equal(impact(store).affected.count, 1);
assert.equal(impact(store).manualOverrides.count, 1);
const trackedTokens = store.get(savedBrowserConceptIdsAtom).size;
assert.equal(
  impact(store).affected.total,
  trackedTokens,
  "Published primitive and semantic concepts share the saved denominator.",
);
assert.ok(
  Math.abs(impact(store).affected.fraction! - 1 / trackedTokens) < 1e-10,
);

store.set(colorSystemDocumentAtom, {
  ...store.get(colorSystemDocumentAtom),
  scales: original.scales.map((scale) =>
    scale.id === red.id
      ? {
          ...scale,
          stops: scale.stops.map((stop, index) =>
            index === 0 ? { ...stop, chroma: stop.chroma + 10 } : stop,
          ),
        }
      : scale,
  ),
});
assert.equal(
  store.get(changeGroupsAtom).find((group) => group.id === "foundations")!
    .count,
  1,
);
tokenGroup = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!;
assert.ok(tokenGroup.count > 1);
assert.ok(
  tokenGroup.items.some((item) => item.fields.some((field) => field.generated)),
);
assert.equal(
  edits(store, "color"),
  1,
  "one stop edit is one foundation parameter",
);
assert.ok(impact(store).valueChanged.count > 1);
assert.ok(impact(store).affected.fraction! <= 1);
const derived = tokenGroup.items.find(
  (item) =>
    item.id !== target.uuid && item.fields.some((field) => field.generated),
)!;
store.set(revertChangeItemAtom, derived);
assert.ok(
  !store
    .get(changeGroupsAtom)
    .find((group) => group.id === "tokens")!
    .items.some((item) => item.id === derived.id),
);
assert.ok(
  !store.get(changeGroupsAtom).some((group) => group.id === "foundations"),
);

const modesBeforeFoundationReset = structuredClone(store.get(modeSetsAtom));
store.set(revertChangeTopicAtom, "foundations");
assert.deepEqual(
  store.get(modeSetsAtom),
  modesBeforeFoundationReset,
  "Foundation reset does not invent legacy mode-opacity patches.",
);
assert.ok(
  !store.get(changeGroupsAtom).some((group) => group.id === "foundations"),
);
assert.ok(store.get(changeGroupsAtom).some((group) => group.id === "tokens"));
store.set(revertChangeTopicAtom, "tokens");
assert.deepEqual(store.get(changeGroupsAtom), []);

// Manual overrides win over generated changes. Reverting one removes its override,
// revealing the current generated value rather than pinning the app default.
const changedDocument = {
  ...original,
  scales: original.scales.map((scale) =>
    scale.id === red.id
      ? {
          ...scale,
          stops: scale.stops.map((stop) => ({
            ...stop,
            chroma: stop.chroma + 20,
          })),
        }
      : scale,
  ),
};
store.set(colorSystemDocumentAtom, changedDocument);
const changedTokenItem = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find(
    (item) =>
      item.source?.scaleId === red.id &&
      item.fields.some((field) => field.key.startsWith("Value")),
  )!;
const editedToken = store
  .get(colorTokenSetAtom)
  .tokens.find((token) => token.uuid === changedTokenItem.id)!;
assert.ok(editedToken);
const generatedValue = editedToken.value;
store.set(colorSystemDocumentAtom, original);
store.set(setTokenValueAtom, { uuid: editedToken.uuid, value: "#F70000" });
store.set(colorSystemDocumentAtom, changedDocument);
assert.equal(
  store
    .get(colorTokenSetAtom)
    .tokens.find((token) => token.uuid === editedToken.uuid)!.value,
  "rgb(247, 0, 0)",
);
const overriddenItem = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.id === editedToken.uuid)!;
assert.equal(
  overriddenItem.fields.find((field) => field.key === "Value · Default")!
    .before,
  generatedValue,
);
assert.equal(
  overriddenItem.fields.find((field) => field.key === "Value · Default")!
    .generated,
  false,
);
assert.ok(
  overriddenItem.fields.every(
    (field) => field.generated === undefined || field.key.startsWith("Value"),
  ),
);
store.set(revertChangeItemAtom, overriddenItem);
assert.equal(
  store
    .get(colorTokenSetAtom)
    .tokens.find((token) => token.uuid === editedToken.uuid)!.value,
  generatedValue,
);
assert.equal(store.get(tokenOverridesAtom)[editedToken.uuid], undefined);
assert.ok(
  store.get(changeGroupsAtom).some((group) => group.id === "foundations"),
);

store.set(setTokenValueAtom, { uuid: editedToken.uuid, value: "#F70000" });
store.set(revertChangeTopicAtom, "tokens");
assert.equal(
  store
    .get(colorTokenSetAtom)
    .tokens.find((token) => token.uuid === editedToken.uuid)!.value,
  generatedValue,
);
assert.deepEqual(store.get(tokenOverridesAtom), {});
assert.ok(store.get(changeGroupsAtom).some((group) => group.id === "tokens"));
assert.ok(
  store.get(changeGroupsAtom).some((group) => group.id === "foundations"),
);
store.set(resetAllChangeDataAtom);
assert.deepEqual(store.get(changeGroupsAtom), []);

const nextScale = {
  ...red,
  id: "scale-new",
  name: "new-scale",
  nameRef: undefined,
};
store.set(colorSystemDocumentAtom, {
  ...original,
  scales: [...original.scales, nextScale],
});
assert.equal(
  store
    .get(changeGroupsAtom)
    .find((group) => group.id === "foundations")!
    .items.find((item) => item.id === nextScale.id)!.kind,
  "new",
);
const addedToken = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.source?.scaleId === nextScale.id)!;
store.set(revertChangeItemAtom, addedToken);
assert.deepEqual(
  store.get(changeGroupsAtom).map((group) => group.id),
  ["registry"],
  "Removing a source preserves its registered vocabulary until explicitly reverted.",
);
store.set(revertChangeTopicAtom, "registry");
assert.deepEqual(store.get(changeGroupsAtom), []);

assert.equal(
  store.set(removeColorScaleAtom, red.id).ok,
  false,
  "Surface tint references require explicit remapping before deletion.",
);
assert.deepEqual(
  store.get(colorSystemDocumentAtom),
  original,
  "Blocked deletion changes neither sources nor their references.",
);
const removable = original.scales.find(
  (scale) =>
    scale.id !== original.backgroundScaleId &&
    !original.surfaces.some((surface) => surface.sourceScaleId === scale.id),
)!;
assert(removable);
const removedConceptIds = new Set(
  store
    .get(browserTokensAtom)
    .filter((token) => token.groupId === removable.id)
    .map((token) => token.id),
);
assert.ok(removedConceptIds.size > 0);
assert.equal(store.set(removeColorScaleAtom, removable.id).ok, true);
assert.equal(
  store
    .get(changeGroupsAtom)
    .find((group) => group.id === "foundations")!
    .items.find((item) => item.id === removable.id)!.kind,
  "removed",
);
assert.equal(
  impact(store).affected.count,
  0,
  "The legacy Impact helper assesses surviving published tokens.",
);
assert.equal(
  impact(store).affected.total,
  trackedTokens - removedConceptIds.size,
);
const removedComparison = store.get(tokenComparisonResultAtom);
assert.ok(removedComparison.status === "ready");
const removedRecords = removedComparison.comparison.records.filter((record) =>
  removedConceptIds.has(record.tokenId),
);
assert.equal(removedRecords.length, removedConceptIds.size);
assert.ok(
  removedRecords.every((record) =>
    record.modeValues.every((value) => value.changed),
  ),
);
const canonicalImpact = summarizeTokenImpact(
  removedComparison.comparison.records,
);
assert.equal(
  canonicalImpact.affected.count,
  removedConceptIds.size,
  "Current Changes retains removed publications in its comparison inventory.",
);
assert.equal(canonicalImpact.affected.total, trackedTokens);
assert.ok(edits(store, "color") > 0, "removing a scale is a foundation edit");
const removedToken = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.source?.scaleId === removable.id)!;
store.set(revertChangeItemAtom, removedToken);
store.set(revertChangeTopicAtom, "registry");
assert.deepEqual(store.get(changeGroupsAtom), []);

store.set(setTokenValueAtom, { uuid: target.uuid, value: "#112233" });
store.set(resetAllChangeDataAtom);
assert.deepEqual(store.get(changeGroupsAtom), []);

const modeStore = createStore();
const defaultSets = modeStore.get(modeSetsAtom);
const scheme = defaultSets.find((set) => set.key === "colorScheme")!;
const dark = scheme.modes.find((mode) => mode.key === "dark")!;
const light = scheme.modes.find((mode) => mode.id === scheme.defaultModeId)!;
modeStore.set(editModeAtom, true);
modeStore.set(modeSelectionAtom, { colorScheme: dark.id });
assert.equal(
  impact(modeStore).affected.count,
  0,
  "the shipped Dark mode is compared against its own shipped token values",
);
modeStore.set(
  modeSetsAtom,
  defaultSets.map((set) =>
    set.key === "colorScheme"
      ? {
          ...set,
          modes: set.modes.map((mode) =>
            mode.key === "dark"
              ? {
                  ...mode,
                  foundations: {
                    ...mode.foundations,
                    color: { backgroundLightness: 0.2 },
                  },
                }
              : mode,
          ),
        }
      : set,
  ),
);
assert.equal(modeStore.get(tokenComparisonResultAtom).status, "ready");
const modeImpact = structuredClone(impact(modeStore));
assert.ok(modeImpact.affected.count > 0);
modeStore.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.42,
});
assert.equal(
  modeStore.get(tokenComparisonResultAtom).status,
  "ready",
  "Preview controls do not replace authored output.",
);
assert.deepEqual(impact(modeStore), modeImpact);
modeStore.set(modeSelectionAtom, { colorScheme: light.id });
assert.equal(
  modeStore.get(tokenComparisonResultAtom).status,
  "ready",
  "Selecting Light keeps changes in Dark assessable.",
);
assert.deepEqual(impact(modeStore), modeImpact);
modeStore.set(revertChangeTopicAtom, "modes");
assert.equal(
  modeStore.get(colorSystemDocumentAtom).backgroundLightness,
  1,
  "reverting a Dark token does not change universal lightness",
);
assert.equal(
  modeStore
    .get(modeSetsAtom)
    .find((set) => set.key === "colorScheme")!
    .modes.find((mode) => mode.key === "dark")!.foundations.color
    ?.backgroundLightness,
  dark.foundations.color?.backgroundLightness,
  "reverting Modes restores the Dark source even while Light is selected",
);
assert.equal(impact(modeStore).affected.count, 0);
const elevationStore = createStore();
elevationStore.set(editModeAtom, true);
const elevation = elevationStore.get(elevationDocumentAtom);
const elevationModes = structuredClone(elevationStore.get(modeSetsAtom));
elevationStore.set(elevationDocumentAtom, {
  ...elevation,
  depth: elevation.depth === 1 ? 2 : 1,
});
const elevationChange = elevationStore
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find((item) => item.sourceKind === "elevation")!;
assert.ok(elevationChange);
elevationStore.set(revertChangeItemAtom, elevationChange);
assert.deepEqual(elevationStore.get(elevationDocumentAtom), elevation);
assert.deepEqual(
  elevationStore.get(modeSetsAtom),
  elevationModes,
  "Elevation item reset preserves absent legacy opacity patches.",
);
assert.deepEqual(elevationStore.get(changeGroupsAtom), []);
const browserStore = createStore();
browserStore.set(editModeAtom, true);
const originalBrowserEdits = structuredClone(
  browserStore.get(browserTokenEditsAtom),
);
const browserToken = browserStore
  .get(browserTokensAtom)
  .find((token) => token.type === "spacing")!;
const browserMode = browserStore.get(browserModeContextAtom);
browserStore.set(editBrowserTokensAtom, {
  ids: [browserToken.id],
  modeKey: browserMode.key,
  patch: { description: "Shared spacing", status: "deprecated", value: 17 },
});
const browserChange = browserStore
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.id === browserToken.id)!;
assert.ok(browserChange.fields.some((field) => field.key === "Description"));
assert.ok(browserChange.fields.some((field) => field.key === "Status"));
const canonicalBrowserChange = browserStore
  .get(canonicalChangeGroupsAtom)
  .find((group) => group.id === "tokens")!
  .items.find((item) => item.id === browserToken.id)!;
assert.ok(canonicalBrowserChange);
assert.ok(
  canonicalBrowserChange.fields.some(
    (field) =>
      field.tokenValue?.tokenId === browserToken.id && field.after === "17px",
  ),
);
browserStore.set(revertChangeItemAtom, browserChange);
assert.deepEqual(browserStore.get(browserTokenEditsAtom), originalBrowserEdits);
assert.deepEqual(browserStore.get(changeGroupsAtom), []);
console.log(
  "changelog: baseline, generated and manual diffs, item/topic/global reverts passed",
);
