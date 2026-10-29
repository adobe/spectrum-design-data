// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import Color from "colorjs.io";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import tokenSchema from "../src/data/design-data-shadow-profile/token.schema.json" with { type: "json" };
import colorSchema from "../src/data/design-data-shadow-profile/value-types/color.schema.json" with { type: "json" };
import documentSchema from "../src/data/design-data-shadow-profile/document-block.schema.json" with { type: "json" };
import shadowSchema from "../src/data/design-data-shadow-profile/value-types/drop-shadow.schema.json" with { type: "json" };
import {
  assertDraftShadowToken,
  buildShadowArtifacts,
  projectShadowValue,
  SHADOW_PROFILE,
  SHADOW_VALUE_TYPE,
  type ShadowArtifactSource,
} from "../src/features/design-data/shadowArtifacts";
import { ELEVATION_FORMULAS } from "../src/features/elevation/formulas";
import { generateElevation } from "../src/features/elevation/generate";
import { resolveElevationDocument } from "../src/features/elevation/resolution";
import {
  browserElevationSources,
  buildElevationCss,
} from "../src/features/elevation/output";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import type { AuthoringCapability, ModeSet } from "../src/features/modes/model";
import { gapRegister } from "../src/features/design-data/gaps";

function source(): ShadowArtifactSource {
  const data = structuredClone(designSystemDefaults);
  return {
    sourceKind: "shipped",
    elevation: data.system.foundations.elevation,
    taxonomy: data.system.taxonomy,
    formulas: structuredClone(ELEVATION_FORMULAS),
    modeSets: data.system.modeSets,
    opacitySource: {
      opacity: data.system.foundations.opacity,
      colorSystem: data.system.foundations.color,
      modeSets: data.system.modeSets,
      browserTokenEdits: {},
    },
  };
}
const baseline = source();
const before = structuredClone(baseline);
const css = buildElevationCss(
  baseline.elevation,
  baseline.taxonomy,
  baseline.modeSets,
  baseline.formulas,
  undefined,
  baseline.opacitySource,
);
const native = browserElevationSources(
  baseline.elevation,
  generateElevation(
    resolveElevationDocument(
      baseline.elevation,
      [],
      baseline.modeSets,
      {},
      baseline.opacitySource,
    ),
  ),
  baseline.taxonomy,
);
const bundle = buildShadowArtifacts(baseline);
assert.deepEqual(baseline, before, "Projection must not mutate caller data.");
assert.equal(bundle.profile.gapId, "LTAX-007");
assert.equal(
  bundle.profile.referenceRevision,
  gapRegister.gaps.find((gap) => gap.id === "LTAX-007")?.revision,
);
assert.equal(
  bundle.profile.referenceRevision,
  "838a6835b746f9d77b2697374408901f334d854e",
);
assert.equal(
  bundle.profile.tokenSchemaId,
  "https://opensource.adobe.com/spectrum-design-data/schemas/v0/token.schema.json",
);
assert.equal(
  bundle.profile.valueSchemaId,
  "https://opensource.adobe.com/spectrum-design-data/schemas/v0/value-types/drop-shadow.schema.json",
);
assert.equal(bundle.profile.files.length, 5);
assert.equal(bundle.profile.formatVersion, "1.0.0-draft");
assert.equal(bundle.profile.specPackageVersion, "4.3.0");
assert.equal(bundle.sourceKind, "shipped");
assert.equal(bundle.tokens.length, 6);
assert.equal(new Set(bundle.lineage.map((row) => row.conceptId)).size, 3);
assert.equal(new Set(bundle.tokens.map((row) => row.uuid)).size, 6);
assert.deepEqual(
  bundle.tokens.map((row) => row.name.scaleIndex),
  ["100", "200", "300", "100", "200", "300"],
);
assert.deepEqual(
  bundle.tokens.map((row) => row.name.colorScheme),
  ["light", "light", "light", "dark", "dark", "dark"],
);
assert.deepEqual(
  bundle.tokens.map((row) => Number(new Color(row.value[0].color).alpha)),
  [0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
);
assert.deepEqual(Object.keys(bundle.tokens[0]).sort(), [
  "$valueType",
  "name",
  "uuid",
  "value",
]);
assert.deepEqual(Object.keys(bundle.tokens[0].value[0]).sort(), [
  "blur",
  "color",
  "spread",
  "x",
  "y",
]);
assert(
  bundle.tokens.every((token) => /^[0-9a-f]{8}-[0-9a-f]{4}-8/.test(token.uuid)),
);
for (const token of bundle.tokens) assertDraftShadowToken(token);
assert.equal(
  css,
  buildElevationCss(
    baseline.elevation,
    baseline.taxonomy,
    baseline.modeSets,
    baseline.formulas,
    undefined,
    baseline.opacitySource,
  ),
);
assert.deepEqual(
  native,
  browserElevationSources(
    baseline.elevation,
    generateElevation(
      resolveElevationDocument(
        baseline.elevation,
        [],
        baseline.modeSets,
        {},
        baseline.opacitySource,
      ),
    ),
    baseline.taxonomy,
  ),
);

for (const file of SHADOW_PROFILE.files) {
  const bytes = readFileSync(
    new URL(
      `../src/data/design-data-shadow-profile/${file.path}`,
      import.meta.url,
    ),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    file.sha256,
    `Pinned bytes: ${file.source}`,
  );
}
const ajv = new Ajv2020({ strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({
  keyword: "x-valueType",
  schemaType: ["string", "array"],
  valid: true,
});
for (const schema of [colorSchema, documentSchema, shadowSchema, tokenSchema])
  ajv.addSchema(schema);
const envelope = ajv.compile(tokenSchema),
  shadow = ajv.compile(shadowSchema),
  color = ajv.compile(colorSchema);
assert.equal(
  envelope({ ...bundle.tokens[0], value: [] }),
  true,
  "The generic envelope does not narrow an array to shadows.",
);
assert.equal(shadow([]), false);
assert.equal(shadow(bundle.tokens[0].value), true);
assert.equal(
  color(bundle.tokens[0].value[0].color),
  false,
  "Standalone color validation is narrower than shadow string fields.",
);
assert.equal(color("rgba(0, 0, 0, 0.125)"), true);

const fractional = source();
fractional.modeSets = [];
delete fractional.elevation.layers[0].opacityTokenId;
fractional.elevation.depth = 50;
fractional.elevation.layers[0].base = 3.75;
fractional.elevation.layers[0].opacity = 12.5;
const fraction = buildShadowArtifacts(fractional);
assert.equal(fraction.tokens[0].value[0].y, "1.875px");
assert.equal(fraction.tokens[0].value[0].blur, "3.75px");
assert.equal(Number(new Color(fraction.tokens[0].value[0].color).alpha), 0.125);
assert.notEqual(
  Number(new Color(fraction.tokens[0].value[0].color).alpha),
  32 / 255,
);
assert.equal(
  fraction.tokens[0].value[0].color,
  generateElevation(fractional.elevation)[0].shadows[0].color,
);
assert.equal(
  fraction.tokens.length,
  3,
  "No owner means one baseline per native concept.",
);
assert.deepEqual(fraction.tokens[0].name, {
  property: "shadow",
  scaleIndex: "100",
});
for (const literal of [
  "rgb(0% 0% 0% / 0.2)",
  "color(display-p3 0.7 0.1 0.2 / 0.125)",
  "oklch(50% 0.15 20 / 0.125)",
]) {
  const generated = {
    ...generateElevation(fractional.elevation)[0].shadows[0],
    color: literal,
  };
  assert.equal(projectShadowValue([generated])[0].color, literal);
}
const tiny = {
  ...generateElevation(fractional.elevation)[0].shadows[0],
  blur: 1e-7,
  offsetY: Number.MAX_VALUE,
};
assert.equal(projectShadowValue([tiny])[0].blur, "1e-7px");
assert.equal(projectShadowValue([tiny])[0].y, `${Number.MAX_VALUE}px`);
const zero = buildShadowArtifacts({
  ...fractional,
  elevation: {
    ...fractional.elevation,
    depth: 0,
    layers: [{ ...fractional.elevation.layers[0], base: 0, opacity: 0 }],
  },
});
assert.deepEqual(zero.tokens[0].value[0], {
  x: "0px",
  y: "0px",
  blur: "0px",
  spread: "0px",
  color: generateElevation({
    ...fractional.elevation,
    depth: 0,
    layers: [{ ...fractional.elevation.layers[0], base: 0, opacity: 0 }],
  })[0].shadows[0].color,
});
for (const count of [2, 8]) {
  const layered = source();
  layered.modeSets = [];
  layered.elevation.layers = Array.from({ length: count }, (_, index) => ({
    ...layered.elevation.layers[0],
    opacityTokenId: undefined,
    id: crypto.randomUUID(),
    label: `Layer ${index}`,
    base: index % 2 ? 2 : 4,
    opacity: index ? 0 : 20,
  }));
  const forward = buildShadowArtifacts(layered);
  const reverse = buildShadowArtifacts({
    ...layered,
    elevation: {
      ...layered.elevation,
      layers: [...layered.elevation.layers].reverse(),
    },
  });
  assert.equal(
    forward.tokens.length,
    3,
    "Layer count must not change concept counts.",
  );
  assert.equal(
    forward.tokens[0].value.length,
    count,
    "Equal/transparent layers are never discarded.",
  );
  assert.deepEqual(
    forward.tokens[0].value,
    projectShadowValue(generateElevation(layered.elevation)[0].shadows),
  );
  assert.deepEqual(
    reverse.tokens[0].value,
    [...forward.tokens[0].value].reverse(),
  );
  assert.deepEqual(
    reverse.tokens.map((row) => row.uuid),
    forward.tokens.map((row) => row.uuid),
  );
  assert.deepEqual(
    reverse.lineage[0].layers.map((layer) => layer.id),
    [...forward.lineage[0].layers.map((layer) => layer.id)].reverse(),
  );
}

const valid = fraction.tokens[0],
  layer = valid.value[0];
for (const invalid of [
  { ...valid, value: [] },
  { ...valid, value: "none" },
  { ...valid, value: null },
  { ...valid, value: ["{layer}"] },
  { ...valid, value: [layer, "{layer}"] },
  { ...valid, value: [{ $ref: "layer" }] },
  {
    ...valid,
    value: [{ x: "0px", y: "0px", blur: "0px", color: layer.color }],
  },
  { ...valid, value: [{ ...layer, x: 0 }] },
  { ...valid, value: [{ ...layer, blur: "-1px" }] },
  { ...valid, value: [{ ...layer, x: "banana" }] },
  { ...valid, value: [{ ...layer, x: "2pxgarbage" }] },
  { ...valid, value: [{ ...layer, x: "{offset-100}" }] },
  {
    ...valid,
    value: [{ ...layer, color: { colorSpace: "srgb", components: [0, 0, 0] } }],
  },
  { ...valid, value: [{ ...layer, color: "{missing-color}" }] },
  { ...valid, value: [{ ...layer, color: "not-a-color" }] },
  { ...valid, value: [{ ...layer, color: "rgb(none 0 0)" }] },
  { ...valid, value: [{ ...layer, inset: false }] },
  { ...valid, value: [{ ...layer, inset: true }] },
  { ...valid, value: [{ ...layer, opacity: 0.125 }] },
  { ...valid, value: [{ ...layer, layerId: "internal" }] },
  { ...valid, value: [{ ...layer, y: "Infinitypx" }] },
  { ...valid, $valueType: "value-types/color.schema.json" },
  { ...valid, $valueType: undefined },
  { ...valid, $ref: valid.uuid },
  {
    name: valid.name,
    uuid: valid.uuid,
    $valueType: SHADOW_VALUE_TYPE,
    $ref: valid.uuid,
  },
  { ...valid, uuid: "not-a-uuid" },
  { ...valid, uuid: undefined },
  { ...valid, name: "shadow-100" },
  { ...valid, name: { property: "shadow", scaleIndex: 100 } },
  { ...valid, name: { property: "elevation", scaleIndex: "100" } },
  { ...valid, $schema: "legacy" },
  { ...valid, conceptId: "native" },
])
  assert.throws(() => assertDraftShadowToken(invalid), /Shadow export:/);
assertDraftShadowToken({
  ...valid,
  value: [{ ...layer, x: "-2px", spread: "-1px" }],
});
assert.equal(
  shadow([{ ...layer, color: "{missing-color}" }]),
  true,
  "Typed shape does not prove scalar-reference existence.",
);
assert.throws(() => projectShadowValue([]), /empty-valued/);
const inset = structuredClone(
  generateElevation(fractional.elevation)[0].shadows[0],
);
Reflect.set(inset, "inset", true);
assert.throws(() => projectShadowValue([inset]), /shadows\/0\/inset/);
for (const geometry of [NaN, Infinity, -Infinity]) {
  assert.throws(
    () =>
      projectShadowValue([
        {
          ...generateElevation(fractional.elevation)[0].shadows[0],
          blur: geometry,
        },
      ]),
    /shadows\/0/,
  );
}
assert.throws(
  () =>
    projectShadowValue([
      { ...generateElevation(fractional.elevation)[0].shadows[0], blur: -1 },
    ]),
  /value\/0\/blur/,
);
for (const opacity of [-0.1, 1.1]) {
  assert.throws(
    () =>
      projectShadowValue([
        { ...generateElevation(fractional.elevation)[0].shadows[0], opacity },
      ]),
    /shadows\/0\/opacity/,
  );
}
assert.throws(
  () => buildShadowArtifacts({ ...baseline, formulas: [] }),
  /formula is unavailable/,
);
assert.throws(
  () =>
    buildShadowArtifacts({
      ...baseline,
      elevation: {
        ...baseline.elevation,
        layers: [{ ...baseline.elevation.layers[0], scale: 1e308 }],
      },
    }),
  /could not be calculated/,
);
assert.throws(
  () =>
    buildShadowArtifacts({
      ...baseline,
      elevation: {
        ...baseline.elevation,
        name: { ...baseline.elevation.name, termId: crypto.randomUUID() },
      },
    }),
  /Unresolved/,
);
const missingStep = source();
const stepCategory = missingStep.taxonomy.categories.find(
  (category) => category.key === "scaleIndex",
)!;
missingStep.taxonomy.terms = missingStep.taxonomy.terms.filter(
  (term) => term.categoryId !== stepCategory.id || term.value !== 200,
);
assert.throws(
  () => buildShadowArtifacts(missingStep),
  /registered scaleIndex term/,
);
assert.equal(
  buildShadowArtifacts({
    ...fractional,
    elevation: { ...fractional.elevation, layers: [] },
  }).tokens.length,
  0,
);
const emptyOwned = source();
emptyOwned.elevation.layers = [];
for (const set of emptyOwned.modeSets)
  for (const mode of set.modes) {
    if (mode.foundations.elevation)
      mode.foundations.elevation.layerOpacities = {};
  }
assert.deepEqual(
  buildShadowArtifacts(emptyOwned).tokens,
  [],
  "An empty foundation retains owning declarations without publishing an empty-valued token.",
);
assert.deepEqual(buildShadowArtifacts(emptyOwned).lineage, []);
assert.equal(
  buildShadowArtifacts({
    ...baseline,
    elevation: { ...baseline.elevation, hideFromPublishing: true },
  }).tokens.length,
  0,
);

function axis(
  id: string,
  key: string,
  capabilities: AuthoringCapability[],
  count = 2,
): ModeSet {
  return {
    id,
    key,
    name: key,
    description: "",
    iconId: "none",
    defaultModeId: `${id}-0`,
    authoringCapabilities: capabilities,
    modes: Array.from({ length: count }, (_, index) => ({
      id: `${id}-${index}`,
      key: `m${index}`,
      name: `Mode ${index}`,
      description: "",
      iconId: "none",
      platformIds: [],
      foundations: {},
    })),
  };
}
const custom = axis("custom-depth", "shadowDepth", ["elevation.depth"]);
const customRows = buildShadowArtifacts({ ...baseline, modeSets: [custom] });
assert.equal(customRows.tokens.length, 6);
assert.deepEqual(customRows.tokens[0].value, customRows.tokens[3].value);
assert.notEqual(
  customRows.tokens[0].uuid,
  customRows.tokens[3].uuid,
  "Equal named modes retain separate scoped identities.",
);
assert.equal(customRows.tokens[0].name.shadowDepth, "m0");
assert.equal(customRows.modeSets[0].defaultModeId, custom.defaultModeId);
const nonfirstDefault = structuredClone(custom);
nonfirstDefault.defaultModeId = nonfirstDefault.modes[1].id;
nonfirstDefault.modes[0].foundations.elevation = { depth: 50 };
const declared = buildShadowArtifacts({
  ...baseline,
  modeSets: [nonfirstDefault],
});
assert.equal(declared.tokens[0].value[0].y, "2px");
assert.equal(
  declared.tokens[3].value[0].y,
  "4px",
  "Declared default inherits the shared source, not the first row's override.",
);
assert.equal(declared.modeSets[0].defaultModeId, nonfirstDefault.defaultModeId);
const ownedColor = axis("color-owner", "shadowColor", ["elevation.color"]);
ownedColor.modes[1].foundations.elevation = { color: "#ffffff" };
const separate = buildShadowArtifacts({
  ...baseline,
  modeSets: [nonfirstDefault, ownedColor],
});
assert.equal(separate.tokens.length, 12);
const combined = separate.tokens.find(
  (row) => row.name.shadowDepth === "m0" && row.name.shadowColor === "m1",
)!;
assert.equal(combined.value[0].y, "2px");
assert.equal(new Color(combined.value[0].color).coords[0], 1);
assert.deepEqual(
  buildShadowArtifacts({
    ...baseline,
    modeSets: [...baseline.modeSets, axis("unused", "unrelated", [], 8)],
  }),
  bundle,
);
assert.deepEqual(
  buildShadowArtifacts({
    ...baseline,
    modeSets: [...baseline.modeSets].reverse(),
  })
    .tokens.map((row) => row.uuid)
    .sort(),
  bundle.tokens.map((row) => row.uuid).sort(),
);
const detached = structuredClone(baseline.modeSets);
for (const set of detached) {
  set.authoringCapabilities = set.authoringCapabilities?.filter(
    (capability) => !capability.startsWith("elevation."),
  );
  for (const mode of set.modes) delete mode.foundations.elevation;
}
assert.equal(
  buildShadowArtifacts({ ...baseline, modeSets: detached }).tokens.length,
  6,
  "Referenced opacity keeps its Color scheme dependency after Elevation ownership is detached.",
);
const sparse = axis("opacity", "shadowOpacity", ["elevation.layerOpacities"]);
sparse.modes[1].foundations.elevation = { layerOpacities: {} };
assert.deepEqual(
  buildShadowArtifacts({ ...baseline, modeSets: [sparse] }).tokens[0].value,
  bundle.tokens[0].value,
);
for (const malformed of [
  { ...custom, defaultModeId: "missing" },
  { ...custom, modes: [] },
  {
    ...custom,
    modes: [custom.modes[0], { ...custom.modes[1], key: custom.modes[0].key }],
  },
  {
    ...custom,
    modes: [custom.modes[0], { ...custom.modes[1], id: custom.modes[0].id }],
  },
  { ...custom, key: "property" },
  { ...custom, key: "scaleIndex" },
  { ...custom, key: "state" },
  {
    ...custom,
    authoringCapabilities: [
      ...custom.authoringCapabilities!,
      ...custom.authoringCapabilities!,
    ],
  },
])
  assert.throws(
    () => buildShadowArtifacts({ ...baseline, modeSets: [malformed] }),
    /Shadow export:/,
  );
assert.throws(
  () =>
    buildShadowArtifacts({
      ...baseline,
      modeSets: [custom, { ...custom, id: "second", key: "second", modes: [] }],
    }),
  /ownership/,
);
assert.throws(
  () =>
    buildShadowArtifacts({
      ...baseline,
      modeSets: [custom, { ...axis("second", "shadowDepth", []) }],
    }),
  /duplicate/,
);
const defaultPatch = structuredClone(custom);
defaultPatch.modes[0].foundations.elevation = { depth: 50 };
assert.throws(
  () => buildShadowArtifacts({ ...baseline, modeSets: [defaultPatch] }),
  /nondefault/,
);
const unownedPatch = axis("unowned", "unowned", []);
unownedPatch.modes[1].foundations.elevation = { depth: 50 };
assert.throws(
  () => buildShadowArtifacts({ ...baseline, modeSets: [custom, unownedPatch] }),
  /declared owner/,
);
sparse.modes[1].foundations.elevation = {
  layerOpacities: { "missing-layer": 30 },
};
assert.deepEqual(
  buildShadowArtifacts({ ...baseline, modeSets: [sparse] }).tokens[0].value,
  bundle.tokens[0].value,
  "Historical opacity patches no longer drive generated shadow values.",
);
const boundedAxes = (count: number) => [
  axis("depth", "shadowDepth", ["elevation.depth"], count),
  axis("color", "shadowColor", ["elevation.color"], count),
  axis("opacity", "shadowOpacity", ["color.backgroundLightness"], count),
];
assert.equal(
  buildShadowArtifacts({ ...baseline, modeSets: boundedAxes(6) }).tokens.length,
  216 * 3,
);
assert.throws(
  () => buildShadowArtifacts({ ...baseline, modeSets: boundedAxes(7) }),
  /343.*limit is 256/,
);
assert.equal(
  buildShadowArtifacts({
    ...baseline,
    modeSets: [
      axis("depth", "shadowDepth", ["elevation.depth"], 16),
      axis("color", "shadowColor", ["elevation.color"], 16),
    ],
  }).tokens.length,
  256 * 3,
);
assert.throws(
  () =>
    buildShadowArtifacts({
      ...baseline,
      modeSets: [axis("depth", "shadowDepth", ["elevation.depth"], 257)],
    }),
  /257.*limit is 256/,
);

const rename = source();
const nameTerm = rename.taxonomy.terms.find(
  (term) => term.id === rename.elevation.name.termId,
)!;
nameTerm.value = "Layered depth";
for (const variant of [
  rename,
  {
    ...baseline,
    elevation: {
      ...baseline.elevation,
      layers: [
        { ...baseline.elevation.layers[0], label: "Renamed layer", base: 2 },
      ],
    },
  },
]) {
  const changed = buildShadowArtifacts(variant);
  assert.deepEqual(
    changed.tokens.map((row) => row.uuid),
    bundle.tokens.map((row) => row.uuid),
  );
  assert.deepEqual(
    changed.lineage.map((row) => row.conceptId),
    bundle.lineage.map((row) => row.conceptId),
  );
}
assert.equal(
  buildShadowArtifacts(rename).lineage[0].foundationName,
  "Layered depth",
);
const extended = buildShadowArtifacts({
  ...baseline,
  elevation: { ...baseline.elevation, below: 2, above: 3 },
});
for (const row of bundle.lineage)
  assert.equal(
    extended.lineage.find(
      (other) =>
        other.conceptId === row.conceptId &&
        JSON.stringify(other.selection) === JSON.stringify(row.selection),
    )?.uuid,
    row.uuid,
  );
const smaller = buildShadowArtifacts({
  ...fractional,
  elevation: { ...fractional.elevation, below: 1 },
});
const moreSmall = buildShadowArtifacts({
  ...fractional,
  elevation: { ...fractional.elevation, below: 2 },
});
assert.equal(smaller.lineage[0].uuid, moreSmall.lineage[1].uuid);
assert.notEqual(
  smaller.lineage[0].step,
  moreSmall.lineage[1].step,
  "Display-step changes must not remint mathematical-index identities.",
);
const relabel = structuredClone(custom);
relabel.key = "renamedAxis";
relabel.name = "Renamed";
relabel.modes[0].key = "renamedMode";
relabel.modes[0].name = "Renamed";
assert.deepEqual(
  buildShadowArtifacts({ ...baseline, modeSets: [relabel] }).tokens.map(
    (row) => row.uuid,
  ),
  customRows.tokens.map((row) => row.uuid),
);
const reidentified = structuredClone(custom);
reidentified.modes[1].id = "replacement-mode";
const replacedRows = buildShadowArtifacts({
  ...baseline,
  modeSets: [reidentified],
});
assert.equal(replacedRows.tokens[0].uuid, customRows.tokens[0].uuid);
assert.notEqual(replacedRows.tokens[3].uuid, customRows.tokens[3].uuid);
const movedOwner = { ...custom, id: "replacement-owner" };
assert.notEqual(
  buildShadowArtifacts({ ...baseline, modeSets: [movedOwner] }).tokens[0].uuid,
  customRows.tokens[0].uuid,
);
const store = createStore();
store.set(previewOverridesAtom, { "elevation.depth": 50 });
assert.deepEqual(
  buildShadowArtifacts(baseline),
  bundle,
  "Ambient previews must not enter the supplied publication source.",
);
assert.equal(
  buildShadowArtifacts({ ...baseline, sourceKind: "working" }).sourceKind,
  "working",
);
assert.equal(
  buildShadowArtifacts({ ...baseline, sourceKind: "saved" }).sourceKind,
  "saved",
);
const undeclaredSource = source();
Reflect.set(undeclaredSource, "sourceKind", "draft");
assert.throws(() => buildShadowArtifacts(undeclaredSource), /declare whether/);
bundle.tokens[0].value[0].blur = "999px";
assert.equal(
  buildShadowArtifacts(baseline).tokens[0].value[0].blur,
  "4px",
  "Results must not become cached or writable authoring output.",
);
bundle.profile.files[0].sha256 = "changed";
assert.equal(
  buildShadowArtifacts(baseline).profile.files[0].sha256,
  SHADOW_PROFILE.files[0].sha256,
);
assert.deepEqual(baseline, before);
console.log(
  "Shadow artifacts: pinned draft schemas, literal precision, ordered composites, scoped modes, stable identities and native-output preservation passed.",
);
