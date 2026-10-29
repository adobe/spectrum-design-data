// Copyright 2026 Adobe. All rights reserved.
import { generateDimensionScale } from "../scales/foundation";
import { RULE_DEFAULTS } from "../logic/defaults";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../scales/scaleType";
import type { Rule } from "../logic/model";
import type { ModeParameterValues } from "../scales/generate";
import type { RadiusScale } from "./model";

export function generateRadiusScale(
  scale: RadiusScale,
  rules: readonly Rule[] = RULE_DEFAULTS,
  formulas: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  modeValues: ModeParameterValues = {},
) {
  return generateDimensionScale("radius", scale, rules, formulas, modeValues);
}
