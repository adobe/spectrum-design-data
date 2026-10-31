// Copyright 2026 Adobe. All rights reserved.
import type { TshirtSemanticRow } from "../design-data/tshirtTypes";
import {
  projectClassification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import type { BrowserTokenSource } from "./browserModel";

export function semanticTokenSource(
  row: TshirtSemanticRow,
  registry: TaxonomyDocument,
): BrowserTokenSource {
  const projection = projectClassification(
    registry,
    row.classification,
    "structures",
  );
  return {
    id: row.conceptId,
    type: row.target.family === "color" ? "colors" : row.target.family,
    groupId: row.target.metricId ?? row.structureId,
    groupLabel: row.structureName,
    name: projection.name,
    generatedName: projection.name,
    value: row.target.value,
    generatedValue: row.target.value,
    unit:
      row.target.family === "color" ||
      row.target.family === "elevation" ||
      row.target.unit === "multiplier"
        ? ""
        : "px",
    shadows: row.target.shadows,
    semantic: row,
    projection,
    referenceId: "$ref" in row.token ? row.target.nativeId : undefined,
    taxonomySource: { id: row.conceptId, governed: row.classification },
  };
}
