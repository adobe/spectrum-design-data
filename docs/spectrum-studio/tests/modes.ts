// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import { createStore } from "jotai";
import {
  ensureModeSetKeys,
  migrateModeSets,
  MODE_SET_DEFAULTS,
  TEXT_SCALING_MODE_SET_ID,
  type Mode,
  type ModeSet,
} from "../src/features/modes/model";
import {
  ADAPTIVE_CLAIM_DEFAULTS,
  migrateAdaptiveClaims,
} from "../src/features/modes/adaptive";
import {
  CUSTOM_MODE_KEY,
  displayedModeIdsAtom,
} from "../src/features/modes/preview";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import {
  generatedTypographyAtom,
  resolveTypographyDocument,
  typographyDocumentAtom,
} from "../src/features/typography/state";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import {
  parameterOwners,
  setParameterValue,
} from "../src/features/modes/parameters";
import { resolveActiveMode } from "../src/features/modes/selection";
import {
  clearPreviewParametersAtom,
  setPreviewParameterAtom,
} from "../src/features/modes/previewState";
import {
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
  updateColorStopAtom,
  resetModeColorStopAtom,
  cssBaseDocumentAtom,
  colorSchemeDocumentsAtom,
  contrastModesAtom,
  scaleModeDocumentsAtom,
} from "../src/features/color-system/state";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { modeSetsAtom } from "../src/features/modes/state";
import {
  applyPendingModeParameterAtom,
  modeSelectionAtom,
  pendingModeParameterAtom,
  setActiveModeParameterAtom,
} from "../src/features/modes/selection";
import { applyColorStopToModeAtom } from "../src/features/color-system/state";
import { colorTokenJsonAtom } from "../src/features/tokens/state";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { resolveColorDocument as resolveFromState } from "../src/features/color-system/state";

assert.equal(
  resolveColorDocument,
  resolveFromState,
  "state and report callers share one color resolver",
);

const v1Payload = [
  {
    id: "mode-set-color-scheme",
    name: "Color scheme",
    description: "",
    modes: [
      {
        id: "mode-light",
        name: "Light",
        description: "",
        iconId: "light",
        platformIds: ["react"],
      },
      {
        id: "mode-dark",
        name: "Dark",
        description: "",
        iconId: "dark",
        platformIds: ["react"],
      },
    ],
  },
];

const migrated = migrateModeSets(v1Payload, 1);
assert.ok(migrated, "v1 payload should migrate");
assert.equal(migrated![0].key, "colorScheme");
assert.equal(migrated![0].defaultModeId, "mode-light");
assert.deepEqual(
  migrated![0].modes.map((mode) => mode.key),
  ["light", "dark"],
);
assert.deepEqual(
  migrated![0].modes.map((mode) => mode.foundations),
  [{}, { color: { backgroundLightness: 0 } }],
);
assert.equal(migrateModeSets(v1Payload, 2), null, "only v1 migrates");
const legacyDefaults = structuredClone(MODE_SET_DEFAULTS) as ModeSet[];
legacyDefaults[1].modes[0].foundations = { color: { contrastMultiplier: 1 } };
const migratedV3 = migrateModeSets(legacyDefaults, 3)!;
assert.deepEqual(
  migratedV3[1].modes[0].foundations,
  {},
  "legacy default overrides are discarded",
);
assert.deepEqual(migratedV3[0].authoringCapabilities, [
  "color.backgroundLightness",
]);
assert.deepEqual(migratedV3[1].authoringCapabilities, [
  "color.contrastMultiplier",
]);
const savedV4 = structuredClone(MODE_SET_DEFAULTS) as ModeSet[];
savedV4[0].modes[1].foundations = {};
savedV4[0].authoringCapabilities = [
  "color.backgroundLightness",
  "color.scales",
];
const migratedV4 = migrateModeSets(savedV4, 4)!;
assert.equal(migratedV4[0].modes[1].foundations.color?.backgroundLightness, 0);
assert.deepEqual(migratedV4[0].authoringCapabilities, [
  "color.backgroundLightness",
  "color.scales",
]);
savedV4[0].modes[1].foundations = { color: { backgroundLightness: 0.24 } };
assert.equal(
  migrateModeSets(savedV4, 4)![0].modes[1].foundations.color
    ?.backgroundLightness,
  0.24,
  "an authored Dark background is preserved",
);

