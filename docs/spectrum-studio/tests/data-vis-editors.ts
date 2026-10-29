// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import { createDataVisSnapshot, DATA_VIS_IDS } from "./fixtures/dataVis";
import {
  captureSnapshot,
  restoreAuthoringSnapshotAtom,
  assertStoredSnapshot,
  saveEditAtom,
  enterEditModeAtom,
  cancelEditAtom,
  editSessionSnapshotAtom,
  type EditSessionSnapshot,
} from "../src/features/edit-session/state";
import {
  colorSystemDocumentAtom,
  removePaletteColorAtom,
  updateColorScalePublishingAtom,
} from "../src/features/color-system/state";
import {
  dataVisContinuousOutputsAtom,
  dataVisPrimitiveColorsAtom,
  dataVisUiSwatchesAtom,
  dataVisContextFingerprintAtom,
  editDataVisPointAtom,
  editDataVisStructureAtom,
  applyCategoricalDataVisAtom,
} from "../src/features/color-system/data-vis/state";
import {
  setDataVisStaticAtom,
  undoDataVisStaticAtom,
  editDataVisStaticColorAtom,
  editDataVisStaticStopsAtom,
} from "../src/features/color-system/data-vis/frozenState";
import {
  editStaticMemberOverrides,
  staticCategoricalTokenIds,
} from "../src/features/color-system/data-vis/frozenColors";
import {
  primitiveColorIdentities,
  linkedPrimitiveColor,
  publishedPrimitiveColors,
} from "../src/features/color-system/data-vis/primitiveColors";
import {
  applyDataVisPointPatch,
  isDataVisScale,
  isDataVisPoint,
  isFrozenColor,
  frozenColorValue,
  type DataVisScale,
} from "../src/features/color-system/data-vis/model";
import { dataVisMemberId } from "../src/features/color-system/data-vis/identity";
import { buildDataVisSourcePacket } from "../src/features/color-system/data-vis/export";
import { createDataVisRuntime } from "../src/features/color-system/data-vis/adapter";
import { buildDataVisCategoricalCss } from "../src/features/color-system/data-vis/css";
import { upgradeDataVisSnapshot } from "../src/features/edit-session/dataVisUpgrade";
import { upgradeColorOutputSnapshot } from "../src/features/edit-session/colorOutputUpgrade";
import { serializeOutputColor } from "../src/features/color-system/outputSerialization";
import { migrateColorSystemDocument } from "../src/features/color-system/model";
import {
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { modeSetsAtom } from "../src/features/modes/state";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  browserTokensAtom,
  browserModeContextAtom,
  editBrowserTokensAtom,
  resetBrowserTokenAtom,
} from "../src/features/tokens/browserState";
import { browserTokenImpactRecordsAtom } from "../src/features/tokens/browserSavedState";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import {
  aliasReferencePacket,
  aliasTargetsForContext,
} from "../src/features/tokens/aliases";
import { aliasesAtom } from "../src/features/tokens/aliasState";
import { tokenUuid } from "../src/features/tokens/model";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { editModeAtom } from "../src/state/view/editMode";
import { continuousStopBounds } from "../src/features/color-system/data-vis/editor";
import { gradientPointerPosition } from "../src/components/color-picker/gradientStopPositions";
import { analysisWorkingInputAtom } from "../src/features/design-data/state";

const initial = createDataVisSnapshot();
initial.components!.components = [];
function fresh(snapshot = initial) {
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, structuredClone(snapshot));
  store.set(editModeAtom, true);
  return store;
}
type Store = ReturnType<typeof fresh>;
function definition(store: Store, id = DATA_VIS_IDS.sequential): DataVisScale {
  const scale = store
    .get(colorSystemDocumentAtom)
    .dataVisScales.find((scale) => scale.id === id);
  assert.ok(scale);
  return scale;
}
function compiled(store: Store, id = DATA_VIS_IDS.sequential) {
  const output = store
    .get(dataVisContinuousOutputsAtom)
    .find(
      (output) =>
        (output.status === "ready" ? output.scale.id : output.id) === id,
    );
  assert.ok(output);
  assert.equal(output.status, "ready");
  if (output.status !== "ready") throw new Error(output.error);
  return output.scale;
}
function member(store: Store, id: string) {
  const token = store.get(browserTokensAtom).find((token) => token.id === id);
  assert.ok(token);
  return token;
}
function select(store: Store, axisKey: string, modeKey: string) {
  const axis = store.get(modeSetsAtom).find((axis) => axis.key === axisKey);
  const mode = axis?.modes.find((mode) => mode.key === modeKey);
  assert.ok(mode);
  store.set(modeSelectionAtom, {
    ...store.get(modeSelectionAtom),
    [axisKey]: mode.id,
  });
}
function samples(store: Store, id = DATA_VIS_IDS.sequential) {
  const scale = compiled(store, id);
  return [0, 0.17, 0.5, 0.81, 1].map((position) => scale.evaluate(position));
}

