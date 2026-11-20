// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { modeSetsAtom } from "../src/features/modes/documentState";
import {
  modeSelectionAtom,
  selectModeAtom,
} from "../src/features/modes/selection";
import { resetModeAtom } from "../src/features/modes/preview";
import { setPreviewParameterAtom } from "../src/features/modes/previewState";
import { liveColorDocumentAtom } from "../src/features/edit-session/previewSources";
import type { ColorSystemDocument } from "../src/features/color-system/model";
import { DEFAULT_COLOR_OUTPUT } from "../src/features/color-system/outputSettings";
import { computeColorPreview } from "../src/features/color-system/previewWork";
import { computeColorAnalysis } from "../src/features/color-system/analysisWork";
import {
  buildAnalysisScale,
  buildOutputProfile,
} from "../src/features/color-system/analysis";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import { generateSelectedColor } from "../src/features/color-system/colorScaleType";
import { scaleContrasts } from "../src/features/color-system/contrastSteps";
import {
  resolvedBackgroundLinear,
  surfaceCss,
} from "../src/features/color-system/surfaceGeneration";

const base = {
  id: "base",
  name: "Base",
  base: true,
  previewRole: "hidden" as const,
  showInPreview: true,
};
const document: ColorSystemDocument = {
  schemaVersion: 5,
  background: "#ffffff",
  backgroundScaleId: "neutral",
  backgroundLightness: 1,
  palette: [],
  dataVisScales: [],
  scales: [
    {
      id: "neutral",
      name: "Neutral",
      stops: [
        { id: "black", lightness: 0, hue: 0, chroma: 0 },
        { id: "white", lightness: 1, hue: 0, chroma: 0 },
      ],
    },
    {
      id: "blue",
      name: "Blue",
      stops: [
        { id: "dark-blue", lightness: 0.3, hue: 250, chroma: 30 },
        { id: "light-blue", lightness: 0.9, hue: 250, chroma: 10 },
      ],
    },
  ],
  contrasts: [
    { id: "preview-one", value: 1 },
    { id: "preview-three", value: 3 },
  ],
  surfaces: [base],
  settings: {
    side: "auto",
    backgroundBlend: 0.5,
    colorSourceCurveOffset: 0,
    guardThreshold: 0,
    colorOutput: { ...DEFAULT_COLOR_OUTPUT },
  },
};
const before = structuredClone(document);
const result = computeColorPreview({ document, surfaceId: base.id });
const background = resolvedBackgroundLinear(document);
assert.deepEqual(result.background, background);
assert.equal(result.backgroundCss, surfaceCss(base, document));
for (const scale of document.scales) {
  const data = buildScaleData(scale, document.settings.colorOutput);
  assert.deepEqual(
    result.generatedByScale.get(scale.id),
    scaleContrasts(document, scale).map((contrast) => ({
      selected: generateSelectedColor(
        data,
        background,
        contrast,
        document.settings,
      ),
      comparison: generateColors(
        data,
        background,
        contrast.value,
        document.settings,
      ),
    })),
  );
}
assert.deepEqual(document, before, "Preview computation does not author data.");
assert.deepEqual(
  structuredClone(result),
  result,
  "Worker output survives structured cloning without changing its values.",
);
const changed = computeColorPreview({
  document: { ...document, backgroundLightness: 0.9 },
  surfaceId: base.id,
});
assert.notEqual(changed.backgroundCss, result.backgroundCss);
assert.notDeepEqual(changed.generatedByScale, result.generatedByScale);
assert.deepEqual(
  [...changed.generatedByScale.keys()],
  [...result.generatedByScale.keys()],
  "An upstream edit preserves the preview's scale identities.",
);
assert.deepEqual(
  computeColorPreview({ document, surfaceId: "removed-surface" }),
  result,
  "A removed selection retains the existing first-surface fallback.",
);
assert.throws(
  () =>
    computeColorPreview({
      document: { ...document, surfaces: [] },
      surfaceId: "",
    }),
  /Choose an available Color preview surface/,
);
const analysisInput = {
  document,
  authoredContrasts: document.contrasts,
  referenceScaleId: "blue",
  surfaceId: base.id,
  includeOutput: true,
};
const analysis = computeColorAnalysis(analysisInput);
assert.equal(analysis.output.referenceId, "blue");
assert.equal(analysis.output.surfaceId, base.id);
const otherReference = computeColorAnalysis({
  ...analysisInput,
  referenceScaleId: "neutral",
});
assert.equal(otherReference.output.referenceId, "neutral");
assert.equal(
  analysis.output.referenceId,
  "blue",
  "A retained analysis result keeps its own reference identity during selection changes.",
);
assert.deepEqual(
  analysis.scales,
  document.scales.map((scale) =>
    buildAnalysisScale(scale, document.settings.colorOutput),
  ),
);
assert.deepEqual(
  analysis.output.profile,
  buildOutputProfile(document, document.scales[1], base, document.contrasts),
);
assert.deepEqual(analysis, structuredClone(analysis));
assert.deepEqual(
  computeColorAnalysis({ ...analysisInput, includeOutput: false }).output,
  {},
);
assert.notDeepEqual(
  computeColorAnalysis({
    ...analysisInput,
    document: { ...document, backgroundLightness: 0.9 },
  }).output.profile,
  analysis.output.profile,
);
assert.deepEqual(document, before);
const store = createStore();
const colorScheme = store
  .get(modeSetsAtom)
  .find((set) => set.key === "colorScheme")!;
const initialSelection = store.get(modeSelectionAtom);
const initialPreview = store.get(liveColorDocumentAtom);
store.set(resetModeAtom, {
  modeSetKey: colorScheme.key,
  modeId: colorScheme.defaultModeId,
});
assert.equal(store.get(modeSelectionAtom), initialSelection);
assert.equal(
  store.get(liveColorDocumentAtom),
  initialPreview,
  "Reselecting the implicit default must not invalidate the color generation input.",
);
const alternate = colorScheme.modes.find(
  (mode) => mode.id !== colorScheme.defaultModeId,
)!;
store.set(selectModeAtom, {
  modeSetKey: colorScheme.key,
  modeId: alternate.id,
});
const alternatePreview = store.get(liveColorDocumentAtom);
assert.notDeepEqual(
  alternatePreview,
  initialPreview,
  "Changing modes updates resolved color data.",
);
store.set(selectModeAtom, {
  modeSetKey: colorScheme.key,
  modeId: alternate.id,
});
assert.equal(store.get(liveColorDocumentAtom), alternatePreview);
store.set(setPreviewParameterAtom, {
  parameterId: "color.backgroundLightness",
  value: 0.5,
});
assert.notDeepEqual(store.get(liveColorDocumentAtom), alternatePreview);
store.set(resetModeAtom, { modeSetKey: colorScheme.key, modeId: alternate.id });
assert.deepEqual(
  store.get(liveColorDocumentAtom),
  alternatePreview,
  "An explicit mode reset still clears genuine preview overrides.",
);
console.log(
  "Color preview/canonical output and upstream propagation checks passed.",
);
