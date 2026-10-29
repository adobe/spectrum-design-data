// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import { buildShadowArtifacts } from "../src/features/design-data/shadowArtifacts";
import { upgradeOpacitySnapshot } from "../src/features/edit-session/opacityUpgrade";
import { generateElevation } from "../src/features/elevation/generate";
import {
  buildElevationCss,
  elevationOwnerIds,
} from "../src/features/elevation/output";
import { resolveElevationDocument } from "../src/features/elevation/resolution";
import { ELEVATION_FORMULAS } from "../src/features/elevation/formulas";
import {
  DEFAULT_SHADOW_OPACITY_ID,
  OPACITY_DEFAULTS,
} from "../src/features/opacity/defaults";
import {
  opacityContexts,
  resolveOpacity,
} from "../src/features/opacity/generation";
import type { OpacitySource } from "../src/features/opacity/generation";
import type { ElevationDocument } from "../src/features/elevation/model";
import { modeCombinations } from "../src/features/modes/combinations";
import {
  elevationDocumentAtom,
  addShadowLayerAtom,
  removeShadowLayerAtom,
  restoreShadowLayerAtom,
  updateShadowLayerAtom,
} from "../src/features/elevation/state";
import {
  opacityDocumentAtom,
  removeOpacityLevelAtom,
} from "../src/features/opacity/state";
import { editModeAtom } from "../src/state/view/editMode";

const system = structuredClone(designSystemDefaults.system);
const source: OpacitySource = {
  colorSystem: system.foundations.color,
  modeSets: system.modeSets,
  opacity: structuredClone(OPACITY_DEFAULTS),
  browserTokenEdits: {},
};
const document: ElevationDocument = {
  ...system.foundations.elevation,
  layers: system.foundations.elevation.layers.map((layer) => ({
    ...layer,
    opacityTokenId: DEFAULT_SHADOW_OPACITY_ID,
  })),
};
const original = structuredClone(source);
const contexts = opacityContexts(source);
assert.equal(contexts.length, 2);
for (const { modes } of contexts) {
  const resolved = resolveElevationDocument(
    document,
    modes,
    source.modeSets,
    {},
    source,
  );
  assert.equal(generateElevation(resolved)[0].shadows[0].opacity, 0.2);
}
assert.throws(() => generateElevation(document), /resolve its opacity token/);
assert.throws(
  () => resolveElevationDocument(document, [], source.modeSets),
  /opacity token is unavailable/,
);
assert.deepEqual(
  source,
  original,
  "Resolution must not mutate authored inputs.",
);

const dark = contexts.find(({ modes }) =>
  modes.some((mode) => mode.key === "dark"),
)!;
source.browserTokenEdits![DEFAULT_SHADOW_OPACITY_ID] = {
  values: { [dark.key]: { value: 0.61, baseline: 0.2 } },
};
const shadow = generateElevation(
  resolveElevationDocument(document, dark.modes, source.modeSets, {}, source),
)[0].shadows[0];
assert.equal(shadow.opacity, 0.61);
assert.equal(Number(new Color(shadow.color).alpha), 0.61);
assert.match(
  buildElevationCss(
    document,
    system.taxonomy,
    source.modeSets,
    ELEVATION_FORMULAS,
    undefined,
    source,
  ),
  /0\.61/,
);
const artifacts = buildShadowArtifacts({
  sourceKind: "working",
  elevation: document,
  taxonomy: system.taxonomy,
  formulas: ELEVATION_FORMULAS,
  modeSets: source.modeSets,
  opacitySource: source,
});
assert.ok(
  artifacts.tokens.some(
    (token) => Number(new Color(token.value[0].color).alpha) === 0.61,
  ),
);
assert.ok(
  artifacts.tokens.every(
    (token) => !JSON.stringify(token.value).includes("opacityTokenId"),
  ),
);

