// Copyright 2026 Adobe. All rights reserved.
export const COLOR_GAMUTS = ["srgb", "display-p3", "rec2020"] as const;
export const COLOR_FORMATS = ["rgb", "oklch", "hex", "hsl"] as const;
export type ColorGamut = (typeof COLOR_GAMUTS)[number];
export type ColorFormat = (typeof COLOR_FORMATS)[number];

export interface ColorOutputSettings {
  authoringGamut: ColorGamut;
  outputFormat: ColorFormat;
  mapOutputsToSrgb: boolean;
}

export const DEFAULT_COLOR_OUTPUT: Readonly<ColorOutputSettings> = {
  authoringGamut: "srgb",
  outputFormat: "hex",
  mapOutputsToSrgb: false,
};

export const GAMUT_LABELS: Record<ColorGamut, string> = {
  srgb: "sRGB",
  "display-p3": "Display P3",
  rec2020: "Rec 2020",
};
export const FORMAT_LABELS: Record<ColorFormat, string> = {
  rgb: "RGB",
  oklch: "OKLCh",
  hex: "Hex",
  hsl: "HSL",
};

export function outputGamut(settings: ColorOutputSettings): ColorGamut {
  return settings.mapOutputsToSrgb ? "srgb" : settings.authoringGamut;
}

export function isFormatAvailable(
  settings: ColorOutputSettings,
  format: ColorFormat,
): boolean {
  return (
    outputGamut(settings) === "srgb" || format === "rgb" || format === "oklch"
  );
}

export function isColorOutputSettings(
  value: unknown,
): value is ColorOutputSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 3 &&
    COLOR_GAMUTS.some((gamut) => gamut === record.authoringGamut) &&
    COLOR_FORMATS.some((format) => format === record.outputFormat) &&
    typeof record.mapOutputsToSrgb === "boolean" &&
    (record.mapOutputsToSrgb ||
      record.authoringGamut === "srgb" ||
      record.outputFormat === "rgb" ||
      record.outputFormat === "oklch")
  );
}

export function updateColorOutputSettings(
  current: ColorOutputSettings,
  patch: Partial<ColorOutputSettings>,
) {
  const next = { ...current, ...patch };
  let message: string | undefined;
  if (!isFormatAvailable(next, next.outputFormat)) {
    if (patch.outputFormat !== undefined)
      throw new Error(
        `${FORMAT_LABELS[patch.outputFormat]} requires sRGB output.`,
      );
    message = `Color format changed to RGB because ${GAMUT_LABELS[outputGamut(next)]} does not support ${FORMAT_LABELS[next.outputFormat]} output.`;
    next.outputFormat = "rgb";
  }
  if (!isColorOutputSettings(next))
    throw new Error("Invalid color authoring or output settings.");
  return { settings: next, message };
}

export function migrateLegacyColorOutput(value: unknown): ColorOutputSettings {
  if (value === "srgb") return { ...DEFAULT_COLOR_OUTPUT };
  if (value === "display-p3")
    return {
      authoringGamut: "display-p3",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    };
  if (value === "oklch")
    return {
      authoringGamut: "srgb",
      outputFormat: "oklch",
      mapOutputsToSrgb: false,
    };
  throw new Error(`Unsupported legacy color output: ${String(value)}.`);
}

export function colorJsSpace(gamut: ColorGamut) {
  return gamut === "display-p3" ? "p3" : gamut;
}
