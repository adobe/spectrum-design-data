// Copyright 2026 Adobe. All rights reserved.
import { tokenIdentity } from "../tokens/canonicalIdentity";
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
import { opacityRows, opacityOutputIssues } from "../opacity/output";
import type { OpacityDocument } from "../opacity/model";
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
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import {
  canonicalTokenModeKey,
  MISSING_VALUE_MESSAGE,
  tokenModePairs,
} from "../tokens/browserModel";
import { dialogRowsForMode } from "../tokens/dialogModel";
import { projectShadowValue } from "../design-data/shadowValue";
import type { TokenTier } from "../tokens/tier";
import { tokenUuid } from "../tokens/model";

interface ComponentTokenMetadata {
  tier?: TokenTier;
  id: string;
  browserId?: string;
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
  opacity?: OpacityDocument;
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
  reuseAliases = false,
) {
  const colors = withPreparedScaleColors(
    witness?.scaleColors,
    prepared,
    (reuse) => buildCascadeTokenInventory(componentColorInput(source), reuse),
  );
  const reusableAliases =
    reuseAliases &&
    colors.blockedColors.length === 0 &&
    Object.values(colors.taxonomy?.projections ?? {}).every(
      (projection) => projection.issues.length === 0,
    );
  const references = new Map(
    colors.colorReferences.map((row) => [row.rowId, row]),
  );
  const colorMetadata = (token: {
    uuid: string;
    name: Record<string, string | number>;
  }) => {
    const reference = references.get(token.uuid);
    const identity =
      reusableAliases && reference
        ? tokenIdentity(source.browserTokenEdits ?? {}, reference.id)
        : undefined;
    return {
      id:
        identity && reference
          ? (identity.rows[reference.context] ??
            tokenUuid(
              `canonical-token-row:v1:${identity.conceptId}:${reference.context}`,
            ))
          : token.uuid,
      browserId: identity?.conceptId ?? reference?.id,
      context:
        reusableAliases && reference
          ? Object.fromEntries(
              tokenModePairs(reference.context).flatMap(([axisId, modeId]) => {
                const axis = source.modeSets.find((axis) => axis.id === axisId);
                const mode = axis?.modes.find((mode) => mode.id === modeId);
                return axis && mode && mode.id !== axis.defaultModeId
                  ? [[axis.key, mode.key]]
                  : [];
              }),
            )
          : Object.fromEntries(
              Object.entries(token.name).filter(([key]) =>
                source.modeSets.some((axis) => axis.key === key),
              ),
            ),
    };
  };
  const colorName = (token: {
    uuid: string;
    name: Record<string, string | number>;
  }) => {
    const projection = colors.taxonomy?.projections[token.uuid];
    const reference = references.get(token.uuid);
    if (reusableAliases && projection && reference && source.taxonomy) {
      const identity = tokenIdentity(
        source.browserTokenEdits ?? {},
        reference.id,
      );
      return projectClassification(
        source.taxonomy,
        source.taxonomy.classifications[identity?.conceptId ?? reference.id] ??
          projection.classification,
        "colors",
        "primitive",
      ).name;
    }
    return projection?.name ?? Object.values(token.name).join("-");
  };
  const tokens: ComponentToken[] = [
    ...colors.tokens.map(
      (token): ComponentToken => ({
        ...colorMetadata(token),
        ...(reusableAliases &&
          references.has(token.uuid) && { outputError: undefined }),
        name: colorName(token),
        property: String(token.name.property),
        value: token.value,
        displayValue: String(token.value),
        ownerId: token.conceptId,
        kind: "primitive",
        tier: "primitive",
      }),
    ),
    ...colors.blockedColors.map(
      (token): ComponentToken => ({
        ...colorMetadata(token),
        name: colorName(token),
        property: "color",
        outputError: token.error,
        displayValue: "Color output unavailable",
        ownerId: token.conceptId,
        kind: "primitive",
        tier: "primitive",
      }),
    ),
  ];
  return { tokens, reusableAliases };
}

