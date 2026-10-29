// Copyright 2026 Adobe. All rights reserved.
import {
  createColorDefaults,
  designSystemDefaults,
} from "../../src/data/defaults";
import { RULE_DEFAULTS } from "../../src/features/logic/defaults";
import { MODE_SET_DEFAULTS } from "../../src/features/modes/model";
import { resolveModeParameterValues } from "../../src/features/modes/parameterResolution";
import type { DimensionComparisonInput } from "../../src/features/scales/dimensionComparisons";
import { generateDimensionScale } from "../../src/features/scales/foundation";
import { SCALE_TYPE_DEFAULTS } from "../../src/features/scales/scaleType";
import { SPACING_DEFAULTS } from "../../src/features/spacing/defaults";
import { governedFoundationContext } from "../../src/features/taxonomy/foundationGovernance";
import {
  projectClassification,
  taxonomyDimensionSourceId,
} from "../../src/features/taxonomy/model";
import { TYPOGRAPHY_DEFAULTS } from "../../src/features/typography/defaults";

export function dimensionExampleInput(
  adaptive = false,
  multiple = false,
): DimensionComparisonInput {
  const scale = structuredClone(
    SPACING_DEFAULTS.scales.find((scale) => scale.name === "Base gap")!,
  );
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
    RULE_DEFAULTS,
    SCALE_TYPE_DEFAULTS,
    current,
  ).map((value) => {
    const context = governedFoundationContext(
      designSystemDefaults.system.taxonomy,
      "spacing",
      scale.nameRef!,
      taxonomyDimensionSourceId("spacing", scale.id),
      value.step,
    );
    return {
      ...value,
      name: projectClassification(
        designSystemDefaults.system.taxonomy,
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
    rules: structuredClone([...RULE_DEFAULTS]),
    scaleTypes: structuredClone([...SCALE_TYPE_DEFAULTS]),
  };
}