assert.equal(
  isFrozenColor({ id: "first", value: "rgba(10, 20, 30, 0.4)" }),
  true,
);
for (const value of ["var(--color)", "currentColor", "not-a-color", 1]) {
  assert.equal(isFrozenColor({ id: "first", value }), false);
}
assert.equal(
  isFrozenColor({ id: "first", value: "#123456", overrideValue: "bad" }),
  false,
);
assert.equal(
  isDataVisPoint({
    id: "point",
    position: 0.5,
    source: { kind: "primitive-token", tokenId: "native-id" },
  }),
  true,
);
assert.equal(
  isDataVisPoint({
    id: "point",
    position: 0.5,
    source: { kind: "primitive-token", tokenId: "" },
  }),
  false,
);
assert.equal(
  isDataVisPoint({
    id: "point",
    position: 0.5,
    source: { kind: "primitive-token", tokenId: "native-id" },
    contrast: { value: 3 },
  }),
  false,
);
const contract = structuredClone(initial.colorSystem.dataVisScales[0]);
assert.ok(contract.kind !== "categorical");
assert.equal(isDataVisScale({ ...contract, staticColors: [] }), false);
assert.equal(
  isDataVisScale({
    ...contract,
    staticColors: [
      { id: "a", value: "#112233", position: 0 },
      { id: "a", value: "#445566", position: 1 },
    ],
  }),
  false,
);
assert.equal(
  isDataVisScale({
    ...contract,
    staticColors: [
      { id: "a", value: "#112233", position: 0.1 },
      { id: "b", value: "#445566", position: 1 },
    ],
  }),
  false,
);
assert.equal(
  isDataVisScale({
    ...initial.colorSystem.dataVisScales[1],
    staticColors: [
      { id: "a", value: "#112233", position: 0 },
      { id: "b", value: "#445566", position: 1 },
    ],
  }),
  false,
);
assert.equal(
  isDataVisScale({
    ...initial.colorSystem.dataVisScales[2],
    staticColors: [{ id: "missing", value: "#112233" }],
  }),
  false,
);

const older = structuredClone(initial);
const { colorOutput: oldColorOutput, ...oldSettings } =
  older.colorSystem.settings;
void oldColorOutput;
const oldColor = {
  ...older.colorSystem,
  schemaVersion: 3,
  settings: { ...oldSettings, outputGamut: "srgb" },
};
const migrated = migrateColorSystemDocument(oldColor, 3);
assert.ok(migrated);
assert.equal(migrated.schemaVersion, 5);
assert.deepEqual(migrated.dataVisScales, older.colorSystem.dataVisScales);
assert.ok(
  migrated.dataVisScales.every((scale) => scale.staticColors === undefined),
);
const upgraded = upgradeDataVisSnapshot({ ...older, colorSystem: oldColor }, 8);
assert.deepEqual(
  upgraded.colorSystem.dataVisScales,
  older.colorSystem.dataVisScales,
);
const savedOld = {
  ...structuredClone(older),
  colorSystem: {
    ...oldColor,
    dataVisScales: oldColor.dataVisScales.slice(0, 1),
  },
};
for (const axis of savedOld.modeSets)
  for (const mode of axis.modes)
    if (mode.foundations.color) {
      delete mode.foundations.color.dataVisSources;
    }
const previousEnvelope = {
  version: 8,
  working: { ...older, colorSystem: oldColor },
  saved: savedOld,
  isEditing: true,
  attachments: {},
  savedAttachments: {},
};
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: { getItem: () => JSON.stringify(previousEnvelope) },
  },
});
let record;
try {
  record = readAuthoringRecord<EditSessionSnapshot>(
    assertStoredSnapshot,
    upgradeColorOutputSnapshot,
  );
} finally {
  if (windowDescriptor)
    Object.defineProperty(globalThis, "window", windowDescriptor);
  else Reflect.deleteProperty(globalThis, "window");
}
assert.ok(record);
assert.equal(record.version, AUTHORING_RECORD_VERSION);
assert.equal(record.working.colorSystem.dataVisScales.length, 3);
assert.equal(
  record.saved.colorSystem.dataVisScales.length,
  1,
  "Working and saved inputs migrate independently.",
);

