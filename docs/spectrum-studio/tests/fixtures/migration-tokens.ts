// Copyright 2026 Adobe. All rights reserved.
import { assessColorsAndOpacities } from "../../src/features/design-data/colorOpacityAssessment";
import type {
  AnalysisInput,
  AnalysisRecord,
} from "../../src/features/design-data/comparison";

function input(records: AnalysisRecord[]): AnalysisInput {
  return {
    records,
    source: {
      kind: "reference",
      hash: "migration-fixture",
      root: "fixture",
      revision: "fixture",
      version: "fixture",
      dirty: false,
      validator: "fixture",
    },
    inventoryStatus: "complete",
    errors: [],
    limitations: [],
    schemas: [],
    categories: ["tokens", "mode-sets"],
  };
}

export function migrationTokensFixture() {
  const modes: AnalysisRecord = {
    id: "colorScheme",
    category: "mode-sets",
    name: "Color scheme",
    source: "fixture",
    pointer: "",
    classification: "authored",
    value: { key: "colorScheme", modes: ["light", "dark"], default: "light" },
  };
  const definitions = [
    {
      id: "gray-100",
      property: "color",
      values: [
        ["#ccc", "#ccc"],
        ["#000", "#fff"],
      ],
    },
    {
      id: "gray-200",
      property: "color",
      values: [
        ["#666", "#676767"],
        ["#444", "#444"],
      ],
    },
    {
      id: "spacing-100",
      property: "spacing",
      unit: "px",
      values: [
        [8, 10],
        [16, 16],
      ],
    },
    {
      id: "duration-100",
      property: "duration",
      unit: "ms",
      values: [
        [100, 100],
        [100, 100],
      ],
    },
  ];
  const records = (side: "app" | "reference") => [
    modes,
    ...definitions.flatMap((definition, index) =>
      definition.values.map((values, mode) => ({
        id: `${definition.id}:${mode}`,
        identity: `${definition.id}:${mode}`,
        conceptId: definition.id,
        browserTokenId: definition.id,
        category: "tokens",
        source: "fixture",
        pointer: "",
        classification: "generated" as const,
        name: definition.id,
        structuredName: { property: definition.property, scaleIndex: index },
        context: { colorScheme: mode ? "dark" : "light" },
        unit: definition.unit,
        value: values[side === "app" ? 0 : 1],
      })),
    ),
  ];
  return assessColorsAndOpacities(
    input(records("app")),
    input(records("reference")),
  );
}
