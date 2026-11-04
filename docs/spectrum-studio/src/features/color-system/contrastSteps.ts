// Copyright 2026 Adobe. All rights reserved.
import type { ColorScale, ColorSystemDocument, ContrastToken } from "./model";
import { storedCustomContrasts } from "./customContrastConfig";
import type { Rule } from "../logic/model";
import { assertSwatchIndices, swatchIndex } from "../scales/swatchIndices";
import {
  STANDARD_SCALE_NAMING_RULE,
  resolveScaleNamingRule,
  scaleNamingIndices,
} from "../logic/scaleNaming";

/** Authored indices take precedence over automatic naming, never contrast ratios. */
export function contrastStepIndex(
  position: number,
  scale?: ColorScale,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
  sharedContrasts: readonly ContrastToken[] = [],
): number {
  if (scale?.customContrasts) {
    const custom = scale.customContrasts;
    const authored = custom.steps[position]?.scaleIndex;
    if (authored !== undefined) return authored;
    const indices = scaleNamingIndices(
      resolveScaleNamingRule(rules, custom.namingRuleId),
      custom.steps.length,
      custom.steps.findIndex((step) => step.id === custom.baseContrastId),
    );
    if (indices[position] === undefined)
      throw new Error("The requested contrast step is unavailable.");
    return indices[position];
  }
  return swatchIndex(sharedContrasts[position] ?? {}, position);
}

export function scaleContrasts(
  document: Pick<ColorSystemDocument, "contrasts">,
  scale: ColorScale,
) {
  return scale.customContrasts?.steps ?? document.contrasts;
}

export function customContrastNamesMissingFromShared(
  scale: ColorScale,
  sharedContrasts: readonly ContrastToken[],
  rules: readonly Rule[],
): string[] {
  const sharedNames = new Set(
    sharedContrasts.map((_, index) =>
      contrastStepIndex(index, undefined, rules, sharedContrasts),
    ),
  );
  return (scale.customContrasts?.steps ?? []).flatMap((_, index) => {
    const name = contrastStepIndex(index, scale, rules);
    return sharedNames.has(name) ? [] : [`${scale.name}-${name}`];
  });
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
  assertSwatchIndices(
    document.contrasts.map((step, index) => swatchIndex(step, index)),
  );
  for (const scale of document.scales) {
    const customContrasts = storedCustomContrasts(scale);
    if (customContrasts)
      assertSwatchIndices(
        customContrasts.steps.map((_, position) =>
          contrastStepIndex(position, { ...scale, customContrasts }, rules),
        ),
      );
  }
}
