// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import type { TaxonomyDocument } from "../taxonomy/model";
import {
  projectClassification,
  withTaxonomyProjection,
} from "../taxonomy/model";
import {
  buildCascadeTokenInventory,
  type CascadeExportInput,
} from "../tokens/cascadeExport";
import { ColorOutputError } from "../color-system/outputContrast";
import {
  captureDimensionSource,
  materializeDimensionTokens,
} from "../design-data/dimensionArtifacts";
import { buildShadowArtifacts } from "../design-data/shadowArtifacts";
import {
  buildTshirtArtifacts,
  type TshirtAuthoringSource,
} from "../design-data/tshirtArtifacts";
import { canonicalJson } from "../design-data/canonicalJson";
import type {
  ComponentAssignment,
  ComponentsDocument,
  LiteralValue,
} from "./model";
import { isJsonValue } from "./model";
import { assertShadowValue } from "../design-data/shadowValue";
import { assertComponentValueType } from "./validation";
import {
  componentColorInput,
  createComponentColorWitness,
  witnessedComponentColors,
  type ComponentColorWitness,
} from "./colorWitness";
import {
  withPreparedScaleColors,
  type PreparedScaleColors,
} from "./scaleColorWitness";

interface ComponentTokenMetadata {
  id: string;
  name: string;
  property: string;
  displayValue: string;
  context: Record<string, string | number>;
  ownerId: string;
  kind: "primitive" | "semantic";
}
export type ComponentToken = ComponentTokenMetadata &
  (
    | { outputError?: undefined; value: LiteralValue }
    | { outputError: ColorOutputError; value?: never }
  );
export type ComponentTokenSource = TshirtAuthoringSource & {
  colorSystem: CascadeExportInput["base"];
  tokenOverrides: CascadeExportInput["overrides"];
};

export function componentTokenCatalog(
  source: ComponentTokenSource,
  colorWitness: ComponentColorWitness | null = null,
): ComponentToken[] {
  if (!source.taxonomy || !source.elevation || !source.scaleTypes)
    throw new Error("Component references need complete foundation data.");
  return withTaxonomyProjection(
    source.taxonomy,
    () => buildComponentTokenCatalog(source, colorWitness).tokens,
  );
}

export function componentTokenCatalogWithColorWitness(
  source: ComponentTokenSource,
) {
  if (!source.taxonomy || !source.elevation || !source.scaleTypes)
    throw new Error("Component references need complete foundation data.");
  return withTaxonomyProjection(source.taxonomy, () => {
    const { tokens, colors, scaleColors } = buildComponentTokenCatalog(
      source,
      null,
      true,
    );
    return {
      tokens,
      componentColorWitness: createComponentColorWitness(
        source,
        colors,
        scaleColors,
      ),
    };
  });
}

function buildComponentColorTokens(
  source: ComponentTokenSource,
  witness: ComponentColorWitness | null,
  prepared?: PreparedScaleColors[],
): ComponentToken[] {
  const colors = withPreparedScaleColors(
    witness?.scaleColors,
    prepared,
    (reuse) => buildCascadeTokenInventory(componentColorInput(source), reuse),
  );
  return [
    ...colors.tokens.map(
      (token): ComponentToken => ({
        id: token.uuid,
        name:
          colors.taxonomy?.projections[token.uuid]?.name ??
          Object.values(token.name).join("-"),
        property: String(token.name.property),
        value: token.value,
        displayValue: String(token.value),
        ownerId: token.conceptId,
        kind: "primitive",
        context: Object.fromEntries(
          Object.entries(token.name).filter(([key]) =>
            source.modeSets.some((axis) => axis.key === key),
          ),
        ),
      }),
    ),
    ...colors.blockedColors.map(
      (token): ComponentToken => ({
        id: token.uuid,
        name:
          colors.taxonomy?.projections[token.uuid]?.name ??
          Object.values(token.name).join("-"),
        property: "color",
        outputError: token.error,
        displayValue: "Color output unavailable",
        ownerId: token.conceptId,
        kind: "primitive",
        context: Object.fromEntries(
          Object.entries(token.name).filter(([key]) =>
            source.modeSets.some((axis) => axis.key === key),
          ),
        ),
      }),
    ),
  ];
}

