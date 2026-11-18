// Copyright 2026 Adobe. All rights reserved.
export type TypographyDisplayMode = "font-size" | "line-height" | "sample-icon";

/** Every column the Show menu can toggle, in menu order. */
export const typographyDisplayModes: TypographyDisplayMode[] = [
  "font-size",
  "line-height",
  "sample-icon",
];

/** The sample icon column starts hidden. */
export const defaultTypographyDisplayModes: TypographyDisplayMode[] = [
  "font-size",
  "line-height",
];

const COLUMN_GAP = 16;
const SAMPLE_TEXT_MIN = 240;

/**
 * Grid tracks for the Typography Elements table: Index, Font size,
 * Line height, Sample icon (only when shown), then Sample text. Hidden metric
 * columns keep their space so values don't shift; the icon column collapses.
 */
export function typographyRampColumns(
  displayModes: readonly TypographyDisplayMode[],
  iconTrack: number,
): { gridTemplateColumns: string; minWidth: number } {
  const tracks = [44, 70, 100];
  if (displayModes.includes("sample-icon")) tracks.push(iconTrack);
  return {
    gridTemplateColumns: [
      ...tracks.map((width) => `${width}px`),
      `minmax(${SAMPLE_TEXT_MIN}px, 1fr)`,
    ].join(" "),
    minWidth:
      tracks.reduce((sum, width) => sum + width, SAMPLE_TEXT_MIN) +
      COLUMN_GAP * tracks.length,
  };
}
