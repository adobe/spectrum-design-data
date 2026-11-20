// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { measureOutputContrast } from "../color-system/outputContrast";
import {
  outputGamut,
  type ColorOutputSettings,
} from "../color-system/outputSettings";
import { serializeOutputColor } from "../color-system/outputSerialization";
import type { OpacityResult } from "./generation";

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
