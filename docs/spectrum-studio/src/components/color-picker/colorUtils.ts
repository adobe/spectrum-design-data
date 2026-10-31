// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { colorToP3Hsl, p3HslToColor, type P3HslCoords } from "./p3HslUtils";
import { COLOR_OUTPUT_MAPPING_METHOD } from "../../features/color-system/outputSerialization";

export type PickerColorSpace = "sRGB" | "Display P3" | "OKlch";
export type PickerGamut = "sRGB" | "Display-P3" | "Rec2020";
export type PickerModel = "cartesian" | "polar";
export type ChannelName = "r" | "g" | "b" | "h" | "s" | "l" | "a" | "c";

export interface ColorSpaceConfig {
  id: string;
  channels: ChannelName[];
  defaultChannels: [ChannelName, ChannelName];
  thirdChannel: ChannelName;
}

const configCache = new Map<string, ColorSpaceConfig>();
const rangeCache = new Map<string, readonly [number, number]>();
const gamutRangeCache = new Map<string, readonly [number, number]>();
const MAX_GAMUT_RANGE_CACHE_SIZE = 256;

export function getColorSpaceConfig(
  colorSpace: PickerColorSpace,
  model: PickerModel,
): ColorSpaceConfig {
  const key = `${colorSpace}-${model}`;
  const cached = configCache.get(key);
  if (cached) return cached;

  const config =
    colorSpace === "Display P3" && model === "polar"
      ? {
          id: "p3-hsl",
          channels: ["h", "s", "l"] as ChannelName[],
          defaultChannels: ["s", "l"] as [ChannelName, ChannelName],
          thirdChannel: "h" as ChannelName,
        }
      : colorSpace === "sRGB" && model === "polar"
        ? {
            id: "hsl",
            channels: ["h", "s", "l"] as ChannelName[],
            defaultChannels: ["s", "l"] as [ChannelName, ChannelName],
            thirdChannel: "h" as ChannelName,
          }
        : colorSpace === "OKlch" && model === "polar"
          ? {
              id: "oklch",
              channels: ["l", "c", "h"] as ChannelName[],
              defaultChannels: ["c", "h"] as [ChannelName, ChannelName],
              thirdChannel: "l" as ChannelName,
            }
          : colorSpace === "OKlch"
            ? {
                id: "oklab",
                channels: ["l", "a", "b"] as ChannelName[],
                defaultChannels: ["a", "b"] as [ChannelName, ChannelName],
                thirdChannel: "l" as ChannelName,
              }
            : colorSpace === "Display P3"
              ? {
                  id: "p3",
                  channels: ["r", "g", "b"] as ChannelName[],
                  defaultChannels: ["r", "g"] as [ChannelName, ChannelName],
                  thirdChannel: "b" as ChannelName,
                }
              : {
                  id: "srgb",
                  channels: ["r", "g", "b"] as ChannelName[],
                  defaultChannels: ["r", "g"] as [ChannelName, ChannelName],
                  thirdChannel: "b" as ChannelName,
                };

  configCache.set(key, config);
  return config;
}

export function getGamutSpace(gamut: PickerGamut) {
  return gamut === "Display-P3"
    ? "p3"
    : gamut === "Rec2020"
      ? "rec2020"
      : "srgb";
}

export function getChannelRange(
  channel: ChannelName,
  spaceId: string,
): readonly [number, number] {
  const key = `${spaceId}-${channel}`;
  const cached = rangeCache.get(key);
  if (cached) return cached;

  const range =
    spaceId === "hsl" || spaceId === "p3-hsl"
      ? channel === "h"
        ? ([0, 360] as const)
        : ([0, 100] as const)
      : spaceId === "oklch"
        ? channel === "l"
          ? ([0, 1] as const)
          : channel === "c"
            ? ([0, 0.5] as const)
            : ([0, 360] as const)
        : spaceId === "oklab"
          ? channel === "l"
            ? ([0, 1] as const)
            : ([-0.5, 0.5] as const)
          : ([0, 1] as const);

  rangeCache.set(key, range);
  return range;
}

export function isRgbChannel(channel: ChannelName) {
  return channel === "r" || channel === "g" || channel === "b";
}

export function isPercentageChannel(channel: ChannelName, spaceId: string) {
  if (spaceId === "p3" && isRgbChannel(channel)) return true;
  if (
    (spaceId === "hsl" || spaceId === "p3-hsl") &&
    (channel === "s" || channel === "l")
  )
    return true;
  return (spaceId === "oklch" || spaceId === "oklab") && channel === "l";
}

