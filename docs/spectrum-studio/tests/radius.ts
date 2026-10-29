// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { RADIUS_DEFAULTS } from "../src/features/radius/defaults";
import { generateRadiusScale } from "../src/features/radius/generate";
import {
  addRadiusScaleAtom,
  generatedRadiusAtom,
  radiusDocumentAtom,
  removeRadiusScaleAtom,
  restoreRadiusScaleAtom,
  updateRadiusScaleAtom,
  updateRadiusFormulaPartAtom,
} from "../src/features/radius/state";
import { scaleTypesAtom } from "../src/features/logic/scaleTypeLibrary";
import { dimensionIssues } from "../src/features/scales/issues";
import { buildDimensionComparisons } from "../src/features/scales/dimensionComparisons";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import {
  browserTokenImpactRecordsAtom,
  savedBrowserConceptIdsAtom,
  savedBrowserTokensAtom,
} from "../src/features/tokens/browserSavedState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { modeSetsAtom } from "../src/features/modes/state";
import {
  captureSnapshot,
  createDefaultSnapshot,
  assertStoredSnapshot,
  cancelEditAtom,
  enterEditModeAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  readAuthoringRecord,
  writeAuthoringRecord,
} from "../src/features/edit-session/storage";
import { upgradeRadiusSnapshot } from "../src/features/edit-session/radiusUpgrade";
import { upgradeTshirtSnapshot } from "../src/features/edit-session/tshirtUpgrade";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import {
  generatedSizeAtom,
  sizeDocumentAtom,
} from "../src/features/size/state";
import {
  scaleTypeConsumers,
  deleteScaleTypeAtom,
} from "../src/features/logic/scaleTypeReferences";
import {
  ruleConsumers,
  reassignConsumers,
} from "../src/features/logic/consumers";
import { RADIUS_SCALE_TYPE_ID } from "../src/features/scales/scaleType";
import { changeGroupsAtom } from "../src/features/changelog/state";
import { dimensionFoundationParameters } from "../src/features/impact/sources/spacingFoundation";
import {
  buildDimensionArtifacts,
  captureDimensionSource,
  DIMENSION_PROFILE,
  validateDimensionBundle,
} from "../src/features/design-data/dimensionArtifacts";
import { tokenValueText } from "../src/features/tokens/browserModel";
import { buildSpacingPrimitiveTable } from "../src/features/tokens/view/tokenPrimitiveAdapters";
import {
  defaultsAnalysisInput,
  projectAuthoringDataset,
} from "../src/features/design-data/projection";
import { designSystemDefaults } from "../src/data/defaults";
import { EMPTY_STRUCTURES } from "../src/features/structures/model";
import { structuresDocumentAtom } from "../src/features/structures/documentState";

