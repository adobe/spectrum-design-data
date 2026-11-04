// Copyright 2026 Adobe. All rights reserved.
import {
  DEFAULT_ABSOLUTE_COLOR,
  normalizedAdjustment,
} from "../color-system/scaleAdjustment";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function legacyChannel(value: unknown) {
  return isRecord(value) &&
    (value.method === "relative" || value.method === "absolute") &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
    ? { method: value.method, value: value.value }
    : undefined;
}

export function upgradeScaleAdjustmentSnapshot(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.modeSets)) return value;
  return {
    ...value,
    modeSets: value.modeSets.map((set: unknown) => {
      if (!isRecord(set) || !Array.isArray(set.modes)) return set;
      return {
        ...set,
        modes: set.modes.map((mode: unknown) => {
          if (!isRecord(mode) || !isRecord(mode.foundations)) return mode;
          const color = mode.foundations.color;
          if (!isRecord(color) || !isRecord(color.scaleAdjustment)) return mode;
          const old = color.scaleAdjustment;
          if ("method" in old) return mode;
          const hue = legacyChannel(old.hue);
          const chroma = legacyChannel(old.chroma);
          if (
            (old.hue !== undefined && !hue) ||
            (old.chroma !== undefined && !chroma)
          )
            return mode;
          const adjustment =
            hue?.method === "absolute" || chroma?.method === "absolute"
              ? { method: "absolute", color: { ...DEFAULT_ABSOLUTE_COLOR } }
              : normalizedAdjustment({
                  method: "relative",
                  hue: hue?.value,
                  chroma: chroma?.value,
                });
          const nextColor = { ...color };
          if (adjustment) nextColor.scaleAdjustment = adjustment;
          else delete nextColor.scaleAdjustment;
          return {
            ...mode,
            foundations: { ...mode.foundations, color: nextColor },
          };
        }),
      };
    }),
  };
}
