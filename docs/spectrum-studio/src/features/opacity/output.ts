// Copyright 2026 Adobe. All rights reserved.
import { dataAttribute } from "../color-system/cssLibrary";
import { modeCombinationCount } from "../modes/combinations";
import type { Mode } from "../modes/model";
import type { PreviewOverrides } from "../modes/previewState";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import type { BrowserTokenSource } from "../tokens/browserModel";
import { OPACITY_PROPERTY_TERM_ID } from "../taxonomy/opacityGovernance";
import {
  opacityAxes,
  opacityContexts,
  resolveOpacity,
  type OpacitySource,
} from "./generation";

export const OPACITY_PROPERTY_TERM = OPACITY_PROPERTY_TERM_ID;

export function opacityOutputIssues(source: OpacitySource): string[] {
  if (modeCombinationCount(opacityAxes(source)) > 256)
    return [
      "Opacity requires more than 256 mode contexts. No partial output inventory is emitted.",
    ];
  return [
    ...new Set(
      opacityContexts(source).flatMap(({ modes }) => {
        const result = resolveOpacity(source, modes);
        return [
          ...result.issues,
          ...result.levels
            .filter((level) => !level.uuid)
            .map(
              (level) =>
                `${level.name}: persisted mode-row identity is unavailable.`,
            ),
        ];
      }),
    ),
  ];
}

export function browserOpacitySources(
  source: OpacitySource,
  modes: readonly Mode[],
  registry?: TaxonomyDocument,
  preview?: PreviewOverrides,
): BrowserTokenSource[] {
  const result = resolveOpacity(source, modes, preview);
  return result.levels.map((level) => {
    const property = registry?.categories.find(
      (item) => item.key === "property",
    );
    const index = registry?.categories.find(
      (item) => item.key === "scaleIndex",
    );
    const step = registry?.terms.find(
      (item) =>
        item.categoryId === index?.id && item.value === level.scaleIndex,
    );
    const governed = {
      ...(property && { [property.id]: OPACITY_PROPERTY_TERM }),
      ...(index && step && { [index.id]: step.id }),
    };
    const projection = registry
      ? projectClassification(registry, governed, "opacity")
      : undefined;
    const issues = [
      ...result.issues,
      ...(!level.uuid
        ? [
            "Opacity mode-row identity is unavailable. Save the required mode context before exporting.",
          ]
        : []),
      ...(projection?.issues ?? []),
    ];
    const name =
      projection && !projection.issues.length ? projection.name : level.name;
    return {
      id: level.id,
      rowId: level.uuid,
      modeKey: result.modeKey,
      resolvedValue: { overridden: level.overridden, stale: level.stale },
      type: "opacity",
      groupId: "opacity",
      groupLabel: "Opacity",
      name,
      generatedName: name,
      value: level.value,
      generatedValue: level.generatedValue,
      unit: "",
      taxonomyEvidence: { property: "opacity", scaleIndex: level.scaleIndex },
      taxonomySource: { id: level.id, governed },
      ...(issues.length && { validationError: issues.join(" ") }),
    };
  });
}

/** Local opacity output contract; not an upstream value-type schema. */
export function opacityRows(
  source: OpacitySource,
  registry?: TaxonomyDocument,
) {
  const axes = opacityAxes(source);
  if (modeCombinationCount(axes) > 256) return [];
  return opacityContexts(source).flatMap(({ modes, key, context }) =>
    browserOpacitySources(source, modes, registry).map((token) => ({
      conceptId: token.id,
      scaleIndex:
        (source.opacity?.levels.findIndex((level) => level.id === token.id) ??
          -1) *
          100 +
        100,
      uuid: token.rowId,
      modeKey: key,
      context: Object.fromEntries(
        Object.entries(context).filter(([axis]) => {
          const index = axes.findIndex((item) => item.key === axis);
          return modes[index]?.id !== axes[index]?.defaultModeId;
        }),
      ),
      name: token.name,
      type: "opacity" as const,
      value: token.value as number,
      generatedValue: token.generatedValue as number,
      issues: token.validationError ? [token.validationError] : [],
    })),
  );
}

export function buildOpacityCss(
  source: OpacitySource,
  registry?: TaxonomyDocument,
): string {
  const issues = opacityOutputIssues(source);
  if (issues.length) throw new Error(issues.join(" "));
  const axes = opacityAxes(source);
  return opacityContexts(source)
    .map(({ modes }) => {
      const result = resolveOpacity(source, modes);
      if (result.issues.length) throw new Error(result.issues.join(" "));
      const tokens = browserOpacitySources(source, modes, registry);
      const issue = tokens.find(
        (token) => token.validationError,
      )?.validationError;
      if (issue) throw new Error(issue);
      if (!tokens.length) return "";
      const attributes = modes.map(
        (mode, index) =>
          `[${dataAttribute(axes[index].key)}=${JSON.stringify(mode.key)}]`,
      );
      const selected = attributes.filter(
        (_, index) => modes[index].id !== axes[index].defaultModeId,
      );
      const selector = [
        ...new Set([selected.join("") || ":root", attributes.join("")]),
      ]
        .filter(Boolean)
        .join(", ");
      return `${selector} {\n${tokens.map((token) => `  --${token.name}: ${token.value};`).join("\n")}\n}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
