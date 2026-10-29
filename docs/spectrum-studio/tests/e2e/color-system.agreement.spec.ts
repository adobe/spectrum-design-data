// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { COLOR_SYSTEM_DEFAULTS } from "../../src/features/color-system/defaults";
import {
  buildColorLibrary,
  sanitizeTokenName,
} from "../../src/features/color-system/cssLibrary";
import {
  contrastRatio,
  convertLinearGamut,
  hexToLinear,
  luminance,
  oklchToLinear,
  toLinear,
  type LinearRgb,
  type RgbGamut,
  xyzD65ToLinear,
} from "../../src/features/color-system/colorMath";
import { generateColors } from "../../src/features/color-system/dynamicGeneration";
import { hydrateColorSystem } from "../../src/features/color-system/model";
import { buildScaleData } from "../../src/features/color-system/scaleGeneration";

function parseComputedColor(
  value: string,
  gamut: RgbGamut = "srgb",
): LinearRgb {
  const linearMatch = value.match(
    /color\(srgb-linear\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/i,
  );
  if (linearMatch)
    return [
      Number(linearMatch[1]),
      Number(linearMatch[2]),
      Number(linearMatch[3]),
    ];

  const p3Match = value.match(
    /color\(display-p3\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/i,
  );
  if (p3Match)
    return p3Match
      .slice(1, 4)
      .map(Number)
      .map(toLinear) as unknown as LinearRgb;

  const xyzMatch = value.match(
    /color\(xyz-d65\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/i,
  );
  if (xyzMatch)
    return xyzD65ToLinear(
      xyzMatch.slice(1, 4).map(Number) as unknown as LinearRgb,
      "display-p3",
    );

  const oklchMatch = value.match(
    /oklch\(\s*([\d.e+-]+)%?\s+([\d.e+-]+)\s+([\d.e+-]+)/i,
  );
  if (oklchMatch)
    return oklchToLinear([
      Number(oklchMatch[1]) / (value.includes("%") ? 100 : 1),
      Number(oklchMatch[2]),
      Number(oklchMatch[3]),
    ]);

  const srgbMatch = value.match(
    /color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/i,
  );
  if (srgbMatch)
    return srgbMatch
      .slice(1, 4)
      .map(Number)
      .map(toLinear) as unknown as LinearRgb;

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (!rgbMatch) throw new Error(`Unsupported computed color: ${value}`);
  const channels = rgbMatch[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(Number);
  const srgb = channels.map((channel) =>
    toLinear(channel / 255),
  ) as unknown as LinearRgb;
  return gamut === "display-p3"
    ? convertLinearGamut(srgb, "srgb", "display-p3")
    : srgb;
}

test("JS preview agrees with CSS-only dynamic output", async ({ page }) => {
  const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);
  const css = buildColorLibrary(document);
  const backgrounds = ["#ffffff", "#000000", "#777777"];
  const scaleNames = ["Silver", "Blue", "Red"];
  const contrastIndexes = [0, 4, 8, 11];

  const probes = scaleNames.flatMap((scaleName) =>
    backgrounds.flatMap((background) =>
      contrastIndexes.map((contrastIndex) => ({
        scaleName,
        background,
        contrastIndex,
      })),
    ),
  );

  await page.setContent(`
    <style>${css}</style>
    ${probes
      .map(
        (probe, index) => `
      <div
        id="probe-${index}"
        class="color-scale-${sanitizeTokenName(probe.scaleName)} color-contrast-${(probe.contrastIndex + 1) * 100} color-system-tint-bg"
        style="--bg: ${probe.background}"
      ></div>
    `,
      )
      .join("")}
  `);

  const computed = await page
    .locator("[id^=probe-]")
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backgroundColor),
    );

  probes.forEach((probe, index) => {
    const scale = document.scales.find(
      (candidate) => candidate.name === probe.scaleName,
    )!;
    const target = document.contrasts[probe.contrastIndex].value;
    const expected = generateColors(
      buildScaleData(scale),
      hexToLinear(probe.background),
      target,
      document.settings,
    );
    const actualLinear = parseComputedColor(computed[index]);
    const maxChannelError = Math.max(
      ...actualLinear.map((channel, channelIndex) =>
        Math.abs(channel - expected.dynamic.linear[channelIndex]),
      ),
    );
    const actualContrast = contrastRatio(
      luminance(actualLinear),
      luminance(hexToLinear(probe.background)),
    );

    expect(
      maxChannelError,
      `${probe.scaleName} ${probe.background} ${target}:1 channel drift`,
    ).toBeLessThanOrEqual(0.005);
    expect(
      Math.abs(actualContrast - expected.dynamic.measuredContrast),
      `${probe.scaleName} ${probe.background} ${target}:1 contrast drift`,
    ).toBeLessThanOrEqual(0.02);
  });
});

test("Display P3 output uses the wide-gamut CSS path", async ({ page }) => {
  const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);
  document.settings.colorOutput = "display-p3";
  const css = buildColorLibrary(document);
  const scale = document.scales.find((candidate) => candidate.name === "Red")!;
  const background = convertLinearGamut(
    hexToLinear("#777777"),
    "srgb",
    "display-p3",
  );
  const generated = generateColors(
    buildScaleData(scale, "display-p3"),
    background,
    4.79,
    document.settings,
  );

  await page.setContent(`
    <style>${css}</style>
    <div id="p3-probe" class="color-scale-red color-contrast-900 color-system-tint-bg" style="--bg: #777777"></div>
  `);
  const computed = await page
    .locator("#p3-probe")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const actual = parseComputedColor(computed, "display-p3");
  const maxChannelError = Math.max(
    ...actual.map((channel, index) =>
      Math.abs(channel - generated.dynamic.linear[index]),
    ),
  );
  const actualContrast = contrastRatio(
    luminance(actual, "display-p3"),
    luminance(background, "display-p3"),
  );

  expect(css).toContain("color(from var(--_linear-color) display-p3 r g b");
  expect(generated.dynamic.css).toMatch(/^color\(display-p3 /);
  expect(maxChannelError).toBeLessThanOrEqual(0.005);
  expect(
    Math.abs(actualContrast - generated.dynamic.measuredContrast),
  ).toBeLessThanOrEqual(0.02);
});

test("OKLCH output serializes the same generated color", async ({ page }) => {
  const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);
  document.settings.colorOutput = "oklch";
  const css = buildColorLibrary(document);
  const scale = document.scales.find((candidate) => candidate.name === "Red")!;
  const background = hexToLinear("#777777");
  const generated = generateColors(
    buildScaleData(scale, "oklch"),
    background,
    4.79,
    document.settings,
  );

  await page.setContent(`
    <style>${css}</style>
    <div id="oklch-probe" class="color-scale-red color-contrast-900 color-system-tint-bg" style="--bg: #777777"></div>
  `);
  const computed = await page
    .locator("#oklch-probe")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const actual = parseComputedColor(computed);
  const maxChannelError = Math.max(
    ...actual.map((channel, index) =>
      Math.abs(channel - generated.dynamic.linear[index]),
    ),
  );

  expect(css).toContain("oklch(from var(--_linear-color) l c h)");
  expect(generated.dynamic.css).toMatch(/^oklch\(/);
  expect(computed).toMatch(/^oklch\(/i);
  expect(maxChannelError).toBeLessThanOrEqual(0.005);
});
