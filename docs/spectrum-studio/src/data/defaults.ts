// Copyright 2026 Adobe. All rights reserved.
import dataset from "./design-system.defaults.json" with { type: "json" };
import type {
  ColorSystemDocument,
  ColorSystemDefaults,
} from "../features/color-system/model";
import { composeDesignSystemDefaults } from "../features/design-data/validation";
import { SCALE_TYPE_DEFAULTS } from "../features/scales/scaleType";
export type {
  DesignSystemDataset,
  CompleteDesignSystemDataset,
} from "../features/design-data/model";

function freezeDeep<Value>(value: Value): Value {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

export const designSystemDefaults = freezeDeep(
  composeDesignSystemDefaults(dataset, SCALE_TYPE_DEFAULTS),
);

export function createColorDefaults(): ColorSystemDocument {
  return structuredClone(designSystemDefaults.system.foundations.color);
}

export function createColorInputDefaults(): ColorSystemDefaults {
  const color = createColorDefaults();
  return {
    background: color.background,
    scales: color.scales.map(({ name, stops }) => ({
      name,
      stops: stops.map(({ lightness, hue, chroma }) => ({
        lightness,
        hue,
        chroma,
      })),
    })),
    contrasts: color.contrasts.map(({ value }) => value),
    surfaces: color.surfaces.map((surface) => {
      const { id, previewRole, showInPreview, sourceScaleId, ...rest } =
        surface;
      void id;
      void previewRole;
      void showInPreview;
      if (!sourceScaleId) return rest;
      const source = color.scales.find((scale) => scale.id === sourceScaleId);
      if (!source)
        throw new Error(
          `Default surface ${surface.name} has an unavailable tint source.`,
        );
      return { ...rest, source: source.name };
    }),
    extOffset: color.settings.extOffset,
    extSteep: color.settings.extSteep,
  };
}
