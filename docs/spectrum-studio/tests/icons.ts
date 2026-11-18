// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "../src/features/typography/model";
import { textZoomMultiplier } from "../src/features/typography/typeScale";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { ICONS_DEFAULTS } from "../src/features/icons/defaults";
import {
  WORKFLOW_ICON_SCALE_ID,
  isIconsDocument,
  type IconScale,
  type IconsDocument,
} from "../src/features/icons/model";
import {
  MISSING_ICON_LINE_HEIGHT,
  generateIconScale,
  iconScaleRange,
  iconsGenerationIssues,
  workflowIconSizes,
} from "../src/features/icons/generate";
import {
  splitTypographyIconography,
  upgradeIconsSnapshot,
} from "../src/features/icons/upgrade";
import {
  addIconScaleAtom,
  generatedIconsAtom,
  iconsDocumentAtom,
  patchIconScale,
  removeIconScaleAtom,
  restoreIconScaleAtom,
  updateIconScaleAtom,
  updateIconsSettingsAtom,
} from "../src/features/icons/state";
import { buildIconScaleComparisons } from "../src/features/icons/comparisons";
import {
  SPECTRUM_ICON_OPTIONS,
  filterSpectrumIcons,
  spectrumIconLabel,
} from "../src/features/icons/iconSearch";
import {
  addLineHeightAtom,
  lineHeightConsumers,
  removeLineHeightAtom,
  restoreLineHeightAtom,
  typographyDocumentAtom,
} from "../src/features/typography/state";
import {
  createDefaultSnapshot,
  enterEditModeAtom,
} from "../src/features/edit-session/state";

const near = (actual: number, expected: number, message?: string) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-6,
    message ?? `${actual} ≈ ${expected}`,
  );
const workflow = ICONS_DEFAULTS.scales.find(
  (scale) => scale.id === WORKFLOW_ICON_SCALE_ID,
)!;
const withWorkflow = (patch: Parameters<typeof patchIconScale>[1]) => ({
  ...ICONS_DEFAULTS,
  scales: [patchIconScale(workflow, patch)],
});

// Shipped defaults are valid and Workflow keeps the line height alignment it had under Typography.
assert.ok(isIconsDocument(ICONS_DEFAULTS));
assert.equal(workflow.source, "line-height");
assert.equal(workflow.lineHeightId, "component");
for (let zoom = TEXT_ZOOM_MIN; zoom <= TEXT_ZOOM_MAX; zoom++)
  assert.equal(
    workflowIconSizes(ICONS_DEFAULTS, TYPOGRAPHY_DEFAULTS, zoom).length,
    TYPOGRAPHY_DEFAULTS.smallSizes + TYPOGRAPHY_DEFAULTS.largeSizes + 1,
    "Workflow publishes one icon size per type step",
  );

// Document rules.
assert.ok(
  !isIconsDocument({ ...ICONS_DEFAULTS, scales: [] }),
  "Workflow is required",
);
assert.ok(
  !isIconsDocument({
    ...ICONS_DEFAULTS,
    scales: [workflow, { ...workflow, id: "other", name: "WORKFLOW" }],
  }),
  "scale names are unique ignoring case",
);
assert.ok(
  !isIconsDocument({
    ...ICONS_DEFAULTS,
    scales: [{ ...workflow, roundingRuleId: "another-rule" }],
  }),
  "every scale uses the document rounding rule",
);
assert.ok(
  !isIconsDocument({
    ...ICONS_DEFAULTS,
    scales: [{ ...workflow, lineHeightId: undefined }],
  }),
  "line height scales name a line height",
);
assert.ok(
  !isIconsDocument({ ...ICONS_DEFAULTS, minIconSize: 40, maxIconSize: 20 }),
);

// Changing the size source starts from that source's own settings.
const followed = patchIconScale(workflow, {
  source: "follow-typography",
  base: 20,
});
assert.equal(followed.lineHeightId, undefined);
assert.equal(followed.base, 20);
assert.ok(isIconsDocument({ ...ICONS_DEFAULTS, scales: [followed] }));
const geometric = SCALE_TYPE_DEFAULTS[1];
const formula = patchIconScale(followed, {
  source: "formula",
  scaleTypeId: geometric.id,
});
assert.equal(formula.scaleTypeId, geometric.id);
assert.deepEqual(formula.parameters, {}, "a new formula drops old parameters");
assert.equal(
  patchIconScale(formula, { source: "line-height" }, "body").lineHeightId,
  "body",
  "switching to Line height picks the fallback line height",
);
assert.equal(
  patchIconScale(formula, { below: -3, above: 2 }).below,
  0,
  "ranges are clamped",
);

