// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import { concreteColor } from "./data-vis/colors";
import { serializeOutputColor } from "./outputSerialization";
import type { ColorOutputSettings } from "./outputSettings";
import { luminance, type LinearRgb, type RgbGamut } from "./colorMath";
import type { ColorSystemDocument } from "./model";
import type { Mode, ModeSet } from "../modes/model";
import { resolveColorDocument } from "./resolution";
import { resolveScaleColorAtLightness } from "./scaleGeneration";

export const PREVIEW_LIGHTNESS_THRESHOLD = 0.5;
export const CHECKERBOARD_LIGHTNESS_DIFFERENCE = 0.1;

export function contrastingLightness(lightness: number): number {
  // Color-space conversion can place white a fraction above 1.
  if (
    !Number.isFinite(lightness) ||
    lightness < -1e-12 ||
    lightness > 1 + 1e-12
  )
    throw new Error("Preview lightness must be between 0 and 1.");
  const normalized = Math.min(1, Math.max(0, lightness));
  return Math.min(
    1,
    Math.max(
      0,
      normalized +
        (normalized >= PREVIEW_LIGHTNESS_THRESHOLD
          ? -CHECKERBOARD_LIGHTNESS_DIFFERENCE
          : CHECKERBOARD_LIGHTNESS_DIFFERENCE),
    ),
  );
}

export function checkerboardColors(
  background: string,
  settings: ColorOutputSettings,
) {
  const source = concreteColor(background);
  if (source.alpha !== 1)
    throw new Error("Checkerboard backgrounds must be opaque.");
  const alternate = source.to("oklch");
  alternate.coords[0] = contrastingLightness(Number(alternate.coords[0]));
  if (!Number.isFinite(alternate.coords[2])) alternate.coords[2] = 0;
  return {
    background,
    alternate: serializeOutputColor(alternate, settings),
  };
}

export interface CheckerboardStyle extends CSSProperties {
  "--checkerboard-base": string;
  "--checkerboard-alternate": string;
}

export function checkerboardSurfaceStyle(
  background: string,
  settings: ColorOutputSettings,
): CheckerboardStyle {
  const colors = checkerboardColors(background, settings);
  return {
    "--checkerboard-base": colors.background,
    "--checkerboard-alternate": colors.alternate,
  };
}

export interface ElementsSurfaceStyle extends CheckerboardStyle {
  "--elements-preview-foreground": string;
  "--elements-preview-divider": string;
}

export function elementsSurfaceStyle(background: {
  css: string;
  linear: LinearRgb;
  gamut: RgbGamut;
}): ElementsSurfaceStyle {
  const isLight = luminance(background.linear, background.gamut) > 0.1791;
  const foreground = isLight ? "#000000" : "#ffffff";
  return {
    ...checkerboardSurfaceStyle(background.css, {
      authoringGamut: background.gamut,
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    }),
    backgroundColor: background.css,
    color: foreground,
    "--elements-preview-foreground": foreground,
    "--elements-preview-divider": `rgb(${isLight ? "0 0 0" : "255 255 255"} / 20%)`,
  };
}

export function modePreviewSurface(
  source: ColorSystemDocument,
  modes: Mode[],
  modeSets: ModeSet[],
): ElementsSurfaceStyle {
  const document = resolveColorDocument(source, modes, undefined, { modeSets });
  const scale =
    document.scales.find((item) => item.id === document.backgroundScaleId) ??
    document.scales[0];
  return elementsSurfaceStyle(
    resolveScaleColorAtLightness(
      scale,
      document.backgroundLightness,
      document.settings.colorOutput,
    ),
  );
}
