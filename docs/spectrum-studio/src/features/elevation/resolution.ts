// Copyright 2026 Adobe. All rights reserved.
import type { Mode, ModeSet } from "../modes/model";
import { capabilityOwners } from "../modes/parameters";
import type { PreviewOverrides } from "../modes/previewState";
import type { ElevationDocument } from "./model";
import { resolveOpacity, type OpacitySource } from "../opacity/generation";

export function resolveElevationDocument(
  document: ElevationDocument,
  modes: readonly Mode[],
  sets: readonly ModeSet[],
  preview: PreviewOverrides = {},
  opacitySource?: OpacitySource,
): ElevationDocument {
  const owners = capabilityOwners(sets);
  const patch = (capability: "elevation.depth" | "elevation.color") => {
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
  const opacity = document.layers.some((layer) => layer.opacityTokenId)
    ? opacitySource && resolveOpacity(opacitySource, modes, preview)
    : undefined;
  if (opacity?.issues.length) throw new Error(opacity.issues.join(" "));
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
    layers: document.layers.map((layer) => {
      if (!layer.opacityTokenId) return layer;
      const level = opacity?.levels.find(
        (level) => level.id === layer.opacityTokenId,
      );
      if (!level)
        throw new Error(
          `${layer.label}: its opacity token is unavailable. Choose another opacity token or a manual percentage.`,
        );
      const {
        opacityTokenId: _reference,
        manualOpacity: _manual,
        ...rest
      } = layer;
      void _reference;
      void _manual;
      return { ...rest, opacity: level.value * 100 };
    }),
  };
}
