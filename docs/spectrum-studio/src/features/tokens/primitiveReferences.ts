// Copyright 2026 Adobe. All rights reserved.
import type {
  DimensionScale,
  GeneratedDimensionValue,
} from "../scales/foundation";
import type {
  ElevationDocument,
  ElevationLevel,
  GeneratedShadow,
} from "../elevation/model";
import type { TaxonomyDocument } from "../taxonomy/model";
import { browserElevationSources } from "../elevation/output";
import { browserSourcesFromOutputs } from "./browserSources";
import {
  projectBrowserTokens,
  resolveBrowserTokens,
  tokenValueText,
  type BrowserTokenEdits,
  type BrowserTokenSource,
  type NominalFontSizeMeasurement,
} from "./browserModel";
import {
  primitiveReferenceId,
  type PrimitiveReferenceFamily,
} from "./primitiveIdentity";
import type {
  GeneratedTypographyToken,
  TypographyDocument,
} from "../typography/model";
import { typographyTokenGroups } from "../typography/typographyTokens";
import type { TypographyNamingContext } from "../typography/typographyTokens";

export interface PrimitiveReference {
  id: string;
  family: PrimitiveReferenceFamily;
  sourceId: string;
  index: number;
  step?: number;
  sourceName?: string;
  valueOverridden?: boolean;
  nativeId: string;
  name: string;
  value: number | string;
  displayValue: string;
  hidden: boolean;
  shadows?: GeneratedShadow[];
  error?: string;
  metricId?: string;
  unit?: "px" | "multiplier";
  measurement?: NominalFontSizeMeasurement;
}
export interface PrimitiveReferenceOutputs {
  spacing: { scale: DimensionScale; values: GeneratedDimensionValue[] }[];
  size: { scale: DimensionScale; values: GeneratedDimensionValue[] }[];
  radius: { scale: DimensionScale; values: GeneratedDimensionValue[] }[];
  elevation: { document: ElevationDocument; levels: ElevationLevel[] };
  color?: BrowserTokenSource[];
  typography?: {
    document: TypographyDocument;
    values: GeneratedTypographyToken[];
    naming: TypographyNamingContext;
  };
}

export function primitiveReferencesFromOutputs(
  outputs: PrimitiveReferenceOutputs,
  registry: TaxonomyDocument,
  edits: BrowserTokenEdits = {},
  modeKey = "",
): PrimitiveReference[] {
  const sources = [
    ...browserSourcesFromOutputs(
      [],
      outputs.typography?.values ?? [],
      outputs.spacing,
      outputs.size,
      outputs.typography?.naming ?? { registry },
      undefined,
      outputs.radius,
      { includeUnpublished: true },
    ),
    ...browserElevationSources(
      outputs.elevation.document,
      outputs.elevation.levels,
      registry,
      { includeUnpublished: true },
    ),
    ...(outputs.color ?? []),
  ];
  const identities = new Map<
    string,
    {
      sourceId: string;
      sourceName: string;
      index: number;
      step: number;
      hidden: boolean;
      metricId?: string;
      unit?: "px" | "multiplier";
    }
  >();
  if (outputs.typography)
    for (const group of typographyTokenGroups(
      outputs.typography.document,
      outputs.typography.naming,
    )) {
      for (const token of outputs.typography.values)
        identities.set(`typography-${group.id}-${token.scale}`, {
          sourceId: `typography:${group.id}`,
          sourceName: group.label,
          index: token.position,
          step: token.scale,
          hidden: outputs.typography.document.hideFromPublishing ?? false,
          metricId: group.id,
          unit: group.isUnitless ? "multiplier" : "px",
        });
    }
  for (const family of ["spacing", "size", "radius"] as const)
    for (const { scale, values } of outputs[family]) {
      for (const token of values)
        identities.set(`${family}-${scale.id}-${token.step}`, {
          sourceId: scale.id,
          sourceName: scale.name,
          index: token.index,
          step: token.step,
          hidden: scale.hideFromPublishing ?? false,
        });
    }
  for (const level of outputs.elevation.levels)
    identities.set(level.id, {
      sourceId: outputs.elevation.document.id,
      sourceName: String(
        registry.terms.find(
          (term) => term.id === outputs.elevation.document.name.termId,
        )?.value ?? "",
      ),
      index: level.index,
      step: level.step,
      hidden: outputs.elevation.document.hideFromPublishing ?? false,
    });
  for (const source of outputs.color ?? [])
    if (source.dataVis)
      identities.set(source.id, {
        sourceId: source.dataVis.scaleId,
        sourceName: source.groupLabel,
        index: source.dataVis.ordinal - 1,
        step: source.dataVis.ordinal,
        hidden: source.dataVis.hidden,
      });
  return (
    ["size", "spacing", "radius", "elevation", "color", "typography"] as const
  ).flatMap((family) =>
    projectBrowserTokens(
      resolveBrowserTokens(
        sources.filter(
          (source) => source.type === (family === "color" ? "colors" : family),
        ),
        edits,
        modeKey,
      ),
      registry,
    ).map((row) => {
      const identity = identities.get(row.id);
      if (!identity)
        throw new Error(`Missing authoring source identity for ${row.id}.`);
      const valueError =
        family !== "elevation" &&
        family !== "color" &&
        (typeof row.value !== "number" ||
          !Number.isFinite(row.value) ||
          row.value < 0)
          ? "Choose a finite, non-negative length from this foundation."
          : undefined;
      const error =
        valueError ??
        row.validationError ??
        (row.projection?.issues.length
          ? row.projection.issues.join(" ")
          : undefined);
      return {
        ...identity,
        id:
          family === "color"
            ? row.id
            : primitiveReferenceId(family, identity.sourceId, identity.index),
        family,
        nativeId: row.id,
        name: row.name,
        value: row.value,
        displayValue: tokenValueText(row),
        valueOverridden: row.valueOverridden,
        shadows: row.shadows,
        ...(row.measurement && { measurement: row.measurement }),
        ...(error && { error }),
      };
    }),
  );
}
