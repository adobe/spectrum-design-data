// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createColorDefaults,
  designSystemDefaults,
} from "../src/data/defaults";
import {
  grayDarkRatios,
  grayIndices,
  grayLightRatios,
} from "./fixtures/grayDefaults";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../src/features/color-system/contrastSteps";
import {
  buildScaleData,
  resolveScaleColorAtLightness,
} from "../src/features/color-system/scaleGeneration";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import {
  effectiveContrast,
  multiplyContrast,
  polarityContext,
} from "../src/features/color-system/polarity";
import { generateColorTokensForScale } from "../src/features/tokens/generation";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import { modeSetDefaultMode, type Mode } from "../src/features/modes/model";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import {
  defaultsAnalysisInput,
  projectAuthoringDataset,
} from "../src/features/design-data/projection";
import { outputInventory } from "../src/features/design-data/materialization";
import { generatedColorTokensAtom } from "../src/features/tokens/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { tokenIdentity } from "../src/features/tokens/canonicalIdentity";
import {
  browserTokenImpactRecordsAtom,
  savedBrowserConceptIdsAtom,
} from "../src/features/tokens/browserSavedState";
import { changeGroupsAtom } from "../src/features/changelog/state";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import {
  colorSchemeDocumentsAtom,
  contrastModesAtom,
  cssBaseDocumentAtom,
  customContrastModeDocumentsAtom,
} from "../src/features/color-system/state";

const color = createColorDefaults();
const gray = color.scales[0];
const custom = gray.customContrasts!;
const rules = designSystemDefaults.system.rules;
assert.equal(gray.id, "scale-gray");
assert.equal(gray.name, "gray");
assert.equal(
  color.scales[1].name,
  "silver",
  "Gray is added, not renamed from Silver.",
);
assert.equal(
  color.backgroundScaleId,
  gray.id,
  "The authored Gray scale supplies the current background.",
);
assert.equal(gray.stops.length, 1);
assert.equal(gray.stops[0].chroma, 0);
assert.equal(
  resolveScaleColorAtLightness(gray, gray.stops[0].lightness).hex,
  "#777777",
);
assert.equal(buildScaleData(gray).neutral, true);
assert.deepEqual(
  custom.steps.map((step) => step.value),
  grayLightRatios,
);
assert.deepEqual(
  custom.steps.map((step) => step.oppositeValue),
  grayDarkRatios,
);
assert.equal(new Set(custom.steps.map((step) => step.id)).size, 13);
assert.equal(custom.baseContrastId, custom.steps[3].id);
assert.equal(custom.namingRuleId, "rule-standard-scale-naming");
assert.deepEqual(
  custom.steps.map((_, index) => contrastStepIndex(index, gray, rules)),
  grayIndices,
);
assert.equal(color.contrasts.length, 16);
assert.ok(
  color.scales
    .slice(1)
    .every(
      (scale) =>
        !scale.customContrasts && scaleContrasts(color, scale).length === 16,
    ),
);
assert.doesNotThrow(() =>
  composeDesignSystemDefaults(
    canonicalDesignSystemDataset(designSystemDefaults),
    designSystemDefaults.system.scaleTypes,
  ),
);

const sets = designSystemDefaults.system.modeSets;
const scheme = sets.find((axis) => axis.key === "colorScheme")!;
const contrast = sets.find((axis) => axis.key === "contrast")!;
let lightIds: string[] | undefined;
for (const dark of [false, true])
  for (const high of [false, true]) {
    const modes = sets
      .map((axis) =>
        axis.id === scheme.id
          ? axis.modes.find((mode) => mode.key === (dark ? "dark" : "light"))
          : axis.id === contrast.id && high
            ? axis.modes.find((mode) => mode.key === "high")
            : modeSetDefaultMode(axis),
      )
      .filter((mode): mode is Mode => !!mode);
    const document = resolveColorDocument(color, modes, undefined, {
      modeSets: sets,
    });
    const resolvedGray = document.scales[0];
    const context = polarityContext(document);
    const expected = custom.steps.map((step) =>
      multiplyContrast(effectiveContrast(step, context), high ? 2 : 1),
    );
    assert.deepEqual(
      resolvedGray.customContrasts!.steps.map((step) => step.value),
      expected,
    );
    const tokens = generateColorTokensForScale(
      resolvedGray,
      document.contrasts,
      resolvedBackgroundLinear(document),
      document.settings,
      document.settings.colorOutput,
      rules,
    );
    assert.deepEqual(
      tokens.map((token) => Number(token.name.contrastValue)),
      grayIndices,
    );
    assert.ok(tokens.every((token) => token.name.colorName === "gray"));
    if (lightIds)
      assert.deepEqual(
        tokens.map((token) => token.uuid),
        lightIds,
        "Light/Dark and contrast modes preserve swatch identities.",
      );
    else lightIds = tokens.map((token) => token.uuid);
  }