const store = fresh();
const catalog = store.get(dataVisPrimitiveColorsAtom);
assert.deepEqual(
  new Set(catalog.map((color) => color.origin.kind)),
  new Set(["palette", "ui-swatch", "categorical"]),
);
assert.equal(
  catalog.length,
  primitiveColorIdentities(initial.colorSystem).filter((color) => !color.hidden)
    .length,
);
assert.ok(
  catalog.every(
    (color) => !color.error && !color.hidden && color.name !== color.id,
  ),
);
const palette = catalog.find((color) => color.origin.kind === "palette")!;
const categorical = catalog.find(
  (color) => color.origin.kind === "categorical",
)!;
const ui = catalog.find((color) => color.origin.kind === "ui-swatch")!;
const manualCss = "color(display-p3 0.12 0.23 0.34 / 0.45)";
const manualOutput = serializeOutputColor(
  new Color(manualCss),
  initial.colorSystem.settings.colorOutput,
);
assert.throws(() => linkedPrimitiveColor("missing", catalog), /unavailable/);
assert.throws(
  () => linkedPrimitiveColor(ui.id, [{ ...ui, hidden: true }]),
  /unavailable/,
);
assert.throws(
  () => linkedPrimitiveColor(ui.id, [{ ...ui, error: "invalid source" }]),
  /invalid source/,
);
assert.ok(
  publishedPrimitiveColors(initial.colorSystem, [], []).every(
    (color) => color.error,
  ),
  "Missing values stay explicit failures.",
);
const modeKey = store.get(browserModeContextAtom).key;
store.set(editBrowserTokensAtom, {
  ids: [ui.id],
  modeKey,
  patch: { value: manualCss },
});
for (const source of [palette, ui, categorical]) {
  store.set(editDataVisPointAtom, {
    scaleId: DATA_VIS_IDS.sequential,
    pointId: "named",
    source: { kind: "primitive-token", tokenId: source.id },
    scope: "base",
  });
  assert.equal(
    compiled(store).points.find((point) => point.id === "named")!.value,
    member(store, source.id).value,
  );
}
store.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: ui.id },
  scope: "base",
});
assert.equal(
  compiled(store).points.find((point) => point.id === "named")!.value,
  manualOutput,
);
store.set(previewOverridesAtom, { "color.contrastMultiplier": 2 });
assert.equal(
  compiled(store).points.find((point) => point.id === "named")!.value,
  member(store, ui.id).value,
  "Exact native links are not contrast-adjusted a second time.",
);
assert.notEqual(
  compiled(store).points[0].value,
  compiled(fresh()).points[0].value,
  "Owned sources remain contrast-adaptive.",
);
store.set(previewOverridesAtom, {});
store.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: palette.id },
  scope: "base",
});
const paletteBeforeDelete = captureSnapshot(store.get);
assert.throws(
  () =>
    store.set(
      removePaletteColorAtom,
      palette.origin.kind === "palette" ? palette.origin.paletteColorId : "",
    ),
  /replacement/,
);
assert.deepEqual(captureSnapshot(store.get), paletteBeforeDelete);
store.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: ui.id },
  scope: "base",
});
assert.throws(
  () =>
    store.set(updateColorScalePublishingAtom, {
      scaleId: ui.origin.kind === "ui-swatch" ? ui.origin.scaleId : "",
      hideFromPublishing: true,
    }),
  /replacement/,
);
store.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  from: "current",
});
assert.equal(
  compiled(store).points.find((point) => point.id === "named")!.value,
  manualOutput,
);
select(store, "colorScheme", "dark");
assert.equal(
  compiled(store).points.find((point) => point.id === "named")!.value,
  manualOutput,
  "Capturing an exact source preserves its emitted value and alpha in other modes.",
);

for (const id of [
  DATA_VIS_IDS.sequential,
  DATA_VIS_IDS.diverging,
  DATA_VIS_IDS.categorical,
]) {
  const fixture = fresh(),
    adaptive = structuredClone(definition(fixture, id));
  const modesBefore = structuredClone(fixture.get(modeSetsAtom));
  const undo = fixture.set(setDataVisStaticAtom, {
    scaleId: id,
    from: "current",
  });
  const frozen = structuredClone(definition(fixture, id).staticColors);
  assert.ok(frozen);
  assert.deepEqual(fixture.get(modeSetsAtom), modesBefore);
  select(fixture, "colorScheme", "dark");
  select(fixture, "contrast", "high");
  fixture.set(previewOverridesAtom, { "color.contrastMultiplier": 1.37 });
  if (id === DATA_VIS_IDS.categorical) {
    const scale = definition(fixture, id);
    assert.ok(scale.kind === "categorical");
    for (const color of frozen)
      assert.equal(
        member(fixture, dataVisMemberId(id, color.id)).value,
        color.value,
      );
    assert.equal(
      staticCategoricalTokenIds(fixture.get(colorSystemDocumentAtom)).size,
      scale.members.length,
    );
  } else {
    for (const color of frozen)
      assert.equal(
        compiled(fixture, id).points.find((point) => point.id === color.id)!
          .value,
        color.value,
      );
    const beforeSamples = samples(fixture, id);
    fixture.set(previewOverridesAtom, { "color.contrastMultiplier": 0.5 });
    assert.deepEqual(
      samples(fixture, id),
      beforeSamples,
      "Static interpolation is independent of contrast.",
    );
  }
  fixture.set(undoDataVisStaticAtom, undo);
  assert.deepEqual(definition(fixture, id), adaptive);
  assert.equal(
    fixture.get(previewOverridesAtom)["color.contrastMultiplier"],
    id === DATA_VIS_IDS.categorical ? 1.37 : 0.5,
    "Restoring Adaptive colors does not rewind global previews.",
  );
  assert.throws(() => fixture.set(undoDataVisStaticAtom, undo), /later edit/);
  fixture.set(previewOverridesAtom, {});
  assertStoredSnapshot(captureSnapshot(fixture.get));
}