// Duplicate names must still produce unique keys.
const duplicateKeys = ensureModeSetKeys({
  id: "set",
  key: "",
  name: "Density",
  description: "",
  defaultModeId: "missing",
  modes: [
    {
      id: "a",
      key: "",
      name: "Compact",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
    {
      id: "b",
      key: "",
      name: "Compact",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
  ],
});
assert.equal(duplicateKeys.key, "density");
assert.deepEqual(
  duplicateKeys.modes.map((mode) => mode.key),
  ["compact", "compact-2"],
);
assert.equal(
  duplicateKeys.defaultModeId,
  "a",
  "invalid default falls back to the first mode",
);

function mode(id: string, overrides?: Partial<Mode>): Mode {
  return {
    id,
    key: id,
    name: id,
    description: "",
    iconId: "none",
    platformIds: [],
    foundations: {},
    ...overrides,
  };
}

const light = mode("light");
const dark = setParameterValue(mode("dark"), "color.backgroundLightness", 0.1);
assert.deepEqual(dark.foundations.color, { backgroundLightness: 0.1 });
assert.deepEqual(
  setParameterValue(dark, "color.backgroundLightness", undefined).foundations,
  {},
  "clearing the last override removes the foundation",
);

const colorScheme: ModeSet = {
  id: "set-color-scheme",
  key: "colorScheme",
  name: "Color scheme",
  description: "",
  defaultModeId: "light",
  authoringCapabilities: ["color.backgroundLightness"],
  modes: [light, dark],
};

// Unselected sets resolve to their default, mirroring the spec's omitted-field rule.
assert.equal(resolveActiveMode(colorScheme, {})?.id, "light");
assert.equal(
  resolveActiveMode(colorScheme, { colorScheme: "dark" })?.id,
  "dark",
);
assert.equal(
  resolveActiveMode(colorScheme, { colorScheme: "removed" })?.id,
  "light",
  "stale selection falls back to default",
);

const owners = parameterOwners([colorScheme]);
assert.equal(owners["color.backgroundLightness"], "set-color-scheme");
assert.equal(
  owners["color.backgroundScaleId"],
  undefined,
  "unused parameters stay unclaimed",
);
assert.equal(
  owners["color.scales"],
  undefined,
  "color scales stay universal until claimed",
);

const contrast: ModeSet = {
  id: "set-contrast",
  key: "contrast",
  name: "Contrast",
  description: "",
  defaultModeId: "regular",
  modes: [mode("regular"), mode("high")],
};
assert.equal(
  parameterOwners([colorScheme, contrast])["color.backgroundLightness"],
  "set-color-scheme",
  "declarations determine ownership",
);

// A mode set added later inherits the base until it declares overrides.
assert.deepEqual(
  contrast.modes.map((item) => item.foundations),
  [{}, {}],
);

const store = createStore();
const baselineJson = store.get(colorTokenJsonAtom);
const baselineChanges = store.get(changeGroupsAtom);
const baselineLightness = store.get(
  resolvedColorSystemDocumentAtom,
).backgroundLightness;

store.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: baselineLightness === 0.42 ? 0.24 : 0.42,
});

assert.notEqual(
  store.get(resolvedColorSystemDocumentAtom).backgroundLightness,
  baselineLightness,
  "a preview changes the resolved document",
);
assert.notEqual(
  store.get(colorTokenJsonAtom),
  baselineJson,
  "a preview flows through to tokens",
);
assert.deepEqual(
  store.get(changeGroupsAtom),
  baselineChanges,
  "a temporary adaptive preview is not a saved change",
);

