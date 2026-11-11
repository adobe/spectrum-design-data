// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { concreteColor } from "../src/features/color-system/data-vis/colors";
import { serializeOutputColor } from "../src/features/color-system/outputSerialization";
import {
  canvasToColor,
  colorToCanvas,
  colorChannelToFieldValue,
  channelFormatOptions,
  createColorWithChannelValue,
  fieldValueToColorChannel,
  formatPickerHex,
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
  createColorFromCoords,
  pickerChannelName,
  pickerChannelValueText,
  pickerSliderPosition,
  movePickerAreaPosition,
} from "../src/components/color-picker/colorUtils";
import {
  colorToP3Hsl,
  p3HslToRgb,
  p3RgbToHsl,
} from "../src/components/color-picker/p3HslUtils";

for (const space of ["sRGB", "Display P3", "OKlch"] as const) {
  for (const model of ["cartesian", "polar"] as const) {
    const config = getColorSpaceConfig(space, model);
    for (const alpha of [0, 0.35, 1]) {
      const source = new Color("p3", [0.23, 0.46, 0.79], alpha);
      const coords = getColorCoords(source, config);
      const changed = createColorWithChannelValue(
        source,
        config,
        config.channels[0],
        coords[0],
      );
      assert.equal(changed.alpha, alpha, `${space}/${model} retains alpha`);
      assert.equal(createColorFromCoords(config, coords, alpha).alpha, alpha);
      assert.ok(pickerColorsEqual(source, changed));
      const position = colorToCanvas(
        source,
        200,
        config,
        config.defaultChannels,
      );
      const areaColor = canvasToColor(
        position.x,
        position.y,
        200,
        source,
        config,
        config.defaultChannels,
      );
      assert.equal(areaColor.alpha, alpha, "Area construction retains alpha");
      assert.equal(parsePickerHex("#123456", alpha)?.alpha, alpha);
      const payload = concreteColor(serializePickerColor(source, space));
      assert.ok(
        pickerColorsEqual(source, payload),
        `${space} payload is lossless`,
      );
    }
  }
}
for (const value of [
  "not-a-color",
  "rgb(12, 340, Q)",
  "var(--color)",
  "currentcolor",
  "rgb(10 none 20)",
  "oklch(none 0.1 40)",
  "rgb(10 20 30 / none)",
]) {
  assert.equal(parsePickerColor(value), null, `${value} is explicitly invalid`);
}

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
assert.equal(formatPickerHex(p3Red), formatPickerHex(recRed));
assert.notEqual(serializePickerColor(p3Red), serializePickerColor(recRed));
for (const source of [p3Red, recRed]) {
  for (const space of ["sRGB", "Display P3", "OKlch"] as const) {
    assert.ok(
      pickerColorsEqual(source, new Color(serializePickerColor(source, space))),
    );
  }
  for (const alpha of [0, 0.00000001, 0.123456789012345, 1]) {
    const source = new Color("rec2020", [0.85, 0.1, 0.1], alpha);
    const payload = concreteColor(serializePickerColor(source));
    assert.equal(payload.alpha, alpha);
    assert.ok(pickerColorsEqual(source, payload));
    const settings = {
      authoringGamut: "rec2020",
      outputFormat: "rgb",
      mapOutputsToSrgb: true,
    } as const;
    assert.equal(
      serializeOutputColor(payload, settings),
      serializeOutputColor(source, settings),
    );
  }
}
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

function validColor(value: string) {
  const parsed = parsePickerColor(value);
  assert.ok(parsed, `${value} should parse`);
  return parsed;
}
assert.equal(
  serializePickerColor(validColor("hsl(225.39 0% 100%)")),
  "#ffffff",
);
assert.equal(formatPickerHex(validColor("color(display-p3 1 0 0)")), "#ff0000");
for (const input of ["#ff0000", "#ffffff"]) {
  for (const space of ["Display P3", "OKlch"] as const) {
    const source = validColor(input);
    assert.ok(
      pickerColorsEqual(source, new Color(serializePickerColor(source, space))),
    );
  }
}
assert.equal(
  serializePickerColor(validColor("oklch(70% 0.16 40deg)"), "OKlch"),
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
  getColorCoords(validColor("oklch(70% 0.16 40deg)"), oklchPolar),
  [0.7, 0.16, 40],
);
const changed = createColorWithChannelValue(color, srgbCartesian, "r", 0.9);
assert.ok(changed.to("srgb").coords[0] > 0.89);

const outOfGamut = new Color("oklch", [0.7, 0.4, 40]);
assert.ok(pickerColorsEqual(validColor("oklch(0.7 0.4 40)"), outOfGamut));
for (const input of ["oklch(0.5 0 none)", "hsl(none 0% 50%)", "#fff", "#000"]) {
  assert.ok(validColor(input));
}
assert.equal(pickerChannelName("b", "oklab"), "Blue/yellow");
assert.equal(pickerChannelName("b", "srgb"), "Blue");
assert.equal(pickerChannelValueText("r", 0.2, "srgb"), "51");
assert.equal(pickerChannelValueText("l", 0.35, "oklch"), "35%");
for (const gamut of ["sRGB", "Display-P3", "Rec2020"] as const) {
  const source = new Color("oklch", [0.7, 0.4, 40], 0.35);
  const mapped = mapColorToGamut(source, gamut);
  assert.equal(mapped.alpha, source.alpha);
  assert.equal(source.alpha, 0.35);
  assert.equal(source.coords[1], 0.4);
}
for (const size of [1, 200]) {
  assert.equal(pickerSliderPosition(0.4, [0.4, 0.4], size, "horizontal"), 0);
  assert.equal(pickerSliderPosition(0.4, [0.4, 0.4], size, "vertical"), size);
  assert.deepEqual(
    movePickerAreaPosition({ x: size, y: 0 }, size, 0, 10, false),
    { x: size, y: 0 },
  );
  assert.deepEqual(movePickerAreaPosition({ x: 0, y: 0 }, size, 1, 10, false), {
    x: 0,
    y: 0,
  });
}
assert.deepEqual(movePickerAreaPosition({ x: 100, y: 0 }, 200, 1, 1, true), {
  x: 100,
  y: 199,
});
assert.deepEqual(movePickerAreaPosition({ x: 200, y: 100 }, 200, 0, 10, true), {
  x: 10,
  y: 100,
});
assert.equal(pickerSliderPosition(0.5, [0, 1], 200, "horizontal"), 100);
assert.equal(pickerSliderPosition(1, [0, 1], 200, "vertical"), 0);
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