const fromDefault = fresh(),
  defaultValues = samples(fromDefault, DATA_VIS_IDS.diverging);
select(fromDefault, "colorScheme", "dark");
select(fromDefault, "contrast", "high");
fromDefault.set(previewOverridesAtom, { "color.contrastMultiplier": 1.6 });
assert.notDeepEqual(
  samples(fromDefault, DATA_VIS_IDS.diverging),
  defaultValues,
);
const selectionBefore = structuredClone(fromDefault.get(modeSelectionAtom));
fromDefault.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.diverging,
  from: "default",
});
assert.deepEqual(samples(fromDefault, DATA_VIS_IDS.diverging), defaultValues);
assert.deepEqual(fromDefault.get(modeSelectionAtom), selectionBefore);
assert.equal(
  fromDefault.get(previewOverridesAtom)["color.contrastMultiplier"],
  1.6,
);
const currentPreview = fresh();
currentPreview.set(previewOverridesAtom, { "color.contrastMultiplier": 1.6 });
const previewColors = samples(currentPreview);
currentPreview.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  from: "current",
});
assert.deepEqual(samples(currentPreview), previewColors);
const stale = fresh(),
  fingerprint = stale.get(dataVisContextFingerprintAtom);
select(stale, "colorScheme", "dark");
const beforeStale = captureSnapshot(stale.get);
assert.throws(
  () =>
    stale.set(setDataVisStaticAtom, {
      scaleId: DATA_VIS_IDS.sequential,
      from: "current",
      fingerprint,
    }),
  /displayed colors changed/,
);
assert.deepEqual(captureSnapshot(stale.get), beforeStale);
assert.throws(
  () => stale.set(setDataVisStaticAtom, { scaleId: DATA_VIS_IDS.sequential }),
  /Choose current/,
);
stale.set(editModeAtom, false);
assert.throws(
  () =>
    stale.set(setDataVisStaticAtom, {
      scaleId: DATA_VIS_IDS.sequential,
      from: "current",
    }),
  /edit mode/,
);

const modeLinks = fresh();
select(modeLinks, "colorScheme", "dark");
modeLinks.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: palette.id },
  scope: "mode",
});
assert.equal(
  compiled(modeLinks).points.find((point) => point.id === "named")!.value,
  member(modeLinks, palette.id).value,
  "Historical exact UI links can select every published primitive in a mode.",
);
const beforeModeSourceRemoval = captureSnapshot(modeLinks.get);
assert.throws(
  () =>
    modeLinks.set(
      removePaletteColorAtom,
      palette.origin.kind === "palette" ? palette.origin.paletteColorId : "",
    ),
  /replacement/,
);
assert.deepEqual(captureSnapshot(modeLinks.get), beforeModeSourceRemoval);
const modesWithLink = structuredClone(modeLinks.get(modeSetsAtom));
modeLinks.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  from: "current",
});
modeLinks.set(setDataVisStaticAtom, { scaleId: DATA_VIS_IDS.sequential });
assert.deepEqual(modeLinks.get(modeSetsAtom), modesWithLink);
modeLinks.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: categorical.id },
  scope: "base",
});
assert.equal(
  compiled(modeLinks).points.find((point) => point.id === "named")!.value,
  member(modeLinks, palette.id).value,
  "Changing the shared exact-source representation preserves authored mode links.",
);
modeLinks.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  reset: "source",
  scope: "mode",
});
assert.equal(
  compiled(modeLinks).points.find((point) => point.id === "named")!.value,
  member(modeLinks, categorical.id).value,
);
assertStoredSnapshot(captureSnapshot(modeLinks.get));

