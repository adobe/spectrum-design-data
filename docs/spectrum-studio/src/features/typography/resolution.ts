// Copyright 2026 Adobe. All rights reserved.
import { clampTextZoom, type TypographyDocument } from "./model";
import type { Mode, ModeSet } from "../modes/model";
import { parameterOwners } from "../modes/parameters";
import type { PreviewOverrides } from "../modes/previewState";

/** Base document plus owned mode overrides, then preview overrides; mirrors resolveColorDocument. */
export function resolveTypographyDocument(
  base: TypographyDocument,
  modes: readonly Mode[],
  preview?: PreviewOverrides,
  { modeSets }: { modeSets?: ModeSet[] } = {},
): TypographyDocument {
  let resolved = base;
  const owners = modeSets ? parameterOwners(modeSets) : undefined;
  for (const mode of modes) {
    const textZoom = mode.foundations.typography?.textZoom;
    if (textZoom === undefined) continue;
    const modeSet = modeSets?.find((item) =>
      item.modes.some((candidate) => candidate.id === mode.id),
    );
    if (modeSet && mode.id === modeSet.defaultModeId) continue;
    if (owners && modeSet?.id !== owners["typography.textZoom"]) continue;
    resolved = { ...resolved, textZoom };
  }
  const previewZoom = preview?.["typography.textZoom"];
  if (typeof previewZoom === "number")
    resolved = { ...resolved, textZoom: previewZoom };
  return resolved === base
    ? base
    : { ...resolved, textZoom: clampTextZoom(resolved.textZoom) };
}
