// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  appColorSchemeAtom,
  authoringCapabilityOwnersAtom,
  previewColorSchemeAtom,
} from "../src/features/modes/capabilities";
import {
  authoringSnapshotAtom,
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { editModeAtom } from "../src/state/view/editMode";
import {
  applyFoundationModeSetAtom,
  attachFoundationModeSetAtom,
  detachFoundationModeSetAtom,
  modeSetFoundationsAtom,
} from "../src/features/modes/foundationAttachments";
import { modeSetsAtom } from "../src/features/modes/state";
import { resetModeAtom } from "../src/features/modes/preview";
import {
  previewOverridesAtom,
  setPreviewParameterAtom,
} from "../src/features/modes/previewState";
import {
  canEditContrastStepsAtom,
  updateContrastTokenAtom,
  colorSystemDocumentAtom,
  colorSchemeDocumentsAtom,
} from "../src/features/color-system/state";
import { colorTokenJsonAtom } from "../src/features/tokens/state";
import { changeGroupsAtom } from "../src/features/changelog/state";
import {
  createModeSet,
  MODE_SETS_SCHEMA_VERSION,
  type ModeSet,
} from "../src/features/modes/model";
import { AUTHORING_CAPABILITY_OPTIONS } from "../src/features/modes/parameters";
import { adaptiveClaimsAtom } from "../src/features/modes/adaptive";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  canonicalTokenModeKey,
  tokenModeSetIds,
} from "../src/features/tokens/browserModel";
import { tokenOverridesAtom } from "../src/features/tokens/overrides";
import { foundationModeAttachmentsAtom } from "../src/state/view/foundationModeAttachments";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { sizeDocumentAtom } from "../src/features/size/state";
import {
  buildDimensionArtifacts,
  captureDimensionSource,
} from "../src/features/design-data/dimensionArtifacts";
import type { CascadeTokenExport } from "../src/features/tokens/cascadeExport";

const locations = createStore();
const originalSets = locations.get(modeSetsAtom);
const originalSnapshot = locations.get(authoringSnapshotAtom);
const colorSet = originalSets.find((set) => set.key === "colorScheme")!;
const initialOwners = locations.get(authoringCapabilityOwnersAtom);
for (const { id } of AUTHORING_CAPABILITY_OPTIONS) {
  assert.equal(
    initialOwners[id],
    originalSets.find((set) => set.authoringCapabilities?.includes(id))?.id,
  );
}
assert.equal(initialOwners["color.backgroundLightness"], colorSet.id);
assert.ok(initialOwners["color.contrastMultiplier"]);
assert.ok(initialOwners["typography.textZoom"]);
assert.equal(
  initialOwners["color.backgroundScaleId"],
  undefined,
  "Unclaimed controls keep their existing editor.",
);
assert.deepEqual(
  locations.get(authoringSnapshotAtom),
  originalSnapshot,
  "Reading editor ownership changes no authoring data.",
);
locations.set(
  modeSetsAtom,
  originalSets.map<ModeSet>((set) =>
    set.id === colorSet.id
      ? {
          ...set,
          authoringCapabilities: [
            ...(set.authoringCapabilities ?? []),
            "color.backgroundScaleId",
            "color.scales",
          ],
        }
      : set,
  ),
);
assert.equal(
  locations.get(authoringCapabilityOwnersAtom)["color.backgroundScaleId"],
  colorSet.id,
);
assert.equal(
  locations.get(authoringCapabilityOwnersAtom)["color.scales"],
  colorSet.id,
);
locations.set(resetModeAtom, {
  modeSetKey: colorSet.key,
  modeId: colorSet.defaultModeId,
});
assert.equal(
  locations.get(authoringCapabilityOwnersAtom)["color.backgroundScaleId"],
  colorSet.id,
  "Default selection does not duplicate the panel editor.",
);
locations.set(resetModeAtom, {
  modeSetKey: colorSet.key,
  modeId: colorSet.modes[1].id,
});
assert.equal(
  locations.get(authoringCapabilityOwnersAtom)["color.backgroundScaleId"],
  colorSet.id,
  "Nondefault selection uses the same editor ownership.",
);
locations.set(modeSetsAtom, originalSets);
assert.deepEqual(
  locations.get(authoringCapabilityOwnersAtom),
  initialOwners,
  "Removing a capability restores its unclaimed panel editor.",
);
assert.deepEqual(locations.get(authoringSnapshotAtom), originalSnapshot);

