// Copyright 2026 Adobe. All rights reserved.
import type { ColorScale } from "./model";
import type { ModeSet } from "../modes/model";
import { parameterOwners } from "../modes/parameters";

export function assertCustomContrastPatchRestore(
  sets: ModeSet[],
  patches: { modeId: string }[],
) {
  const owner = parameterOwners(sets)["color.contrastMultiplier"];
  if (
    sets.some((axis) =>
      axis.modes.some(
        (mode) =>
          patches.some((patch) => patch.modeId === mode.id) &&
          (axis.id !== owner || mode.id === axis.defaultModeId),
      ),
    )
  ) {
    throw new Error(
      "Contrast mode ownership changed after deletion. Use Cancel to restore the last save.",
    );
  }
}

export function pruneCustomContrastPatches(
  sets: ModeSet[],
  scales: readonly ColorScale[],
): ModeSet[] {
  return sets.map((axis) => ({
    ...axis,
    modes: axis.modes.map((mode) => {
      const color = mode.foundations.color;
      if (!color?.scaleContrasts) return mode;
      const scaleContrasts = Object.fromEntries(
        Object.entries(color.scaleContrasts).flatMap(([id, values]) => {
          const ids = new Set(
            scales
              .find((scale) => scale.id === id)
              ?.customContrasts?.steps.map((step) => step.id),
          );
          const steps = Object.fromEntries(
            Object.entries(values).filter(([id]) => ids.has(id)),
          );
          return Object.keys(steps).length ? [[id, steps]] : [];
        }),
      );
      const next = { ...color };
      if (Object.keys(scaleContrasts).length)
        next.scaleContrasts = scaleContrasts;
      else delete next.scaleContrasts;
      return { ...mode, foundations: { ...mode.foundations, color: next } };
    }),
  }));
}
