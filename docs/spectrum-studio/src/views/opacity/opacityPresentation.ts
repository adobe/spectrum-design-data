// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { measureOutputContrast } from "../../features/color-system/outputContrast";
import {
  outputGamut,
  type ColorOutputSettings,
} from "../../features/color-system/outputSettings";
import { serializeOutputColor } from "../../features/color-system/outputSerialization";
import type { OpacityResult } from "../../features/opacity/generation";

export function formatOpacityPercent(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function opacitySwatchStyle(value: number) {
  return {
    backgroundColor:
      "var(--elements-preview-foreground, light-dark(black, white))",
    opacity: value,
  };
}

export function opacityEditDescription(level: {
  overridden: boolean;
  stale: boolean;
}) {
  return level.overridden
    ? level.stale
      ? "Out of date manual override"
      : "Manual override"
    : "Generated";
}

export function opacityObservations(
  result: OpacityResult,
  settings: ColorOutputSettings,
) {
  const dark = result.weight >= 0.5;
  const background = dark ? "#000000" : "#ffffff";
  const foreground: [number, number, number] = dark ? [1, 1, 1] : [0, 0, 0];
  const gamut = outputGamut(settings);
  return {
    dark,
    background,
    levels: result.levels.map((level) => {
      const css = serializeOutputColor(
        new Color("srgb", foreground, level.value),
        settings,
      );
      return {
        ...level,
        css,
        contrast: measureOutputContrast(css, background, gamut),
      };
    }),
  };
}
