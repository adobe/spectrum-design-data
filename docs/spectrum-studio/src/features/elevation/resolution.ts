// Copyright 2026 Adobe. All rights reserved.
import type { Mode, ModeSet } from "../modes/model";
import { capabilityOwners } from "../modes/parameters";
import type { PreviewOverrides } from "../modes/previewState";
import type { ElevationDocument } from "./model";

export function resolveElevationDocument(
  document: ElevationDocument,
  modes: readonly Mode[],
  sets: readonly ModeSet[],
  preview: PreviewOverrides = {},
): ElevationDocument {
  const owners = capabilityOwners(sets);
  const patch = (
    capability:
      | "elevation.depth"
      | "elevation.color"
      | "elevation.layerOpacities",
  ) => {
    const owner = sets.find((set) => set.id === owners[capability]);
    const mode =
      owner &&
      modes.find((mode) =>
        owner.modes.some((candidate) => candidate.id === mode.id),
      );
    return mode && mode.id !== owner?.defaultModeId
      ? mode.foundations.elevation
      : undefined;
  };
  const opacities = patch("elevation.layerOpacities")?.layerOpacities ?? {};
  return {
    ...document,
    depth: Number(
      preview["elevation.depth"] ??
        patch("elevation.depth")?.depth ??
        document.depth,
    ),
    color: String(
      preview["elevation.color"] ??
        patch("elevation.color")?.color ??
        document.color,
    ),
    layers: document.layers.map((layer) => ({
      ...layer,
      opacity: opacities[layer.id] ?? layer.opacity,
    })),
  };
}
