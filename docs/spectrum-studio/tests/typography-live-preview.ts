// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { designSystemDefaults } from "../src/data/defaults";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import {
  buildTypographyCss,
  buildTypographyPreviewCss,
} from "../src/features/typography/typographyCss";
import { generateTypography } from "../src/features/typography/typographyGeneration";
import { TYPOGRAPHY_UNITS } from "../src/features/typography/units";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { TYPOGRAPHY_INTERPOLATIONS } from "../src/features/typography/lineHeightInterpolations";
import { ICONS_DEFAULTS } from "../src/features/icons/defaults";
import { computeTypographyAnalysis } from "../src/features/typography/analysisWork";
import { buildTypographyComparisons } from "../src/features/typography/comparisons";
import {
  computeTypographyPreview,
  TYPOGRAPHY_PREVIEW_SCOPE,
} from "../src/features/typography/previewWork";

const registry = designSystemDefaults.system.taxonomy;
const scope = ".liveTypography";
for (const outputUnit of TYPOGRAPHY_UNITS) {
  for (const textZoom of [-4, 3, 8]) {
    const document = { ...TYPOGRAPHY_DEFAULTS, outputUnit, textZoom };
    const tokens = generateTypography(document);
    const before = structuredClone({ document, tokens, registry });
    const preview = buildTypographyPreviewCss(
      document,
      tokens,
      scope,
      registry,
    );
    const complete = buildTypographyCss(document, {
      scope,
      purpose: "authoring",
      registry,
    });
    assert.deepEqual(
      preview.split("\n").slice(1, -1),
      complete.slice(0, complete.indexOf("}")).split("\n").slice(1, -1),
      `The active ${outputUnit}/${textZoom} preview agrees with complete output.`,
    );
    assert.equal(
      preview.match(/\{/g)?.length,
      1,
      "A live preview emits only the active context.",
    );
    assert.equal(complete.match(/\{/g)?.length, 13);
    assert.deepEqual({ document, tokens, registry }, before);
  }
}

const hidden = { ...TYPOGRAPHY_DEFAULTS, hideFromPublishing: true };
const values = generateTypography(hidden);
assert.notEqual(
  buildTypographyPreviewCss(hidden, values, scope, registry),
  "",
  "Unpublished authoring data remains visible in previews.",
);
assert.equal(buildTypographyCss(hidden, { registry }), "");
assert.notEqual(
  buildTypographyPreviewCss(hidden, [], scope, registry),
  buildTypographyPreviewCss(hidden, values, scope, registry),
  "Preview CSS consumes the supplied active values rather than regenerating.",
);
const source = {
  document: TYPOGRAPHY_DEFAULTS,
  resolved: { ...TYPOGRAPHY_DEFAULTS, textZoom: 3 },
  rules: [...RULE_DEFAULTS],
  scaleTypes: [...SCALE_TYPE_DEFAULTS],
  interpolations: [...TYPOGRAPHY_INTERPOLATIONS],
  registry,
  icons: ICONS_DEFAULTS,
};
const active = computeTypographyPreview(source);
assert.deepEqual(
  active.tokens,
  generateTypography(
    source.resolved,
    undefined,
    source.rules,
    source.scaleTypes,
    source.interpolations,
    source.icons,
  ),
);
assert.equal(
  active.css,
  buildTypographyPreviewCss(
    source.resolved,
    active.tokens,
    TYPOGRAPHY_PREVIEW_SCOPE,
    registry,
  ),
);
assert.notEqual(source.document.textZoom, source.resolved.textZoom);
const analysisInput = {
  document: source.document,
  registry: source.registry,
  modeSets: [],
  rules: source.rules,
  scaleTypes: source.scaleTypes,
  interpolations: source.interpolations,
  icons: source.icons,
};
const analysis = computeTypographyAnalysis(analysisInput);
assert.deepEqual(
  analysis,
  buildTypographyComparisons(
    analysisInput.document,
    analysisInput.modeSets,
    analysisInput.registry,
    analysisInput,
  ),
);
assert.deepEqual(structuredClone(analysis), analysis);
const scaledAnalysis = computeTypographyAnalysis({
  ...analysisInput,
  document: {
    ...source.document,
    textSize: source.document.textSize * 1.1,
  },
});
assert.notDeepEqual(scaledAnalysis.zoom.metrics, analysis.zoom.metrics);
assert.deepEqual(scaledAnalysis.zoom.steps, analysis.zoom.steps);
const previewAnalysis = computeTypographyAnalysis({
  ...analysisInput,
  preview: { textZoom: 3, textSize: source.document.textSize },
});
assert.deepEqual(previewAnalysis.zoom.metrics, analysis.zoom.metrics);
assert.deepEqual(previewAnalysis.modes, analysis.modes);
assert.deepEqual(
  previewAnalysis.zoom.settings.find(
    (setting) => setting.id === `zoom:${source.document.textZoom}`,
  ),
  analysis.zoom.settings.find(
    (setting) => setting.id === `zoom:${source.document.textZoom}`,
  ),
  "An adaptive preview does not rename or replace the authored Default.",
);
assert.equal(
  previewAnalysis.zoom.settings.find((setting) => setting.id === "zoom:3")
    ?.isRequired,
  true,
);
assert.match(
  previewAnalysis.zoom.settings.find((setting) => setting.id === "zoom:3")!
    .label,
  /preview/,
);
const sizedPreview = computeTypographyAnalysis({
  ...analysisInput,
  preview: { textZoom: 3, textSize: source.document.textSize * 1.1 },
});
const previewIndex = sizedPreview.zoom.settings.findIndex(
  (setting) => setting.id === "preview",
);
assert(previewIndex >= 0);
assert.deepEqual(
  sizedPreview.zoom.metrics.map((metric) => metric.rows[previewIndex]),
  scaledAnalysis.zoom.metrics.map(
    (metric) =>
      metric.rows[
        scaledAnalysis.zoom.settings.findIndex(
          (setting) => setting.textZoom === 3,
        )
      ],
  ),
);
assert.deepEqual(sizedPreview.modes, analysis.modes);
console.log("Active Typography preview/output agreement checks passed.");