source.opacity!.polarityCompensation = 1;
delete source.browserTokenEdits![DEFAULT_SHADOW_OPACITY_ID];
for (const preview of [{}, { "color.backgroundLightness": 30 }]) {
  const effective = resolveOpacity(source, dark.modes, preview);
  const generated = generateElevation(
    resolveElevationDocument(
      document,
      dark.modes,
      source.modeSets,
      preview,
      source,
    ),
  );
  assert.ok(
    Math.abs(
      generated[0].shadows[0].opacity -
        effective.levels.find(
          (level) => level.id === DEFAULT_SHADOW_OPACITY_ID,
        )!.value,
    ) < 1e-14,
  );
}
assert.throws(
  () =>
    resolveElevationDocument(
      {
        ...document,
        layers: [
          { ...document.layers[0], opacityTokenId: crypto.randomUUID() },
        ],
      },
      [],
      source.modeSets,
      {},
      source,
    ),
  /unavailable/,
);
assert.equal(
  generateElevation({
    ...document,
    layers: [
      {
        ...document.layers[0],
        opacityTokenId: undefined,
        manualOpacity: 0.12345,
      },
    ],
  })[0].shadows[0].opacity,
  0.12345,
);

function legacy() {
  const modeSets = structuredClone(system.modeSets);
  const scheme = modeSets.find((set) => set.key === "colorScheme")!;
  (scheme.authoringCapabilities as string[]).push("elevation.layerOpacities");
  const layer = {
    ...document.layers[0],
    opacityTokenId: undefined,
    opacity: 20,
  };
  const layers = [
    layer,
    { ...layer, id: crypto.randomUUID(), label: "Same vector" },
    { ...layer, id: crypto.randomUUID(), label: "Different vector" },
    { ...layer, id: crypto.randomUUID(), label: "Existing level", opacity: 16 },
  ];
  scheme.modes.find((mode) => mode.key === "dark")!.foundations.elevation = {
    layerOpacities: {
      [layers[0].id]: 50,
      [layers[1].id]: 50,
      [layers[2].id]: 60,
    },
  };
  return {
    colorSystem: structuredClone(source.colorSystem),
    modeSets,
    elevation: { ...document, layers },
    browserTokenEdits: {
      unrelated: {
        name: "Keep me",
        values: { "[]": { value: 42, baseline: 41 } },
      },
    },
    sentinel: { untouched: true },
  };
}
const old = legacy();
const before = structuredClone(old);
const identities = new Map<string, string>();
const upgraded = upgradeOpacitySnapshot(old, identities);
assert.deepEqual(old, before, "Upgrade must not mutate the source snapshot.");
assert.deepEqual(upgraded.sentinel, old.sentinel);
assert.deepEqual(
  upgraded.browserTokenEdits.unrelated,
  old.browserTokenEdits.unrelated,
);
assert.equal(
  upgraded.opacity.levels.length,
  OPACITY_DEFAULTS.levels.length + 2,
);
assert.equal(
  upgraded.elevation.layers[0].opacityTokenId,
  upgraded.elevation.layers[1].opacityTokenId,
);
assert.notEqual(
  upgraded.elevation.layers[0].opacityTokenId,
  upgraded.elevation.layers[2].opacityTokenId,
);
assert.equal(
  upgraded.elevation.layers[3].opacityTokenId,
  OPACITY_DEFAULTS.levels.find((level) => level.value === 0.16)!.id,
);
for (const modes of modeCombinations(old.modeSets)) {
  const isDark = modes.some((mode) => mode.key === "dark");
  assert.deepEqual(
    generateElevation(
      resolveElevationDocument(
        upgraded.elevation,
        modes,
        upgraded.modeSets,
        {},
        upgraded,
      ),
    )[0].shadows.map((shadow) => shadow.opacity),
    isDark ? [0.5, 0.5, 0.6, 0.16] : [0.2, 0.2, 0.2, 0.16],
  );
}
assert.ok(
  upgraded.modeSets.every(
    (set) =>
      !(set.authoringCapabilities as string[]).includes(
        "elevation.layerOpacities",
      ) &&
      set.modes.every((mode) => !mode.foundations.elevation?.layerOpacities),
  ),
);
assert.deepEqual(
  upgradeOpacitySnapshot(upgraded, identities),
  upgraded,
  "Upgrade must be idempotent.",
);
const matching = {
  ...old,
  opacity: structuredClone(OPACITY_DEFAULTS),
  elevation: { ...old.elevation, layers: [old.elevation.layers[0]] },
  browserTokenEdits: {
    ...old.browserTokenEdits,
    [DEFAULT_SHADOW_OPACITY_ID]: {
      values: { [dark.key]: { value: 0.5, baseline: 0.2 } },
    },
  },
};
const matchingUpgrade = upgradeOpacitySnapshot(matching);
assert.equal(
  matchingUpgrade.opacity.levels.length,
  OPACITY_DEFAULTS.levels.length,
);
assert.equal(
  matchingUpgrade.elevation.layers[0].opacityTokenId,
  DEFAULT_SHADOW_OPACITY_ID,
);
assert.deepEqual(matchingUpgrade.browserTokenEdits, matching.browserTokenEdits);
const unrelatedMode = system.modeSets.find((set) => set.key === "contrast")!;
const unaffected = {
  ...source,
  browserTokenEdits: {
    [OPACITY_DEFAULTS.levels[0].id]: {
      values: {
        [JSON.stringify([[unrelatedMode.id, unrelatedMode.modes[1].id]])]: {
          value: 0.3,
          baseline: 0.02,
        },
      },
    },
  },
};
assert.ok(
  !elevationOwnerIds(source.modeSets, unaffected, document).has(
    unrelatedMode.id,
  ),
  "Unreferenced opacity overrides must not add shadow mode dependencies.",
);
const working = structuredClone(old);
working.modeSets
  .find((set) => set.key === "colorScheme")!
  .modes.find(
    (mode) => mode.key === "dark",
  )!.foundations.elevation!.layerOpacities![old.elevation.layers[0].id] = 70;