// Generation for each size source.
for (let zoom = TEXT_ZOOM_MIN; zoom <= TEXT_ZOOM_MAX; zoom++) {
  const small = generateIconScale(
    ICONS_DEFAULTS,
    patchIconScale(workflow, { source: "follow-typography", base: 16 }),
    TYPOGRAPHY_DEFAULTS,
    zoom,
  );
  const large = generateIconScale(
    ICONS_DEFAULTS,
    patchIconScale(workflow, { source: "follow-typography", base: 32 }),
    TYPOGRAPHY_DEFAULTS,
    zoom,
  );
  near(
    large.find((value) => value.index === 0)!.raw /
      small.find((value) => value.index === 0)!.raw,
    2,
    "Follow Typography scales its base with the type scale",
  );
}
const custom: IconScale = {
  ...patchIconScale(workflow, {
    source: "formula",
    scaleTypeId: geometric.id,
    base: 20,
    parameters: { ratio: 1.5 },
  }),
  id: "custom",
  name: "Large",
  below: 2,
  above: 3,
};
const customDocument: IconsDocument = {
  ...ICONS_DEFAULTS,
  scales: [workflow, custom],
};
assert.ok(isIconsDocument(customDocument));
assert.deepEqual(iconScaleRange(custom, TYPOGRAPHY_DEFAULTS), {
  below: 2,
  above: 3,
});
assert.deepEqual(iconScaleRange(workflow, TYPOGRAPHY_DEFAULTS), {
  below: TYPOGRAPHY_DEFAULTS.smallSizes,
  above: TYPOGRAPHY_DEFAULTS.largeSizes,
});
for (const zoom of [TEXT_ZOOM_MIN, 0, TEXT_ZOOM_MAX]) {
  const values = generateIconScale(
    customDocument,
    custom,
    TYPOGRAPHY_DEFAULTS,
    zoom,
  );
  assert.equal(values.length, 6);
  near(
    values.find((value) => value.index === 0)!.raw /
      textZoomMultiplier(TYPOGRAPHY_DEFAULTS, zoom),
    20,
    "Formula scales follow Typography text zoom",
  );
  assert.ok(
    values.every(
      (value, index) => index === 0 || value.raw > values[index - 1].raw,
    ),
  );
}
const clamped = generateIconScale(
  { ...customDocument, minIconSize: 18, maxIconSize: 24 },
  custom,
  TYPOGRAPHY_DEFAULTS,
  0,
);
assert.ok(clamped.every((value) => value.value >= 18 && value.value <= 24));

// Missing line heights are reported instead of producing broken sizes.
const missing = withWorkflow({ lineHeightId: "missing" });
assert.deepEqual(iconsGenerationIssues(missing, TYPOGRAPHY_DEFAULTS), [
  `Workflow: ${MISSING_ICON_LINE_HEIGHT}`,
]);
assert.throws(
  () => workflowIconSizes(missing, TYPOGRAPHY_DEFAULTS),
  new RegExp(MISSING_ICON_LINE_HEIGHT),
);
assert.deepEqual(
  iconsGenerationIssues(customDocument, TYPOGRAPHY_DEFAULTS),
  [],
);

// Typography schema 11 moves its Iconography settings into Icons.
for (const iconography of [
  { alignment: "text", baseSize: 20 },
  { alignment: "line-height", baseSize: 16, lineHeightId: "body" },
] as const) {
  const legacy = { ...TYPOGRAPHY_DEFAULTS, schemaVersion: 11, iconography };
  const split = splitTypographyIconography(legacy);
  assert.equal(split.typography.schemaVersion, 12);
  assert.ok(!("iconography" in split.typography));
  assert.ok(isIconsDocument(split.icons));
  const scale = split.icons!.scales[0];
  assert.equal(scale.base, iconography.baseSize);
  assert.equal(
    scale.source,
    iconography.alignment === "text" ? "follow-typography" : "line-height",
  );
  assert.equal(
    scale.lineHeightId,
    "lineHeightId" in iconography ? iconography.lineHeightId : undefined,
  );
  const snapshot = upgradeIconsSnapshot({ typography: legacy }) as {
    typography: { schemaVersion: number };
    icons: IconsDocument;
  };
  assert.equal(snapshot.typography.schemaVersion, 12);
  assert.deepEqual(snapshot.icons, split.icons);
  const kept = upgradeIconsSnapshot({
    typography: legacy,
    icons: customDocument,
  }) as { icons: IconsDocument };
  assert.strictEqual(kept.icons, customDocument, "existing Icons are kept");
}
const current = { typography: TYPOGRAPHY_DEFAULTS, icons: ICONS_DEFAULTS };
assert.strictEqual(upgradeIconsSnapshot(current), current);
assert.strictEqual(
  splitTypographyIconography(TYPOGRAPHY_DEFAULTS).typography,
  TYPOGRAPHY_DEFAULTS,
);