store.set(clearPreviewParametersAtom, ["color.backgroundLightness"]);
assert.equal(
  store.get(resolvedColorSystemDocumentAtom).backgroundLightness,
  baselineLightness,
  "clearing a preview restores the resolved document",
);
assert.equal(
  store.get(colorTokenJsonAtom),
  baselineJson,
  "clearing a preview restores token output",
);

const original = store.get(colorSystemDocumentAtom);
const scale = original.scales.find((item) =>
  item.stops.some((candidate) => candidate.chroma > 10),
)!;
const stop = scale.stops.find((item) => item.chroma > 10)!;
const currentStop = () =>
  store
    .get(resolvedColorSystemDocumentAtom)
    .scales.find((item) => item.id === scale.id)!
    .stops.find((item) => item.id === stop.id)!;
const baseStop = () =>
  store
    .get(colorSystemDocumentAtom)
    .scales.find((item) => item.id === scale.id)!
    .stops.find((item) => item.id === stop.id)!;
store.set(updateColorStopAtom, {
  scaleId: scale.id,
  stopId: stop.id,
  hue: stop.hue + 10,
});
assert.ok(
  Math.abs(baseStop().hue - ((stop.hue + 10) % 360)) < 1e-8,
  "unclaimed color scales edit the universal base",
);
store.set(colorSystemDocumentAtom, original);
const ownedSets = store.get(modeSetsAtom).map((set) =>
  set.key === "colorScheme"
    ? {
        ...set,
        authoringCapabilities: [
          ...(set.authoringCapabilities ?? []),
          "color.scales" as const,
        ],
      }
    : set,
);
store.set(modeSetsAtom, ownedSets);
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
store.set(updateColorStopAtom, {
  scaleId: scale.id,
  stopId: stop.id,
  hue: stop.hue + 120,
});
assert.equal(
  baseStop().hue,
  stop.hue,
  "a claimed non-default edit does not mutate the base",
);
assert.ok(Math.abs(currentStop().hue - ((stop.hue + 120) % 360)) < 1e-8);
store.set(modeSelectionAtom, { colorScheme: "mode-light" });
assert.equal(
  currentStop().hue,
  stop.hue,
  "default mode resolves the universal stop",
);
const exportedRows = JSON.parse(store.get(colorTokenJsonAtom)).tokens as {
  conceptId: string;
  name: { colorScheme?: string; property: string };
  value: string;
}[];
const defaultRows = new Map(
  exportedRows
    .filter((row) => row.name.property === "color" && !row.name.colorScheme)
    .map((row) => [row.conceptId, row.value]),
);
assert.ok(
  exportedRows.some(
    (row) =>
      row.name.property === "color" &&
      row.name.colorScheme === "dark" &&
      defaultRows.get(row.conceptId) !== row.value,
  ),
  "cascade output varies in the owned color scheme",
);
const css = buildColorLibrary(
  store.get(cssBaseDocumentAtom),
  store.get(colorSchemeDocumentsAtom),
  store.get(contrastModesAtom),
  store.get(scaleModeDocumentsAtom),
);
assert.match(
  css,
  /\[data-color-scheme="dark"\] \.color-scale-/,
  "CSS has mode-specific source anchors",
);
store.set(modeSelectionAtom, { colorScheme: "mode-dark" });
store.set(resetModeColorStopAtom, { scaleId: scale.id, stopId: stop.id });
assert.equal(currentStop().hue, stop.hue, "reset reveals the universal stop");
store.set(updateColorStopAtom, {
  scaleId: scale.id,
  stopId: stop.id,
  hue: stop.hue + 20,
  scope: "base",
});
assert.ok(
  Math.abs(baseStop().hue - ((stop.hue + 20) % 360)) < 1e-8,
  "Edit base remains universal with a non-default mode selected",
);

