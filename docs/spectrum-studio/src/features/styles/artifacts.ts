// Copyright 2026 Adobe. All rights reserved.
import {
  canonicalAliasRows,
  completeAliasSource,
  type AliasAuthoringSource,
} from "../tokens/aliasTargets";
import { dialogRowsForMode } from "../tokens/dialogModel";
import {
  canonicalTokenModeKey,
  type BrowserToken,
} from "../tokens/browserModel";
import { modeSelections } from "../modes/combinations";
import {
  taxonomyColorSourceId,
  projectClassification,
} from "../taxonomy/model";
import {
  buildStyleArtifacts,
  type StyleContext,
  type StyleReference,
  type StyleRow,
} from "./generation";
import { EMPTY_STYLES, type StyleProperty } from "./model";

export type StyleAuthoringSource = Partial<AliasAuthoringSource> &
  Pick<AliasAuthoringSource, "colorSystem" | "typography" | "modeSets">;
export function styleContexts(source: StyleAuthoringSource): StyleContext[] {
  const foundation = completeAliasSource(source);
  const rows = canonicalAliasRows(
    foundation,
    undefined,
    "preserve-for-review",
    { includeUnpublished: true, excludeStyles: true },
  );
  return modeSelections(source.modeSets).map((selection) => {
    const key = canonicalTokenModeKey(selection);
    const references = dialogRowsForMode(rows, key).flatMap(
      (row): StyleReference[] => {
        const token = row.token;
        if (
          token.validationError ||
          (typeof token.value !== "string" && typeof token.value !== "number")
        )
          return [];
        const sourceId = token.taxonomySource?.id;
        const familyId =
          source.colorSystem.scales.find(
            (scale) => taxonomyColorSourceId(scale.id) === sourceId,
          )?.id ?? token.groupId;
        const metricId =
          token.type === "typography" ? token.groupId : undefined;
        const property: StyleProperty | undefined =
          token.type === "colors"
            ? "color"
            : metricId?.endsWith("-unitlessLineHeight")
              ? "lineHeight"
              : token.type === "size"
                ? "borderWidth"
                : row.canonicalName?.property === "font-family"
                  ? "fontFamily"
                  : row.canonicalName?.property === "font-weight"
                    ? "fontWeight"
                    : undefined;
        if (!property) return [];
        const rawIndex =
          token.projection?.flat.scaleIndex ?? row.canonicalName?.scaleIndex;
        const index = rawIndex === undefined ? undefined : Number(rawIndex);
        return [
          {
            id: row.id,
            browserId: token.id,
            uuid: row.rowId,
            familyId,
            metricId,
            index:
              index !== undefined && Number.isFinite(index) ? index : undefined,
            property,
            name: token.name,
            value: token.value,
            unit: token.unit,
            classification: token.projection?.classification,
          },
        ];
      },
    );
    return {
      selection,
      colorOutput: source.colorSystem.settings.colorOutput,
      modes: Object.fromEntries(
        source.modeSets.flatMap((axis) => {
          const mode = axis.modes.find(
            (mode) => mode.id === selection[axis.id],
          );
          return mode && mode.id !== axis.defaultModeId
            ? [[axis.key, mode.key]]
            : [];
        }),
      ),
      references,
    };
  });
}
export function buildStylesForSource(source: StyleAuthoringSource) {
  if (!source.styles?.recipes.length) return { rows: [], issues: [] };
  if (!source.taxonomy)
    return {
      rows: [],
      issues: [
        { recipeId: "", message: "Style output needs an available Registry." },
      ],
    };
  return buildStyleArtifacts(
    source.styles,
    source.taxonomy,
    source.rules ?? [],
    source.modeSets,
    styleContexts(source),
  );
}
export function styleBrowserToken(
  row: StyleRow,
  source: StyleAuthoringSource,
): BrowserToken {
  const recipe = (source.styles ?? EMPTY_STYLES).recipes.find(
    (recipe) => recipe.id === row.recipeId,
  );
  return {
    id: row.conceptId,
    rowId: row.token.uuid,
    tier: "semantic",
    type:
      row.property === "color"
        ? "colors"
        : row.property === "borderWidth"
          ? "size"
          : "typography",
    groupId: row.metricId ?? row.recipeId,
    groupLabel:
      recipe && source.taxonomy
        ? String(
            source.taxonomy.terms.find((term) => term.id === recipe.name.termId)
              ?.value ?? "Styles",
          )
        : "Styles",
    name: row.name,
    generatedName: row.name,
    value: row.value,
    generatedValue: row.value,
    unit: row.unit === "px" ? "px" : "",
    projection: source.taxonomy
      ? projectClassification(
          source.taxonomy,
          row.classification,
          "styles",
          "semantic",
        )
      : undefined,
    taxonomySource: { id: row.conceptId, governed: row.classification },
    style: row,
    referenceId: row.referenceId,
    classificationScope: "styles",
    description: "",
    status: "draft",
    nameOverridden: false,
    valueOverridden: false,
    stale: false,
  };
}
