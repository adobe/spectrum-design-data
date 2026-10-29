// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisRecord } from "../../src/features/design-data/comparison";

export function materializationInvariants(records: AnalysisRecord[]) {
  return records
    .filter(
      (record) =>
        ![
          "authoring/taxonomy",
          "authoring/structures",
          "compatibility-aliases",
        ].includes(record.category),
    )
    .map((record) => {
      const { name, taxonomy, structuredName, ...invariant } =
        structuredClone(record);
      void name;
      void taxonomy;
      void structuredName;
      if (invariant.category === "foundations") {
        const document = invariant.value as {
          name?: unknown;
          metricNames?: unknown;
          scales?: { name?: unknown; nameRef?: unknown }[];
          palette?: { name?: unknown; nameRef?: unknown }[];
          surfaces?: { name?: unknown; nameRef?: unknown }[];
        };
        delete document.name;
        delete document.metricNames;
        for (const source of [
          ...(document.scales ?? []),
          ...(document.palette ?? []),
          ...(document.surfaces ?? []),
        ]) {
          delete source.name;
          delete source.nameRef;
        }
      }
      return invariant;
    });
}
