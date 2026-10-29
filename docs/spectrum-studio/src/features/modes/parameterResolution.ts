// Copyright 2026 Adobe. All rights reserved.
import type { Mode, ModeSet } from "./model";
import {
  BINDABLE_PARAMETER_RANGES,
  baseParameterValue,
  parameterOwners,
  parameterValue,
  type FoundationDocuments,
} from "./parameters";
import type { PreviewOverrides } from "./previewState";

/** Current value of every bindable mode parameter, keyed by parameter id. */
export type ModeParameterValues = Record<string, number>;

/** Base values, then owned non-default mode overrides, then optional previews, clamped to each range. */
export function resolveModeParameterValues(
  documents: FoundationDocuments,
  modes: readonly Mode[],
  preview?: PreviewOverrides,
  { modeSets }: { modeSets?: ModeSet[] } = {},
): ModeParameterValues {
  const owners = modeSets ? parameterOwners(modeSets) : undefined;
  const values: ModeParameterValues = {};
  for (const [id, range] of Object.entries(BINDABLE_PARAMETER_RANGES)) {
    let value = baseParameterValue(documents, id);
    for (const mode of modes) {
      const override = parameterValue(mode, id);
      if (typeof override !== "number") continue;
      const modeSet = modeSets?.find((item) =>
        item.modes.some((candidate) => candidate.id === mode.id),
      );
      if (modeSet && mode.id === modeSet.defaultModeId) continue;
      if (owners && modeSet?.id !== owners[id]) continue;
      value = override;
    }
    const previewed = preview?.[id];
    if (typeof previewed === "number") value = previewed;
    values[id] = Math.min(
      range.max,
      Math.max(range.min, typeof value === "number" ? value : range.neutral),
    );
  }
  return values;
}
