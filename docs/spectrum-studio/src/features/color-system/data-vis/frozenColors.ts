// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../model";
import { dataVisMemberId } from "./identity";
import { concreteColor } from "./colors";

export function staticCategoricalTokenIds(document: ColorSystemDocument) {
  return new Set(
    document.dataVisScales.flatMap((scale) =>
      scale.kind === "categorical" && scale.staticColors
        ? scale.members.map((member) => dataVisMemberId(scale.id, member.id))
        : [],
    ),
  );
}

export function editStaticMemberOverrides(
  document: ColorSystemDocument,
  updates: ReadonlyMap<string, string | null>,
) {
  const available = staticCategoricalTokenIds(document);
  for (const [id, value] of updates) {
    if (!available.has(id))
      throw new Error("This shared Static categorical color is unavailable.");
    if (value !== null) concreteColor(value);
  }
  return {
    ...document,
    dataVisScales: document.dataVisScales.map((scale) => {
      if (scale.kind !== "categorical" || !scale.staticColors) return scale;
      return {
        ...scale,
        staticColors: scale.staticColors.map((color) => {
          const id = dataVisMemberId(scale.id, color.id);
          if (!updates.has(id)) return color;
          const { overrideValue, ...base } = color;
          void overrideValue;
          const value = updates.get(id);
          return value === null || value === color.value
            ? base
            : { ...base, overrideValue: value };
        }),
      };
    }),
  };
}