const upgradedWorking = upgradeOpacitySnapshot(working, identities);
assert.equal(
  upgradedWorking.elevation.layers[0].opacityTokenId,
  upgraded.elevation.layers[0].opacityTokenId,
);
assert.deepEqual(
  upgradedWorking.opacity.levels.find(
    (level) => level.id === upgradedWorking.elevation.layers[0].opacityTokenId,
  )!.rows,
  upgraded.opacity.levels.find(
    (level) => level.id === upgraded.elevation.layers[0].opacityTokenId,
  )!.rows,
);
assert.equal(
  resolveOpacity(upgradedWorking, dark.modes).levels.find(
    (level) => level.id === upgradedWorking.elevation.layers[0].opacityTokenId,
  )!.value,
  0.7,
);
assert.deepEqual(
  upgradeOpacitySnapshot({
    ...old,
    opacity: { ...OPACITY_DEFAULTS, levels: [] },
    elevation: { ...old.elevation, layers: [] },
  }).opacity.levels,
  [],
);
const store = createStore();
store.set(editModeAtom, true);
store.set(opacityDocumentAtom, structuredClone(OPACITY_DEFAULTS));
store.set(elevationDocumentAtom, document);
assert.throws(
  () => store.set(removeOpacityLevelAtom, DEFAULT_SHADOW_OPACITY_ID),
  /Choose another opacity token/,
);
const added = store.set(addShadowLayerAtom);
assert.equal(
  store.get(elevationDocumentAtom).layers.find((layer) => layer.id === added)!
    .opacityTokenId,
  DEFAULT_SHADOW_OPACITY_ID,
);
const removed = store.set(removeShadowLayerAtom, added);
store.set(restoreShadowLayerAtom, removed);
assert.equal(
  store.get(elevationDocumentAtom).layers.find((layer) => layer.id === added)!
    .opacityTokenId,
  DEFAULT_SHADOW_OPACITY_ID,
);
for (const layer of store.get(elevationDocumentAtom).layers)
  store.set(updateShadowLayerAtom, {
    id: layer.id,
    patch: { manualOpacity: 0.2 },
  });
assert.ok(
  store
    .get(elevationDocumentAtom)
    .layers.every(
      (layer) =>
        layer.manualOpacity === 0.2 &&
        layer.opacityTokenId === undefined &&
        layer.opacity === undefined,
    ),
);
store.set(removeOpacityLevelAtom, DEFAULT_SHADOW_OPACITY_ID);
assert.ok(
  !store
    .get(opacityDocumentAtom)
    .levels.some((level) => level.id === DEFAULT_SHADOW_OPACITY_ID),
);
console.log(
  "Elevation opacity references, effective overrides, literal artifacts and lossless snapshot upgrades pass.",
);