const legacyLinks = fresh(),
  legacyScale = definition(legacyLinks);
assert.ok(legacyScale.kind !== "categorical");
const legacyPoint = legacyScale.points.find((point) => point.id === "named")!;
assert.ok(legacyPoint.source.kind === "ui-swatch");
const legacySource = legacyPoint.source;
assert.throws(
  () =>
    applyDataVisPointPatch(legacyPoint, {
      tokenId: palette.id,
      scaleId: legacySource.scaleId,
    }),
  /one exact token source/,
);
select(legacyLinks, "colorScheme", "dark");
const legacySwatch = legacyLinks
  .get(dataVisUiSwatchesAtom)
  .find((swatch) => swatch.source.scaleId !== legacySource.scaleId)!;
legacyLinks.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: legacySwatch.source,
  scope: "mode",
});
const legacyModeColor = compiled(legacyLinks).points.find(
  (point) => point.id === "named",
)!.value;
legacyLinks.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: palette.id },
  scope: "base",
});
assert.equal(
  compiled(legacyLinks).points.find((point) => point.id === "named")!.value,
  legacyModeColor,
  "Legacy scale/contrast patches keep their exact mode values when the shared source becomes a native token.",
);
assertStoredSnapshot(captureSnapshot(legacyLinks.get));

const stops = fresh(),
  recipeBefore = structuredClone(definition(stops));
stops.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  from: "current",
});
const added = stops.set(editDataVisStaticStopsAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  kind: "add",
  position: 0.25,
});
stops.set(editDataVisStaticColorAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  colorId: added.selectedId,
  position: 0.3,
});
stops.set(editDataVisStaticColorAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  colorId: added.selectedId,
  tokenId: palette.id,
});
const captured = definition(stops).staticColors!.find(
  (color) => color.id === added.selectedId,
)!;
assert.equal(captured.tokenId, palette.id);
const capturedValue = captured.value;
stops.set(editBrowserTokensAtom, {
  ids: [palette.id],
  modeKey: stops.get(browserModeContextAtom).key,
  patch: { value: "#abcdef" },
});
assert.equal(
  compiled(stops).points.find((point) => point.id === added.selectedId)!.value,
  capturedValue,
  "Static token selection captures a value, not a live link.",
);
stops.set(editDataVisStaticColorAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  colorId: added.selectedId,
  value: "color(display-p3 0.1 0.2 0.3 / 0.4)",
});
assert.equal(
  definition(stops).staticColors!.find(
    (color) => color.id === added.selectedId,
  )!.value,
  "color(display-p3 0.1 0.2 0.3 / 0.4)",
);
assert.equal(
  compiled(stops).points.find((point) => point.id === added.selectedId)!.value,
  serializeOutputColor(
    new Color("color(display-p3 0.1 0.2 0.3 / 0.4)"),
    initial.colorSystem.settings.colorOutput,
  ),
);
assert.throws(
  () =>
    stops.set(editDataVisStaticColorAtom, {
      scaleId: DATA_VIS_IDS.sequential,
      colorId: "start",
      position: 0.1,
    }),
  /endpoints/,
);
assert.throws(
  () =>
    stops.set(editDataVisStaticStopsAtom, {
      scaleId: DATA_VIS_IDS.sequential,
      kind: "remove",
      colorId: "start",
    }),
  /endpoints/,
);
assert.throws(
  () =>
    stops.set(editDataVisPointAtom, {
      scaleId: DATA_VIS_IDS.sequential,
      pointId: "start",
      contrast: { value: 5 },
    }),
  /Static/,
);
assert.throws(
  () =>
    stops.set(editDataVisStructureAtom, {
      scaleId: DATA_VIS_IDS.sequential,
      kind: "add-point",
    }),
  /Static/,
);
stops.set(setDataVisStaticAtom, { scaleId: DATA_VIS_IDS.sequential });
assert.deepEqual(
  definition(stops),
  recipeBefore,
  "Static stop edits do not replace the retained Adaptive recipe.",
);

const categories = fresh(),
  memberId = dataVisMemberId(DATA_VIS_IDS.categorical, "blue-member");
