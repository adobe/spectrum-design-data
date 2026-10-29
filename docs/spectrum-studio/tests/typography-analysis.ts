// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { designSystemDefaults } from "../src/data/defaults";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import { NO_ROUNDING_RULE_ID } from "../src/features/logic/model";
import type { Mode, ModeSet } from "../src/features/modes/model";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { generateScale } from "../src/features/scales/generate";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import { TYPOGRAPHY_INTERPOLATIONS } from "../src/features/typography/lineHeightInterpolations";
import {
  buildTypeScaleComparisons,
  buildTypographyComparisons,
  comparisonSelection,
  comparisonSeries,
  defaultComparisonSelection,
  textSizeComparisonSettings,
} from "../src/features/typography/comparisons";
import {
  generateTypography,
  typographyScaleSettings,
} from "../src/features/typography/typographyGeneration";
import {
  toTypographyUnit,
  TYPOGRAPHY_UNITS,
} from "../src/features/typography/units";
import { graphSeriesStyle } from "../src/components/logic/scaleGraphAppearance";

const registry = designSystemDefaults.system.taxonomy;
const library = {
  rules: RULE_DEFAULTS,
  scaleTypes: SCALE_TYPE_DEFAULTS,
  interpolations: TYPOGRAPHY_INTERPOLATIONS,
};
const mode = (id: string, value?: number): Mode => ({
  id,
  key: id,
  name: id,
  description: "",
  iconId: "none",
  platformIds: [],
  foundations: value === undefined ? {} : { typography: { textZoom: value } },
});
const owner: ModeSet = {
  id: "text-size",
  key: "textSize",
  name: "Text size",
  description: "",
  defaultModeId: "default",
  authoringCapabilities: ["typography.textZoom"],
  modes: [
    mode("default", 8),
    mode("smaller", -1),
    mode("large", 4),
    mode("same", 4),
  ],
};
const other: ModeSet = {
  ...owner,
  id: "unrelated",
  authoringCapabilities: [],
  defaultModeId: "unrelated-default",
  modes: [mode("unrelated-default"), mode("unrelated-mode", 8)],
};
const sets = [owner, other];
const original = structuredClone(sets);

for (const outputUnit of TYPOGRAPHY_UNITS) {
  for (const alignment of ["text", "line-height"] as const) {
    const document = {
      ...structuredClone(TYPOGRAPHY_DEFAULTS),
      outputUnit,
      textZoom: 3,
      iconography:
        alignment === "text"
          ? { alignment, baseSize: 18 }
          : { alignment, baseSize: 18, lineHeightId: "heading" },
    };
    const before = structuredClone(document);
    const datasets = buildTypographyComparisons(
      document,
      sets,
      registry,
      library,
    );
    assert.equal(datasets.zoom.settings.length, 13);
    assert.equal(
      datasets.zoom.settings.filter((setting) => setting.isRequired).length,
      1,
    );
    assert.equal(
      datasets.zoom.settings.find((setting) => setting.isRequired)!.textZoom,
      3,
    );
    assert.equal(
      datasets.modes!.settings.find((setting) => setting.isRequired)!.textZoom,
      3,
      "Default mode inherits the shared base, not its stale override.",
    );
    assert.deepEqual(
      datasets.modes!.settings.map((setting) => setting.id),
      ["smaller", "default", "large", "same"],
    );
    assert.equal(defaultComparisonSelection(datasets.zoom.settings).length, 3);
    assert.deepEqual(
      defaultComparisonSelection(datasets.zoom.steps, "tokens"),
      datasets.zoom.steps.map((step) => step.id),
    );
    assert.deepEqual(
      defaultComparisonSelection(datasets.modes!.steps, "tokens"),
      datasets.modes!.steps.map((step) => step.id),
    );
    assert.deepEqual(comparisonSelection(datasets.zoom.settings, []), [
      "zoom:3",
    ]);
    assert.deepEqual(comparisonSelection(datasets.zoom.steps, ["removed"]), [
      "100",
    ]);
    for (const dataset of [datasets.zoom, datasets.modes!]) {
      for (const [row, setting] of dataset.settings.entries()) {
        const expected = generateTypography(
          document,
          setting.textZoom,
          library.rules,
          library.scaleTypes,
          library.interpolations,
        );
        for (const [column, token] of expected.entries()) {
          assert.equal(
            dataset.metrics.find((metric) => metric.id === "font-size")!.rows[
              row
            ][column].value,
            toTypographyUnit(token.fontSize, outputUnit),
          );
          assert.equal(
            dataset.metrics.find(
              (metric) => metric.id === "workflow-icon-size",
            )!.rows[row][column].value,
            toTypographyUnit(token.iconSize, outputUnit),
          );
          for (const card of document.lineHeights) {
            const metric = dataset.metrics.find(
              (metric) => metric.id === `${card.id}-lineHeight`,
            )!;
            assert.equal(
              metric.rows[row][column].value,
              toTypographyUnit(token.lineHeights[card.id].length, outputUnit),
            );
            assert.match(metric.rows[row][column].detail!, /multiplier/);
          }
        }
      }
      for (const metric of dataset.metrics) {
        const bySetting = comparisonSeries(
          dataset,
          metric,
          "settings",
          dataset.settings.map((setting) => setting.id),
        );
        const byToken = comparisonSeries(
          dataset,
          metric,
          "tokens",
          dataset.steps.map((step) => step.id),
        );
        assert.equal(bySetting.filter((line) => line.isBaseline).length, 1);
        assert.equal(byToken.filter((line) => line.isBaseline).length, 1);
        for (let row = 0; row < dataset.settings.length; row++) {
          for (let column = 0; column < dataset.steps.length; column++) {
            assert.equal(
              bySetting[row].points[column].value,
              byToken[column].points[row].value,
            );
            assert.equal(
              bySetting[row].points[column].raw,
              byToken[column].points[row].raw,
            );
          }
        }
        assert.equal(
          comparisonSeries(dataset, metric, "settings", []).length,
          1,
        );
        assert.equal(
          comparisonSeries(dataset, metric, "tokens", [])[0].id,
          "100",
        );
      }
    }
    assert.deepEqual(
      datasets.modes!.metrics[0].rows[2],
      datasets.modes!.metrics[0].rows[3],
    );
    assert.notEqual(
      datasets.modes!.settings[2].id,
      datasets.modes!.settings[3].id,
    );
    assert.deepEqual(document, before);
  }
}
assert.deepEqual(
  sets,
  original,
  "Evaluation must never mutate authored modes.",
);
assert.equal(
  textSizeComparisonSettings(TYPOGRAPHY_DEFAULTS, [other]).modes,
  undefined,
);
assert.throws(
  () =>
    textSizeComparisonSettings({ ...TYPOGRAPHY_DEFAULTS, textZoom: NaN }, sets),
  /valid Text size/,
);
assert.throws(
  () =>
    textSizeComparisonSettings(TYPOGRAPHY_DEFAULTS, [
      { ...owner, defaultModeId: "missing" },
    ]),
  /available default/,
);
assert.throws(
  () =>
    textSizeComparisonSettings(TYPOGRAPHY_DEFAULTS, [
      { ...owner, modes: [mode("default"), mode("invalid", NaN)] },
    ]),
  /valid Text size/,
);