export function channelFormatOptions(
  channel: ChannelName,
  spaceId: string,
): Intl.NumberFormatOptions {
  if (isPercentageChannel(channel, spaceId)) {
    return { style: "percent", maximumFractionDigits: 2 };
  }
  if (channel === "h") {
    return {
      style: "unit",
      unit: "degree",
      unitDisplay: "narrow",
      maximumFractionDigits: 2,
    };
  }
  return {
    maximumFractionDigits: spaceId === "srgb" && isRgbChannel(channel) ? 0 : 2,
  };
}

export function colorChannelToFieldValue(
  channel: ChannelName,
  value: number,
  spaceId: string,
) {
  if (spaceId === "srgb" && isRgbChannel(channel)) return value * 255;
  if (
    (spaceId === "hsl" || spaceId === "p3-hsl") &&
    (channel === "s" || channel === "l")
  )
    return value / 100;
  return value;
}

export function fieldValueToColorChannel(
  channel: ChannelName,
  value: number,
  spaceId: string,
) {
  if (spaceId === "srgb" && isRgbChannel(channel)) return value / 255;
  if (isPercentageChannel(channel, spaceId)) {
    const normalizedValue = Math.abs(value) > 1 ? value / 100 : value;
    if (
      (spaceId === "hsl" || spaceId === "p3-hsl") &&
      (channel === "s" || channel === "l")
    ) {
      return normalizedValue * 100;
    }
    return normalizedValue;
  }
  return value;
}

function channelIndex(config: ColorSpaceConfig, channel: ChannelName) {
  const index = config.channels.indexOf(channel);
  if (index < 0)
    throw new Error(`Channel "${channel}" is not available in ${config.id}.`);
  return index;
}

export function getColorCoords(color: Color, config: ColorSpaceConfig) {
  if (config.id === "p3-hsl") {
    const hsl = colorToP3Hsl(color);
    return [hsl.h, hsl.s, hsl.l];
  }
  return color.to(config.id).coords.map((value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  });
}

export function createColorFromCoords(
  config: ColorSpaceConfig,
  coords: number[],
) {
  if (config.id === "p3-hsl") {
    return new Color(
      p3HslToColor({ h: coords[0], s: coords[1], l: coords[2] }),
    );
  }
  return new Color(config.id, [coords[0], coords[1], coords[2]]);
}

export function createColorWithChannelValue(
  color: Color,
  config: ColorSpaceConfig,
  channel: ChannelName,
  value: number,
) {
  const coords = getColorCoords(color, config).slice();
  coords[channelIndex(config, channel)] = value;
  return createColorFromCoords(config, coords);
}

export function canvasToColor(
  canvasX: number,
  canvasY: number,
  size: number,
  baseColor: Color,
  config: ColorSpaceConfig,
  channels: [ChannelName, ChannelName],
) {
  const coords = getColorCoords(baseColor, config).slice();
  const values = [canvasX / size, 1 - canvasY / size];
  channels.forEach((channel, index) => {
    const [minimum, maximum] = getChannelRange(channel, config.id);
    coords[channelIndex(config, channel)] =
      minimum + values[index] * (maximum - minimum);
  });
  const candidate = createColorFromCoords(config, coords);
  return candidate;
}

export function mapColorToGamut(color: Color, gamut: PickerGamut) {
  const space = getGamutSpace(gamut);
  return color.clone().toGamut({ space, method: COLOR_OUTPUT_MAPPING_METHOD });
}

export function pickerColorsEqual(first: Color, second: Color) {
  const left = first.to("xyz-d65").coords;
  const right = second.to("xyz-d65").coords;
  return (
    Math.abs(Number(first.alpha) - Number(second.alpha)) < 1e-12 &&
    left.every(
      (value, index) => Math.abs(Number(value) - Number(right[index])) < 1e-12,
    )
  );
}

