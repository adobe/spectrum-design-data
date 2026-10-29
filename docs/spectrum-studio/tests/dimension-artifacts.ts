// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { setPreviewParameterAtom } from "../src/features/modes/previewState";
import {
  buildDimensionArtifacts,
  captureDimensionSource,
  validateDimensionBundle,
} from "../src/features/design-data/dimensionArtifacts";
import {
  DimensionArtifactRepository,
  type DimensionArtifactState,
} from "../src/features/design-data/dimensionArtifactRepository";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { generateSpacingScale } from "../src/features/spacing/generate";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import {
  addColorScaleAtom,
  addPaletteColorAtom,
} from "../src/features/color-system/state";
import { addSpacingScaleAtom } from "../src/features/spacing/state";
import { addSizeScaleAtom } from "../src/features/size/state";

const store = createStore();
const snapshot = store.get(authoringSnapshotAtom);
const before = canonicalJson(snapshot);
const baseline = await buildDimensionArtifacts(
  captureDimensionSource(snapshot),
);
assert(baseline.tokens.length > 0);
assert(baseline.tokens.every((token) => Object.keys(token.name).length === 2));
assert.equal(
  new Set(baseline.tokens.map((token) => token.uuid)).size,
  baseline.tokens.length,
);
assert(baseline.tokens.every((token) => token.value.endsWith("px")));
assert.deepEqual(
  await validateDimensionBundle(JSON.parse(canonicalJson(baseline))),
  baseline,
);
assert.equal(canonicalJson(snapshot), before);
const scale = snapshot.spacing!.scales[0];
const raw = generateSpacingScale(scale, snapshot.rules, snapshot.scaleTypes);
for (const value of raw)
  assert.equal(
    baseline.tokens.find(
      (token) =>
        token.name.tokenCategory === "Spacing" &&
        token.name.scaleIndex === value.step,
    )?.value,
    `${value.value}px`,
  );
store.set(enterEditModeAtom);
store.set(editFoundationNameAtom, {
  id: `spacing:${scale.id}`,
  value: "Dimension label",
});
const classified = store.get(authoringSnapshotAtom);
assert.equal(
  store
    .get(taxonomyDocumentAtom)
    .terms.find((term) => term.id === scale.nameRef!.termId)?.value,
  "Dimension label",
);
const classifiedBundle = await buildDimensionArtifacts(
  captureDimensionSource(classified),
);
assert.deepEqual(
  classifiedBundle.tokens,
  baseline.tokens,
  "Custom classifications do not rewrite the fixed proposed dimension profile",
);
assert.notEqual(classifiedBundle.sourceHash, baseline.sourceHash);
assert(
  classifiedBundle.lineage
    .filter((row) => row.scaleId === scale.id && row.domain === "spacing")
    .every(
      (row) =>
        row.taxonomy!.name.startsWith("spacing-") &&
        row.taxonomy!.issues.length === 0,
    ),
  "Unassigned source labels do not rewrite explicit output classifications.",
);
assert(!("sourceAssignments" in classifiedBundle.foundation.source.taxonomy!));
assert.deepEqual(
  await validateDimensionBundle(JSON.parse(canonicalJson(classifiedBundle))),
  classifiedBundle,
);

