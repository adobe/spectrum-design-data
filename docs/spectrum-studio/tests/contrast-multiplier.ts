// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { COLOR_SYSTEM_DEFAULTS } from "../src/features/color-system/defaults";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import {
  hydrateColorSystem,
  isColorSystemDocument,
} from "../src/features/color-system/model";
import {
  applyContrastMultiplier,
  divideContrast,
  multiplyContrast,
} from "../src/features/color-system/polarity";
import { resolveColorDocument } from "../src/features/color-system/state";
import {
  MODE_SET_DEFAULTS,
  MODE_SETS_SCHEMA_VERSION,
  migrateModeSets,
  modeSetDefaultMode,
  type ModeSet,
} from "../src/features/modes/model";
import { parameterOwners } from "../src/features/modes/parameters";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";

const near = (actual: number, expected: number, message: string) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, got ${actual}`,
  );

// Spectrum studio-style scaling of the distance from 1:1.
near(multiplyContrast(1.06, 2), 1.12, "subtle contrast doubles its distance");
near(multiplyContrast(4.5, 2), 8, "mid contrast");
assert.equal(multiplyContrast(1, 3), 1, "1:1 stays fixed");
assert.equal(multiplyContrast(15, 2), 21, "clamped to 21");
assert.equal(multiplyContrast(4.5, 0), 1, "0% collapses to 1:1");
for (const ratio of [1.06, 2.6, 7.9]) {
  assert.equal(multiplyContrast(ratio, 1), ratio, "100% is identity");
  near(
    divideContrast(multiplyContrast(ratio, 1.7), 1.7),
    ratio,
    `inverse round trip ${ratio}`,
  );
}

// Applied after polarity compensation, to contrasts and surfaces.
const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);
assert.equal(
  applyContrastMultiplier(document),
  document,
  "default multiplier is a no-op",
);
const high = {
  ...document,
  settings: {
    ...document.settings,
    contrastMultiplier: 2,
    polarityCompensation: 0.5,
  },
  backgroundLightness: 0,
};
const compensatedOnly = resolveColorDocument(high, [], undefined, {
  applyMultiplier: false,
});
const resolved = resolveColorDocument(high, []);
resolved.contrasts.forEach((contrast, index) =>
  near(
    contrast.value,
    multiplyContrast(compensatedOnly.contrasts[index].value, 2),
    "multiplier follows polarity",
  ),
);
const surface = document.surfaces.find(
  (item) => !item.base && (item.contrast ?? 1) > 1,
)!;
assert.ok(
  resolved.surfaces.find((item) => item.id === surface.id)!.contrast! >
    compensatedOnly.surfaces.find((item) => item.id === surface.id)!.contrast!,
);
assert.ok(isColorSystemDocument(document));
assert.ok(
  !isColorSystemDocument({
    ...document,
    settings: { ...document.settings, contrastMultiplier: "2" },
  }),
);

// The default Contrast mode set owns the multiplier.
const defaults = structuredClone(MODE_SET_DEFAULTS) as ModeSet[];
const contrastSet = defaults.find((modeSet) => modeSet.key === "contrast")!;
assert.deepEqual(
  contrastSet.modes.map((mode) => [
    mode.key,
    mode.foundations.color?.contrastMultiplier,
  ]),
  [
    ["regular", undefined],
    ["high", 2],
  ],
  "Regular inherits the universal 100% multiplier",
);
assert.equal(
  parameterOwners(defaults)["color.contrastMultiplier"],
  contrastSet.id,
);

// Migration adds the Contrast and text scaling sets once and keeps user sets.
assert.equal(MODE_SETS_SCHEMA_VERSION, 8);
const withoutContrast = defaults.filter(
  (modeSet) => modeSet.key !== "contrast" && modeSet.key !== "textScaling",
);
const migrated = migrateModeSets(withoutContrast, 2)!;
assert.deepEqual(
  migrated.map((modeSet) => modeSet.key),
  ["colorScheme", "contrast", "textScaling"],
);
assert.equal(
  migrateModeSets(migrated, 2)!.length,
  3,
  "never adds a second Contrast set",
);

// CSS keeps pre-multiplier variables and applies the multiplier with calc().
const css = buildColorLibrary(
  document,
  [],
  [
    { modeSetKey: "contrast", key: "regular", isDefault: true, multiplier: 1 },
    { modeSetKey: "contrast", key: "high", isDefault: false, multiplier: 2 },
  ],
);
assert.match(css, /:root \{\n {2}--contrast-multiplier: 1;/);
assert.match(
  css,
  /\[data-contrast="regular"\] \{\n {2}--contrast-multiplier: 1;/,
);
assert.match(css, /\[data-contrast="high"\] \{\n {2}--contrast-multiplier: 2;/);
assert.match(
  css,
  /@media \(prefers-contrast: more\) \{\n {2}:root:not\(\[data-contrast\]\) \{\n {4}--contrast-multiplier: 2;/,
);
assert.match(
  css,
  /--_c: min\(21, calc\(\(var\(--contrast-100\) - 1\) \* var\(--contrast-multiplier\) \+ 1\)\)/,
);
assert.match(
  css,
  /--contrast-100: 1\.06;/,
  "contrast variables stay pre-multiplier",
);

// Cascade export: explicit combination rows, default modes omitted, shared conceptIds.
const activeModes = defaults.map((modeSet) => modeSetDefaultMode(modeSet)!);
const exported = buildCascadeTokenExport({
  base: document,
  modeSets: defaults,
  activeModes,
  activeTokens: [],
  overrides: {},
});
assert.deepEqual(exported.modeSets, [
  { name: "colorScheme", modes: ["light", "dark"], default: "light" },
  { name: "contrast", modes: ["regular", "high"], default: "regular" },
]);
const colorRows = exported.tokens.filter(
  (row) => row.name.property === "color",
);
assert.equal(
  colorRows.length,
  document.scales.length * document.contrasts.length * 4 +
    document.palette.length,
  "palette colors export one row each",
);
const concept = colorRows[0].conceptId;
const rows = colorRows.filter((row) => row.conceptId === concept);
assert.deepEqual(
  rows.map(({ name }) => [name.colorScheme, name.contrast]),
  [
    [undefined, undefined],
    [undefined, "high"],
    ["dark", undefined],
    ["dark", "high"],
  ],
);
assert.equal(
  new Set(exported.tokens.map((row) => row.uuid)).size,
  exported.tokens.length,
  "row uuids are unique",
);
const ratioRows = exported.tokens.filter(
  (row) =>
    row.name.property === "contrast-ratio" && row.name.contrastValue === "400",
);
near(
  Number(
    ratioRows.find(
      (row) => row.name.contrast === "high" && !row.name.colorScheme,
    )!.value,
  ),
  Number(
    multiplyContrast(
      Number(
        ratioRows.find((row) => !row.name.contrast && !row.name.colorScheme)!
          .value,
      ),
      2,
    ).toFixed(3),
  ),
  "high rows are multiplied",
);
assert.deepEqual(
  exported.tokens
    .filter((row) => row.name.property === "contrast-multiplier")
    .map((row) => [row.name.contrast, row.value]),
  [
    [undefined, 1],
    ["high", 2],
  ],
);

const appearanceSet: ModeSet = {
  id: "mode-set-appearance",
  key: "appearance",
  name: "Appearance",
  description: "",
  defaultModeId: "mode-appearance-default",
  authoringCapabilities: ["color.backgroundLightness"],
  modes: [
    {
      id: "mode-appearance-default",
      key: "standard",
      name: "Standard",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    },
    {
      id: "mode-appearance-alt",
      key: "alternate",
      name: "Alternate",
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: { color: { backgroundLightness: 0.2 } },
    },
  ],
};
const customSets = [
  ...defaults.map((modeSet) =>
    modeSet.key === "colorScheme"
      ? { ...modeSet, authoringCapabilities: [] }
      : modeSet,
  ),
  appearanceSet,
];
const customExport = buildCascadeTokenExport({
  base: document,
  modeSets: customSets,
  activeModes: customSets.map((modeSet) => modeSetDefaultMode(modeSet)!),
  activeTokens: [],
  overrides: {},
});
assert.deepEqual(
  customExport.modeSets.map((modeSet) => modeSet.name),
  ["contrast", "appearance"],
  "An unowned Color scheme declaration does not expand output.",
);
assert(customExport.tokens.every((row) => row.name.colorScheme === undefined));
assert.equal(
  customExport.tokens.filter(
    (row) => row.name.property === "color" && row.conceptId === concept,
  ).length,
  4,
);
assert.equal(
  customExport.tokens.filter(
    (row) =>
      row.name.property === "color" && row.name.appearance === "alternate",
  ).length,
  document.scales.length * document.contrasts.length * 2,
);

console.log("Contrast multiplier checks passed");
