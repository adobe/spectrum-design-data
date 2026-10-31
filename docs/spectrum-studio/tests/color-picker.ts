// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import {
  canvasToColor,
  colorToCanvas,
  colorChannelToFieldValue,
  channelFormatOptions,
  createColorWithChannelValue,
  fieldValueToColorChannel,
  getColorSpaceConfig,
  getChannelRange,
  getChannelGamutRange,
  getColorCoords,
  isOutOfGamut,
  mapColorToGamut,
  parsePickerColor,
  parsePickerHex,
  serializePickerColor,
  pickerColorsEqual,
} from "../src/components/color-picker/colorUtils";
import {
  colorToP3Hsl,
  p3HslToRgb,
  p3RgbToHsl,
} from "../src/components/color-picker/p3HslUtils";

const srgbCartesian = getColorSpaceConfig("sRGB", "cartesian");
const oklchPolar = getColorSpaceConfig("OKlch", "polar");
const p3Polar = getColorSpaceConfig("Display P3", "polar");

assert.deepEqual(srgbCartesian.defaultChannels, ["r", "g"]);
assert.equal(srgbCartesian.thirdChannel, "b");
assert.deepEqual(oklchPolar.defaultChannels, ["c", "h"]);
assert.deepEqual(getChannelRange("c", "oklch"), [0, 0.5]);
assert.deepEqual(getChannelRange("a", "oklab"), [-0.5, 0.5]);
const p3Red = new Color("p3", [1, 0, 0]),
  recRed = new Color("rec2020", [1, 0, 0]);
assert.equal(serializePickerColor(p3Red), serializePickerColor(recRed));
assert.equal(
  pickerColorsEqual(p3Red, recRed),
  false,
  "Wide source comparison must not collapse distinct colors to sRGB.",
);
const originalRecRed = [...recRed.coords];
mapColorToGamut(recRed, "sRGB");
assert.deepEqual(
  recRed.coords,
  originalRecRed,
  "Gamut mapping must not mutate the authored source.",
);
const recLch = getColorCoords(recRed, oklchPolar);
assert.ok(recLch[1] > 0.26 && recLch[1] < getChannelRange("c", "oklch")[1]);
assert.equal(colorChannelToFieldValue("l", 0.3, "oklch"), 0.3);
assert.equal(fieldValueToColorChannel("l", 0.31, "oklch"), 0.31);
assert.equal(fieldValueToColorChannel("l", 31, "oklch"), 0.31);
assert.equal(colorChannelToFieldValue("r", 0.58, "p3"), 0.58);
assert.equal(fieldValueToColorChannel("r", 58, "p3"), 0.58);
assert.equal(colorChannelToFieldValue("l", 30, "hsl"), 0.3);
assert.equal(fieldValueToColorChannel("l", 0.31, "hsl"), 31);
assert.equal(fieldValueToColorChannel("l", 31, "hsl"), 31);
assert.equal(colorChannelToFieldValue("r", 0.5, "srgb"), 127.5);
assert.equal(fieldValueToColorChannel("r", 128, "srgb"), 128 / 255);
for (const [channel, spaceId, expected] of [
  ["r", "srgb", "128"],
  ["r", "p3", "50.12%"],
  ["l", "oklch", "50.12%"],
  ["c", "oklch", "0.12"],
  ["a", "oklab", "-0.12"],
  ["h", "hsl", "123.46°"],
] as const) {
  const value =
    spaceId === "srgb"
      ? 127.6
      : channel === "h"
        ? 123.456
        : channel === "c"
          ? 0.123456
          : channel === "a"
            ? -0.123456
            : 0.50123456;
  assert.equal(
    new Intl.NumberFormat(
      "en-US",
      channelFormatOptions(channel, spaceId),
    ).format(value),
    expected,
  );
}

const p3Rgb = { r: 0.2, g: 0.45, b: 0.8 };
const p3Hsl = p3RgbToHsl(p3Rgb);
const roundTrip = p3HslToRgb(p3Hsl);
assert.ok(Math.abs(roundTrip.r - p3Rgb.r) < 0.000001);
assert.ok(Math.abs(roundTrip.g - p3Rgb.g) < 0.000001);
assert.ok(Math.abs(roundTrip.b - p3Rgb.b) < 0.000001);

const color = new Color("srgb", [0.2, 0.4, 0.6]);
const p3ColorHsl = colorToP3Hsl(color);
assert.ok(Number.isFinite(p3ColorHsl.h));
assert.equal(p3Polar.id, "p3-hsl");
const whiteOklch = getColorCoords(new Color("srgb", [1, 1, 1]), oklchPolar);
assert.ok(Math.abs(whiteOklch[0] - 1) < 0.000001);
assert.ok(Math.abs(whiteOklch[1]) < 0.000001);
assert.equal(whiteOklch[2], 0);

const center = canvasToColor(50, 150, 200, color, srgbCartesian, ["r", "g"]);
const coords = colorToCanvas(center, 200, srgbCartesian, ["r", "g"]);
assert.ok(Math.abs(coords.x - 50) < 1);
assert.ok(Math.abs(coords.y - 150) < 1);

assert.throws(
  () => canvasToColor(50, 150, 200, color, srgbCartesian, ["a", "g"]),
  /Channel "a" is not available/,
);

