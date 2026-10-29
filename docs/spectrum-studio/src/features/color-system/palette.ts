// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import {
  convertLinearGamut,
  gamutClamp,
  linearToOklch,
  renderGamutForOutput,
} from "./colorMath";
import { sanitizeTokenName } from "./cssLibrary";
import type { ColorSystemDocument, OutputGamut, PaletteColor } from "./model";
import {
  MAX_CHROMA,
  paletteColorCss,
  paletteColorHex,
  type PaletteChannels,
} from "./paletteValue";

export {
  paletteColorCss,
  paletteColorHex,
  paletteColorLinear,
  type PaletteChannels,
} from "./paletteValue";

/** Parses a source color in the authoring gamut, independently of output mapping. */
export function paletteChannelsFromCss(
  input: string,
  outputGamut: OutputGamut,
): PaletteChannels | null {
  let parsed: Color;
  try {
    parsed = new Color(input.trim());
  } catch {
    return null;
  }
  const [lightness, chroma, hue] = parsed.to("oklch").coords.map(Number);
  if (!Number.isFinite(lightness)) return null;
  const gamut =
    typeof outputGamut === "object"
      ? outputGamut.authoringGamut
      : renderGamutForOutput(outputGamut);
  const mapped = gamutClamp(
    lightness,
    Number.isFinite(chroma) ? chroma : 0,
    Number.isFinite(hue) ? hue : 0,
    gamut,
    typeof outputGamut === "object",
  );
  const [mappedLightness, mappedChroma, mappedHue] = linearToOklch(
    convertLinearGamut(mapped, gamut, "srgb"),
  );
  const isNeutral = mappedChroma < 1e-4;
  return {
    lightness: Math.min(1, Math.max(0, mappedLightness)),
    chroma: (mappedChroma / MAX_CHROMA) * 100,
    hue: isNeutral ? 0 : mappedHue,
  };
}

/** Name collisions are checked after sanitizing so they match token and CSS names. */
export function paletteNameKey(name: string) {
  return sanitizeTokenName(name);
}

export type PaletteNameError = "empty" | "duplicate-palette";

export function validatePaletteName(
  document: Pick<ColorSystemDocument, "palette" | "scales">,
  name: string,
  ignoreId?: string,
): PaletteNameError | null {
  if (!name.trim()) return "empty";
  const key = paletteNameKey(name);
  if (
    document.palette.some(
      (color) => color.id !== ignoreId && paletteNameKey(color.name) === key,
    )
  )
    return "duplicate-palette";
  return null;
}

export const PALETTE_NAME_ERRORS: Record<PaletteNameError, string> = {
  empty: "Enter a name.",
  "duplicate-palette": "Another palette color already uses this name.",
};

/** The palette color that already holds this value in the output format, if any. */
export function findPaletteValueDuplicate(
  document: Pick<ColorSystemDocument, "palette" | "settings">,
  channels: PaletteChannels,
  ignoreId?: string,
): PaletteColor | undefined {
  const key = paletteColorCss(channels, document.settings.colorOutput);
  return document.palette.find(
    (color) =>
      color.id !== ignoreId &&
      paletteColorCss(color, document.settings.colorOutput) === key,
  );
}

export interface PaletteSwatch {
  color: PaletteColor;
  hex: string;
  /** Another palette color earlier in the list renders as this same swatch. */
  duplicateOf?: PaletteColor;
}

/** Swatch pickers require unique colors, so later colors that collide are flagged and left out of the picker. */
export function paletteSwatches(
  palette: readonly PaletteColor[],
  outputGamut: OutputGamut,
): PaletteSwatch[] {
  const seen = new Map<string, PaletteColor>();
  return palette.map((color) => {
    const hex = paletteColorHex(color, outputGamut);
    const first = seen.get(hex);
    if (first) return { color, hex, duplicateOf: first };
    seen.set(hex, color);
    return { color, hex };
  });
}

function nextName(
  palette: readonly PaletteColor[],
  scaleNames: readonly string[],
) {
  const taken = new Set([
    ...palette.map((color) => paletteNameKey(color.name)),
    ...scaleNames.map(sanitizeTokenName),
  ]);
  let sequence = palette.length + 1;
  while (taken.has(paletteNameKey(`Palette color ${sequence}`))) sequence += 1;
  return `Palette color ${sequence}`;
}

/** A new color with a unique name and a lightness not yet used in the palette. */
export function createPaletteColor(
  document: Pick<ColorSystemDocument, "palette" | "scales" | "settings">,
  id: string,
): PaletteColor {
  const name = nextName(
    document.palette,
    document.scales.map((scale) => scale.name),
  );
  for (let lightness = 50; lightness >= 0; lightness -= 1) {
    const channels = { lightness: lightness / 100, hue: 0, chroma: 0 };
    if (!findPaletteValueDuplicate(document, channels))
      return { id, name, ...channels };
  }
  for (let lightness = 51; lightness <= 100; lightness += 1) {
    const channels = { lightness: lightness / 100, hue: 0, chroma: 0 };
    if (!findPaletteValueDuplicate(document, channels))
      return { id, name, ...channels };
  }
  return { id, name, lightness: 0.5, hue: 0, chroma: 0 };
}
