// Copyright 2026 Adobe. All rights reserved.
import type { DimensionDocument } from "../scales/foundation";
import type { ElevationDocument } from "../elevation/model";
import { clampScaleRange } from "../scales/stepNames";
import { tokenUuid } from "./model";
import type { ColorSystemDocument } from "../color-system/model";
import { dataVisMemberId } from "../color-system/data-vis/identity";
import type { TypographyDocument } from "../typography/model";
import { typographyTokenGroups } from "../typography/typographyTokens";

export type PrimitiveReferenceFamily =
  | "size"
  | "spacing"
  | "radius"
  | "elevation"
  | "color"
  | "typography";
export const authoringReferencePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function primitiveReferenceId(
  family: PrimitiveReferenceFamily,
  sourceId: string,
  index: number,
) {
  if (family === "typography")
    return tokenUuid(
      `authoring-typography:v1:${sourceId.replace(/^typography:/, "")}:${index}`,
    );
  return tokenUuid(`authoring-primitive:v1:${family}:${sourceId}:${index}`);
}
export function typographyReferenceCoordinates(document: TypographyDocument) {
  const coordinates = new Map<
    string,
    { metricId: string; unit: "px" | "multiplier" }
  >();
  for (const group of typographyTokenGroups(document)) {
    for (
      let index = -Math.abs(Math.round(document.smallSizes));
      index <= Math.round(document.largeSizes);
      index++
    ) {
      coordinates.set(
        primitiveReferenceId("typography", `typography:${group.id}`, index),
        { metricId: group.id, unit: group.isUnitless ? "multiplier" : "px" },
      );
    }
  }
  return coordinates;
}

export function dimensionReferenceIds(
  family: "size" | "spacing" | "radius",
  document: DimensionDocument,
) {
  return new Set(
    document.scales.flatMap((scale) => {
      const { below, above } = clampScaleRange(scale.below, scale.above);
      return Array.from({ length: below + above + 1 }, (_, offset) =>
        primitiveReferenceId(family, scale.id, offset - below),
      );
    }),
  );
}

export function elevationReferenceIds(document: ElevationDocument) {
  const { below, above } = clampScaleRange(document.below, document.above);
  return new Set(
    document.layers.length
      ? Array.from({ length: below + above + 1 }, (_, offset) =>
          primitiveReferenceId("elevation", document.id, offset - below),
        )
      : [],
  );
}

export function availablePrimitiveReferences(sources: {
  spacing: DimensionDocument;
  size: DimensionDocument;
  radius: DimensionDocument;
  elevation: ElevationDocument;
  color?: ColorSystemDocument;
  typography?: TypographyDocument;
}) {
  const available = new Map<string, PrimitiveReferenceFamily>();
  for (const family of ["spacing", "size", "radius"] as const) {
    for (const id of dimensionReferenceIds(family, sources[family]))
      available.set(id, family);
  }
  for (const id of elevationReferenceIds(sources.elevation))
    available.set(id, "elevation");
  for (const scale of sources.color?.dataVisScales ?? [])
    if (scale.kind === "categorical") {
      for (const member of scale.members)
        available.set(dataVisMemberId(scale.id, member.id), "color");
    }
  if (sources.typography)
    for (const id of typographyReferenceCoordinates(sources.typography).keys())
      available.set(id, "typography");
  return available;
}