select(categories, "colorScheme", "dark");
categories.set(editBrowserTokensAtom, {
  ids: [memberId],
  modeKey: categories.get(browserModeContextAtom).key,
  patch: { value: "#123456" },
});
const dormantEdits = structuredClone(categories.get(browserTokenEditsAtom));
categories.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.categorical,
  from: "current",
});
const sharedBase = String(member(categories, memberId).value);
assert.equal(sharedBase, "#123456");
categories.set(editBrowserTokensAtom, {
  ids: [memberId],
  modeKey: categories.get(browserModeContextAtom).key,
  patch: { value: "#654321", description: "Shared chart color" },
});
assert.equal(member(categories, memberId).value, "#654321");
assert.equal(member(categories, memberId).valueOverridden, true);
assert.equal(member(categories, memberId).generatedValue, sharedBase);
assert.deepEqual(
  categories.get(browserTokenEditsAtom)[memberId].values,
  dormantEdits[memberId].values,
);
select(categories, "colorScheme", "light");
select(categories, "contrast", "high");
assert.equal(
  member(categories, memberId).value,
  "#654321",
  "Static Tokens edits apply in all modes.",
);
assert.equal(
  categories
    .get(primitiveReferencesAtom)
    .find((reference) => reference.id === memberId)!.value,
  "#654321",
);
const memberRows = canonicalAliasRows(
  completeAliasSource(captureSnapshot(categories.get)),
).filter((row) => row.id === memberId);
assert.equal(memberRows.length, 1);
assert.equal(memberRows[0].context, "[]");
const cascade = buildCascadeTokenExport({
  base: categories.get(colorSystemDocumentAtom),
  modeSets: categories.get(modeSetsAtom),
  activeModes: [],
  activeTokens: [],
  overrides: {},
  browserEdits: categories.get(browserTokenEditsAtom),
  taxonomy: captureSnapshot(categories.get).taxonomy,
  rules: captureSnapshot(categories.get).rules,
});
assert.equal(
  cascade.tokens.filter((token) => token.uuid === memberId).length,
  1,
);
assert.equal(
  cascade.tokens.find((token) => token.uuid === memberId)!.value,
  "#654321",
);
assert.match(
  buildDataVisCategoricalCss(
    completeAliasSource(captureSnapshot(categories.get)),
  ),
  /#654321/,
);
categories.set(resetBrowserTokenAtom, memberId);
assert.equal(member(categories, memberId).value, sharedBase);
assert.deepEqual(
  categories.get(browserTokenEditsAtom)[memberId].values,
  dormantEdits[memberId].values,
);
categories.set(editBrowserTokensAtom, {
  ids: [memberId],
  modeKey: categories.get(browserModeContextAtom).key,
  patch: { value: "#654321", description: "Shared chart color" },
});
categories.set(saveEditAtom);
assertStoredSnapshot(captureSnapshot(categories.get));
const saved = structuredClone(categories.get(editSessionSnapshotAtom));
const impact = categories
  .get(browserTokenImpactRecordsAtom)
  .filter((record) => record.tokenId === memberId);
assert.equal(impact.length, 1);
assert.equal(impact[0].modeValues.length, 1);
categories.set(enterEditModeAtom);
categories.set(editDataVisStaticColorAtom, {
  scaleId: DATA_VIS_IDS.categorical,
  colorId: "blue-member",
  value: "#aabbcc",
});
categories.set(cancelEditAtom);
assert.deepEqual(categories.get(editSessionSnapshotAtom), saved);
categories.set(enterEditModeAtom);
categories.set(setDataVisStaticAtom, { scaleId: DATA_VIS_IDS.categorical });
select(categories, "colorScheme", "dark");
categories.set(modeSelectionAtom, {
  colorScheme: categories.get(modeSelectionAtom).colorScheme,
});
assert.equal(
  member(categories, memberId).value,
  "#123456",
  "Adaptive member overrides resume after turning off Static.",
);
assert.equal(
  categories.get(browserTokenEditsAtom)[memberId].description,
  "Shared chart color",
);

const changes = fresh();
changes.set(editBrowserTokensAtom, {
  ids: [memberId],
  modeKey: changes.get(browserModeContextAtom).key,
  patch: { value: "#102030" },
});
const previousValues = structuredClone(
  changes.get(browserTokenEditsAtom)[memberId].values,
);
changes.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.categorical,
  from: "current",
});
changes.set(editBrowserTokensAtom, {
  ids: [memberId, ui.id],
  modeKey: changes.get(browserModeContextAtom).key,
  patch: { value: "#506070", description: "Chart note" },
});
assert.equal(member(changes, memberId).value, "#506070");
assert.equal(member(changes, ui.id).value, "#506070");
const analysis = changes.get(analysisWorkingInputAtom);
assert.deepEqual(analysis.errors, []);
const sharedAssignments = analysis.outputMetadata!.assignments.filter(
  (assignment) => assignment.pointer.includes("staticColors"),
);
assert.equal(sharedAssignments.length, 1);
assert.deepEqual(sharedAssignments[0].selection, {});
assert.equal(
  analysis.outputMetadata!.assignments.some((assignment) =>
    assignment.pointer.includes(memberId),
  ),
  false,
  "Dormant Adaptive values remain in authoring data, not in the active assignment inventory.",
);
const sharedObservation = analysis.outputMetadata!.observations.find(
  (observation) => observation.recordId === `tokens:${memberId}`,
);
assert.deepEqual(sharedObservation?.assignmentIds, [sharedAssignments[0].id]);
assert.equal(
  analysis.records.find((record) => record.id === `tokens:${memberId}`)
    ?.overrides?.generatedValue,
  "#102030",
);
const beforeInvalidBulk = captureSnapshot(changes.get);
assert.throws(
  () =>
    changes.set(editBrowserTokensAtom, {
      ids: [memberId, palette.id],
      modeKey: changes.get(browserModeContextAtom).key,
      patch: { value: "#abcdef" },
    }),
  /Palette colors need distinct/,
);
assert.deepEqual(captureSnapshot(changes.get), beforeInvalidBulk);
const changedItems = changes
  .get(changeGroupsAtom)
  .find((group) => group.id === "tokens")!.items;
