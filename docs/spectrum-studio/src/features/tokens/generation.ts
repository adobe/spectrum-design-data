// Copyright 2026 Adobe. All rights reserved.
import type {
  ColorScale,
  ContrastToken,
  OutputGamut,
} from "../color-system/model";
import type { DynamicGenerationSettings } from "../color-system/dynamicGeneration";
import type { LinearRgb } from "../color-system/colorMath";
import type { GeneratedToken } from "./model";
import { contrastStepIndex } from "../color-system/contrastSteps";
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import { generateScaleColorTokens } from "./colorGeneration";
export { generatePaletteTokens } from "./paletteGeneration";

/** Matches the `--contrast-N` naming emitted by the CSS library so both outputs agree. */
export function contrastTokenLabel(index: number) {
  return String(contrastStepIndex(index));
}

export function generateColorTokensForScale(
  scale: ColorScale,
  contrasts: ContrastToken[],
  background: LinearRgb,
  settings: DynamicGenerationSettings,
  outputGamut: OutputGamut,
  rules: readonly Rule[] = RULE_DEFAULTS,
): GeneratedToken[] {
  return generateScaleColorTokens(
    scale,
    contrasts,
    background,
    settings,
    outputGamut,
    rules,
  );
}