const document = {
  ...structuredClone(TYPOGRAPHY_DEFAULTS),
  textZoom: 3,
  componentSize: "xl" as const,
  minTextSize: 300,
  maxTextSize: 300,
};
const formula = structuredClone(SCALE_TYPE_DEFAULTS[0]);
formula.base.default = 24;
formula.parameters[0].default = 1.2;
formula.textSizeAdaptation!.ratioAtSmallest = 1.1;
formula.textSizeAdaptation!.ratioAtLargest = 1.05;
const options = {
  below: 9,
  above: 40,
  roundingRuleId: NO_ROUNDING_RULE_ID,
  rules: RULE_DEFAULTS,
  interpolations: TYPOGRAPHY_INTERPOLATIONS,
};
const formulaDatasets = buildTypeScaleComparisons(
  formula,
  document,
  sets,
  options,
);
assert.equal(formulaDatasets.zoom.steps.length, 50);
assert.equal(formulaDatasets.zoom.metrics.length, 1);
for (const [row, setting] of formulaDatasets.zoom.settings.entries()) {
  const settings = typographyScaleSettings(
    {
      ...document,
      componentSize: "m",
      smallSizes: 9,
      largeSizes: 40,
      textRoundingRuleId: NO_ROUNDING_RULE_ID,
    },
    [formula],
    TYPOGRAPHY_INTERPOLATIONS,
    setting.textZoom,
  );
  const expected = generateScale(settings, {
    scaleTypes: [formula],
    rules: RULE_DEFAULTS,
  });
  assert.deepEqual(
    formulaDatasets.zoom.metrics[0].rows[row],
    expected.map((point) => ({ raw: point.raw, value: point.value })),
  );
}
assert.notEqual(
  formulaDatasets.zoom.metrics[0].rows[4][9].value,
  300,
  "Formula samples must not inherit foundation clamps or component size.",
);
assert.deepEqual(graphSeriesStyle("same-id"), graphSeriesStyle("same-id"));
assert.notDeepEqual(
  graphSeriesStyle("zoom:-1"),
  graphSeriesStyle("zoom:1"),
  "Nearby comparisons have distinguishable treatments.",
);
assert.equal(graphSeriesStyle("any-baseline", true).color, 0);
console.log(
  "Typography comparison matrix, baseline, transposition, units and formula checks passed.",
);