// Analysis compares every text zoom setting through the shared generator.
const { modeSets } = createDefaultSnapshot();
const comparisons = buildIconScaleComparisons(
  customDocument,
  custom,
  TYPOGRAPHY_DEFAULTS,
  modeSets,
);
assert.equal(comparisons.zoom.metrics.length, 1);
assert.equal(comparisons.zoom.metrics[0].label, "Large");
assert.equal(comparisons.zoom.steps.length, 6);
assert.ok(comparisons.zoom.steps.some((step) => step.isRequired));
comparisons.zoom.settings.forEach((setting, index) => {
  assert.deepEqual(
    comparisons.zoom.metrics[0].rows[index].map((point) => point.value),
    generateIconScale(
      customDocument,
      custom,
      { ...TYPOGRAPHY_DEFAULTS, textSize: setting.textSize },
      setting.textZoom,
    ).map((value) => value.value),
  );
});
assert.throws(
  () =>
    buildIconScaleComparisons(
      missing,
      missing.scales[0],
      TYPOGRAPHY_DEFAULTS,
      modeSets,
    ),
  /could not be calculated/,
);

// Icon search.
assert.equal(spectrumIconLabel("ChevronDownSmall"), "Chevron Down Small");
assert.ok(SPECTRUM_ICON_OPTIONS.length > 0);
assert.strictEqual(
  filterSpectrumIcons(SPECTRUM_ICON_OPTIONS, "  "),
  SPECTRUM_ICON_OPTIONS,
);
const sample = SPECTRUM_ICON_OPTIONS[0];
assert.ok(
  filterSpectrumIcons(SPECTRUM_ICON_OPTIONS, sample.label.toUpperCase()).some(
    (option) => option.id === sample.id,
  ),
  "search ignores case and spaces",
);
assert.deepEqual(
  filterSpectrumIcons(SPECTRUM_ICON_OPTIONS, "zzzz-not-an-icon"),
  [],
);

// Authoring through state.
const store = createStore();
assert.throws(
  () => store.set(addIconScaleAtom),
  /edit mode/,
  "Icons changes need edit mode",
);
store.set(enterEditModeAtom);
const addedId = store.set(addIconScaleAtom);
let document = store.get(iconsDocumentAtom);
assert.equal(document.scales.length, 2);
const added = document.scales.find((scale) => scale.id === addedId)!;
assert.equal(added.name, "Scale 2");
assert.equal(added.source, workflow.source, "new scales copy Workflow");
assert.equal(store.get(generatedIconsAtom).length, 2);
assert.ok(store.get(generatedIconsAtom).every((scale) => !scale.issue));
assert.equal(
  store.set(updateIconScaleAtom, { id: addedId, patch: { name: "workflow" } }),
  false,
  "a taken name is refused",
);
assert.equal(store.get(iconsDocumentAtom), document);
assert.equal(
  store.set(updateIconScaleAtom, {
    id: addedId,
    patch: { name: " Large ", source: "follow-typography", base: 24 },
  }),
  true,
);
document = store.get(iconsDocumentAtom);
assert.equal(document.scales[1].name, "Large");
assert.equal(document.scales[1].lineHeightId, undefined);
store.set(updateIconsSettingsAtom, { minIconSize: 10, maxIconSize: 120 });
assert.equal(store.get(iconsDocumentAtom).maxIconSize, 120);
assert.throws(() =>
  store.set(updateIconsSettingsAtom, { roundingRuleId: "missing-rule" }),
);
assert.throws(() =>
  store.set(updateIconsSettingsAtom, { minIconSize: 200, maxIconSize: 10 }),
);
assert.equal(
  store.set(removeIconScaleAtom, WORKFLOW_ICON_SCALE_ID),
  undefined,
  "Workflow cannot be removed",
);
const removed = store.set(removeIconScaleAtom, addedId)!;
assert.equal(store.get(iconsDocumentAtom).scales.length, 1);
store.set(restoreIconScaleAtom, removed);
assert.deepEqual(
  store.get(iconsDocumentAtom).scales.map((scale) => scale.id),
  [WORKFLOW_ICON_SCALE_ID, addedId],
);

// Removing a line height that Icons uses moves those scales to the replacement, and undo moves them back.
const iconLineHeight = store.set(addLineHeightAtom);
store.set(updateIconScaleAtom, {
  id: WORKFLOW_ICON_SCALE_ID,
  patch: { source: "line-height", lineHeightId: iconLineHeight },
});
assert.ok(
  lineHeightConsumers(
    store.get(typographyDocumentAtom),
    iconLineHeight,
    store.get(iconsDocumentAtom),
  ).includes("Icons › Workflow"),
);
assert.throws(() => store.set(removeLineHeightAtom, { id: iconLineHeight }));
const removedLineHeight = store.set(removeLineHeightAtom, {
  id: iconLineHeight,
  replacementId: "component",
});
assert.deepEqual(removedLineHeight.iconScaleIds, [WORKFLOW_ICON_SCALE_ID]);
assert.equal(store.get(iconsDocumentAtom).scales[0].lineHeightId, "component");
store.set(restoreLineHeightAtom, removedLineHeight);
assert.equal(
  store.get(iconsDocumentAtom).scales[0].lineHeightId,
  iconLineHeight,
);

console.log("Icons checks passed.");
