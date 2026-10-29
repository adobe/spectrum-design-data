// Copyright 2026 Adobe. All rights reserved.
import { compensatedContrast } from "../color-system/polarity";
import {
  contrastRatio,
  targetLuminance,
  toGamma,
  toLinear,
} from "../color-system/colorMath";
import { isAlpha } from "./model";

export function compensatedOpacity(
  alpha: number,
  strength: number,
  weight = 1,
): number {
  if (![alpha, strength, weight].every(isAlpha))
    throw new Error(
      "Opacity, compensation and polarity weight must be between 0 and 1.",
    );
  if (alpha === 0 || alpha === 1 || strength === 0 || weight === 0)
    return alpha;
  const ratio = contrastRatio(toLinear(alpha), 0);
  const target = compensatedContrast(ratio, strength, "light");
  const opposite = toGamma(targetLuminance(0, target, false));
  return Math.min(1, Math.max(0, alpha + weight * (opposite - alpha)));
}