export function getChannelGamutRange(
  color: Color,
  config: ColorSpaceConfig,
  channel: ChannelName,
  gamut: PickerGamut,
): readonly [number, number] {
  const practicalRange = getChannelRange(channel, config.id);
  const gamutSpace = getGamutSpace(gamut);
  const anchorColor = color.inGamut(gamutSpace)
    ? color
    : mapColorToGamut(color, gamut);
  const anchorCoords = getColorCoords(anchorColor, config);
  const index = channelIndex(config, channel);
  const anchorValue = Math.min(
    practicalRange[1],
    Math.max(practicalRange[0], anchorCoords[index]),
  );
  const cacheKey = [
    config.id,
    gamut,
    channel,
    ...anchorCoords.map((value, coordinateIndex) =>
      channel === "h" || coordinateIndex !== index
        ? value.toFixed(6)
        : "bounded",
    ),
  ].join("|");
  const cached = gamutRangeCache.get(cacheKey);
  if (cached) return cached;

  const isValid = (value: number) => {
    const coords = anchorCoords.slice();
    coords[index] = value;
    return createColorFromCoords(config, coords).inGamut(gamutSpace);
  };

  let minimum = practicalRange[0];
  if (!isValid(minimum)) {
    let invalid = minimum;
    let valid = anchorValue;
    for (let iteration = 0; iteration < 14; iteration += 1) {
      const middle = (invalid + valid) / 2;
      if (isValid(middle)) valid = middle;
      else invalid = middle;
    }
    minimum = valid;
  }

  let maximum = practicalRange[1];
  if (!isValid(maximum)) {
    let valid = anchorValue;
    let invalid = maximum;
    for (let iteration = 0; iteration < 14; iteration += 1) {
      const middle = (valid + invalid) / 2;
      if (isValid(middle)) valid = middle;
      else invalid = middle;
    }
    maximum = valid;
  }

  const result = [minimum, maximum] as const;
  gamutRangeCache.set(cacheKey, result);
  if (gamutRangeCache.size > MAX_GAMUT_RANGE_CACHE_SIZE) {
    gamutRangeCache.delete(gamutRangeCache.keys().next().value!);
  }
  return result;
}

export function colorToCanvas(
  color: Color,
  size: number,
  config: ColorSpaceConfig,
  channels: [ChannelName, ChannelName],
) {
  const coords = getColorCoords(color, config);
  const values = channels.map((channel) => {
    const value = coords[channelIndex(config, channel)];
    if (channel === "h") return (((value % 360) + 360) % 360) / 360;
    const [minimum, maximum] = getChannelRange(channel, config.id);
    return Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
  });
  return { x: values[0] * size, y: (1 - values[1]) * size };
}

export function isOutOfGamut(color: Color, gamut: PickerGamut) {
  return !color.inGamut(getGamutSpace(gamut));
}

export function getCanvasPixelColor(
  color: Color,
  canvasColorSpace: "display-p3" | "srgb",
) {
  const output = color.to(canvasColorSpace === "display-p3" ? "p3" : "srgb");
  return output.coords
    .slice(0, 3)
    .map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255));
}

export function parsePickerColor(value: string) {
  try {
    return new Color(value);
  } catch {
    return new Color("srgb", [0, 0, 0]);
  }
}

export function parsePickerHex(value: string): Color | null {
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  return match ? new Color(`#${match[1]}`) : null;
}

function formatChannel(value: number) {
  return Number(Number(value).toFixed(5)).toString();
}

export function serializePickerColor(
  color: Color,
  colorSpace: PickerColorSpace = "sRGB",
) {
  if (colorSpace === "Display P3") {
    const [red, green, blue] = color.to("p3").coords;
    return `color(display-p3 ${formatChannel(red)} ${formatChannel(green)} ${formatChannel(blue)})`;
  }

  if (colorSpace === "OKlch") {
    const [lightness, chroma, hue] = color.to("oklch").coords;
    const numericHue = Number(hue);
    return `oklch(${formatChannel(lightness)} ${formatChannel(chroma)} ${formatChannel(Number.isFinite(numericHue) ? numericHue : 0)})`;
  }

  const [red, green, blue] = color.to("srgb").coords;
  const channels = [red, green, blue].map((channel) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}

export function getDeadZoneColor(colorScheme: "light" | "dark") {
  return colorScheme === "dark" ? [26, 32, 44] : [226, 232, 240];
}

export function getThirdChannelValue(color: Color, config: ColorSpaceConfig) {
  return getColorCoords(color, config)[
    channelIndex(config, config.thirdChannel)
  ];
}

export function getColorWithThirdChannel(
  color: Color,
  config: ColorSpaceConfig,
) {
  const coords = getColorCoords(color, config).map(() => 0);
  coords[channelIndex(config, config.thirdChannel)] = getThirdChannelValue(
    color,
    config,
  );
  return createColorFromCoords(config, coords);
}

export function getP3HslValues(color: Color): P3HslCoords {
  return colorToP3Hsl(color);
}