const setup = createStore();
const setupBaseline = setup.get(authoringSnapshotAtom);
const textSet = setup
  .get(modeSetsAtom)
  .find((set) => set.key === "textScaling")!;
const existingDraft = structuredClone(textSet);
existingDraft.authoringCapabilities = [
  ...(existingDraft.authoringCapabilities ?? []),
  "color.backgroundScaleId",
];
assert.throws(
  () =>
    setup.set(applyFoundationModeSetAtom, {
      modeSet: existingDraft,
      foundation: "color",
      isNew: false,
    }),
  /edit mode/,
);
assert.deepEqual(
  setup.get(authoringSnapshotAtom),
  setupBaseline,
  "An unaccepted setup draft changes no source data.",
);
setup.set(enterEditModeAtom);
setup.set(applyFoundationModeSetAtom, {
  modeSet: existingDraft,
  foundation: "color",
  isNew: false,
});
const configuredText = setup
  .get(modeSetsAtom)
  .find((set) => set.id === textSet.id)!;
assert.deepEqual(
  configuredText.modes,
  textSet.modes,
  "Variable setup never changes mode identities or values.",
);
assert.deepEqual(configuredText.authoringCapabilities, [
  "typography.textZoom",
  "color.backgroundScaleId",
]);
assert.deepEqual(setup.get(adaptiveClaimsAtom), setupBaseline.adaptiveClaims);
assert.deepEqual(setup.get(modeSetFoundationsAtom)[textSet.id], [
  "color",
  "typography",
]);
const beforeConflict = setup.get(authoringSnapshotAtom);
assert.throws(
  () =>
    setup.set(applyFoundationModeSetAtom, {
      modeSet: {
        ...existingDraft,
        authoringCapabilities: [
          "typography.textZoom",
          "color.backgroundLightness",
        ],
      },
      foundation: "color",
      isNew: false,
    }),
  /already manages/,
);
assert.deepEqual(
  setup.get(authoringSnapshotAtom),
  beforeConflict,
  "Conflicting variable ownership cannot partly add a card.",
);
assert.throws(
  () =>
    setup.set(applyFoundationModeSetAtom, {
      modeSet: { ...existingDraft, id: "missing" },
      foundation: "color",
      isNew: false,
    }),
  /no longer available/,
);
setup.set(cancelEditAtom);
assert.deepEqual(setup.get(authoringSnapshotAtom), setupBaseline);
const creation = createModeSet();
creation.authoringCapabilities = ["color.backgroundScaleId"];
setup.set(enterEditModeAtom);
setup.set(applyFoundationModeSetAtom, {
  modeSet: creation,
  foundation: "color",
  isNew: true,
  foundations: ["spacing"],
  adaptiveIds: ["color.backgroundScaleId", "typography.textZoom"],
});
assert(setup.get(modeSetsAtom).some((set) => set.id === creation.id));
assert.deepEqual(setup.get(modeSetFoundationsAtom)[creation.id], [
  "spacing",
  "color",
]);
assert.equal(
  setup.get(adaptiveClaimsAtom)["color.backgroundScaleId"],
  creation.id,
);
assert.equal(
  setup.get(adaptiveClaimsAtom)["typography.textZoom"],
  setupBaseline.adaptiveClaims!["typography.textZoom"],
);
assert.deepEqual(setup.get(colorSystemDocumentAtom), setupBaseline.colorSystem);
setup.set(cancelEditAtom);
assert.deepEqual(
  setup.get(authoringSnapshotAtom),
  setupBaseline,
  "Cancel restores an accepted new set and its selected variables together.",
);

