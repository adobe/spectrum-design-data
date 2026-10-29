// Copyright 2026 Adobe. All rights reserved.
import type Color from "colorjs.io";
import { luminance, type LinearRgb } from "../colorMath";
import { colorFromLinearSrgb, linearSrgb } from "./colors";
import type { CvdProfile } from "./model";

// Full-severity Machado coefficients, MIT Culori v4.0.2. See docs/third-party/data-vis-notices.md.
const MACHADO: Record<
  Exclude<CvdProfile, "achromatopsia">,
  readonly LinearRgb[]
> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const SIMULATOR_VERSION = "machado-linear-srgb-full-1";

export function simulateLinearSrgb(
  rgb: LinearRgb,
  profile: CvdProfile,
): LinearRgb {
  if (!rgb.every(Number.isFinite))
    throw new Error("CVD simulation requires finite linear sRGB channels.");
  if (profile === "achromatopsia") {
    const y = luminance(rgb);
    return [y, y, y];
  }
  const matrix = MACHADO[profile];
  const dot = (row: LinearRgb) =>
    row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2];
  return [dot(matrix[0]), dot(matrix[1]), dot(matrix[2])];
}

export function simulateColor(color: Color, profile: CvdProfile): Color {
  return colorFromLinearSrgb(simulateLinearSrgb(linearSrgb(color), profile));
}
