// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  restoreAuthoringSnapshotAtom,
  captureSnapshot,
} from "../src/features/edit-session/state";
import {
  canonicalAliasRows,
  canonicalAliasSourceTargets,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import {
  buildCascadeTokenExport,
  buildCascadeTokenInventory,
} from "../src/features/tokens/cascadeExport";
import {
  tokenStableKey,
  tokenUuid,
  resolveToken,
} from "../src/features/tokens/model";
import { generateDocumentTokens } from "../src/features/changelog/changes";
import { resolveBrowserColorToken } from "../src/features/tokens/colorResolution";
import {
  componentTokenCatalog,
  assertComponentReferences,
} from "../src/features/components/references";
import { ColorOutputError } from "../src/features/color-system/outputContrast";
import { paletteChannelsFromCss } from "../src/features/color-system/palette";
import {
  DEFAULT_COLOR_OUTPUT,
  type ColorOutputSettings,
} from "../src/features/color-system/outputSettings";
import { serializeOutputColor } from "../src/features/color-system/outputSerialization";
import { buildDataVisSourcePacket } from "../src/features/color-system/data-vis/export";
import { upgradeDataVisPacket } from "../src/features/color-system/data-vis/packetValidation";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import Color from "colorjs.io";
import { createColorInputDefaults } from "../src/data/defaults";
import { hydrateColorSystem } from "../src/features/color-system/model";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { ColorOutputBoundary } from "../src/components/ColorOutputBoundary";
import {
  changeGroupsResultAtom,
  revertBlockedColorValueAtom,
} from "../src/features/changelog/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  savedBrowserConceptIdsAtom,
  savedBrowserTokensAtom,
} from "../src/features/tokens/browserSavedState";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { generateElevation } from "../src/features/elevation/generate";
import { buildShadowArtifacts } from "../src/features/design-data/shadowArtifacts";
import { dataVisContextFingerprintAtom } from "../src/features/color-system/data-vis/state";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";

const baseline = createDefaultSnapshot(),
  source = completeAliasSource(baseline);
const hydrated = hydrateColorSystem(createColorInputDefaults());
assert.doesNotThrow(
  () => buildColorLibrary(hydrated),
  "Name-based input defaults must not retain stale source UUIDs when rehydrated.",
);
assert.doesNotThrow(() =>
  buildColorLibrary({
    ...hydrated,
    backgroundLightness: 1,
    settings: { ...hydrated.settings, side: "light" },
  }),
);
const feasible = structuredClone(baseline.colorSystem);
feasible.contrasts = feasible.contrasts.map((step) => ({
  ...step,
  value: Math.min(3, step.value),
}));
for (const scale of feasible.scales)
  if (scale.customContrasts) {
    scale.customContrasts.steps = scale.customContrasts.steps.map((step) => ({
      ...step,
      value: Math.min(3, step.value),
    }));
  }