function buildComponentTokenCatalog(
  source: ComponentTokenSource,
  colorWitness: ComponentColorWitness | null = null,
  prepareScaleColors = false,
) {
  if (!source.taxonomy || !source.elevation || !source.scaleTypes)
    throw new Error("Component references need complete foundation data.");
  const { taxonomy } = source;
  const result = new Map<string, ComponentToken>();
  const add = (token: ComponentToken) => {
    const previous = result.get(token.id);
    if (
      previous &&
      (previous.outputError !== undefined) !== (token.outputError !== undefined)
    )
      throw new Error(
        "A component target has conflicting output availability.",
      );
    if (
      previous &&
      !previous.outputError &&
      !token.outputError &&
      canonicalJson(previous.value) !== canonicalJson(token.value)
    )
      throw new Error("A component target has conflicting emitted values.");
    result.set(token.id, token);
  };
  const dimensions = materializeDimensionTokens(captureDimensionSource(source));
  for (const token of dimensions.tokens) {
    const lineage = dimensions.lineage.find((row) => row.uuid === token.uuid)!;
    add({
      id: token.uuid,
      name: lineage.displayName,
      property: lineage.domain,
      value: token.value,
      displayValue: token.value,
      context: Object.fromEntries(
        Object.entries(token.name).filter(([key]) =>
          source.modeSets.some((axis) => axis.key === key),
        ),
      ),
      ownerId: lineage.scaleId,
      kind: "primitive",
    });
  }
  const scaleColors: PreparedScaleColors[] = [];
  const colors =
    witnessedComponentColors(colorWitness, source) ??
    buildComponentColorTokens(
      source,
      colorWitness,
      prepareScaleColors ? scaleColors : undefined,
    );
  for (const token of colors) add(token);
  const shadows = buildShadowArtifacts({
    sourceKind: "working",
    elevation: source.elevation,
    taxonomy,
    formulas: source.scaleTypes,
    modeSets: source.modeSets,
    colorOutput: source.colorSystem.settings.colorOutput,
  });
  for (const token of shadows.tokens) {
    if (!isJsonValue(token.value) || token.value === null)
      throw new Error("A shadow target has an invalid JSON value.");
    add({
      id: token.uuid,
      name: `${shadows.lineage.find((row) => row.uuid === token.uuid)!.foundationName}-${token.name.scaleIndex}`,
      property: "shadow",
      value: token.value,
      displayValue: `${token.value.length} shadow layers`,
      ownerId: source.elevation.id,
      kind: "primitive",
      context: Object.fromEntries(
        Object.entries(token.name).filter(([key]) =>
          source.modeSets.some((axis) => axis.key === key),
        ),
      ),
    });
  }
  const variants = buildTshirtArtifacts(source);
  for (const row of variants.semantics) {
    const token = row.token;
    const value =
      token.value ??
      variants.tokens.find((target) => target.uuid === token.$ref)?.value;
    if (!isJsonValue(value) || value === null)
      throw new Error("A semantic component target cannot resolve to a value.");
    add({
      id: token.uuid,
      name: projectClassification(taxonomy, row.classification, "structures")
        .name,
      property: token.name.property,
      value,
      displayValue: typeof value === "string" ? value : canonicalJson(value),
      context: row.context,
      ownerId: row.structureId,
      kind: "semantic",
    });
  }
  return { tokens: [...result.values()], colors, scaleColors };
}

export function propertyValueIssue(
  property: string,
  value: LiteralValue,
): string | undefined {
  property = property.trim().toLowerCase();
  if (
    [
      "size",
      "width",
      "height",
      "padding",
      "gap",
      "radius",
      "corner-radius",
      "border-width",
      "min-width",
      "max-width",
      "min-height",
      "max-height",
    ].includes(property)
  ) {
    if (
      typeof value !== "string" ||
      !/^(?:0|(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|dp))$/.test(value)
    )
      return "Enter a non-negative length with a unit, such as 4px.";
  } else if (
    property === "opacity" &&
    (typeof value !== "number" || value < 0 || value > 1)
  )
    return "Enter a number from zero to one.";
  else if (property === "color") {
    if (typeof value !== "string")
      return "Choose a color token or enter a color.";
    try {
      new Color(value);
    } catch {
      return "Enter a valid color.";
    }
  } else if (property === "shadow") {
    try {
      assertShadowValue(value);
    } catch (failure) {
      return failure instanceof Error ? failure.message : String(failure);
    }
  }
  return undefined;
}
export function assignmentValue(
  row: ComponentAssignment,
  tokens: readonly ComponentToken[],
): LiteralValue {
  if (!("$ref" in row)) return row.value;
  const token = tokens.find((token) => token.id === row.$ref);
  if (!token)
    throw new Error(
      "This token is no longer published or available. Choose another token.",
    );
  if (token.outputError) throw token.outputError;
  return token.value;
}
export function assertComponentReferences(
  document: ComponentsDocument,
  taxonomy: TaxonomyDocument,
  tokens: readonly ComponentToken[],
  { sourceOnly = false } = {},
) {
  const tokenIds = new Set(tokens.map((token) => token.id));
  for (const component of document.components)
    for (const row of component.assignments) {
      if (tokenIds.has(row.id))
        throw new Error("A relationship UUID collides with a token UUID.");
      const category = taxonomy.categories.find(
        (category) => category.id === row.property.categoryId,
      );
      const term = taxonomy.terms.find(
        (term) =>
          term.id === row.property.termId && term.categoryId === category?.id,
      );
      if (
        category?.key !== "property" ||
        !term ||
        typeof term.value !== "string"
      )
        throw new Error(
          "A component uses this Property term. Remap its assignment before removing or retyping the term.",
        );
      const target =
        "$ref" in row
          ? tokens.find((token) => token.id === row.$ref)
          : undefined;
      for (const [key, expected] of Object.entries(target?.context ?? {})) {
        if (row.options?.[key] !== String(expected))
          throw new Error(
            `${component.declaration.displayName}: this token requires ${key} = ${expected}. Add that condition or choose a token for another context.`,
          );
      }
      if (sourceOnly && target?.outputError) {
        const observed = target.outputError.details.observedColor;
        if (!observed) throw target.outputError;
        if (row.$valueType) assertComponentValueType(row.$valueType, observed);
        const issue = propertyValueIssue(term.value, observed);
        if (issue)
          throw new Error(`${component.declaration.displayName}: ${issue}`);
        continue;
      }
      const value = assignmentValue(row, tokens);
      if (row.$valueType) assertComponentValueType(row.$valueType, value);
      const issue = propertyValueIssue(term.value, value);
      if (issue)
        throw new Error(`${component.declaration.displayName}: ${issue}`);
    }
}
