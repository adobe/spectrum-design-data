// Copyright 2026 Adobe. All rights reserved.
import type { ColorScale, ColorSystemDocument, ContrastToken } from "./model";
import type { Rule } from "../logic/model";
import {
  STANDARD_SCALE_NAMING_RULE,
  resolveScaleNamingRule,
  scaleNamingIndices,
} from "../logic/scaleNaming";

/** The shared swatch sequence owns indices; contrast ratios never supply them. */
export function contrastStepIndex(
  position: number,
  scale?: ColorScale,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
): number {
  if (scale?.customContrasts) {
    const custom = scale.customContrasts;
    const indices = scaleNamingIndices(
      resolveScaleNamingRule(rules, custom.namingRuleId),
      custom.steps.length,
      custom.steps.findIndex((step) => step.id === custom.baseContrastId),
    );
    if (indices[position] === undefined)
      throw new Error("The requested contrast step is unavailable.");
    return indices[position];
  }
  return (position + 1) * 100;
}

export function scaleContrasts(
  document: Pick<ColorSystemDocument, "contrasts">,
  scale: ColorScale,
) {
  return scale.customContrasts?.steps ?? document.contrasts;
}

export function sortContrastSteps(
  steps: readonly ContrastToken[],
): ContrastToken[] {
  return [...steps].sort((first, second) => first.value - second.value);
}

export function assertCustomContrastNaming(
  document: ColorSystemDocument,
  rules: readonly Rule[],
) {
  for (const scale of document.scales) {
    if (scale.customContrasts) contrastStepIndex(0, scale, rules);
  }
}