const midMode = {
  key: "mid",
  isDefault: false,
  document: { ...feasible, backgroundLightness: 0.6 },
};
assert.doesNotThrow(() => buildColorLibrary(feasible, [midMode]));
const highTargets = structuredClone(feasible);
highTargets.scales[0].customContrasts!.steps[0].value = 7;
assert.doesNotThrow(() => buildColorLibrary(highTargets));
assert.doesNotThrow(
  () =>
    buildColorLibrary(feasible, [midMode], [], [], undefined, RULE_DEFAULTS, [
      { selector: '[data-contrast="high"]', document: highTargets },
    ]),
  "Individually feasible background and target owners must resolve to closest achievable contrast in their declared combined context.",
);
const failure = new ColorOutputError({
  requestedContrast: 3,
  achievableContrast: 1,
  gamut: "srgb",
  background: "#fff",
  source: "Example",
});
assert.deepEqual(ColorOutputBoundary.getDerivedStateFromError(failure), {
  error: failure,
});
assert.throws(
  () =>
    ColorOutputBoundary.getDerivedStateFromError(
      new Error("Unrelated render failure"),
    ),
  /Unrelated/,
);
assert.equal(
  ColorOutputBoundary.getDerivedStateFromProps(
    { revision: [baseline] },
    { revision: [baseline] },
  ),
  null,
);
assert.deepEqual(
  ColorOutputBoundary.getDerivedStateFromProps(
    { revision: [1] },
    { revision: [2] },
  ),
  { error: null, revision: [1] },
);
const emitted = canonicalAliasRows(source).map(
  ({ id, name, context, compatibleModes }) => ({
    id,
    name,
    context,
    ...(compatibleModes && { compatibleModes }),
  }),
);
const inventory = canonicalAliasSourceTargets(source).map(
  ({ id, name, context, compatibleModes }) => ({
    id,
    name,
    context,
    ...(compatibleModes && { compatibleModes }),
  }),
);
const sorted = (rows: typeof emitted) =>
  [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
assert.deepEqual(
  sorted(inventory),
  sorted(emitted),
  "Source-only validation must preserve the existing alias inventory exactly.",
);

const document = baseline.colorSystem,
  token = generateDocumentTokens(document, RULE_DEFAULTS)[0];
const manual = {
  ...resolveToken(token, undefined),
  value: "#000000",
  valueOverridden: true,
};
const formatted = {
  ...document,
  settings: {
    ...document.settings,
    colorOutput: { ...DEFAULT_COLOR_OUTPUT, outputFormat: "rgb" as const },
  },
};
assert.equal(
  resolveBrowserColorToken(manual, {}, "[]", formatted).value,
  "rgb(0, 0, 0)",
);
assert.equal(
  manual.value,
  "#000000",
  "Formatting must not replace the stored manual source.",
);
const formatSnapshot = structuredClone(baseline);
formatSnapshot.colorSystem.settings.colorOutput =
  formatted.settings.colorOutput;
formatSnapshot.tokenOverrides[token.uuid] = {
  value: "#000000",
  editedAt: "2026-01-01T00:00:00.000Z",
  baseline: { name: token.name, value: token.value },
};
const formatStore = createStore();
formatStore.set(restoreAuthoringSnapshotAtom, formatSnapshot);
assert.equal(
  formatStore.get(browserTokensAtom).find((row) => row.id === token.uuid)
    ?.value,
  "rgb(0, 0, 0)",
);
assert.ok(
  formatStore
    .get(savedBrowserTokensAtom)
    .every(
      (context) =>
        context.tokens.find((row) => row.id === token.uuid)?.value ===
        "rgb(0, 0, 0)",
    ),
);

const wide = paletteChannelsFromCss("color(rec2020 0 1 0)", {
  authoringGamut: "rec2020",
  outputFormat: "rgb",
  mapOutputsToSrgb: true,
});
assert.ok(
  wide && wide.chroma > 100,
  "Mapped output must not clip an authored Rec 2020 source to sRGB.",
);

const blocked = structuredClone(baseline);
const scale = blocked.colorSystem.scales[0],
  target = (scale.customContrasts?.steps ?? blocked.colorSystem.contrasts).find(
    (target) => target.value >= 3,
  )!;
const id = tokenUuid(tokenStableKey(scale.id, target.id));
const originalToken = generateDocumentTokens(document, RULE_DEFAULTS).find(
  (token) => token.uuid === id,
)!;
blocked.tokenOverrides[id] = {
  value: "#ffffff",
  editedAt: "2026-01-01T00:00:00.000Z",
  baseline: { name: originalToken.name, value: originalToken.value },
};
const aliasTarget = emitted.find((row) => row.id === id)!;
blocked.aliases!.tokens.push({
  id: tokenUuid("blocked-color-alias"),
  name: "Retained color reference",
  $ref: id,
  contexts: [aliasTarget.context],
});
const category = blocked.taxonomy!.categories.find(
  (category) => category.key === "property",
)!;
const property = blocked.taxonomy!.terms.find(
  (term) => term.categoryId === category.id && term.value === "color",
)!;
blocked.components!.components[0].assignments.push({
  id: tokenUuid("blocked-color-assignment"),
  property: { categoryId: category.id, termId: property.id },
  $ref: id,
});
assertStoredSnapshot(blocked);
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, blocked);
assert.ok(
  store.get(savedBrowserConceptIdsAtom).has(id),
  "A saved color concept must remain identifiable even when its output is unavailable.",
);
assert.deepEqual(
  captureSnapshot(store.get).tokenOverrides,
  blocked.tokenOverrides,
  "A failed output must not discard a saved source.",
);
const input = {
  base: blocked.colorSystem,
  modeSets: blocked.modeSets,
  activeModes: [],
  activeTokens: [],
  overrides: blocked.tokenOverrides,
  browserEdits: blocked.browserTokenEdits,
  taxonomy: blocked.taxonomy,
  rules: blocked.rules,
};
const result = buildCascadeTokenInventory(input);
assert.ok(result.blockedColors.some((row) => row.uuid === id));
assert.ok(
  !result.tokens.some((row) => row.uuid === id),
  "A failed output cannot be a success-shaped token value.",
);
assert.throws(() => buildCascadeTokenExport(input), ColorOutputError);
const catalog = componentTokenCatalog(blocked);
assert.ok(catalog.find((row) => row.id === id)?.outputError);
assert.throws(
  () =>
    assertComponentReferences(blocked.components!, blocked.taxonomy!, catalog),
  ColorOutputError,
);
const changes = store.get(changeGroupsResultAtom);
assert.equal(
  changes.status,
  "blocked",
  "Changes must report unavailable output rather than crashing edit controls or inventing zero counts.",
);
assert.ok(changes.status === "blocked" && changes.error.details.tokenId === id);
store.set(browserTokenEditsAtom, {
  [id]: { description: "Retained description", values: {} },
});
store.set(revertBlockedColorValueAtom, id);
assert.equal(captureSnapshot(store.get).tokenOverrides[id], undefined);
assert.equal(
  store.get(browserTokenEditsAtom)[id].description,
  "Retained description",
);
assert.equal(
  store.get(changeGroupsResultAtom).status,
  "ready",
  "Reverting a failed manual value must restore output and Changes.",
);
assert.doesNotThrow(
  () => store.get(browserTokensAtom),
  "A failed saved baseline must not prevent browsing recovered working output.",
);