const store = createStore();
const source = store.get(authoringSnapshotAtom);
const tokens = store.get(colorTokenJsonAtom);
const changes = store.get(changeGroupsAtom);
store.set(appColorSchemeAtom, "dark");
assert.deepEqual(store.get(authoringSnapshotAtom), source);
assert.equal(store.get(colorTokenJsonAtom), tokens);
assert.deepEqual(store.get(changeGroupsAtom), changes);
assert.equal(store.get(previewColorSchemeAtom), "light");
store.set(resetModeAtom, { modeSetKey: "colorScheme", modeId: "mode-dark" });
assert.equal(store.get(previewColorSchemeAtom), "dark");
store.set(appColorSchemeAtom, "light");
assert.equal(store.get(previewColorSchemeAtom), "dark");
assert.equal(MODE_SETS_SCHEMA_VERSION, 8);

const color = store.get(modeSetsAtom).find((set) => set.key === "colorScheme")!;
assert.throws(
  () =>
    store.set(attachFoundationModeSetAtom, {
      modeSetId: color.id,
      foundation: "spacing",
    }),
  /edit mode/,
);
store.set(editModeAtom, true);
store.set(attachFoundationModeSetAtom, {
  modeSetId: color.id,
  foundation: "spacing",
});
assert.deepEqual(store.get(modeSetFoundationsAtom)[color.id].sort(), [
  "color",
  "elevation",
  "spacing",
]);
assert.deepEqual(
  store.get(modeSetsAtom).find((set) => set.id === color.id),
  color,
  "Interface attachment changes no mode payload.",
);
store.set(detachFoundationModeSetAtom, {
  modeSetId: color.id,
  foundation: "spacing",
});
assert.deepEqual(store.get(modeSetFoundationsAtom)[color.id], [
  "color",
  "elevation",
]);
assert.throws(
  () =>
    store.set(detachFoundationModeSetAtom, {
      modeSetId: "missing",
      foundation: "color",
    }),
  /no longer available/,
);

const contrast = store.get(colorSystemDocumentAtom).contrasts[0];
assert.equal(store.get(canEditContrastStepsAtom), false);
assert.throws(
  () => store.set(updateContrastTokenAtom, { id: contrast.id, value: 1.2 }),
  /default Color modes/,
);
store.set(resetModeAtom, {
  modeSetKey: color.key,
  modeId: color.defaultModeId,
});
assert.equal(store.get(canEditContrastStepsAtom), true);
store.set(updateContrastTokenAtom, { id: contrast.id, value: 1.2 });
assert.ok(
  Math.abs(store.get(colorSystemDocumentAtom).contrasts[0].value - 1.2) < 0.001,
);
const typography = store
  .get(modeSetsAtom)
  .find((set) => set.key === "textScaling")!;
store.set(resetModeAtom, {
  modeSetKey: typography.key,
  modeId: typography.modes[1].id,
});
assert.equal(
  store.get(canEditContrastStepsAtom),
  true,
  "Typography selection does not lock Color.",
);
store.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.5,
});
assert.equal(store.get(canEditContrastStepsAtom), false);
store.set(editModeAtom, false);
assert.throws(
  () => store.set(updateContrastTokenAtom, { id: contrast.id, value: 1.3 }),
  /edit mode/,
);
assert.throws(
  () =>
    store.set(detachFoundationModeSetAtom, {
      modeSetId: color.id,
      foundation: "color",
    }),
  /edit mode/,
);

const removal = createStore();
const shipped = removal.get(authoringSnapshotAtom);
const shared = removal
  .get(modeSetsAtom)
  .find((set) => set.key === "colorScheme")!;
