// Copyright 2026 Adobe. All rights reserved.
import type { GraphSeries } from "../../components/logic/ScaleTypeGraph";
import type { Mode, ModeSet } from "../modes/model";
import { capabilityOwners } from "../modes/parameters";
import type { PreviewOverrides } from "../modes/previewState";
import { generateElevation } from "./generate";
import { resolveElevationDocument } from "./resolution";
import type { ElevationDocument } from "./model";

export type ElevationMetric = "blur" | "offsetY" | "opacity";
export function elevationComparisonOwner(
  metric: ElevationMetric,
  sets: readonly ModeSet[],
) {
  const capability =
    metric === "offsetY"
      ? "elevation.depth"
      : metric === "opacity"
        ? "elevation.layerOpacities"
        : undefined;
  const ownerId = capability && capabilityOwners(sets)[capability];
  return sets.find((set) => set.id === ownerId);
}
export function elevationComparisonSeries(
  document: ElevationDocument,
  sets: readonly ModeSet[],
  activeModes: readonly Mode[],
  metric: ElevationMetric,
  layerIds: readonly string[],
  compareModes: boolean,
  modeIds: readonly string[],
  preview: PreviewOverrides = {},
): GraphSeries[] {
  const owner = compareModes
    ? elevationComparisonOwner(metric, sets)
    : undefined;
  const contexts = owner
    ? owner.modes
        .filter(
          (mode) =>
            mode.id === owner.defaultModeId || modeIds.includes(mode.id),
        )
        .map((mode) => ({
          id: mode.id,
          label: mode.name,
          baseline: mode.id === owner.defaultModeId,
          modes: [
            ...activeModes.filter(
              (mode) =>
                !owner.modes.some((candidate) => candidate.id === mode.id),
            ),
            mode,
          ],
        }))
    : [
        {
          id: "current",
          label: "Current modes",
          baseline: true,
          modes: [...activeModes],
        },
      ];
  const selected = document.layers.filter((layer) =>
    layerIds.includes(layer.id),
  );
  const layers = selected.length ? selected : document.layers.slice(0, 1);
  const overrides = { ...preview };
  if (owner && metric === "offsetY") delete overrides["elevation.depth"];
  return contexts.flatMap((context) => {
    const values = generateElevation(
      resolveElevationDocument(document, context.modes, sets, overrides),
    );
    return layers.map((layer, index) => ({
      id: `${layer.id}:${context.id}`,
      label: `${layer.label} - ${context.label}`,
      isBaseline: context.baseline && index === 0,
      points: values.map((level) => {
        const shadow = level.shadows.find(
          (shadow) => shadow.layerId === layer.id,
        )!;
        const value =
          metric === "opacity" ? shadow.opacity * 100 : shadow[metric];
        return { index: level.index, step: level.step, raw: value, value };
      }),
    }));
  });
}