const packet = buildDataVisSourcePacket({
  ...baseline,
  colorSystem: { ...baseline.colorSystem, dataVisScales: [] },
});
for (const schemaVersion of [1, 2])
  for (const outputGamut of ["srgb", "display-p3", "oklch"]) {
    const { colorOutput, ...settings } = packet.color.settings;
    void colorOutput;
    const legacy = {
      ...packet,
      schemaVersion,
      color: {
        ...packet.color,
        schemaVersion: schemaVersion === 1 ? 3 : 4,
        settings: { ...settings, outputGamut },
      },
    };
    const migrated = upgradeDataVisPacket(legacy);
    assert.equal(migrated.schemaVersion, 3);
    assert.deepEqual(migrated.color.surfaces, []);
    assert.deepEqual(migrated.color.palette, packet.color.palette);
    assert.throws(
      () =>
        upgradeDataVisPacket({
          ...legacy,
          color: { ...legacy.color, settings: packet.color.settings },
        }),
      /legacy.*settings/,
    );
    assert.throws(
      () =>
        upgradeDataVisPacket({
          ...legacy,
          color: {
            ...legacy.color,
            palette: [{ ...packet.color.palette[0], chroma: 125 }],
          },
        }),
      /legacy.*geometry/,
    );
    const modeGeometry = structuredClone(legacy);
    modeGeometry.modeSets[0].modes[0].foundations.color = {
      scaleStops: {
        [packet.color.scales[0].id]: {
          [packet.color.scales[0].stops[0].id]: { chroma: 125 },
        },
      },
    };
    assert.throws(
      () => upgradeDataVisPacket(modeGeometry),
      /legacy.*mode color geometry/,
    );
  }
assert.equal(
  serializeOutputColor(new Color("#000000"), DEFAULT_COLOR_OUTPUT),
  "#000000",
);
const elevation = { ...baseline.elevation!, color: "color(rec2020 0 1 0)" };
const elevationBefore = structuredClone(elevation);
const settingsCases: ColorOutputSettings[] = [
  {
    authoringGamut: "display-p3",
    outputFormat: "rgb",
    mapOutputsToSrgb: false,
  },
  { authoringGamut: "rec2020", outputFormat: "oklch", mapOutputsToSrgb: false },
  { authoringGamut: "rec2020", outputFormat: "hex", mapOutputsToSrgb: true },
];
const fingerprintStore = createStore();
fingerprintStore.set(restoreAuthoringSnapshotAtom, baseline);
const fingerprints = new Set([
  fingerprintStore.get(dataVisContextFingerprintAtom),
]);
for (const colorOutput of settingsCases) {
  const levels = generateElevation(elevation, baseline.scaleTypes, colorOutput);
  const shadows = buildShadowArtifacts({
    sourceKind: "working",
    elevation,
    taxonomy: baseline.taxonomy!,
    formulas: baseline.scaleTypes,
    modeSets: [],
    colorOutput,
  });
  assert.deepEqual(
    shadows.tokens.map((token) => token.value.map((layer) => layer.color)),
    levels.map((level) => level.shadows.map((layer) => layer.color)),
    "Pinned shadow fields use the exact native output policy.",
  );
  const current = fingerprintStore.get(colorSystemDocumentAtom);
  fingerprintStore.set(colorSystemDocumentAtom, {
    ...current,
    settings: { ...current.settings, colorOutput },
  });
  fingerprints.add(fingerprintStore.get(dataVisContextFingerprintAtom));
}
assert.equal(
  fingerprints.size,
  settingsCases.length + 1,
  "Each output policy invalidates the data vis context cache.",
);
assert.deepEqual(
  elevation,
  elevationBefore,
  "Output mapping must not overwrite the wide authored shadow color.",
);
console.log(
  "Color output ownership: manual formatting, preserved failed sources/references, blocked emission, unchanged alias inventories, wide authored geometry and strict packet upgrades passed.",
);
