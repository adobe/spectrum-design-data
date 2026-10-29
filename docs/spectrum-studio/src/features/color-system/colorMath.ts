// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import {
  colorJsSpace,
  outputGamut,
  type ColorGamut,
  type ColorOutputSettings,
} from "./outputSettings";
import {
  COLOR_OUTPUT_MAPPING_METHOD,
  serializeLinearOutputColor,
  serializeOutputColor,
} from "./outputSerialization";

export type LinearRgb = readonly [number, number, number];
export type RgbGamut = ColorGamut;
export type OutputColorSpace = RgbGamut | "oklch" | ColorOutputSettings;
export type Oklab = readonly [number, number, number];
export type Oklch = readonly [number, number, number];

export function formatColorNumber(value: number, decimals = 3) {
  const rounded = Number(value.toFixed(decimals));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function mapLinearRgb(
  color: LinearRgb,
  transform: (channel: number, index: number) => number,
): LinearRgb {
  return [
    transform(color[0], 0),
    transform(color[1], 1),
    transform(color[2], 2),
  ];
}

export function toLinear(channel: number, gamut: RgbGamut = "srgb") {
  if (gamut === "rec2020") {
    const magnitude = Math.abs(channel);
    const linear =
      magnitude < 0.0812428582986315
        ? magnitude / 4.5
        : ((magnitude + 0.09929682680944) / 1.09929682680944) ** (1 / 0.45);
    return Math.sign(channel) * linear;
  }
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function toGamma(channel: number, gamut: RgbGamut = "srgb") {
  if (gamut === "rec2020") {
    const magnitude = Math.abs(channel);
    const encoded =
      magnitude < 0.018053968510807
        ? 4.5 * magnitude
        : 1.09929682680944 * magnitude ** 0.45 - 0.09929682680944;
    return Math.sign(channel) * encoded;
  }
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function hexToLinear(hex: string): LinearRgb {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Expected a six-digit hex color, received "${hex}".`);
  }

  const channel = (index: number) =>
    toLinear(Number.parseInt(normalized.slice(index, index + 2), 16) / 255);
  return [channel(0), channel(2), channel(4)];
}

export function convertLinearGamut(
  color: LinearRgb,
  from: RgbGamut,
  to: RgbGamut,
): LinearRgb {
  if (from === to) return color;
  return xyzD65ToLinear(linearToXyzD65(color, from), to);
}

export function linearToXyzD65(
  [red, green, blue]: LinearRgb,
  gamut: RgbGamut = "srgb",
): LinearRgb {
  return applyMatrix(TO_XYZ[gamut], [red, green, blue]);
}

export function xyzD65ToLinear(
  [x, y, z]: LinearRgb,
  gamut: RgbGamut = "srgb",
): LinearRgb {
  return applyMatrix(FROM_XYZ[gamut], [x, y, z]);
}

export function linearToHex(color: LinearRgb, gamut: RgbGamut = "srgb") {
  const srgb = convertLinearGamut(color, gamut, "srgb");
  const channels = srgb.map((channel) =>
    Math.round(clamp01(toGamma(channel)) * 255)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}

export function linearToCss(color: LinearRgb, gamut: RgbGamut = "srgb") {
  if (gamut === "srgb") return linearToHex(color);
  return `color(${gamut} ${color.map((channel) => formatColorNumber(clamp01(toGamma(channel, gamut)))).join(" ")})`;
}

export function outputColorCss(
  color: LinearRgb,
  output: OutputColorSpace = "srgb",
  inputGamut: RgbGamut = renderGamutForOutput(output),
) {
  if (typeof output === "object") {
    if (inputGamut === outputGamut(output))
      return serializeLinearOutputColor(color, output);
    return serializeOutputColor(
      new Color(`${colorJsSpace(inputGamut)}-linear`, [...color]),
      output,
    );
  }
  if (output === "oklch") {
    const [lightness, chroma, hue] = linearToOklch(
      convertLinearGamut(color, inputGamut, "srgb"),
    );
    return `oklch(${formatColorNumber(lightness)} ${formatColorNumber(chroma)} ${formatColorNumber(hue)})`;
  }
  return linearToCss(color, output);
}

export function renderGamutForOutput(output: OutputColorSpace): RgbGamut {
  return typeof output === "object"
    ? outputGamut(output)
    : output === "oklch"
      ? "srgb"
      : output;
}

export function luminance(
  [red, green, blue]: LinearRgb,
  gamut: RgbGamut = "srgb",
) {
  if (red === green && green === blue) return red;
  if (gamut === "rec2020")
    return (
      0.2627002120112671 * red +
      0.6779980715188708 * green +
      0.05930171646986196 * blue
    );
  return gamut === "display-p3"
    ? 0.2289745640697488 * red +
        0.6917385218365064 * green +
        0.079286914093745 * blue
    : 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: number, second: number) {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function targetLuminance(
  background: number,
  targetContrast: number,
  isDark: boolean,
) {
  return clamp01(
    isDark
      ? (background + 0.05) / targetContrast - 0.05
      : targetContrast * (background + 0.05) - 0.05,
  );
}

export function linearToOklab([red, green, blue]: LinearRgb): Oklab {
  const long = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const medium =
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const short = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const longRoot = Math.cbrt(long);
  const mediumRoot = Math.cbrt(medium);
  const shortRoot = Math.cbrt(short);

  return [
    0.2104542553 * longRoot +
      0.793617785 * mediumRoot -
      0.0040720468 * shortRoot,
    1.9779984951 * longRoot -
      2.428592205 * mediumRoot +
      0.4505937099 * shortRoot,
    0.0259040371 * longRoot +
      0.7827717662 * mediumRoot -
      0.808675766 * shortRoot,
  ];
}

export function oklabToLinear([lightness, a, b]: Oklab): LinearRgb {
  const longRoot = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mediumRoot = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const shortRoot = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * longRoot -
      3.3077115913 * mediumRoot +
      0.2309699292 * shortRoot,
    -1.2684380046 * longRoot +
      2.6097574011 * mediumRoot -
      0.3413193965 * shortRoot,
    -0.0041960863 * longRoot -
      0.7034186147 * mediumRoot +
      1.707614701 * shortRoot,
  ];
}

export function oklabToOklch([lightness, a, b]: Oklab): Oklch {
  const chroma = Math.hypot(a, b);
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return [lightness, chroma, hue];
}

export function oklchToOklab([lightness, chroma, hue]: Oklch): Oklab {
  const hueRadians = (hue * Math.PI) / 180;
  return [
    lightness,
    chroma * Math.cos(hueRadians),
    chroma * Math.sin(hueRadians),
  ];
}

export function linearToOklch(color: LinearRgb) {
  return oklabToOklch(linearToOklab(color));
}

export function oklchToLinear(color: Oklch) {
  return oklabToLinear(oklchToOklab(color));
}

export function isInSrgbGamut(color: LinearRgb) {
  return color.every((channel) => channel >= 0 && channel <= 1);
}

function checkedCoordinates(color: Color): LinearRgb {
  const [first, second, third] = color.coords;
  if (
    first === null ||
    second === null ||
    third === null ||
    ![first, second, third].every(Number.isFinite)
  ) {
    throw new Error("Color conversion returned unavailable channels.");
  }
  return [first, second, third];
}

type ColorMatrix = readonly [LinearRgb, LinearRgb, LinearRgb];

function colorMatrix(from: string, to: string): ColorMatrix {
  return [
    checkedCoordinates(new Color(from, [1, 0, 0]).to(to)),
    checkedCoordinates(new Color(from, [0, 1, 0]).to(to)),
    checkedCoordinates(new Color(from, [0, 0, 1]).to(to)),
  ];
}

// Cache the reference space's basis vectors; generation then uses only linear arithmetic.
const TO_XYZ = {
  srgb: colorMatrix("srgb-linear", "xyz-d65"),
  "display-p3": colorMatrix("p3-linear", "xyz-d65"),
  rec2020: colorMatrix("rec2020-linear", "xyz-d65"),
};
const FROM_XYZ = {
  srgb: colorMatrix("xyz-d65", "srgb-linear"),
  "display-p3": colorMatrix("xyz-d65", "p3-linear"),
  rec2020: colorMatrix("xyz-d65", "rec2020-linear"),
};

function applyMatrix(
  [red, green, blue]: ColorMatrix,
  [first, second, third]: LinearRgb,
): LinearRgb {
  return [
    red[0] * first + green[0] * second + blue[0] * third,
    red[1] * first + green[1] * second + blue[1] * third,
    red[2] * first + green[2] * second + blue[2] * third,
  ];
}

export function requiresOutputGamutMapping(output: OutputColorSpace) {
  return (
    typeof output === "object" &&
    output.mapOutputsToSrgb &&
    output.authoringGamut !== "srgb"
  );
}

export function gamutClamp(
  lightness: number,
  chroma: number,
  hue: number,
  gamut: RgbGamut = "srgb",
  preserveAppearance = false,
): LinearRgb {
  if (lightness <= 0) return [0, 0, 0];
  if (lightness >= 1) return [1, 1, 1];
  if (preserveAppearance) {
    const color = new Color("oklch", [lightness, chroma, hue]);
    return checkedCoordinates(
      color
        .toGamut({
          space: colorJsSpace(gamut),
          method: COLOR_OUTPUT_MAPPING_METHOD,
        })
        .to(`${colorJsSpace(gamut)}-linear`),
    );
  }
  const inGamut = (color: LinearRgb) =>
    isInSrgbGamut(convertLinearGamut(color, "srgb", gamut));
  const unbounded = oklchToLinear([lightness, chroma, hue]);
  if (inGamut(unbounded)) {
    return convertLinearGamut(unbounded, "srgb", gamut);
  }

  let minimum = 0;
  let maximum = chroma;
  for (let iteration = 0; iteration < 22; iteration += 1) {
    const midpoint = (minimum + maximum) / 2;
    if (inGamut(oklchToLinear([lightness, midpoint, hue]))) {
      minimum = midpoint;
    } else {
      maximum = midpoint;
    }
  }

  return convertLinearGamut(
    oklchToLinear([lightness, minimum, hue]),
    "srgb",
    gamut,
  );
}

export function interpolateHue(from: number, to: number, fraction: number) {
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * fraction + 360) % 360;
}

export function deltaE(first: Oklab, second: Oklab) {
  return Math.hypot(
    first[0] - second[0],
    first[1] - second[1],
    first[2] - second[2],
  );
}
