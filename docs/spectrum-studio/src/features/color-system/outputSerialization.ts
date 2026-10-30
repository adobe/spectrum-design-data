// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import {
  colorJsSpace,
  isColorOutputSettings,
  outputGamut,
  type ColorOutputSettings,
} from "./outputSettings";

export const COLOR_OUTPUT_MAPPING_METHOD = "css";
export const COLOR_OUTPUT_PRECISION = 12;

function number(value: number) {
  if (!Number.isFinite(value))
    throw new Error("Color output contains an unavailable channel.");
  const rounded = value.toFixed(COLOR_OUTPUT_PRECISION);
  if (Number(rounded) === 0) return "0";
  return rounded.replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
}

function coordinates(color: Color): [number, number, number] {
  const [first, second, third] = color.coords;
  if (
    first === null ||
    second === null ||
    third === null ||
    ![first, second, third].every((value) => Number.isFinite(Number(value)))
  )
    throw new Error("Color output contains an unavailable channel.");
  return [Number(first), Number(second), Number(third)];
}

function serializeRgb(
  channels: number[],
  alpha: number,
  settings: ColorOutputSettings,
): string {
  if (settings.outputFormat === "hex") {
    const byte = (value: number) =>
      Math.round(Math.min(1, Math.max(0, value)) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${channels.map(byte).join("")}${alpha === 1 ? "" : byte(alpha)}`;
  }
  const suffix = alpha === 1 ? "" : ` / ${number(alpha)}`;
  const clamped = channels.map((value) => Math.min(1, Math.max(0, value)));
  if (outputGamut(settings) === "srgb") {
    const rgb = clamped.map((value) => number(value * 255)).join(", ");
    return alpha === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${number(alpha)})`;
  }
  return `color(${outputGamut(settings)} ${clamped.map(number).join(" ")}${suffix})`;
}

/** In-gamut opaque RGB needs conversion, but no gamut mapping or Color object. */
export function serializeLinearOutputColor(
  linear: readonly [number, number, number],
  settings: ColorOutputSettings,
): string {
  const space = colorJsSpace(outputGamut(settings));
  if (
    isColorOutputSettings(settings) &&
    (settings.outputFormat === "hex" || settings.outputFormat === "rgb") &&
    linear.length === 3 &&
    linear.every(
      (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1,
    )
  ) {
    const channels = Color.Space.get(`${space}-linear`).to(space, [...linear]);
    if (
      channels.some((channel) => channel === null || !Number.isFinite(channel))
    )
      throw new Error("Color output contains an unavailable channel.");
    return serializeRgb(channels.map(Number), 1, settings);
  }
  return serializeOutputColor(
    new Color(`${space}-linear`, [...linear]),
    settings,
  );
}

export function mapOutputColor(
  source: Color,
  settings: ColorOutputSettings,
): Color {
  if (!isColorOutputSettings(settings))
    throw new Error("Invalid color output configuration.");
  const alpha = Number(source.alpha);
  if (
    source.alpha === null ||
    !Number.isFinite(alpha) ||
    alpha < 0 ||
    alpha > 1
  ) {
    throw new Error("Color output has invalid opacity.");
  }
  const copy = source.clone();
  copy.coords = coordinates(source);
  copy.alpha = alpha;
  const space = colorJsSpace(outputGamut(settings));
  return copy.toGamut({ space, method: COLOR_OUTPUT_MAPPING_METHOD }).to(space);
}

export function serializeOutputColor(
  source: Color,
  settings: ColorOutputSettings,
): string {
  const color = mapOutputColor(source, settings);
  const alpha = Number(color.alpha);
  const suffix = alpha === 1 ? "" : ` / ${number(alpha)}`;
  if (settings.outputFormat === "hex" || settings.outputFormat === "rgb")
    return serializeRgb(coordinates(color), alpha, settings);
  if (settings.outputFormat === "hsl") {
    const converted = color.to("hsl");
    if (!Number.isFinite(converted.coords[0])) converted.coords[0] = 0;
    const [hue, saturation, lightness] = coordinates(converted);
    return `hsl(${number(hue)} ${number(saturation)}% ${number(lightness)}%${suffix})`;
  }
  const converted = color.to("oklch");
  const rgb = coordinates(color);
  if (Math.max(...rgb) - Math.min(...rgb) < 1e-12) {
    const linear = coordinates(
      color.to(`${colorJsSpace(outputGamut(settings))}-linear`),
    );
    return `oklch(${number(Math.cbrt(linear[0]))} 0 0${suffix})`;
  }
  if (!Number.isFinite(converted.coords[2])) converted.coords[2] = 0;
  const [lightness, chroma, hue] = coordinates(converted);
  return `oklch(${number(lightness)} ${number(chroma)} ${number(hue)}${suffix})`;
}