store.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.42,
});
const savedModeBefore = store
  .get(modeSetsAtom)
  .find((set) => set.key === "colorScheme")!
  .modes.find((item) => item.id === "mode-dark")!;
assert.equal(
  store.set(setActiveModeParameterAtom, {
    parameterId: "color.backgroundLightness",
    value: 0.33,
  }),
  "pending",
);
assert.ok(
  store.get(pendingModeParameterAtom),
  "Custom requires an explicit destination",
);
assert.deepEqual(
  store
    .get(modeSetsAtom)
    .find((set) => set.key === "colorScheme")!
    .modes.find((item) => item.id === "mode-dark"),
  savedModeBefore,
  "Custom does not silently save to the last selected mode",
);
store.set(applyPendingModeParameterAtom, { modeId: "mode-dark" });
assert.equal(
  store
    .get(modeSetsAtom)
    .find((set) => set.key === "colorScheme")!
    .modes.find((item) => item.id === "mode-dark")!.foundations.color
    ?.backgroundLightness,
  0.33,
);
assert.equal(
  store.get(resolvedColorSystemDocumentAtom).backgroundLightness,
  0.42,
  "preview remains temporary after applying to an existing mode",
);

store.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.28,
});
store.set(applyColorStopToModeAtom, {
  modeSetId: "mode-set-color-scheme",
  name: "Dusk",
  update: {
    scaleId: scale.id,
    stopId: stop.id,
    chroma: stop.chroma + 8,
  },
});
const created = store
  .get(modeSetsAtom)
  .find((set) => set.key === "colorScheme")!
  .modes.find((item) => item.name === "Dusk")!;
assert.ok(created);
assert.equal(
  created.foundations.color?.backgroundLightness,
  0.28,
  "new mode captures its own previewed parameter",
);
assert.equal(
  created.foundations.color?.scaleStops?.[scale.id]?.[stop.id]?.chroma,
  stop.chroma + 8,
);
assert.equal(
  store
    .get(resolvedColorSystemDocumentAtom)
    .scales.find((item) => item.id === scale.id)!
    .stops.find((item) => item.id === stop.id)!.chroma,
  stop.chroma + 8,
);
const modeChanges = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "modes")!;
const newModeItem = modeChanges.items.find(
  (item) =>
    item.modeSetId === "mode-set-color-scheme" && item.title.endsWith("Dusk"),
)!;
assert.ok(
  newModeItem,
  "new mode and its scale stop override appear in the change log",
);
store.set(revertChangeItemAtom, newModeItem);
assert.ok(
  !store
    .get(modeSetsAtom)
    .find((set) => set.key === "colorScheme")!
    .modes.some((item) => item.id === created.id),
  "reverting the mode item removes only that new mode",
);
assert.ok(
  Math.abs(baseStop().hue - ((stop.hue + 20) % 360)) < 1e-8,
  "reverting a mode does not change the base scale",
);

// Accessible text scaling: a default mode set owns text zoom and exposes it as an adaptive control.
const textScaling = MODE_SET_DEFAULTS.find(
  (set) => set.id === TEXT_SCALING_MODE_SET_ID,
)!;
assert.equal(
  parameterOwners([...MODE_SET_DEFAULTS])["typography.textZoom"],
  TEXT_SCALING_MODE_SET_ID,
);
assert.deepEqual(
  textScaling.modes.map((item) => [
    item.key,
    item.foundations.typography?.textZoom,
  ]),
  [
    ["default", undefined],
    ["larger", 2],
    ["largest", 4],
  ],
);
assert.deepEqual(ADAPTIVE_CLAIM_DEFAULTS, {
  "typography.textZoom": TEXT_SCALING_MODE_SET_ID,
});
const savedV5 = (structuredClone(MODE_SET_DEFAULTS) as ModeSet[]).filter(
  (set) => set.id !== TEXT_SCALING_MODE_SET_ID,
);
const upgradedV6 = migrateModeSets(savedV5, 5)!;
assert.deepEqual(
  upgradedV6.map((set) => set.key),
  ["colorScheme", "contrast", "textScaling"],
);
assert.equal(
  migrateModeSets(upgradedV6, 5)!.length,
  3,
  "never adds a second text scaling set",
);
assert.deepEqual(
  migrateAdaptiveClaims({ "color.contrastMultiplier": "mode-set-contrast" }, 1),
  {
    "typography.textZoom": TEXT_SCALING_MODE_SET_ID,
    "color.contrastMultiplier": "mode-set-contrast",
  },
);
assert.deepEqual(
  migrateAdaptiveClaims({ "typography.textZoom": "mine" }, 1),
  { "typography.textZoom": "mine" },
  "an existing claim is kept",
);