removal.set(enterEditModeAtom);
removal.set(
  modeSetsAtom,
  removal.get(modeSetsAtom).map((set) =>
    set.id === shared.id
      ? {
          ...set,
          authoringCapabilities: [
            "color.backgroundLightness",
            "color.backgroundScaleId",
            "color.scales",
            "typography.textZoom",
          ],
          modes: set.modes.map((mode) =>
            mode.id === set.defaultModeId
              ? mode
              : {
                  ...mode,
                  foundations: {
                    color: {
                      ...mode.foundations.color,
                      backgroundScaleId: shipped.colorSystem.scales[1].id,
                      scaleStops: {
                        [shipped.colorSystem.scales[0].id]: {
                          [shipped.colorSystem.scales[0].stops[0].id]: {
                            lightness: 0.3,
                          },
                        },
                      },
                    },
                    typography: { textZoom: 2 },
                  },
                },
          ),
        }
      : set.key === "textScaling"
        ? {
            ...set,
            authoringCapabilities: [],
            modes: set.modes.map((mode) => ({ ...mode, foundations: {} })),
          }
        : set,
  ),
);
removal.set(adaptiveClaimsAtom, {
  "color.backgroundLightness": shared.id,
  "typography.textZoom": shared.id,
  "color.contrastMultiplier": removal
    .get(modeSetsAtom)
    .find((set) => set.key === "contrast")!.id,
});
removal.set(attachFoundationModeSetAtom, {
  modeSetId: shared.id,
  foundation: "typography",
});
const baselineOutput: CascadeTokenExport = JSON.parse(
  removal.get(colorTokenJsonAtom),
);
const baseRow = baselineOutput.tokens.find(
  (row) =>
    row.name.property === "color" &&
    !row.name.colorScheme &&
    !row.name.contrast,
)!;
const modeKey = canonicalTokenModeKey(
  Object.fromEntries(
    removal.get(modeSetsAtom).map((set) => [set.id, set.defaultModeId]),
  ),
);
assert.deepEqual(
  tokenModeSetIds(modeKey),
  [...removal.get(modeSetsAtom).map((set) => set.id)].sort(),
);
assert.deepEqual(tokenModeSetIds("[]"), []);
assert.throws(() => tokenModeSetIds("{}"), /invalid mode assignment/);
assert.throws(
  () => tokenModeSetIds('[["axis",42]]'),
  /invalid mode assignment/,
);
const typeEdit = {
  description: "Keep typography",
  values: { [modeKey]: { value: 20, baseline: 16 } },
};
removal.set(browserTokenEditsAtom, {
  [baseRow.uuid]: {
    description: "Keep color notes",
    values: {
      [modeKey]: { value: "#123456", baseline: String(baseRow.value) },
    },
  },
  "typography-font-size-100": typeEdit,
});
const globalOverride = {
  value: "#abcdef",
  baseline: {
    name: { colorName: "Cyan", contrastValue: "100" },
    value: String(baseRow.value),
  },
  editedAt: "2026-10-07T00:00:00Z",
};
removal.set(tokenOverridesAtom, { [baseRow.uuid]: globalOverride });
removal.set(saveEditAtom);
const configured = removal.get(authoringSnapshotAtom);
const attachments = removal.get(foundationModeAttachmentsAtom);
removal.set(resetModeAtom, {
  modeSetKey: shared.key,
  modeId: shared.modes[1].id,
});
removal.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.4,
});
removal.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 3,
});
const otherSets = removal
  .get(modeSetsAtom)
  .filter((set) => set.id !== shared.id);
