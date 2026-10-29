// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { colorJsSpace } from "../outputSettings";
import {
  COLOR_OUTPUT_MAPPING_METHOD,
  serializeOutputColor,
} from "../outputSerialization";
import { renderedOutputLinear } from "../outputContrast";
import {
  clamp01,
  gamutClamp,
  oklabToOklch,
  outputColorCss,
  renderGamutForOutput,
  toGamma,
  toLinear,
  type LinearRgb,
  type Oklab,
  type Oklch,
  type OutputColorSpace,
  type RgbGamut,
} from "../colorMath";

export function concreteColor(value: string): Color {
  if (!value.trim() || /\b(?:var|env)\(|\bcurrentcolor\b/i.test(value))
    throw new Error(`Unavailable concrete color: ${value || "(empty)"}.`);
  let color: Color;
  try {
    color = new Color(value);
  } catch (cause) {
    throw new Error(`Unavailable concrete color: ${value}.`, { cause });
  }
  if (
    color.alpha === null ||
    !Number.isFinite(Number(color.alpha)) ||
    color.coords.some(
      (channel) => channel === null || !Number.isFinite(Number(channel)),
    )
  ) {
    throw new Error(`Color ${value} has unavailable channels.`);
  }
  color.alpha = Number(color.alpha);
  // CSS parsers may attach unit metadata to numeric channel objects.
  color.coords = [
    Number(color.coords[0]),
    Number(color.coords[1]),
    Number(color.coords[2]),
  ];
  return color;
}

function coordinates(color: Color): [number, number, number] {
  const [first, second, third] = color.coords;
  if (
    [first, second, third].some(
      (channel) => channel === null || !Number.isFinite(channel),
    )
  )
    throw new Error("Color conversion has unavailable channels.");
  return [first, second, third];
}

export function colorOklab(color: Color): Oklab {
  return coordinates(color.to("oklab"));
}

export function renderedColor(
  value: string,
  background: string,
  gamut: RgbGamut = "srgb",
): Color {
  const space = colorJsSpace(gamut);
  const source = concreteColor(value),
    reference = concreteColor(background);
  if (source.inGamut(space) && reference.inGamut(space)) {
    return new Color(`${space}-linear`, [
      ...renderedOutputLinear(value, background, gamut),
    ]).to(space);
  }
  const foreground = source
    .toGamut({ space, method: COLOR_OUTPUT_MAPPING_METHOD })
    .to(space);
  const base = reference
    .toGamut({ space, method: COLOR_OUTPUT_MAPPING_METHOD })
    .to(space);
  if (base.alpha < 1)
    throw new Error("The comparison background must be opaque.");
  const alpha = clamp01(foreground.alpha);
  const fg = coordinates(foreground),
    bg = coordinates(base);
  return new Color(space, [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ]);
}

export function linearSrgb(color: Color): LinearRgb {
  const mapped = color
    .clone()
    .toGamut({ space: "srgb", method: COLOR_OUTPUT_MAPPING_METHOD })
    .to("srgb");
  const rgb = coordinates(mapped);
  return [
    toLinear(clamp01(rgb[0])),
    toLinear(clamp01(rgb[1])),
    toLinear(clamp01(rgb[2])),
  ];
}

export function colorFromLinearSrgb(linear: LinearRgb): Color {
  return new Color("srgb", [
    toGamma(clamp01(linear[0])),
    toGamma(clamp01(linear[1])),
    toGamma(clamp01(linear[2])),
  ]);
}

export function interpolatedCss(
  lab: Oklab,
  alpha: number,
  output: OutputColorSpace,
): string {
  return formatInterpolatedCss(oklabToOklch(lab), alpha, output);
}

export function interpolatedOklchCss(
  lch: Oklch,
  alpha: number,
  output: OutputColorSpace,
): string {
  return formatInterpolatedCss(lch, alpha, output, true);
}

function formatInterpolatedCss(
  [lightness, chroma, hue]: Oklch,
  alpha: number,
  output: OutputColorSpace,
  precisePolarOutput = false,
): string {
  if (typeof output === "object") {
    const color = new Color("oklch", [clamp01(lightness), chroma, hue]);
    color.alpha = alpha;
    return serializeOutputColor(color, output);
  }
  if (alpha <= 0) return "rgb(0 0 0 / 0)";
  const mapped = gamutClamp(
    clamp01(lightness),
    chroma,
    hue,
    renderGamutForOutput(output),
  );
  if (precisePolarOutput && output === "oklch") {
    // Coarse polar rounding can move a mapped color back outside the output gamut.
    const color = new Color("srgb-linear", [...mapped]).to("oklch");
    if (Number.isNaN(color.coords[2])) color.coords[2] = 0;
    color.alpha = alpha;
    return color.toString({ precision: 12 });
  }
  const css = outputColorCss(mapped, output);
  if (alpha >= 1) return css;
  const color = concreteColor(css);
  color.alpha = alpha;
  return color.toString({ precision: 7 });
}
