// Copyright 2026 Adobe. All rights reserved.
import { clampTextZoom, type TypographyDocument } from "./model";
import type { Mode, ModeSet } from "../modes/model";
import { parameterOwners } from "../modes/parameters";
import type { PreviewOverrides } from "../modes/previewState";
import { resolveModeParameterValues } from "../modes/parameterResolution";
import { resolveSizingFactors } from "../foundations/componentSizing";

/** Base document plus owned mode overrides, then preview overrides; mirrors resolveColorDocument. */
export function resolveTypographyDocument(
  base: TypographyDocument,
  modes: readonly Mode[],
  preview?: PreviewOverrides,
  { modeSets }: { modeSets?: ModeSet[] } = {},
): TypographyDocument {
  let resolved = base;
  const sizing = resolveSizingFactors(
    resolveModeParameterValues({ typography: base }, modes, preview, {
      modeSets,
    }),
  );
  const textSize = sizing.status === "ready" ? sizing.textSize : Number.NaN;
  if (textSize !== base.textSize) resolved = { ...resolved, textSize };
  const owners = modeSets ? parameterOwners(modeSets) : undefined;
  for (const mode of modes) {
    const textZoom = mode.foundations.typography?.textZoom;
    const modeSet = modeSets?.find((item) =>
      item.modes.some((candidate) => candidate.id === mode.id),
    );
    if (modeSet && mode.id === modeSet.defaultModeId) continue;
    if (
      textZoom !== undefined &&
      (!owners || modeSet?.id === owners["typography.textZoom"])
    )
      resolved = { ...resolved, textZoom };
  }
  const previewZoom = preview?.["typography.textZoom"];
  if (typeof previewZoom === "number")
    resolved = { ...resolved, textZoom: previewZoom };
  return resolved === base
    ? base
    : { ...resolved, textZoom: clampTextZoom(resolved.textZoom) };
}