removal.set(detachFoundationModeSetAtom, {
  modeSetId: shared.id,
  foundation: "color",
});
const retained = removal.get(modeSetsAtom).find((set) => set.id === shared.id)!;
assert.deepEqual(
  retained.modes.map((mode) => [mode.id, mode.key, mode.name]),
  shared.modes.map((mode) => [mode.id, mode.key, mode.name]),
);
assert(
  retained.modes.every((mode) => mode.foundations.color === undefined),
  "Delete removes scale-stop and scalar overrides together.",
);
assert.equal(retained.modes[1].foundations.typography?.textZoom, 2);
assert.deepEqual(retained.authoringCapabilities, ["typography.textZoom"]);
assert.deepEqual(
  removal.get(modeSetsAtom).filter((set) => set.id !== shared.id),
  otherSets,
);
assert.deepEqual(removal.get(modeSetFoundationsAtom)[shared.id], [
  "typography",
]);
assert.equal(
  removal.get(adaptiveClaimsAtom)["color.backgroundLightness"],
  undefined,
);
assert.equal(removal.get(adaptiveClaimsAtom)["typography.textZoom"], shared.id);
assert(removal.get(adaptiveClaimsAtom)["color.contrastMultiplier"]);
assert.deepEqual(removal.get(previewOverridesAtom), {
  "typography.textZoom": 3,
});
assert.deepEqual(removal.get(colorSystemDocumentAtom), configured.colorSystem);
assert.deepEqual(
  removal.get(authoringSnapshotAtom).taxonomy,
  configured.taxonomy,
);
assert.deepEqual(removal.get(browserTokenEditsAtom)[baseRow.uuid], {
  description: "Keep color notes",
  values: {},
});
assert.deepEqual(
  removal.get(browserTokenEditsAtom)["typography-font-size-100"],
  typeEdit,
);
assert.deepEqual(removal.get(tokenOverridesAtom), {
  [baseRow.uuid]: globalOverride,
});
assert.deepEqual(removal.get(colorSchemeDocumentsAtom), []);
const partial: CascadeTokenExport = JSON.parse(removal.get(colorTokenJsonAtom));
assert.deepEqual(
  partial.modeSets.map((set) => set.name),
  ["contrast"],
  "Other foundations' explicit token edits do not re-expand Color.",
);
assert(partial.tokens.every((row) => row.name.colorScheme === undefined));
assert(
  partial.tokens.some((row) => row.name.contrast !== undefined),
  "A remaining Color owner still emits its own assignments.",
);
removal.set(cancelEditAtom);
assert.deepEqual(
  removal.get(authoringSnapshotAtom),
  configured,
  "Cancel restores data removed by one-click deletion.",
);
assert.deepEqual(removal.get(foundationModeAttachmentsAtom), attachments);
removal.set(enterEditModeAtom);
removal.set(detachFoundationModeSetAtom, {
  modeSetId: shared.id,
  foundation: "color",
});
const contrastSet = removal
  .get(modeSetsAtom)
  .find((set) => set.key === "contrast")!;
removal.set(detachFoundationModeSetAtom, {
  modeSetId: contrastSet.id,
  foundation: "color",
});
const flat: CascadeTokenExport = JSON.parse(removal.get(colorTokenJsonAtom));
assert.deepEqual(flat.modeSets, []);
assert.equal(
  new Set(flat.tokens.map((row) => row.conceptId)).size,
  flat.tokens.length,
  "There is exactly one row per concept after all Color dependencies are removed.",
);
assert(
  flat.tokens.every(
    (row) =>
      !("colorScheme" in row.name) &&
      !("contrast" in row.name) &&
      !("sets" in row),
  ),
);
const defaultRows = baselineOutput.tokens.filter(
  (row) => !row.name.colorScheme && !row.name.contrast,
);
assert.deepEqual(
  flat.tokens,
  defaultRows.map((row) =>
    row.uuid === baseRow.uuid ? { ...row, value: "#abcdef" } : row,
  ),
  "Flat rows retain default values and UUIDs, not the selected dark override.",
);
assert.equal(
  removal.get(canEditContrastStepsAtom),
  true,
  "An unowned Color scheme declaration cannot lock shared contrast editing.",
);
removal.set(saveEditAtom);
const savedRemoval = removal.get(authoringSnapshotAtom);
removal.set(cancelEditAtom);
assert.deepEqual(
  removal.get(authoringSnapshotAtom),
  savedRemoval,
  "Save makes removal the new baseline.",
);

const equalModes = createStore();
equalModes.set(
  modeSetsAtom,
  equalModes.get(modeSetsAtom).map((set) => ({
    ...set,
    modes: set.modes.map((mode) => ({ ...mode, foundations: {} })),
  })),
);
const equalOutput: CascadeTokenExport = JSON.parse(
  equalModes.get(colorTokenJsonAtom),
);
const equalDark = equalOutput.tokens.find(
  (row) =>
    row.name.property === "color" &&
    row.name.colorScheme === "dark" &&
    !row.name.contrast,
)!;
assert.equal(
  equalDark.value,
  equalOutput.tokens.find(
    (row) =>
      row.conceptId === equalDark.conceptId &&
      !row.name.colorScheme &&
      !row.name.contrast,
  )!.value,
);
assert(
  equalOutput.modeSets.some((set) => set.name === "colorScheme"),
  "Equal values do not remove a declared dependency or its qualified rows.",
);
const isolatedPreview = createStore();
isolatedPreview.set(enterEditModeAtom);
isolatedPreview.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.4,
});
isolatedPreview.set(setPreviewParameterAtom, {
  parameterId: "color.contrastMultiplier",
  value: 0.8,
});
isolatedPreview.set(detachFoundationModeSetAtom, {
  modeSetId: isolatedPreview
    .get(modeSetsAtom)
    .find((set) => set.key === "contrast")!.id,
  foundation: "color",
});
assert.deepEqual(
  isolatedPreview.get(previewOverridesAtom),
  { "color.backgroundLightness": 0.4 },
  "Delete does not clear a different mode set's preview of the same foundation.",
);