const snapshot = createDefaultSnapshot();
snapshot.structures = structuredClone(EMPTY_STRUCTURES);
function radiusStore() {
  const store = createStore();
  store.set(structuresDocumentAtom, structuredClone(EMPTY_STRUCTURES));
  return store;
}
const scale = RADIUS_DEFAULTS.scales[0];
const values = generateRadiusScale(scale);
assert.deepEqual(
  values.map((value) => value.value),
  [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
);
assert.deepEqual(
  values.map((value) => value.step),
  [50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900],
);
assert.deepEqual(scale.parameters, {});
assert.equal(scale.base, undefined);
assert.equal(scale.bindings, undefined);
const zero = values.map((value, index) => ({
  ...value,
  raw: index,
  value: index,
}));
assert.deepEqual(dimensionIssues(zero, "non-negative").issues, []);
assert(
  dimensionIssues(zero).issues.includes("non-positive"),
  "other dimension domains still warn about zero",
);
const negative = [{ ...values[0], raw: -0.1, value: 0 }, ...values.slice(1)];
assert.equal(
  dimensionIssues(negative, "non-negative").variant,
  "negative",
  "negative raw radii are errors even if rounded to zero",
);
assert.equal(
  dimensionIssues([{ ...values[0], raw: NaN }], "non-negative").variant,
  "negative",
);
assert.equal(
  dimensionIssues([{ ...values[0], value: Infinity }], "non-negative").variant,
  "negative",
);
assert.equal(
  dimensionIssues([], "non-negative").variant,
  "negative",
  "missing Radius output is an explicit calculation error",
);
assert.equal(
  dimensionIssues([values[0], values[0]], "non-negative").variant,
  "informative",
);
const input = {
  scale,
  values,
  rules: snapshot.rules!,
  scaleTypes: snapshot.scaleTypes!,
  documents: { color: snapshot.colorSystem, typography: snapshot.typography },
  modeSets: snapshot.modeSets,
  current: {},
  valuePolicy: "non-negative" as const,
};
assert.equal(buildDimensionComparisons(input).range.settings.length, 1);
assert.throws(
  () => buildDimensionComparisons({ ...input, values: negative }),
  /non-negative/,
);
const bound = {
  ...scale,
  bindings: {
    base: {
      modeParameterId: "typography.textZoom",
      method: "linear" as const,
      points: [
        { at: -4, value: 8 },
        { at: 0, value: 10 },
        { at: 8, value: 14 },
      ],
    },
  },
};
assert.deepEqual(
  buildDimensionComparisons({ ...input, scale: bound }).parameterIds,
  ["typography.textZoom"],
);

const legacy = structuredClone(snapshot);
delete legacy.radius;
legacy.scaleTypes = legacy.scaleTypes!.filter(
  (formula) => formula.id !== RADIUS_SCALE_TYPE_ID,
);
legacy.taxonomy!.categories.forEach((category) => {
  category.scopes = category.scopes.filter((scope) => scope !== "radius");
});
legacy.taxonomy!.terms = legacy.taxonomy!.terms.filter(
  (term) => term.value !== "radius",
);
legacy.spacing!.scales = legacy.spacing!.scales.slice(0, 1);
legacy.spacing!.scales[0].base = 9;
legacy.taxonomy!.terms.find(
  (term) => term.id === scale.nameRef!.termId,
)!.value = "My shared scale";
const original = structuredClone(legacy);
const upgraded = upgradeRadiusSnapshot(legacy);
assertStoredSnapshot(upgraded);
assert.deepEqual(legacy, original, "upgrade never mutates its input");
assert.deepEqual(
  upgraded.spacing,
  legacy.spacing,
  "older spacing examples are not merged",
);
assert.equal(upgraded.radius!.scales[0].name, "My shared scale");
assert.deepEqual(
  upgradeRadiusSnapshot(upgraded),
  upgraded,
  "migration is idempotent",
);
assert.equal(upgraded.radius!.scales[0].nameRef!.termId, scale.nameRef!.termId);
const conflict = structuredClone(legacy);
conflict.taxonomy!.terms[0].value = "radius";
assert.throws(() => upgradeRadiusSnapshot(conflict), /different identity/);
assert.throws(
  () => assertStoredSnapshot(legacy),
  /incomplete/,
  "current-format snapshots cannot silently omit Radius",
);

const memory = new Map<string, string>();
const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let failWrites = false;
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new Error("Storage denied");
        memory.set(key, value);
      },
    },
  },
});
try {
  const record = {
    version: 1 as const,
    working: legacy,
    saved: {
      ...legacy,
      spacing: {
        ...legacy.spacing!,
        scales: [{ ...legacy.spacing!.scales[0], base: 8 }],
      },
    },
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  };
  memory.set(AUTHORING_STORAGE_KEY, JSON.stringify(record));
  const migrated = readAuthoringRecord(
    assertStoredSnapshot,
    upgradeTshirtSnapshot,
  )!;
  assert.equal(migrated.version, AUTHORING_RECORD_VERSION);
  assert.equal(migrated.working.spacing!.scales[0].base, 9);
  assert.equal(migrated.saved.spacing!.scales[0].base, 8);
  assert.equal(
    memory.get(AUTHORING_STORAGE_KEY),
    JSON.stringify(record),
    "reading/upgrading does not write before all record checks",
  );
  failWrites = true;
  assert.throws(() => writeAuthoringRecord(migrated), /Storage denied/);
  assert.equal(memory.get(AUTHORING_STORAGE_KEY), JSON.stringify(record));
  failWrites = false;
  writeAuthoringRecord(migrated);
  assert.deepEqual(
    readAuthoringRecord(assertStoredSnapshot, upgradeTshirtSnapshot),
    migrated,
  );

  const store = radiusStore();
  assert.equal(store.get(generatedRadiusAtom).length, 1);
  assert.equal(
    store.get(browserTokensAtom).filter((token) => token.type === "radius")
      .length,
    11,
  );
  assert.equal(
    store
      .get(browserTokenImpactRecordsAtom)
      .filter((token) => token.category === "radius").length,
    11,
  );
  assert.equal(
    store
      .get(browserTokenImpactRecordsAtom)
      .filter((token) => token.category === "radius")
      .flatMap((token) => token.modeValues).length,
    11,
  );
  assert.equal(
    [...store.get(savedBrowserConceptIdsAtom)].filter((id) =>
      id.startsWith("radius-"),
    ).length,
    11,
  );
  assert.equal(
    dimensionFoundationParameters(
      "radius",
      RADIUS_DEFAULTS,
      store.get(radiusDocumentAtom),
    ).filter((record) => record.edited).length,
    0,
  );
  const scoped = radiusStore();
  const combinations = scoped.get(savedBrowserTokensAtom);
  const primitive = combinations[0].tokens.find(
    (token) => token.type === "radius",
  )!;
  scoped.set(browserTokenEditsAtom, {
    [primitive.id]: {
      values: Object.fromEntries(
        combinations
          .slice(0, 2)
          .map(({ modeKey }) => [
            modeKey,
            { value: primitive.value, baseline: primitive.value },
          ]),
      ),
    },
  });
  assert.equal(
    scoped
      .get(browserTokenImpactRecordsAtom)
      .find((token) => token.tokenId === primitive.id)!.modeValues.length,
    3,
    "two equal-valued explicit assignments keep full contexts alongside the static baseline",
  );
  scoped.set(browserTokenEditsAtom, {});
  const sets = scoped.get(modeSetsAtom);
  const textAxis = sets.find((set) => set.key === "textScaling")!;
  scoped.set(
    modeSetsAtom,
    sets.map((set) => ({
      ...set,
      authoringCapabilities:
        set.id === textAxis.id
          ? ["typography.textZoom"]
          : set.authoringCapabilities.filter(
              (capability) => capability !== "typography.textZoom",
            ),
    })),
  );
  scoped.set(radiusDocumentAtom, {
    ...RADIUS_DEFAULTS,
    scales: [
      {
        ...bound,
        bindings: {
          base: {
            ...bound.bindings.base,
            points: [
              { at: -4, value: 8 },
              { at: 8, value: 8 },
            ],
          },
        },
      },
    ],
  });
  const boundCounts = scoped
    .get(browserTokenImpactRecordsAtom)
    .filter((token) => token.category === "radius");
  assert.equal(
    boundCounts.flatMap((token) => token.modeValues).length,
    11 * textAxis.modes.length,
    "bindings count only owner-axis identities, even when outputs are equal",
  );
  assert(
    boundCounts.every((token) =>
      token.modeValues.every((value) => !value.changed),
    ),
    "equal-value bindings add scoped identities without inventing changes",
  );
  const broken = radiusStore();
  broken.set(radiusDocumentAtom, {
    ...RADIUS_DEFAULTS,
    scales: [{ ...scale, base: 0 }],
  });
  const invalidToken = broken
    .get(browserTokensAtom)
    .find((token) => token.type === "radius")!;
  assert.match(tokenValueText(invalidToken), /Unavailable radius/);
  assert(
    invalidToken.projection!.issues.some((issue) =>
      issue.includes("non-negative"),
    ),
  );
  const table = buildSpacingPrimitiveTable(
    broken.get(generatedRadiusAtom),
    "radius",
  );
  assert.match(table.groups[0].rows[0].cells.value.text, /Unavailable radius/);
  const sharedFormula = radiusStore();
  sharedFormula.set(radiusDocumentAtom, {
    ...RADIUS_DEFAULTS,
    scales: [{ ...bound, base: 10, parameters: { step: 4 } }],
  });
  sharedFormula.set(addRadiusScaleAtom);
  sharedFormula.set(sizeDocumentAtom, {
    ...sharedFormula.get(sizeDocumentAtom),
    scales: sharedFormula
      .get(sizeDocumentAtom)
      .scales.map((scale) => ({ ...scale, scaleTypeId: RADIUS_SCALE_TYPE_ID })),
  });
  const beforeSharedEdit = captureSnapshot(sharedFormula.get);
  sharedFormula.set(enterEditModeAtom);
  sharedFormula.set(updateRadiusFormulaPartAtom, {
    scaleId: scale.id,
    parameterId: "base",
    value: 12,
  });
  assert(
    sharedFormula
      .get(radiusDocumentAtom)
      .scales.every((scale) => scale.base === undefined),
    "editing the shared base clears that part's Radius overrides, rather than creating new ones",
  );
  assert.deepEqual(
    sharedFormula
      .get(radiusDocumentAtom)
      .scales.find((item) => item.id === scale.id)!.bindings!.base.points,
    [
      { at: -4, value: 8 },
      { at: 0, value: 12 },
      { at: 8, value: 14 },
    ],
    "binding connections survive with the edited neutral point",
  );
  assert.equal(
    sharedFormula
      .get(generatedSizeAtom)[0]
      .values.find((value) => value.index === 0)!.value,
    12,
    "other foundations inheriting the selected formula see the shared edit",
  );
  sharedFormula.set(updateRadiusFormulaPartAtom, {
    scaleId: scale.id,
    parameterId: "step",
    value: 3,
  });
  assert(
    sharedFormula
      .get(radiusDocumentAtom)
      .scales.every((scale) => Object.keys(scale.parameters).length === 0),
  );
  assert.deepEqual(
    sharedFormula
      .get(radiusDocumentAtom)
      .scales.map((scale) => [scale.id, scale.nameRef]),
    beforeSharedEdit.radius!.scales.map((scale) => [scale.id, scale.nameRef]),
  );
  assert.throws(
    () =>
      sharedFormula.set(updateRadiusFormulaPartAtom, {
        scaleId: scale.id,
        parameterId: "step",
        value: NaN,
      }),
    /finite/,
  );
  assert.throws(
    () =>
      sharedFormula.set(updateRadiusFormulaPartAtom, {
        scaleId: scale.id,
        parameterId: "missing",
        value: 3,
      }),
    /no longer available/,
  );
  sharedFormula.set(cancelEditAtom);
  assert.deepEqual(
    captureSnapshot(sharedFormula.get),
    beforeSharedEdit,
    "Cancel restores both the formula and pre-existing Radius overrides",
  );
  sharedFormula.set(
    scaleTypesAtom,
    sharedFormula
      .get(scaleTypesAtom)
      .map((formula) =>
        formula.id === RADIUS_SCALE_TYPE_ID
          ? { ...formula, locked: true }
          : formula,
      ),
  );
  const lockedSnapshot = captureSnapshot(sharedFormula.get);
  assert.throws(
    () =>
      sharedFormula.set(updateRadiusFormulaPartAtom, {
        scaleId: scale.id,
        parameterId: "base",
        value: 12,
      }),
    /read-only/,
  );
  assert.deepEqual(
    captureSnapshot(sharedFormula.get),
    lockedSnapshot,
    "locked formula edits cannot create partial changes",
  );
  store.set(enterEditModeAtom);
  store.set(updateRadiusScaleAtom, { id: scale.id, patch: { base: 12 } });
  assert.equal(
    store.get(generatedRadiusAtom)[0].values.find((value) => value.index === 0)!
      .value,
    12,
  );
  assert(
    store
      .get(changeGroupsAtom)
      .flatMap((group) => group.items)
      .some((item) => item.sourceKind === "radius-scale"),
  );
  store.set(saveEditAtom);
  store.set(updateRadiusScaleAtom, { id: scale.id, patch: { base: 16 } });
  store.set(cancelEditAtom);
  assert.equal(store.get(radiusDocumentAtom).scales[0].base, 12);
  store.set(enterEditModeAtom);
  const ids = store
    .get(browserTokensAtom)
    .filter((token) => token.type === "radius")
    .map((token) => token.id);
  store.set(editFoundationNameAtom, {
    id: `radius:${scale.id}`,
    value: "Shared layout",
  });
  assert.equal(store.get(spacingDocumentAtom).scales[0].name, "Shared layout");
  assert.equal(store.get(sizeDocumentAtom).scales[0].name, "Shared layout");
  assert.equal(
    store.get(radiusDocumentAtom).scales[0].nameRef!.termId,
    scale.nameRef!.termId,
  );
  assert.deepEqual(
    store
      .get(browserTokensAtom)
      .filter((token) => token.type === "radius")
      .map((token) => token.id),
    ids,
  );
  assert.equal(
    store
      .get(taxonomyDocumentAtom)
      .terms.find((term) => term.id === scale.nameRef!.termId)!.categoryId,
    scale.nameRef!.categoryId,
  );
  store.set(removeRadiusScaleAtom, scale.id);
  assert.equal(store.get(radiusDocumentAtom).scales.length, 1);
  const addedId = store.set(addRadiusScaleAtom);
  const added = store
    .get(radiusDocumentAtom)
    .scales.find((scale) => scale.id === addedId)!;
  store.set(removeRadiusScaleAtom, addedId);
  store.set(restoreRadiusScaleAtom, { scale: added, index: 1 });
  assert.equal(store.get(radiusDocumentAtom).scales[1].id, addedId);
  store.set(updateRadiusScaleAtom, {
    id: addedId,
    patch: { hideFromPublishing: true },
  });
  assert.equal(store.get(generatedRadiusAtom).length, 2);
  assert.equal(
    store.get(browserTokensAtom).filter((token) => token.type === "radius")
      .length,
    11,
  );
  assert.equal(store.set(deleteScaleTypeAtom, RADIUS_SCALE_TYPE_ID), null);
  assertStoredSnapshot(captureSnapshot(store.get));
} finally {
  if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
const consumers = ruleConsumers({
  typography: snapshot.typography,
  spacing: snapshot.spacing!,
  size: snapshot.size,
  radius: snapshot.radius,
});
const radiusConsumer = consumers.find(
  (consumer) => consumer.slot.foundation === "radius",
)!;
assert(radiusConsumer);
assert.equal(
  reassignConsumers(
    {
      typography: snapshot.typography,
      spacing: snapshot.spacing!,
      radius: snapshot.radius,
    },
    [radiusConsumer],
    "another-rule",
  ).radius!.scales[0].roundingRuleId,
  "another-rule",
);
assert(
  scaleTypeConsumers(
    snapshot.spacing!,
    snapshot.size,
    snapshot.typography,
    snapshot.radius,
  ).some((consumer) => consumer.id === `radius/${scale.id}`),
);
const bundle = await buildDimensionArtifacts(captureDimensionSource(snapshot));
assert.equal(bundle.profileId, DIMENSION_PROFILE);
assert.equal(
  bundle.tokens.filter((token) => token.name.property === "radius").length,
  11,
  "static radius emits baseline values, not Cartesian samples",
);
assert.deepEqual(await validateDimensionBundle(bundle), bundle);
const invalid = structuredClone(snapshot);
invalid.radius!.scales[0].base = 0;
await assert.rejects(
  buildDimensionArtifacts(captureDimensionSource(invalid)),
  /Invalid generated radius/,
);
const invalidDataset = structuredClone(designSystemDefaults);
invalidDataset.system.structures = structuredClone(EMPTY_STRUCTURES);
invalidDataset.system.foundations.radius.scales[0].base = 0;
const invalidProjection = projectAuthoringDataset(
  invalidDataset,
  defaultsAnalysisInput().source,
);
assert(
  invalidProjection.errors.some((error) =>
    error.includes("Invalid Radius scale"),
  ),
);
assert.equal(
  invalidProjection.inventoryStatus,
  "partial",
  "invalid radii cannot appear as complete native output",
);
console.log(
  "Radius defaults, validation, migration, storage, identity, lifecycle, consumers, accounting and artifacts passed.",
);