function buildComponentTokenCatalog(
  source: ComponentTokenSource,
  colorWitness: ComponentColorWitness | null = null,
  prepareScaleColors = false,
) {
  if (!source.taxonomy || !source.elevation || !source.scaleTypes)
    throw new Error("Component references need complete foundation data.");
  const { taxonomy } = source;
  const canReuseColors =
    Object.values(source.browserTokenEdits ?? {}).some(
      (edit) => edit.authoring,
    ) &&
    Object.values(source.browserTokenEdits ?? {}).every(
      (edit) =>
        !edit.name &&
        !edit.authoring?.manual &&
        !edit.authoring?.classification &&
        !edit.authoring?.lifecycle &&
        !Object.keys(edit.authoring?.assignments ?? {}).length &&
        !Object.keys(edit.authoring?.baselines ?? {}).length,
    ) &&
    !Object.values(source.tokenOverrides).some((edit) => edit.name);
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
      browserId: `${lineage.domain}-${lineage.scaleId}-${lineage.step}`,
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
      tier: "primitive",
    });
  }
  const scaleColors: PreparedScaleColors[] = [];
  if (source.opacity) {
    const issues = opacityOutputIssues(source);
    if (issues.length) throw new Error(issues.join(" "));
  }
  for (const row of opacityRows(source, taxonomy)) {
    if (!row.uuid || row.issues.length)
      throw new Error(
        row.issues.join(" ") || "Opacity row identity is unavailable.",
      );
    add({
      id: row.uuid,
      browserId: row.conceptId,
      name: row.name,
      property: "opacity",
      value: row.value,
      displayValue: `${row.value * 100}%`,
      context: row.context,
      ownerId: row.conceptId,
      kind: "primitive",
      tier: "primitive",
    });
  }
  const witnessedColors = witnessedComponentColors(colorWitness, source);
  const { tokens: colors, reusableAliases: reuseColors } = witnessedColors
    ? { tokens: witnessedColors, reusableAliases: canReuseColors }
    : buildComponentColorTokens(
        source,
        colorWitness,
        prepareScaleColors ? scaleColors : undefined,
        canReuseColors,
      );
  const colorTargets = new Map(colors.map((token) => [token.id, token]));
  for (const token of colors) add(token);
  const shadows = buildShadowArtifacts({
    sourceKind: "working",
    elevation: source.elevation,
    taxonomy,
    formulas: source.scaleTypes,
    modeSets: source.modeSets,
    colorOutput: source.colorSystem.settings.colorOutput,
    opacitySource: source,
  });
  for (const token of shadows.tokens) {
    if (!isJsonValue(token.value) || token.value === null)
      throw new Error("A shadow target has an invalid JSON value.");
    add({
      id: token.uuid,
      browserId: shadows.lineage.find((row) => row.uuid === token.uuid)!
        .conceptId,
      name: `${shadows.lineage.find((row) => row.uuid === token.uuid)!.foundationName}-${token.name.scaleIndex}`,
      property: "shadow",
      value: token.value,
      displayValue: `${token.value.length} shadow layers`,
      ownerId: source.elevation.id,
      kind: "primitive",
      tier: "primitive",
      context: Object.fromEntries(
        Object.entries(token.name).filter(([key]) =>
          source.modeSets.some((axis) => axis.key === key),
        ),
      ),
    });
  }
  const variants = buildTshirtArtifacts(source);
  const styles = source.styles?.recipes.length
    ? canonicalAliasRows(
        completeAliasSource(source),
        variants,
        "preserve-for-review",
      )
    : [];
  for (const row of styles.filter((row) => row.token.style)) {
    const token = row.token,
      style = token.style!;
    if (token.validationError) throw new Error(token.validationError);
    add({
      id: row.rowId,
      browserId: row.id,
      name: row.name,
      property: String(row.canonicalName?.property),
      value:
        token.unit === "px" && typeof token.value === "number"
          ? `${token.value}px`
          : token.value,
      displayValue: `${token.value}${token.unit}`,
      context: style.context,
      ownerId: style.recipeId,
      kind: "semantic",
      tier: "semantic",
    });
  }
  for (const row of variants.semantics) {
    const token = row.token;
    const value =
      token.value ??
      variants.tokens.find((target) => target.uuid === token.$ref)?.value;
    if (!isJsonValue(value) || value === null)
      throw new Error(
        `Semantic component target ${token.uuid} cannot resolve ${token.$ref ?? "its literal"} to a value.`,
      );
    add({
      id: token.uuid,
      browserId: row.conceptId,
      name: projectClassification(taxonomy, row.classification, "structures")
        .name,
      property: String(token.name.property),
      value,
      displayValue: typeof value === "string" ? value : canonicalJson(value),
      context: row.context,
      ownerId: row.structureId,
      kind: "semantic",
      tier: "semantic",
    });
  }
  if (
    Object.values(source.browserTokenEdits ?? {}).some((edit) => edit.authoring)
  ) {
    const rows = canonicalAliasRows(
      completeAliasSource(source),
      variants,
      "preserve-for-review",
      { excludeColors: reuseColors },
    );
    const rowsByMode = new Map<string, Map<string, (typeof rows)[number]>>();
    for (const [id, componentToken] of [...result]) {
      if (!componentToken.browserId) continue;
      if (reuseColors && colorTargets.has(id)) continue;
      const selection = Object.fromEntries(
        source.modeSets.flatMap((axis) => {
          const mode =
            axis.modes.find(
              (mode) => mode.key === componentToken.context[axis.key],
            ) ?? axis.modes.find((mode) => mode.id === axis.defaultModeId);
          return mode ? [[axis.id, mode.id]] : [];
        }),
      );
      const identity = tokenIdentity(
        source.browserTokenEdits ?? {},
        componentToken.browserId,
      );
      const modeKey = canonicalTokenModeKey(selection);
      let selectedRows = rowsByMode.get(modeKey);
      if (!selectedRows) {
        selectedRows = new Map(
          dialogRowsForMode(rows, modeKey).map((row) => [row.token.id, row]),
        );
        rowsByMode.set(modeKey, selectedRows);
      }
      const row = selectedRows.get(
        identity?.conceptId ?? componentToken.browserId,
      );
      if (!row) continue;
      const token = row.token;
      if (token.validationError && !componentToken.outputError)
        throw new Error(token.validationError);
      const value =
        token.type === "elevation"
          ? (
              token.literalShadows ?? projectShadowValue(token.shadows ?? [])
            ).map((layer) => ({ ...layer }))
          : typeof token.value === "number" && token.unit === "px"
            ? `${token.value}px`
            : token.value;
      result.delete(id);
      const rowId = identity ? row.rowId : id;
      const rowSelection = new Map(tokenModePairs(row.context));
      const context = Object.fromEntries(
        source.modeSets.flatMap((axis) => {
          const mode = axis.modes.find(
            (mode) => mode.id === rowSelection.get(axis.id),
          );
          return mode && mode.id !== axis.defaultModeId
            ? [[axis.key, mode.key]]
            : [];
        }),
      );
      const target: ComponentToken = componentToken.outputError
        ? {
            ...componentToken,
            id: rowId,
            browserId: token.id,
            tier: token.tier,
            name: token.name,
            context,
          }
        : {
            ...componentToken,
            id: rowId,
            browserId: token.id,
            tier: token.tier,
            outputError: undefined,
            value,
            name: token.name,
            context,
            displayValue:
              typeof value === "object" ? canonicalJson(value) : String(value),
          };
      result.set(rowId, target);
      if (colorTargets.has(id)) colorTargets.set(id, target);
    }
    for (const row of rows.filter((row) => row.token.manual)) {
      const token = row.token;
      if (token.validationError === MISSING_VALUE_MESSAGE) continue;
      if (token.validationError) throw new Error(token.validationError);
      const context = Object.fromEntries(
        (JSON.parse(row.context) as [string, string][]).flatMap(
          ([axisId, modeId]) => {
            const axis = source.modeSets.find((axis) => axis.id === axisId);
            const mode = axis?.modes.find((mode) => mode.id === modeId);
            return axis && mode ? [[axis.key, mode.key]] : [];
          },
        ),
      );
      const value =
        token.type === "elevation"
          ? (
              token.literalShadows ?? projectShadowValue(token.shadows ?? [])
            ).map((layer) => ({ ...layer }))
          : typeof token.value === "number" && token.unit === "px"
            ? `${token.value}px`
            : token.value;
      add({
        id: row.rowId,
        browserId: token.id,
        name: token.name,
        property:
          token.type === "colors"
            ? "color"
            : token.type === "elevation"
              ? "shadow"
              : token.type,
        value,
        displayValue:
          typeof value === "object" ? canonicalJson(value) : String(value),
        ownerId: token.id,
        kind: "semantic",
        tier: token.tier,
        context,
      });
    }
  }
  return {
    tokens: [...result.values()],
    colors: [...colorTargets.values()],
    scaleColors,
  };
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
