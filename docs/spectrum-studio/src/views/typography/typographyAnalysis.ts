// Copyright 2026 Adobe. All rights reserved.
import type {
  GeneratedTypographyToken,
  TypographyDocument,
} from "../../features/typography/model";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import { typographyTokenGroups } from "../../features/typography/typographyTokens";
import {
  formatTypographyLength,
  formatTypographyNumber,
  toTypographyUnit,
} from "../../features/typography/units";
import type { AnalyzeSection } from "../analyze/ScaleAnalyzeView";

export function typographyAnalysisSection(
  tokens: readonly GeneratedTypographyToken[],
  document: TypographyDocument,
  registry: TaxonomyDocument,
): AnalyzeSection {
  const groups = typographyTokenGroups(document, {
    names: document.metricNames,
    registry,
  });
  return {
    id: "type-scale",
    title: "Type scale",
    graphs: groups
      .filter((group) => !group.isUnitless)
      .map((group) => ({
        label: `${group.label} by index`,
        heading: `${group.label} (${document.outputUnit})`,
        points: tokens.map((token) => ({
          index: token.position,
          step: token.scale,
          raw: toTypographyUnit(group.value(token), document.outputUnit),
          value: toTypographyUnit(group.value(token), document.outputUnit),
        })),
      })),
    columns: ["Index", "Token", ...groups.map((group) => group.label)],
    rows: tokens.map((token) => ({
      key: String(token.position),
      isBase: token.position === 0,
      cells: [
        String(token.position),
        token.name,
        ...groups.map((group) =>
          group.isUnitless
            ? formatTypographyNumber(group.value(token))
            : formatTypographyLength(group.value(token), document.outputUnit),
        ),
      ],
    })),
  };
}
