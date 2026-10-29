// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import {
  COMPONENT_SIZES,
  isTypographyDocument,
  TEXT_ZOOM_MIN,
  TEXT_ZOOM_MAX,
} from "../src/features/typography/model";
import {
  adaptiveRatio,
  generateTypography,
} from "../src/features/typography/typographyGeneration";
import {
  fromTypographyUnit,
  toTypographyUnit,
  formatTypographyLength,
  type TypographyUnit,
} from "../src/features/typography/units";
import {
  evaluateInterpolationMapping,
  interpolationIssues,
  type Interpolation,
} from "../src/features/scales/interpolationDefinition";
import {
  SCALE_TYPE_DEFAULTS,
  TYPOGRAPHY_SCALE_TYPE_ID,
  createScaleType,
  isScaleType,
  withScaleTypeKind,
} from "../src/features/scales/scaleType";
import {
  isScaleTypeList,
  scaleTypesAtom,
  replaceScaleTypeAtom,
  removeScaleTypeAtom,
  interpolationsAtom,
  removeInterpolationAtom,
  addInterpolationAtom,
  replaceInterpolationAtom,
} from "../src/features/logic/scaleTypeLibrary";
import { editModeAtom } from "../src/state/view/editMode";
import {
  addLineHeightAtom,
  generatedTypographyAtom,
  lineHeightConsumers,
  removeLineHeightAtom,
  renameLineHeightAtom,
  restoreLineHeightAtom,
  restoreTypographyDefaultsAtom,
  typographyDocumentAtom,
  updateTypographyAtom,
} from "../src/features/typography/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { lineHeightName } from "../src/features/typography/lineHeightNames";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { buildTypographyCss } from "../src/features/typography/typographyCss";
import { typographyTokenValues } from "../src/features/typography/typographyTokens";
import { browserSourcesFromOutputs } from "../src/features/tokens/browserSources";
import {
  applyBrowserTokenEdits,
  canBulkEditValue,
  parseBrowserTokenValue,
  resolveBrowserTokens,
  tokenValueText,
} from "../src/features/tokens/browserModel";
import {
  enterEditModeAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { browserTokenSourcesAtom } from "../src/features/tokens/browserState";
import {
  savedBrowserConceptIdsAtom,
  publishedBrowserTokensAtom,
} from "../src/features/tokens/browserSavedState";
import { buildTaxonomyExport } from "../src/features/taxonomy/export";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import { interpolationConsumersAtom } from "../src/features/logic/interpolationReferences";
import {
  sizeDocumentAtom,
  updateSizeScaleAtom,
} from "../src/features/size/state";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
for (const [unit, value] of [
  ["px", 16],
  ["rem", 1],
  ["em", 1],
  ["pt", 12],
] as const) {
  assert.equal(toTypographyUnit(16, unit), value);
  assert.equal(fromTypographyUnit(value, unit), 16);
  let pixels = 13.123456789;
  for (let count = 0; count < 100; count++)
    pixels = fromTypographyUnit(toTypographyUnit(pixels, unit), unit);
  near(pixels, 13.123456789);
  assert.equal(formatTypographyLength(16, unit), `${value}${unit}`);
}
assert.throws(() => fromTypographyUnit(NaN, "px"));
assert.throws(() => toTypographyUnit(16, "vw" as TypographyUnit));

const shape: Interpolation = {
  id: "linear",
  name: "Linear",
  description: "",
  kind: "method",
  method: "linear",
};
const mapping = {
  interpolationId: shape.id,
  from: 10,
  to: 30,
  outputAtFrom: 1.5,
  outputAtTo: 1.1,
};
assert.equal(evaluateInterpolationMapping(shape, mapping, -100), 1.5);
assert.equal(evaluateInterpolationMapping(shape, mapping, 100), 1.1);
near(evaluateInterpolationMapping(shape, mapping, 20), 1.3);
near(
  evaluateInterpolationMapping({ ...shape, method: "cosine" }, mapping, 20),
  1.3,
);
near(
  evaluateInterpolationMapping(
    { ...shape, method: "exponential" },
    { ...mapping, outputAtFrom: 1, outputAtTo: 4 },
    20,
  ),
  2,
);
assert.throws(() =>
  evaluateInterpolationMapping(shape, { ...mapping, to: 10 }, 20),
);
assert.throws(() =>
  evaluateInterpolationMapping(
    shape,
    { ...mapping, interpolationId: "missing" },
    20,
  ),
);
assert.throws(() =>
  evaluateInterpolationMapping(
    { ...shape, method: "exponential" },
    { ...mapping, outputAtFrom: 0 },
    20,
  ),
);
const expression: Interpolation = {
  id: shape.id,
  name: "Squared",
  description: "",
  kind: "expression",
  parameters: [],
  expression: "x * x",
};
near(evaluateInterpolationMapping(expression, mapping, 20), 1.4);
assert.ok(interpolationIssues({ ...expression, expression: "x / 2" }).length);
assert.ok(
  interpolationIssues({
    ...expression,
    expression: "x + x * (x - 1) / (x - 0.5)",
  }).length,
);
assert.equal(
  evaluateInterpolationMapping(
    shape,
    { ...mapping, outputAtFrom: 2, outputAtTo: 4 },
    20,
  ),
  3,
  "ranges belong to each consumer",
);

const shared = SCALE_TYPE_DEFAULTS.find(
  (item) => item.id === TYPOGRAPHY_SCALE_TYPE_ID,
)!;
assert.deepEqual(
  shared.parameters.map((item) => item.id),
  ["ratio"],
);
assert.ok(isScaleType(shared));
assert.ok(
  !isScaleType({
    ...shared,
    parameters: [
      ...shared.parameters,
      { ...shared.parameters[0], id: "offset" },
    ],
  }),
);
assert.ok(
  !isScaleType({ ...shared, base: { ...shared.base, adaptable: false } }),
);
assert.ok(!isScaleType({ ...shared, textSizeAdaptation: undefined }));
assert.ok(
  !isScaleTypeList(SCALE_TYPE_DEFAULTS.filter((item) => item.id !== shared.id)),
);
assert.ok(!isScaleTypeList([...SCALE_TYPE_DEFAULTS, shared]));
assert.throws(() => withScaleTypeKind(shared, "geometric"));
assert.throws(() => createScaleType("type-scale"));
assert.equal(adaptiveRatio(TYPOGRAPHY_DEFAULTS, -4), 1.066);
assert.equal(adaptiveRatio(TYPOGRAPHY_DEFAULTS, 0), 1.125);
assert.equal(adaptiveRatio(TYPOGRAPHY_DEFAULTS, 8), 1.066);
near(adaptiveRatio(TYPOGRAPHY_DEFAULTS, -2), (1.066 + 1.125) / 2);

const generated = generateTypography(TYPOGRAPHY_DEFAULTS);
assert.equal(generated.length, 17);
assert.equal(typographyTokenValues(generated).length, 136);
assert.ok(
  !typographyTokenValues(generated).some((item) =>
    /Spacing/.test(item.group.id),
  ),
);
for (const size of COMPONENT_SIZES)
  for (let zoom = TEXT_ZOOM_MIN; zoom <= TEXT_ZOOM_MAX; zoom++) {
    for (const token of generateTypography(
      { ...TYPOGRAPHY_DEFAULTS, componentSize: size.id },
      zoom,
    )) {
      assert.equal(token.iconSize, token.lineHeights.component.length);
      for (const height of Object.values(token.lineHeights)) {
        near(height.multiplier * token.fontSize, height.length);
        assert.ok(height.length > 0 && Number.isFinite(height.multiplier));
      }
    }
  }
for (const unit of ["px", "rem", "em", "pt"] as const) {
  const document = { ...TYPOGRAPHY_DEFAULTS, outputUnit: unit };
  assert.deepEqual(generateTypography(document), generated);
  assert.match(
    buildTypographyCss(document),
    new RegExp(`--font-size-100: ${formatTypographyLength(14, unit)};`),
  );
}
assert.equal(
  buildTypographyCss({ ...TYPOGRAPHY_DEFAULTS, hideFromPublishing: true }),
  "",
);
assert.ok(
  buildTypographyCss(
    { ...TYPOGRAPHY_DEFAULTS, hideFromPublishing: true },
    { purpose: "authoring" },
  ).length > 0,
);

const sources = browserSourcesFromOutputs([], generated, [], [], {
  names: TYPOGRAPHY_DEFAULTS.metricNames,
  registry: designSystemDefaults.system.taxonomy,
  outputUnit: "rem",
});
const font = sources.find((item) => item.id === "typography-font-size-100")!;
assert.equal(tokenValueText(font), "0.875rem");
assert.equal(parseBrowserTokenValue(font, "1rem"), 16);
const edited = resolveBrowserTokens(
  [font],
  { [font.id]: { values: { "[]": { value: 16, baseline: 14 } } } },
  "[]",
)[0];
assert.equal(tokenValueText(edited), "1rem");
assert.equal(
  tokenValueText({ ...edited, displayUnit: "pt" }),
  "12pt",
  "manual canonical lengths survive unit changes",
);
assert.equal(
  applyBrowserTokenEdits([font], {}, [font.id], "[]", { value: 16 })[font.id]
    .values["[]"].value,
  16,
  "numeric patches are canonical pixels",
);
assert.equal(
  applyBrowserTokenEdits([font], {}, [font.id], "[]", { value: "1rem" })[
    font.id
  ].values["[]"].value,
  16,
  "text patches use the display unit",
);
assert.throws(() =>
  applyBrowserTokenEdits([font], {}, [font.id], "[]", { value: NaN }),
);
assert.equal(
  canBulkEditValue(
    resolveBrowserTokens(
      [font, { ...font, id: "pixels", displayUnit: "px" }],
      {},
      "[]",
    ),
  ),
  false,
  "bulk input cannot mix displayed units",
);
assert.equal(
  canBulkEditValue(
    resolveBrowserTokens([font, { ...font, id: "same-units" }], {}, "[]"),
  ),
  true,
);

const store = createStore();
store.set(editModeAtom, true);
assert.equal(store.set(removeScaleTypeAtom, shared.id), null);
const changedFormula = {
  ...shared,
  base: { ...shared.base, default: 16 },
  parameters: shared.parameters.map((item) => ({ ...item, default: 1.25 })),
};
store.set(replaceScaleTypeAtom, changedFormula);
assert.equal(store.get(scaleTypesAtom)[0].base.default, 16);
assert.equal(
  store.get(generatedTypographyAtom).find((item) => item.position === 0)!
    .fontSize,
  16,
);
const beforeInvalid = store.get(typographyDocumentAtom);
assert.throws(() => store.set(updateTypographyAtom, { largeSizes: 15 }));
assert.strictEqual(store.get(typographyDocumentAtom), beforeInvalid);
assert.ok(
  !isTypographyDocument({
    ...TYPOGRAPHY_DEFAULTS,
    iconography: {
      alignment: "line-height",
      baseSize: 16,
      lineHeightId: "missing",
    },
  }),
);
const id = store.set(addLineHeightAtom);
const added = store.get(typographyDocumentAtom);
assert.equal(added.lineHeights.length, 4);
assert.equal(added.lineHeights[0].id, id);
assert.equal(added.lineHeights[0].isAdaptive, false);
store.set(updateTypographyAtom, {
  lineHeights: added.lineHeights.map((card) =>
    card.id === id ? { ...card, defaultValue: 2 } : card,
  ),
});
store.set(updateTypographyAtom, {
  lineHeights: store
    .get(typographyDocumentAtom)
    .lineHeights.map((card) =>
      card.id === id ? { ...card, isAdaptive: true } : card,
    ),
});
assert.equal(
  store.get(typographyDocumentAtom).lineHeights.find((card) => card.id === id)!
    .adaptive.outputAtFrom,
  2,
);
assert.equal(
  store.get(typographyDocumentAtom).lineHeights.find((card) => card.id === id)!
    .adaptive.outputAtTo,
  2,
);
store.set(updateTypographyAtom, {
  lineHeights: store.get(typographyDocumentAtom).lineHeights.map((card) =>
    card.id === id
      ? {
          ...card,
          isAdaptive: false,
          adaptive: { ...card.adaptive, outputAtTo: 1.2 },
        }
      : card,
  ),
});
store.set(updateTypographyAtom, {
  lineHeights: store
    .get(typographyDocumentAtom)
    .lineHeights.map((card) =>
      card.id === id ? { ...card, isAdaptive: true } : card,
    ),
});
assert.equal(
  store.get(typographyDocumentAtom).lineHeights.find((card) => card.id === id)!
    .adaptive.outputAtTo,
  1.2,
  "configured endpoints survive disable/enable",
);
const nameRefs = added.metricNames[`${id}-lineHeight`];
store.set(renameLineHeightAtom, { id, name: "Caption" });
assert.deepEqual(
  store.get(typographyDocumentAtom).metricNames[`${id}-lineHeight`],
  nameRefs,
);
assert.equal(
  lineHeightName(
    store.get(typographyDocumentAtom),
    store.get(taxonomyDocumentAtom),
    id,
  ),
  "Caption",
);
const beforeDuplicate = store.get(taxonomyDocumentAtom);
assert.throws(() => store.set(renameLineHeightAtom, { id, name: "body" }));
assert.strictEqual(store.get(taxonomyDocumentAtom), beforeDuplicate);
assert.deepEqual(
  lineHeightConsumers(store.get(typographyDocumentAtom), "body"),
  ["Elements text sample"],
);
assert.throws(() => store.set(removeLineHeightAtom, { id: "body" }));
store.set(browserTokenEditsAtom, {
  "typography-body-lineHeight-100": {
    values: { "[]": { value: 30, baseline: 20 } },
  },
});
const removed = store.set(removeLineHeightAtom, {
  id: "body",
  replacementId: id,
});
assert.equal(store.get(typographyDocumentAtom).previewLineHeightId, id);
assert.equal(
  store.get(browserTokenEditsAtom)["typography-body-lineHeight-100"],
  undefined,
);
store.set(updateTypographyAtom, { previewLineHeightId: "heading" });
store.set(restoreLineHeightAtom, removed);
assert.equal(
  store.get(typographyDocumentAtom).previewLineHeightId,
  "heading",
  "undo does not overwrite a subsequent selection",
);
assert.ok(store.get(browserTokenEditsAtom)["typography-body-lineHeight-100"]);
assert.equal(
  store.get(typographyDocumentAtom).lineHeights[removed.index].id,
  "body",
);
assert.equal(store.get(generatedTypographyAtom).length, generated.length);

const libraries = createStore();
const beforeShapes = libraries.get(interpolationsAtom);
assert.throws(
  () => libraries.set(removeInterpolationAtom, "interpolation-linear"),
  /still used/,
);
assert.throws(
  () => libraries.set(removeInterpolationAtom, "interpolation-cosine"),
  /still used/,
);
assert.strictEqual(libraries.get(interpolationsAtom), beforeShapes);
assert.throws(
  () =>
    libraries.set(addInterpolationAtom, {
      ...expression,
      id: "bad",
      expression: "x / 2",
    }),
  /shape/,
);
assert.throws(
  () =>
    libraries.set(replaceInterpolationAtom, { ...expression, id: "missing" }),
  /no longer available/,
);
assert.throws(
  () =>
    libraries.set(replaceScaleTypeAtom, {
      ...shared,
      textSizeAdaptation: {
        ...shared.textSizeAdaptation!,
        interpolationId: "missing",
      },
    }),
  /available/,
);
const overshooting: Interpolation = {
  ...expression,
  id: "interpolation-linear",
  expression: "x + 120 * x * (1 - x)",
};
assert.deepEqual(
  interpolationIssues(overshooting),
  [],
  "a reusable shape can be valid but incompatible with a consumer's endpoints",
);
assert.throws(
  () => libraries.set(replaceInterpolationAtom, overshooting),
  /ratio positive/,
);
assert.strictEqual(
  libraries.get(interpolationsAtom),
  beforeShapes,
  "invalid settings are rejected before the shared shape changes",
);
assert.throws(
  () =>
    libraries.set(replaceInterpolationAtom, {
      ...overshooting,
      id: "interpolation-cosine",
    }),
  /positive finite length/,
);
libraries.set(addInterpolationAtom, {
  ...overshooting,
  id: "unused-overshoot",
});
const beforeFormula = libraries.get(scaleTypesAtom);
assert.throws(
  () =>
    libraries.set(replaceScaleTypeAtom, {
      ...shared,
      textSizeAdaptation: {
        ...shared.textSizeAdaptation!,
        interpolationId: "unused-overshoot",
      },
    }),
  /ratio positive/,
);
assert.strictEqual(
  libraries.get(scaleTypesAtom),
  beforeFormula,
  "consumer selection is checked at all Text size settings, not just the neutral setting",
);

const icons = createStore();
icons.set(enterEditModeAtom);
icons.set(updateTypographyAtom, {
  iconography: { alignment: "text", baseSize: 32 },
});
assert.equal(
  icons.get(generatedTypographyAtom).find((token) => token.position === 0)!
    .iconSize,
  32,
);
assert.equal(
  icons.get(generatedTypographyAtom).find((token) => token.position === 1)!
    .iconSize,
  36,
);
icons.set(updateTypographyAtom, {
  iconography: {
    ...icons.get(typographyDocumentAtom).iconography,
    alignment: "line-height",
    lineHeightId: "body",
  },
});
assert.ok(
  icons
    .get(generatedTypographyAtom)
    .every((token) => token.iconSize === token.lineHeights.body.length),
);
icons.set(updateTypographyAtom, {
  iconography: {
    alignment: "text",
    baseSize: icons.get(typographyDocumentAtom).iconography.baseSize,
  },
});
assert.equal(
  icons.get(generatedTypographyAtom).find((token) => token.position === 0)!
    .iconSize,
  32,
  "switching alignment preserves the authored icon base",
);
assert.throws(
  () =>
    icons.set(updateTypographyAtom, { lineHeightRoundingRuleId: "missing" }),
  /available/,
);
assert.throws(
  () =>
    icons.set(updateTypographyAtom, {
      lineHeights: icons
        .get(typographyDocumentAtom)
        .lineHeights.map((card) => ({
          ...card,
          adaptive: { ...card.adaptive, interpolationId: "missing" },
        })),
    }),
  /available/,
);

const lifecycle = createStore();
lifecycle.set(enterEditModeAtom);
// Exclude the existing Spacing/Size flat-name collision from this publication fixture.
lifecycle.set(updateSizeScaleAtom, {
  id: lifecycle.get(sizeDocumentAtom).scales[0].id,
  patch: { hideFromPublishing: true },
});
const initialConcepts = new Set(
  [...lifecycle.get(savedBrowserConceptIdsAtom)].filter((concept) =>
    concept.startsWith("typography-"),
  ),
);
assert.equal(initialConcepts.size, 136);
const newId = lifecycle.set(addLineHeightAtom);
lifecycle.set(renameLineHeightAtom, { id: newId, name: "Reading" });
assert.ok(
  lifecycle
    .get(interpolationConsumersAtom)
    .some(
      (consumer) =>
        consumer.id === `typography/${newId}` &&
        consumer.label === "Typography › Reading line height",
    ),
);
const workingConcepts = lifecycle
  .get(browserTokenSourcesAtom)
  .filter((token) => token.type === "typography");
assert.equal(workingConcepts.length, 170);
assert.deepEqual(
  new Set(
    [...lifecycle.get(savedBrowserConceptIdsAtom)].filter((concept) =>
      concept.startsWith("typography-"),
    ),
  ),
  initialConcepts,
  "unsaved additions do not change the saved denominator",
);
const registryChange = lifecycle
  .get(changeGroupsAtom)
  .find((group) => group.id === "registry")!.items[0];
const registryBeforeRevert = lifecycle.get(taxonomyDocumentAtom);
assert.throws(
  () => lifecycle.set(revertChangeItemAtom, registryChange),
  /reference/,
);
assert.strictEqual(lifecycle.get(taxonomyDocumentAtom), registryBeforeRevert);
lifecycle.set(saveEditAtom);
assert.equal(
  [...lifecycle.get(savedBrowserConceptIdsAtom)].filter((concept) =>
    concept.startsWith("typography-"),
  ).length,
  170,
);
const manual = { "[]": { value: 16, baseline: 14 } };
lifecycle.set(browserTokenEditsAtom, {
  "typography-font-size-100": { values: manual },
});
const beforeHide = lifecycle
  .get(browserTokenSourcesAtom)
  .filter((token) => token.type === "typography")
  .map((token) => token.id);
lifecycle.set(updateTypographyAtom, { hideFromPublishing: true });
assert.deepEqual(
  lifecycle
    .get(browserTokenSourcesAtom)
    .filter((token) => token.type === "typography")
    .map((token) => token.id),
  beforeHide,
);
assert.equal(
  [...lifecycle.get(savedBrowserConceptIdsAtom)].filter((concept) =>
    concept.startsWith("typography-"),
  ).length,
  170,
);
assert.deepEqual(
  lifecycle.get(browserTokenEditsAtom)["typography-font-size-100"].values,
  manual,
  "hiding does not delete manual edits",
);
const hiddenPacket = buildTaxonomyExport(
  lifecycle.get(taxonomyDocumentAtom),
  lifecycle.get(publishedBrowserTokensAtom),
);
assert.equal(
  hiddenPacket.tokens.filter((token) => token.id.startsWith("typography-"))
    .length,
  0,
  "taxonomy download excludes every hidden Typography primitive",
);
assert.ok(
  hiddenPacket.tokens.length > 0,
  "hiding Typography does not hide other foundations",
);
lifecycle.set(browserTokenEditsAtom, {
  ...lifecycle.get(browserTokenEditsAtom),
  [`typography-${newId}-lineHeight-100`]: { values: manual },
  unrelated: { values: manual },
});
const nonTypographyTerms = lifecycle
  .get(taxonomyDocumentAtom)
  .terms.filter(
    (term) =>
      term.categoryId !==
      TYPOGRAPHY_DEFAULTS.metricNames["font-size"].categoryId,
  );
lifecycle.set(restoreTypographyDefaultsAtom);
assert.deepEqual(lifecycle.get(typographyDocumentAtom), TYPOGRAPHY_DEFAULTS);
assert.deepEqual(
  lifecycle
    .get(taxonomyDocumentAtom)
    .terms.filter(
      (term) =>
        term.categoryId !==
        TYPOGRAPHY_DEFAULTS.metricNames["font-size"].categoryId,
    ),
  nonTypographyTerms,
);
assert.ok(lifecycle.get(browserTokenEditsAtom)["typography-font-size-100"]);
assert.ok(lifecycle.get(browserTokenEditsAtom).unrelated);
assert.equal(
  lifecycle.get(browserTokenEditsAtom)[`typography-${newId}-lineHeight-100`],
  undefined,
);
assert.deepEqual(
  lifecycle
    .get(browserTokenSourcesAtom)
    .filter((token) => token.type === "typography")
    .map((token) => token.id),
  [...initialConcepts],
);
assert.ok(
  buildTaxonomyExport(
    lifecycle.get(taxonomyDocumentAtom),
    lifecycle.get(publishedBrowserTokensAtom),
  ).tokens.some((token) => token.id.startsWith("typography-")),
  "unhiding restores publishing output",
);
console.log("Typography architecture checks passed.");