const parsed = parsePickerColor("not-a-color");
assert.equal(serializePickerColor(parsed), "#000000");
assert.equal(
  serializePickerColor(parsePickerColor("hsl(225.39 0% 100%)")),
  "#ffffff",
);
assert.equal(
  serializePickerColor(parsePickerColor("color(display-p3 1 0 0)")),
  "#ff0000",
);
assert.equal(
  serializePickerColor(parsePickerColor("#ff0000"), "Display P3"),
  "color(display-p3 0.91749 0.20029 0.13856)",
);
assert.equal(
  serializePickerColor(parsePickerColor("#ff0000"), "OKlch"),
  "oklch(0.62796 0.25768 29.23388)",
);
assert.equal(
  serializePickerColor(parsePickerColor("#ffffff"), "OKlch"),
  "oklch(1 0 0)",
);
assert.equal(
  serializePickerColor(parsePickerColor("oklch(70% 0.16 40deg)"), "OKlch"),
  "oklch(0.7 0.16 40)",
);
for (const [input, expected] of [
  ["#336699", "#336699"],
  ["336699", "#336699"],
  ["#ABC", "#aabbcc"],
  ["abc", "#aabbcc"],
  ["  #Ff8800\n", "#ff8800"],
  ["000", "#000000"],
  ["#fff", "#ffffff"],
]) {
  const parsedHex = parsePickerHex(input);
  assert.ok(parsedHex, `${input} should be accepted as a hex color`);
  assert.equal(serializePickerColor(parsedHex), expected);
}
for (const input of [
  "",
  "#",
  "#12",
  "#12345",
  "#1234567",
  "#abcd",
  "#12345678",
  "#gggggg",
  "red",
  "rgb(1 2 3)",
  "##123",
  "#12 3456",
]) {
  assert.equal(
    parsePickerHex(input),
    null,
    `${input} should be rejected as a hex color`,
  );
}
const hexColor = parsePickerHex("#336699");
assert.ok(hexColor);
const hexCoordinates = getColorCoords(hexColor, srgbCartesian);
assert.deepEqual(
  hexCoordinates.map((value, index) =>
    colorChannelToFieldValue(
      srgbCartesian.channels[index],
      value,
      srgbCartesian.id,
    ),
  ),
  [51, 102, 153],
);
assert.equal(
  serializePickerColor(
    createColorWithChannelValue(
      hexColor,
      srgbCartesian,
      "r",
      fieldValueToColorChannel("r", 255, "srgb"),
    ),
  ),
  "#ff6699",
);
for (const config of [
  getColorSpaceConfig("sRGB", "polar"),
  oklchPolar,
  p3Polar,
  getColorSpaceConfig("OKlch", "cartesian"),
  getColorSpaceConfig("Display P3", "cartesian"),
]) {
  const coords = getColorCoords(hexColor, config);
  assert.equal(
    serializePickerColor(
      createColorWithChannelValue(
        hexColor,
        config,
        config.channels[0],
        coords[0],
      ),
    ),
    "#336699",
  );
}
assert.deepEqual(
  getColorCoords(parsePickerColor("oklch(70% 0.16 40deg)"), oklchPolar),
  [0.7, 0.16, 40],
);
const changed = createColorWithChannelValue(color, srgbCartesian, "r", 0.9);
assert.ok(changed.to("srgb").coords[0] > 0.89);

const outOfGamut = new Color("oklch", [0.7, 0.4, 40]);
const rawCanvasCandidate = canvasToColor(200, 0, 200, outOfGamut, oklchPolar, [
  "c",
  "h",
]);
assert.equal(isOutOfGamut(rawCanvasCandidate, "sRGB"), true);
const mapped = outOfGamut.toGamut({ space: "srgb" });
assert.ok(mapped.inGamut("srgb"));
assert.ok(mapColorToGamut(rawCanvasCandidate, "sRGB").inGamut("srgb"));

const p3HslRgb = p3HslToRgb({ h: 284, s: 80, l: 68 });
const p3HslColor = new Color("p3", [p3HslRgb.r, p3HslRgb.g, p3HslRgb.b]);
const saturationRange = getChannelGamutRange(p3HslColor, p3Polar, "s", "sRGB");
const saturationAtMaximum = createColorWithChannelValue(
  p3HslColor,
  p3Polar,
  "s",
  saturationRange[1],
);
const saturationPastMaximum = createColorWithChannelValue(
  p3HslColor,
  p3Polar,
  "s",
  Math.min(100, saturationRange[1] + 0.01),
);
assert.ok(saturationRange[1] < 100);
assert.ok(saturationAtMaximum.inGamut("srgb"));
assert.equal(saturationPastMaximum.inGamut("srgb"), false);
const redP3HslRgb = p3HslToRgb({ h: 0, s: 80, l: 68 });
const redP3HslColor = new Color("p3", [
  redP3HslRgb.r,
  redP3HslRgb.g,
  redP3HslRgb.b,
]);
const redSaturationRange = getChannelGamutRange(
  redP3HslColor,
  p3Polar,
  "s",
  "sRGB",
);
assert.notEqual(
  redSaturationRange[1].toFixed(2),
  saturationRange[1].toFixed(2),
);

console.log("Color picker utility checks passed");
