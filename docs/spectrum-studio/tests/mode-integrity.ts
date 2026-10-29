// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  isPlatformList,
  resolvePlatforms,
} from "../src/features/platforms/model";
import { createStore } from "jotai";
import {
  MODE_SET_DEFAULTS,
  migrateModeSets,
  modeSetDefaultMode,
  type ModeSet,
} from "../src/features/modes/model";
import {
  normalizeModeState,
  normalizeModeStateAtom,
} from "../src/features/modes/integrity";
import { modeSetsAtom } from "../src/features/modes/state";
import {
  modeSelectionAtom,
  resolveActiveMode,
} from "../src/features/modes/selection";
import { adaptiveClaimsAtom } from "../src/features/modes/adaptive";
import {
  resolveColorDocument,
  colorSystemDocumentAtom,
  resolvedColorSystemDocumentAtom,
} from "../src/features/color-system/state";

// Stored v5 payload from a real session where Light/Dark stopped changing the preview.
const platformFixture = [{ id: "react", name: "React" }];
assert.ok(isPlatformList(platformFixture));
assert.ok(isPlatformList([]));
assert.equal(isPlatformList([{ id: "", name: "Empty" }]), false);
assert.equal(isPlatformList([{ id: "  ", name: "Blank" }]), false);
assert.equal(isPlatformList([...platformFixture, ...platformFixture]), false);
assert.equal(isPlatformList([{ id: "react", name: 42 }]), false);
assert.deepEqual(
  resolvePlatforms(platformFixture, ["missing", "react"]),
  platformFixture,
);

const storedV5: ModeSet[] = [
  {
    id: "mode-set-color-scheme",
    key: "colorScheme",
    name: "Color scheme",
    description: "",
    defaultModeId: "mode-light",
    iconId: "none",
    modes: [
      {
        id: "mode-light",
        key: "light",
        name: "Light",
        description: "",
        iconId: "light",
        platformIds: ["react"],
        foundations: {},
      },
      {
        id: "mode-dark",
        key: "dark",
        name: "Dark",
        description: "",
        iconId: "dark",
        platformIds: ["react"],
        foundations: {
          color: { backgroundScaleId: "scale-1", backgroundLightness: 0 },
        },
      },
    ],
  },
  {
    id: "mode-set-custom-contrast",
    key: "contrast",
    name: "Contrast",
    description: "",
    defaultModeId: "mode-regular",
    iconId: "contrast",
    modes: [
      {
        id: "mode-regular",
        key: "regular",
        name: "Regular",
        description: "",
        iconId: "none",
        platformIds: [],
        foundations: {},
      },
      {
        id: "mode-high",
        key: "high",
        name: "High",
        description: "",
        iconId: "none",
        platformIds: [],
        foundations: {},
      },
    ],
  },
];
const storedSelection = {
  colorScheme: "mode-dark",
  contrast: "mode-regular",
  textScaling: "mode-text-scaling-largest",
};
const storedClaims = { "color.backgroundLightness": "mode-set-color-scheme" };

const migrated = migrateModeSets(storedV5, 5)!;
const base = createStore().get(colorSystemDocumentAtom);
const resolve = (modeSets: ModeSet[], selection: Record<string, string>) =>
  resolveColorDocument(
    base,
    modeSets.map((modeSet) => resolveActiveMode(modeSet, selection)!),
    undefined,
    { modeSets },
  );

assert.notEqual(base.backgroundLightness, 0);
assert.equal(
  resolve(migrated, storedSelection).backgroundLightness,
  base.backgroundLightness,
  "reproduces the bug: unowned Dark overrides are ignored",
);

const normalized = normalizeModeState({
  modeSets: migrated,
  selection: storedSelection,
  claims: storedClaims,
});
const colorScheme = normalized.modeSets.find(
  (modeSet) => modeSet.key === "colorScheme",
)!;
assert.deepEqual([...colorScheme.authoringCapabilities!].sort(), [
  "color.backgroundLightness",
  "color.backgroundScaleId",
]);
assert.equal(
  resolve(normalized.modeSets, normalized.selection).backgroundLightness,
  0,
  "Dark resolves its override",
);
assert.equal(
  resolve(normalized.modeSets, {
    ...normalized.selection,
    colorScheme: "mode-light",
  }).backgroundLightness,
  base.backgroundLightness,
);
assert.deepEqual(normalized.claims, storedClaims);
assert.ok(normalized.corrections.length > 0);

// Shipped defaults are already valid, so the guard is a no-op for them.
const defaults = MODE_SET_DEFAULTS.map((modeSet) =>
  structuredClone(modeSet),
) as ModeSet[];
const clean = normalizeModeState({
  modeSets: defaults,
  selection: {},
  claims: { "typography.textZoom": "mode-set-text-scaling" },
});
assert.deepEqual(clean.corrections, []);
assert.deepEqual(clean.modeSets, defaults);

// Generic rules, using invented sets rather than shipped data.
const mode = (id: string, foundations = {}) => ({
  id,
  key: id,
  name: id,
  description: "",
  iconId: "none" as const,
  platformIds: [],
  foundations,
});
const first: ModeSet = {
  id: "a",
  key: "a",
  name: "A",
  description: "",
  defaultModeId: "a0",
  authoringCapabilities: ["color.contrastMultiplier"],
  modes: [mode("a0"), mode("a1", { color: { contrastMultiplier: 2 } })],
};
const second: ModeSet = {
  id: "b",
  key: "b",
  name: "B",
  description: "",
  defaultModeId: "b0",
  authoringCapabilities: ["color.contrastMultiplier"],
  modes: [mode("b0"), mode("b1", { typography: { textZoom: 3 } })],
};
const result = normalizeModeState({
  modeSets: [first, second],
  selection: { a: "a1", b: "gone", missing: "x" },
  claims: {
    "color.contrastMultiplier": "b",
    "spacing.unknown": "a",
    "color.backgroundLightness": "deleted-set",
  },
});
assert.deepEqual(
  result.modeSets[0].authoringCapabilities,
  ["color.contrastMultiplier"],
  "first owner keeps a contested parameter",
);
assert.deepEqual(
  result.modeSets[1].authoringCapabilities,
  ["typography.textZoom"],
  "duplicate owner removed, override ownership granted",
);
assert.deepEqual(
  result.selection,
  { a: "a1" },
  "stale selections clear so the set falls back to its default",
);
assert.deepEqual(
  result.claims,
  {},
  "claims for other owners, unknown parameters, or deleted sets are dropped",
);
assert.deepEqual(
  normalizeModeState(result).corrections,
  [],
  "normalization is idempotent",
);

const claimOnly = normalizeModeState({
  modeSets: [{ ...first, authoringCapabilities: [], modes: [mode("a0")] }],
  selection: {},
  claims: { "typography.textZoom": "a" },
});
assert.deepEqual(
  claimOnly.modeSets[0].authoringCapabilities,
  ["typography.textZoom"],
  "an adaptive claim implies ownership",
);

// The atom writes back corrected state and leaves valid state untouched.
const store = createStore();
store.set(modeSetsAtom, migrated);
store.set(modeSelectionAtom, storedSelection);
store.set(adaptiveClaimsAtom, storedClaims);
assert.ok(store.set(normalizeModeStateAtom).length > 0);
assert.equal(store.get(resolvedColorSystemDocumentAtom).backgroundLightness, 0);
assert.deepEqual(store.set(normalizeModeStateAtom), []);
assert.equal(modeSetDefaultMode(store.get(modeSetsAtom)[0])?.id, "mode-light");

console.log("Mode integrity checks passed.");
