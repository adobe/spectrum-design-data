// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  dataVisContinuousOutputsAtom,
  dataVisInputDocumentAtom,
  resolvedCategoricalTokensAtom,
} from "../../../features/color-system/data-vis/state";
import {
  continuousSamples,
  type ContinuousScale,
} from "../../../features/color-system/data-vis/continuous";
import { categoricalPreviewMembers } from "../../../features/color-system/data-vis/categoricalPreview";
import type { DataVisScale } from "../../../features/color-system/data-vis/model";
import type { DataVisObservation } from "../../../features/color-system/data-vis/analysis";

export type DataVisDisplay = { definition: DataVisScale } & (
  | {
      status: "ready";
      observations: DataVisObservation[];
      continuous?: ContinuousScale;
    }
  | { status: "error"; error: string }
);
export function useDataVisDisplay(): DataVisDisplay[] {
  const document = useAtomValue(dataVisInputDocumentAtom),
    outputs = useAtomValue(dataVisContinuousOutputsAtom);
  const tokens = useAtomValue(resolvedCategoricalTokensAtom);
  return useMemo(
    () =>
      document.dataVisScales.map((definition): DataVisDisplay => {
        if (definition.kind !== "categorical") {
          const output = outputs.find((output) =>
            output.status === "ready"
              ? output.scale.id === definition.id
              : output.id === definition.id,
          );
          if (!output || output.status === "error")
            return {
              definition,
              status: "error",
              error: output?.error ?? "This continuous output is unavailable.",
            };
          return {
            definition,
            status: "ready",
            continuous: output.scale,
            observations: continuousSamples(output.scale, 9).map((sample) => ({
              id: String(sample.position),
              label: `${Number((sample.position * 100).toFixed(3))}%`,
              ...sample,
            })),
          };
        }
        try {
          const observations = categoricalPreviewMembers(
            definition,
            tokens,
          ).map((member, index) => ({
            id: definition.members[index].id,
            label: member.label,
            position: index + 1,
            value: member.value,
          }));
          return { definition, status: "ready", observations };
        } catch (failure) {
          return {
            definition,
            status: "error",
            error: failure instanceof Error ? failure.message : String(failure),
          };
        }
      }),
    [document.dataVisScales, outputs, tokens],
  );
}