const both = setParameterValue(
  setParameterValue(mode("both"), "color.backgroundLightness", 0.2),
  "typography.textZoom",
  3,
);
assert.deepEqual(
  both.foundations,
  { color: { backgroundLightness: 0.2 }, typography: { textZoom: 3 } },
  "parameters from different foundations coexist",
);

const larger = textScaling.modes[1];
const strayZoom = {
  ...mode("stray"),
  foundations: { typography: { textZoom: 7 } },
};
const resolveSets: ModeSet[] = [
  ...MODE_SET_DEFAULTS,
  {
    id: "stray-set",
    key: "stray",
    name: "Stray",
    description: "",
    defaultModeId: "stray-default",
    modes: [mode("stray-default"), strayZoom],
  },
];
assert.equal(
  resolveTypographyDocument(TYPOGRAPHY_DEFAULTS, [larger], undefined, {
    modeSets: [...MODE_SET_DEFAULTS],
  }).textZoom,
  2,
);
assert.equal(
  resolveTypographyDocument(
    TYPOGRAPHY_DEFAULTS,
    [larger, strayZoom],
    undefined,
    { modeSets: resolveSets },
  ).textZoom,
  2,
  "only the owning set may override text zoom",
);
assert.equal(
  resolveTypographyDocument(
    TYPOGRAPHY_DEFAULTS,
    [larger],
    { "typography.textZoom": 12 },
    { modeSets: [...MODE_SET_DEFAULTS] },
  ).textZoom,
  8,
  "previews clamp to the zoom range",
);

const typeStore = createStore();
typeStore.set(modeSelectionAtom, { textScaling: "mode-text-scaling-larger" });
assert.deepEqual(
  typeStore.get(generatedTypographyAtom),
  generateTypography(TYPOGRAPHY_DEFAULTS, 2),
);
typeStore.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 4,
});
assert.equal(
  typeStore.get(displayedModeIdsAtom).textScaling,
  "mode-text-scaling-largest",
  "previewing a preset's value selects it",
);
typeStore.set(setPreviewParameterAtom, {
  parameterId: "typography.textZoom",
  value: 5,
});
assert.equal(typeStore.get(displayedModeIdsAtom).textScaling, CUSTOM_MODE_KEY);
assert.equal(
  typeStore.get(displayedModeIdsAtom).colorScheme,
  "mode-light",
  "text zoom does not affect color scheme display",
);
typeStore.set(clearPreviewParametersAtom, ["typography.textZoom"]);

typeStore.set(typographyDocumentAtom, {
  ...TYPOGRAPHY_DEFAULTS,
  componentSize: "l",
});
const typographyItem = typeStore
  .get(changeGroupsAtom)
  .find((group) => group.id === "foundations")!
  .items.find((item) => item.sourceKind === "typography")!;
assert.deepEqual(
  typographyItem.fields.map((field) => field.key),
  ["Component Size"],
);
typeStore.set(enterEditModeAtom);
typeStore.set(revertChangeItemAtom, typographyItem);
assert.deepEqual(typeStore.get(typographyDocumentAtom), TYPOGRAPHY_DEFAULTS);

console.log("modes tests passed");
