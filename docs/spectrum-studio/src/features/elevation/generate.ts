// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { scaleTypeValue, type ScaleType } from "../scales/scaleType";
import { scaleStepName } from "../scales/stepNames";
import { ELEVATION_FORMULAS, ELEVATION_POWER_FORMULA_ID } from "./formulas";
import {
  elevationIssues,
  type ElevationDocument,
  type ElevationLevel,
} from "./model";
import type { ColorOutputSettings } from "../color-system/outputSettings";
import { serializeOutputColor } from "../color-system/outputSerialization";

export function generateElevation(
  document: ElevationDocument,
  formulas: readonly ScaleType[] = ELEVATION_FORMULAS,
  colorOutput?: ColorOutputSettings,
): ElevationLevel[] {
  const issues = elevationIssues(document);
  if (issues.length) throw new Error(issues.join(" "));
  if (!document.layers.length) return [];
  return Array.from(
    { length: document.below + document.above + 1 },
    (_, position) => {
      const index = position - document.below;
      const shadows = document.layers.map((layer) => {
        if (layer.opacityTokenId)
          throw new Error(
            `${layer.label}: resolve its opacity token before generating shadows.`,
          );
        const opacity =
          layer.manualOpacity ??
          (layer.opacity === undefined ? undefined : layer.opacity / 100);
        if (opacity === undefined)
          throw new Error(
            `${layer.label}: choose an opacity token or a manual percentage.`,
          );
        const formula = ELEVATION_FORMULAS.find(
          (formula) => formula.id === layer.scaleTypeId,
        );
        if (
          !formula ||
          !formulas.some((formula) => formula.id === layer.scaleTypeId)
        )
          throw new Error(`${layer.label}: the shadow formula is unavailable.`);
        const blur = scaleTypeValue(
          formula,
          index,
          layer.base,
          layer.scaleTypeId === ELEVATION_POWER_FORMULA_ID
            ? { ratio: layer.scale, offset: 0 }
            : { step: layer.scale },
        );
        const offsetY = blur * (document.depth / 100);
        if (
          ![blur, offsetY].every(
            (value) => Number.isFinite(value) && value >= 0,
          )
        )
          throw new Error(
            `${layer.label}: a shadow could not be calculated. Reduce its base, scale or level range.`,
          );
        const color = new Color(document.color);
        color.alpha = opacity;
        return {
          layerId: layer.id,
          offsetX: 0 as const,
          offsetY,
          blur,
          spread: 0 as const,
          color: colorOutput
            ? serializeOutputColor(color, colorOutput)
            : color.toString({ precision: 12 }),
          opacity,
          inset: false as const,
        };
      });
      return {
        id: `elevation-${document.id}-${index}`,
        index,
        step: scaleStepName(index, document.below),
        shadows,
      };
    },
  );
}
export function shadowCss(level: Pick<ElevationLevel, "shadows">): string {
  if (!level.shadows.length) return "none";
  return level.shadows
    .map((shadow) => {
      if (
        ![shadow.offsetY, shadow.blur].every(
          (value) => Number.isFinite(value) && value >= 0,
        )
      )
        throw new Error("Invalid shadow lengths cannot be exported.");
      return `0 ${shadow.offsetY}px ${shadow.blur}px 0 ${shadow.color}`;
    })
    .join(", ");
}
export function hasDuplicateElevationLevels(
  levels: readonly ElevationLevel[],
): boolean {
  const values = levels.map((level) => JSON.stringify(level.shadows));
  return new Set(values).size !== values.length;
}