const renamed = structuredClone(snapshot);
renamed.taxonomy!.terms.find(
  (term) => term.id === scale.nameRef!.termId,
)!.value = "Renamed spacing";
const renamedBundle = await buildDimensionArtifacts(
  captureDimensionSource(renamed),
);
assert.deepEqual(
  renamedBundle.tokens,
  baseline.tokens,
  "Ordinary recipe rename never remints token UUIDs or rewrites structured identity",
);
assert.notEqual(renamedBundle.sourceHash, baseline.sourceHash);
const negative = structuredClone(snapshot);
negative.spacing!.scales[0].parameters.ratio = 1.5;
assert(
  (await buildDimensionArtifacts(captureDimensionSource(negative))).tokens.some(
    (token) => token.value.startsWith("-"),
  ),
  "Finite signed dimensions retain actual generator output; negative-value warnings are not schema failures",
);
const unused = structuredClone(snapshot);
unused.modeSets.push({
  id: "unused-axis",
  key: "unused",
  name: "Unused",
  description: "",
  iconId: "none",
  defaultModeId: "unused-a",
  modes: [
    {
      id: "unused-a",
      key: "a",
      name: "A",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
    {
      id: "unused-b",
      key: "b",
      name: "B",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
  ],
});
assert.deepEqual(
  (await buildDimensionArtifacts(captureDimensionSource(unused))).tokens,
  baseline.tokens,
  "Unused declarations do not materialize a Cartesian product",
);
const bound = structuredClone(snapshot);
bound.spacing!.scales[0].bindings = {
  base: {
    modeParameterId: "typography.textZoom",
    method: "exponential",
    points: [
      { at: -4, value: 4 },
      { at: 0, value: 8 },
      { at: 8, value: 16 },
    ],
  },
};
const boundBundle = await buildDimensionArtifacts(
  captureDimensionSource(bound),
);
assert(
  boundBundle.tokens.some((token) => token.name.textScaling === "largest"),
);
assert(
  boundBundle.tokens
    .filter((token) => token.name.tokenCategory === "Spacing")
    .every(
      (token) =>
        token.name.colorScheme === undefined &&
        token.name.contrast === undefined,
    ),
);

const edited = structuredClone(snapshot);
const keys = ["default", "larger"].map((key) =>
  canonicalTokenModeKey(
    Object.fromEntries(
      snapshot.modeSets.map((axis) => [
        axis.id,
        axis.key === "textScaling"
          ? axis.modes.find((mode) => mode.key === key)!.id
          : axis.defaultModeId,
      ]),
    ),
  ),
);
edited.browserTokenEdits = {
  [`spacing-${scale.id}-100`]: {
    values: Object.fromEntries(
      keys.map((key) => [key, { value: 8, baseline: 8 }]),
    ),
  },
};
const editedBundle = await buildDimensionArtifacts(
  captureDimensionSource(edited),
);
assert.equal(
  editedBundle.tokens.length,
  baseline.tokens.length + 2,
  "Two equal explicit value assignments remain two qualified rows plus baseline",
);
assert.equal(editedBundle.lineage.filter((row) => row.edit).length, 2);
assert(
  editedBundle.lineage
    .filter((row) => row.edit)
    .every((row) => row.edit!.authoredBaseline === 8),
);
const hidden = structuredClone(snapshot);
hidden.spacing!.scales[0].hideFromPublishing = true;
const hiddenBundle = await buildDimensionArtifacts(
  captureDimensionSource(hidden),
);
assert(hiddenBundle.foundation.source.spacing.scales.length > 0);
assert(
  !hiddenBundle.tokens.some((token) => token.name.tokenCategory === "Spacing"),
);

for (const invalid of [
  { ...baseline, profileId: "wrong-profile" },
  { ...baseline, sourceHash: "0".repeat(64) },
  {
    ...baseline,
    tokens: baseline.tokens.map((token, index) =>
      index ? token : { ...token, value: "999px" },
    ),
  },
  { ...baseline, tokens: [...baseline.tokens, baseline.tokens[0]] },
  {
    ...baseline,
    tokens: baseline.tokens.map((token, index) =>
      index ? token : { ...token, $ref: "alias" },
    ),
  },
])
  await assert.rejects(validateDimensionBundle(invalid));
const broken = structuredClone(snapshot);
broken.spacing!.scales[0].scaleTypeId = "absent";
assert.throws(() => captureDimensionSource(broken), /Unresolved formula/);
const forbidden = structuredClone(bound);
forbidden.scaleTypes!.find(
  (formula) => formula.id === scale.scaleTypeId,
)!.base.adaptable = false;
assert.throws(() => captureDimensionSource(forbidden), /Unsupported binding/);
const ambiguous = structuredClone(edited);
const editId = `spacing-${scale.id}-100`;
const original = ambiguous.browserTokenEdits![editId].values[keys[0]];
ambiguous.browserTokenEdits![editId].values = {
  [JSON.stringify([...JSON.parse(keys[0])].reverse())]: original,
};
assert.throws(() => captureDimensionSource(ambiguous), /noncanonical/);
const orphan = structuredClone(edited);
orphan.browserTokenEdits = {
  "spacing-removed-scale-100": { values: { [keys[0]]: original } },
};
await assert.rejects(
  buildDimensionArtifacts(captureDimensionSource(orphan)),
  /Unmaterialized explicit/,
);

let state: DimensionArtifactState | undefined;
const repository = new DimensionArtifactRepository((next) => {
  state = next;
}, 60_000);
repository.request(snapshot, snapshot);
await repository.flush();
assert.equal(state?.status, "ready");
assert.equal(state?.isSaved, true);
const generatedBaseline = canonicalJson(state?.bundle);
repository.request(classified, snapshot);
await repository.flush();
assert.equal(
  state?.isSaved,
  false,
  "Working source classifications are provisional artifact evidence",
);
assert.equal(state?.bundle?.sourceHash, classifiedBundle.sourceHash);
repository.request(classified, classified);
await repository.flush();
assert.equal(state?.isSaved, true);
repository.request(snapshot, snapshot);
await repository.flush();
assert.equal(
  canonicalJson(state?.bundle),
  generatedBaseline,
  "Source-classification Cancel restores the exact native/lineage artifact pair",
);
const creationStore = createStore();
creationStore.set(enterEditModeAtom);
for (const mutation of [
  addPaletteColorAtom,
  addColorScaleAtom,
  addSpacingScaleAtom,
  addSizeScaleAtom,
]) {
  creationStore.set(mutation);
  const created = creationStore.get(authoringSnapshotAtom);
  assert(!("sourceAssignments" in created.taxonomy!));
  const createdBundle = await buildDimensionArtifacts(
    captureDimensionSource(created),
  );
  assert.deepEqual(
    createdBundle.foundation.source.taxonomy,
    created.taxonomy,
    "Real creation payloads retain every classification field in the strict schema",
  );
  repository.request(created, snapshot);
  await repository.flush();
  assert.equal(state?.status, "ready");
  assert.equal(state?.isSaved, false);
  assert.equal(state?.bundle?.sourceHash, createdBundle.sourceHash);
  assert.deepEqual(
    await validateDimensionBundle(JSON.parse(canonicalJson(createdBundle))),
    createdBundle,
  );
}
creationStore.set(cancelEditAtom);
repository.request(creationStore.get(authoringSnapshotAtom), snapshot);
await repository.flush();
assert.equal(
  canonicalJson(state?.bundle),
  generatedBaseline,
  "Cancelling source creation restores the exact validated artifact pair",
);
repository.request(edited, snapshot);
await repository.flush();
assert.equal(state?.isSaved, false);
assert.equal(state?.bundle?.tokens.length, editedBundle.tokens.length);
repository.request(edited, edited);
await repository.flush();
assert.equal(state?.isSaved, true);
repository.request(snapshot, snapshot);
await repository.flush();
assert.equal(
  canonicalJson(state?.bundle),
  generatedBaseline,
  "Cancel source restores the exact artifact pair",
);
const oldJob = (async () => {
  repository.request(edited, snapshot);
  await repository.flush();
})();
repository.request(snapshot, snapshot);
await repository.flush();
await oldJob;
assert.equal(
  canonicalJson(state?.bundle),
  generatedBaseline,
  "Discarded asynchronous work cannot win after Cancel",
);
repository.request(broken, snapshot);
await repository.flush();
assert.equal(state?.status, "stale");
assert.equal(state?.isSaved, false);
assert.equal(
  canonicalJson(state?.bundle),
  generatedBaseline,
  "Invalid source preserves last-good in-memory output and authored source",
);
const reloaded = new DimensionArtifactRepository((next) => {
  state = next;
}, 60_000);
reloaded.request(snapshot, snapshot);
await reloaded.flush();
assert.equal(state?.status, "ready");
assert.equal(
  canonicalJson(state?.bundle),
  generatedBaseline,
  "A fresh repository rebuilds defaults without browser cache input",
);

store.set(enterEditModeAtom);
store.set(spacingDocumentAtom, {
  ...snapshot.spacing!,
  scales: snapshot.spacing!.scales.map((item) => ({ ...item, base: 12 })),
});
const workingSource = captureDimensionSource(store.get(authoringSnapshotAtom));
store.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 8,
});
assert.equal(
  canonicalJson(captureDimensionSource(store.get(authoringSnapshotAtom))),
  canonicalJson(workingSource),
  "Temporary previews never enter artifact source",
);
store.set(saveEditAtom);
store.set(spacingDocumentAtom, snapshot.spacing!);
store.set(cancelEditAtom);
assert.equal(
  canonicalJson(captureDimensionSource(store.get(authoringSnapshotAtom))),
  canonicalJson(workingSource),
  "Native Save/Cancel still owns source restoration",
);
repository.cancel();
reloaded.cancel();
console.log(
  "Spacing/size proposed schemas, UUIDs, emission, cache validation and repository lifecycle checks passed.",
);