for (const foundation of ["spacing", "size"] as const) {
  const dimensions = createStore();
  dimensions.set(enterEditModeAtom);
  const baseline = await buildDimensionArtifacts(
    captureDimensionSource(dimensions.get(authoringSnapshotAtom)),
  );
  const owner = dimensions
    .get(modeSetsAtom)
    .find((set) => set.key === "textScaling")!;
  const document =
    foundation === "spacing"
      ? dimensions.get(spacingDocumentAtom)
      : dimensions.get(sizeDocumentAtom);
  const bound = {
    ...document,
    scales: document.scales.map((scale) => ({
      ...scale,
      bindings: {
        base: {
          modeParameterId: "typography.textZoom",
          method: "exponential" as const,
          points: [
            { at: -4, value: 4 },
            { at: 0, value: 8 },
            { at: 8, value: 16 },
          ],
        },
        [foundation === "spacing" ? "ratio" : "step"]: {
          modeParameterId: "color.contrastMultiplier",
          method: "linear" as const,
          points: [
            { at: 0, value: 1 },
            { at: 1, value: 1.25 },
            { at: 2, value: 1.5 },
          ],
        },
      },
    })),
  };
  if (foundation === "spacing")
    dimensions.set(spacingDocumentAtom, { ...bound, schemaVersion: 4 });
  else dimensions.set(sizeDocumentAtom, { ...bound, schemaVersion: 2 });
  dimensions.set(attachFoundationModeSetAtom, {
    modeSetId: owner.id,
    foundation,
  });
  const before = dimensions.get(modeSetsAtom);
  dimensions.set(detachFoundationModeSetAtom, {
    modeSetId: owner.id,
    foundation,
  });
  const detached =
    foundation === "spacing"
      ? dimensions.get(spacingDocumentAtom)
      : dimensions.get(sizeDocumentAtom);
  assert(
    detached.scales.every(
      (scale) =>
        !scale.bindings?.base &&
        scale.bindings?.[foundation === "spacing" ? "ratio" : "step"],
    ),
    "Only this foundation's bindings to the removed set are released.",
  );
  assert.deepEqual(
    dimensions.get(modeSetsAtom),
    before,
    "The source parameter owner's other foundations are unchanged.",
  );
  assert.deepEqual(
    detached.scales.map((scale) => scale.parameters),
    document.scales.map((scale) => scale.parameters),
  );
  const bundle = await buildDimensionArtifacts(
    captureDimensionSource(dimensions.get(authoringSnapshotAtom)),
  );
  assert(
    bundle.tokens
      .filter((row) => row.name.property === foundation)
      .every((row) => row.name.textScaling === undefined),
  );
  dimensions.set(detachFoundationModeSetAtom, {
    modeSetId: dimensions
      .get(modeSetsAtom)
      .find((set) => set.key === "contrast")!.id,
    foundation,
  });
  const flat = await buildDimensionArtifacts(
    captureDimensionSource(dimensions.get(authoringSnapshotAtom)),
  );
  assert.deepEqual(
    flat.tokens.filter((row) => row.name.property === foundation),
    baseline.tokens.filter((row) => row.name.property === foundation),
    "Removing all dimension dependencies restores single shared-value rows with stable source identities.",
  );
}
console.log(
  "Mode UI: independent appearance, shared attachments, one-click cleanup, flat outputs, lifecycle and stable identities passed.",
);