const sharedItem = changedItems.find((item) =>
  item.fields.some((field) => field.key === "Value (all modes)"),
);
assert.ok(sharedItem);
assert.equal(
  sharedItem.fields.filter((field) => field.key === "Value (all modes)").length,
  1,
);
assert.equal(
  sharedItem.fields.some(
    (field) =>
      field.key.startsWith("Value (") && field.key !== "Value (all modes)",
  ),
  false,
);
changes.set(revertChangeItemAtom, sharedItem);
assert.equal(member(changes, memberId).value, "#102030");
assert.equal(
  changes.get(browserTokenEditsAtom)[memberId].description,
  undefined,
);
assert.deepEqual(
  changes.get(browserTokenEditsAtom)[memberId].values,
  previousValues,
);
changes.set(editBrowserTokensAtom, {
  ids: [memberId],
  modeKey: changes.get(browserModeContextAtom).key,
  patch: { value: "#506070" },
});
changes.set(revertChangeTopicAtom, "tokens");
assert.equal(member(changes, memberId).value, "#102030");
assert.deepEqual(
  changes.get(browserTokenEditsAtom)[memberId].values,
  previousValues,
);

const aliases = fresh();
const aliasContexts = canonicalAliasRows(
  completeAliasSource(captureSnapshot(aliases.get)),
)
  .filter((row) => row.id === memberId)
  .map((row) => row.context);
aliases.set(aliasesAtom, {
  schemaVersion: 1,
  tokens: [
    {
      id: tokenUuid("static-compatible-alias"),
      name: "old-chart-color",
      $ref: memberId,
      contexts: aliasContexts,
    },
  ],
});
const originalAliases = structuredClone(aliases.get(aliasesAtom));
aliases.set(setDataVisStaticAtom, {
  scaleId: DATA_VIS_IDS.categorical,
  from: "current",
});
assertStoredSnapshot(captureSnapshot(aliases.get));
assert.ok(
  aliases
    .get(browserTokensAtom)
    .some((token) => token.alias?.name === "old-chart-color"),
);
const aliasRows = canonicalAliasRows(
  completeAliasSource(captureSnapshot(aliases.get)),
);
assert.equal(aliasRows.filter((row) => row.id === memberId).length, 1);
assert.ok(
  aliasReferencePacket(originalAliases, aliasRows).every(
    (row) => row.$ref === aliasRows.find((row) => row.id === memberId)!.rowId,
  ),
);
assert.equal(
  aliasTargetsForContext(
    aliasRows,
    memberId,
    JSON.stringify([["removed-axis", "missing-mode"]]),
  ).length,
  0,
);
aliases.set(saveEditAtom);
assert.deepEqual(
  aliases.get(aliasesAtom),
  originalAliases,
  "Saving Static colors preserves mode-scoped aliases.",
);
aliases.set(enterEditModeAtom);
aliases.set(setDataVisStaticAtom, { scaleId: DATA_VIS_IDS.categorical });
assertStoredSnapshot(captureSnapshot(aliases.get));
assert.deepEqual(aliases.get(aliasesAtom), originalAliases);

const guard = fresh(),
  guardUndo = guard.set(setDataVisStaticAtom, {
    scaleId: DATA_VIS_IDS.sequential,
    from: "current",
  });
