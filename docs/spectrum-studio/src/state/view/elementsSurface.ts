// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import type { CSSProperties } from "react";
import {
  luminance,
  type LinearRgb,
  type RgbGamut,
} from "../../features/color-system/colorMath";
import { resolvedBackgroundAtom } from "../../features/color-system/state";

interface ElementsSurfaceStyle extends CSSProperties {
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
    backgroundColor: background.css,
    color: foreground,
    "--elements-preview-foreground": foreground,
    "--elements-preview-divider": `rgb(${isLight ? "0 0 0" : "255 255 255"} / 20%)`,
  };
}

export const elementsSurfaceStyleAtom = atom((get) =>
  elementsSurfaceStyle(get(resolvedBackgroundAtom)),
);