assert.deepEqual(
  color.scales[0].customContrasts!.steps.map((step) => step.value),
  grayLightRatios,
);

const shipped = defaultsAnalysisInput();
const comparisonWithGray = structuredClone(designSystemDefaults);
comparisonWithGray.system.foundations.color.backgroundScaleId =
  color.scales[1].id;
const comparison = projectAuthoringDataset(comparisonWithGray, shipped.source);
const withoutGray = structuredClone(comparisonWithGray);
withoutGray.system.foundations.color.scales =
  withoutGray.system.foundations.color.scales.slice(1);
withoutGray.system.foundations.color.backgroundScaleId =
  withoutGray.system.foundations.color.scales[0].id;
const before = projectAuthoringDataset(withoutGray, shipped.source);
assert.deepEqual(shipped.errors, []);
assert.deepEqual(comparison.errors, []);
assert.deepEqual(before.errors, []);
const previousTokens = new Map(
  before.records
    .filter((record) => record.category === "tokens")
    .map((record) => [record.id, record]),
);
const currentTokens = new Map(
  comparison.records
    .filter((record) => record.category === "tokens")
    .map((record) => [record.id, record]),
);
for (const [id, token] of previousTokens)
  assert.deepEqual(
    currentTokens.get(id),
    token,
    "All pre-existing token rows remain unchanged.",
  );
const added = [...currentTokens.values()].filter(
  (token) => !previousTokens.has(token.id),
);
assert.equal(
  new Set(added.map((token) => token.conceptId)).size,
  grayIndices.length,
  "Thirteen swatches are published; contrast ratios remain authored inputs.",
);
assert.equal(
  added.length,
  grayIndices.length * scheme.modes.length * contrast.modes.length,
  "Only existing color-owned mode combinations are emitted.",
);
assert.ok(added.every((token) => token.classification === "generated"));
assert.equal(
  outputInventory(shipped).counts.explicitAssignments,
  0,
  "Shipped ratios are generation inputs, not manual token assignments.",
);

const store = createStore();
assert.equal(
  store
    .get(generatedColorTokensAtom)
    .filter((token) => token.source.scaleId === gray.id).length,
  13,
);
const grayConceptIds = lightIds!.map((id) => {
  const identity = tokenIdentity(store.get(browserTokenEditsAtom), id);
  assert.ok(identity);
  return identity.conceptId;
});
assert.ok(
  grayConceptIds.every((id) => store.get(savedBrowserConceptIdsAtom).has(id)),
);
const impact = store
  .get(browserTokenImpactRecordsAtom)
  .filter((record) => grayConceptIds.includes(record.tokenId));
assert.equal(impact.length, 13);
assert.ok(
  impact.every(
    (record) =>
      !record.nameChanged &&
      !record.manuallyOverridden &&
      record.modeValues.every((value) => !value.changed),
  ),
);
assert.equal(
  store.get(changeGroupsAtom).flatMap((group) => group.items).length,
  0,
  "Gray is part of the shipped baseline, not a working edit.",
);
const css = buildColorLibrary(
  store.get(cssBaseDocumentAtom),
  store.get(colorSchemeDocumentsAtom),
  store.get(contrastModesAtom),
  designSystemDefaults.system.taxonomy,
  rules,
  store.get(customContrastModeDocumentsAtom),
);
assert.ok(css.includes(".color-scale-gray.color-contrast-25"));
assert.ok(css.includes(".color-scale-gray.color-contrast-1000"));
const darkDocument = store
  .get(colorSchemeDocumentsAtom)
  .find((mode) => mode.key === "dark")!.document;
const darkGray = darkDocument.scales.find((scale) => scale.id === gray.id)!;
for (const [index, step] of darkGray.customContrasts!.steps.entries())
  assert.ok(
    css.includes(
      `--contrast-gray-${grayIndices[index]}: ${Number(step.value.toFixed(6))};`,
    ),
    "CSS uses the resolved Dark ratios, including its non-black background.",
  );
console.log(
  "Gray defaults: authored ratios, resolved modes and CSS, canonical identities, isolated addition and generated baselines passed.",
);