guard.set(editDataVisStaticColorAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  colorId: "start",
  value: "#334455",
});
const beforeConflict = captureSnapshot(guard.get);
assert.throws(() => guard.set(undoDataVisStaticAtom, guardUndo), /later edit/);
assert.deepEqual(captureSnapshot(guard.get), beforeConflict);
const sourceGuard = fresh();
sourceGuard.set(editDataVisPointAtom, {
  scaleId: DATA_VIS_IDS.sequential,
  pointId: "named",
  source: { kind: "primitive-token", tokenId: categorical.id },
  scope: "base",
});
const categoryDefinition = definition(sourceGuard, DATA_VIS_IDS.categorical);
assert.ok(categoryDefinition.kind === "categorical");
const beforeMemberRemoval = captureSnapshot(sourceGuard.get);
assert.throws(
  () =>
    sourceGuard.set(applyCategoricalDataVisAtom, {
      scale: {
        ...categoryDefinition,
        members: categoryDefinition.members.slice(1),
      },
      fingerprint: sourceGuard.get(dataVisContextFingerprintAtom),
      acknowledgeFailures: true,
    }),
  /replacement/,
);
assert.deepEqual(captureSnapshot(sourceGuard.get), beforeMemberRemoval);
assert.ok(
  colorFoundationParameters(categories.get(colorSystemDocumentAtom)).some(
    (parameter) => parameter.id.endsWith("/static"),
  ),
);
assert.throws(
  () =>
    editStaticMemberOverrides(
      initial.colorSystem,
      new Map([["missing", "#123456"]]),
    ),
  /unavailable/,
);
assert.equal(
  frozenColorValue({ id: "one", value: "#123456", overrideValue: "#654321" }),
  "#654321",
);

for (const native of [palette, ui, categorical]) {
  const runtimeStore = fresh();
  runtimeStore.set(editDataVisPointAtom, {
    scaleId: DATA_VIS_IDS.sequential,
    pointId: "named",
    source: { kind: "primitive-token", tokenId: native.id },
    scope: "base",
  });
  const packet = buildDataVisSourcePacket(captureSnapshot(runtimeStore.get));
  assert.equal(packet.schemaVersion, 3);
  const engine = createDataVisRuntime(packet);
  assert.deepEqual(
    [0, 0.17, 0.5, 0.81, 1].map(engine.continuous(DATA_VIS_IDS.sequential)),
    samples(runtimeStore),
  );
  runtimeStore.set(setDataVisStaticAtom, {
    scaleId: DATA_VIS_IDS.sequential,
    from: "current",
  });
  const frozenPacket = buildDataVisSourcePacket(
    captureSnapshot(runtimeStore.get),
  );
  assert.deepEqual(
    [0, 0.17, 0.5, 0.81, 1].map(
      createDataVisRuntime(frozenPacket).continuous(DATA_VIS_IDS.sequential),
    ),
    samples(runtimeStore),
  );
}
const legacyPacket = buildDataVisSourcePacket(initial);
const v1 = {
  ...legacyPacket,
  schemaVersion: 1,
  color: {
    ...legacyPacket.color,
    schemaVersion: 3,
    settings: { ...oldSettings, outputGamut: "srgb" },
  },
};
assert.deepEqual(
  [0, 0.5, 1].map(createDataVisRuntime(v1).continuous(DATA_VIS_IDS.sequential)),
  [0, 0.5, 1].map((position) => compiled(fresh()).evaluate(position)),
);
assert.throws(
  () =>
    createDataVisRuntime({
      ...v1,
      color: {
        ...v1.color,
        dataVisScales: [
          {
            ...v1.color.dataVisScales[0],
            staticColors: [{ id: "a", value: "#123456", position: 0 }],
          },
        ],
      },
    }),
  /unmodified version-one packet/,
);

assert.equal(gradientPointerPosition(160, 100, 200), 0.3);
assert.equal(gradientPointerPosition(-1, 100, 200, 0.2, 0.8), 0.2);
assert.equal(gradientPointerPosition(500, 100, 200, 0.2, 0.8), 0.8);
for (const args of [
  [0, 0, 0],
  [NaN, 0, 100],
  [0, 0, 100, 1, 0],
])
  assert.throws(
    () => gradientPointerPosition(args[0], args[1], args[2], args[3], args[4]),
    /valid bounds/,
  );
const positions = [
  { id: "start", position: 0 },
  { id: "middle", position: 0.5 },
  { id: "end", position: 1 },
];
assert.equal(
  continuousStopBounds(positions, "start", "sequential").fixed,
  true,
);
assert.equal(
  continuousStopBounds(positions, "middle", "diverging").fixed,
  true,
);
assert.deepEqual(continuousStopBounds(positions, "middle", "sequential"), {
  fixed: false,
  minimum: 0.00000001,
  maximum: 0.99999999,
});
assert.throws(
  () => continuousStopBounds(positions, "missing", "sequential"),
  /unavailable/,
);
console.log(
  "Data vis editors: native primitive links, Static lifecycle, dormant edits, shared Tokens, aliases, accounting, migrations, source guards, adapter parity and gradient bounds passed.",
);
