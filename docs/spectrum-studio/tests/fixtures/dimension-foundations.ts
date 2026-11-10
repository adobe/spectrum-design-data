// Copyright 2026 Adobe. All rights reserved.
import {
  createColorDefaults,
  designSystemDefaults,
} from "../../src/data/defaults";
import { RULE_DEFAULTS } from "../../src/features/logic/defaults";
import type { Rule } from "../../src/features/logic/model";
import { MODE_SET_DEFAULTS } from "../../src/features/modes/model";
import { resolveModeParameterValues } from "../../src/features/modes/parameterResolution";
import type { DimensionComparisonInput } from "../../src/features/scales/dimensionComparisons";
import {
  generateDimensionScale,
  type DimensionScale,
} from "../../src/features/scales/foundation";
import { SCALE_TYPE_DEFAULTS } from "../../src/features/scales/scaleType";
import { SPACING_DEFAULTS } from "../../src/features/spacing/defaults";
import { governedFoundationContext } from "../../src/features/taxonomy/foundationGovernance";
import { reconcileDimensionSourceNames } from "../../src/features/taxonomy/naming";
import {
  projectClassification,
  taxonomyDimensionSourceId,
} from "../../src/features/taxonomy/model";
import { TYPOGRAPHY_DEFAULTS } from "../../src/features/typography/defaults";

export function dimensionExampleSources() {
  const horizontal: DimensionScale = {
    id: "spacing-example-horizontal",
    name: "Example horizontal spacing",
    scaleTypeId: "scale-type-typography",
    base: 10,
    below: 2,
    above: 2,
    parameters: {},
    roundingRuleId: "rule-example-spacing",
    hideFromPublishing: true,
  };
  const gap: DimensionScale = {
    ...horizontal,
    id: "spacing-example-gap",
    name: "Example gap",
    base: 6,
    roundingRuleId: "rule-whole-numbers",
  };
  const exampleRule: Rule = {
    id: horizontal.roundingRuleId,
    name: "Example spacing rounding",
    description: "Rounds values below five to one and larger values to two.",
    type: "rounding",
    depth: 1,
    defaultOutcome: { factor: 2 },
    conditions: [
      {
        id: "example-small-spacing",
        comparator: "lt",
        threshold: 5,
        outcome: { factor: 1 },
      },
    ],
  };
  const { taxonomy, document } = reconcileDimensionSourceNames(
    structuredClone(designSystemDefaults.system.taxonomy),
    SPACING_DEFAULTS,
    {
      ...structuredClone(SPACING_DEFAULTS),
      scales: [...structuredClone(SPACING_DEFAULTS.scales), horizontal, gap],
    },
    "spacing",
  );
  return {
    taxonomy,
    document,
    rules: [...structuredClone(RULE_DEFAULTS), exampleRule],
    horizontal: document.scales.find((scale) => scale.id === horizontal.id)!,
    gap: document.scales.find((scale) => scale.id === gap.id)!,
  };
}

export function dimensionExampleInput(
  adaptive = false,
  multiple = false,
): DimensionComparisonInput {
  const fixture = dimensionExampleSources();
  const scale = fixture.gap;
  const documents = {
    color: createColorDefaults(),
    typography: structuredClone(TYPOGRAPHY_DEFAULTS),
  };
  const modeSets = structuredClone([...MODE_SET_DEFAULTS]);
  const current = resolveModeParameterValues(documents, [], undefined, {
    modeSets,
  });
  if (adaptive)
    scale.bindings = {
      base: {
        modeParameterId: "typography.textZoom",
        method: "linear",
        points: [
          { at: -4, value: 3 },
          { at: 0, value: 6 },
          { at: 8, value: 12 },
        ],
      },
      ...(multiple && {
        ratio: {
          modeParameterId: "color.contrastMultiplier",
          method: "linear" as const,
          points: [
            { at: 0, value: 1 },
            { at: 1, value: 1.125 },
            { at: 3, value: 1.5 },
          ],
        },
      }),
    };
  const values = generateDimensionScale(
    "spacing",
    scale,
    fixture.rules,
    SCALE_TYPE_DEFAULTS,
    current,
  ).map((value) => {
    const context = governedFoundationContext(
      fixture.taxonomy,
      "spacing",
      scale.nameRef!,
      taxonomyDimensionSourceId("spacing", scale.id),
      value.step,
    );
    return {
      ...value,
      name: projectClassification(
        fixture.taxonomy,
        context.governed!,
        "spacing",
      ).name,
    };
  });
  return {
    scale,
    values,
    documents,
    modeSets,
    current,
    rules: fixture.rules,
    scaleTypes: structuredClone([...SCALE_TYPE_DEFAULTS]),
  };
}
