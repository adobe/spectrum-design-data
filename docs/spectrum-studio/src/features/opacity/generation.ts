// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import { resolveColorDocument } from "../color-system/resolution";
import { backgroundLuminance, polarityWeight } from "../color-system/polarity";
import { parameterOwners } from "../modes/parameters";
import { modeSetDefaultMode, type Mode, type ModeSet } from "../modes/model";
import {
  modeCombinations,
  selectionForModes,
  contextForModes,
} from "../modes/combinations";
import type { PreviewOverrides } from "../modes/previewState";
import {
  canonicalTokenModeKey,
  tokenModePairs,
  type BrowserTokenEdits,
} from "../tokens/browserModel";
import { isAlpha, isOpacityDocument, type OpacityDocument } from "./model";
import { compensatedOpacity } from "./polarity";

export interface OpacitySource {
  opacity?: OpacityDocument;
  colorSystem: ColorSystemDocument;
  modeSets: ModeSet[];
  browserTokenEdits?: BrowserTokenEdits;
}
export interface ResolvedOpacityLevel {
  id: string;
  uuid?: string;
  scaleIndex: number;
  name: string;
  value: number;
  generatedValue: number;
  overridden: boolean;
  stale: boolean;
  overrideKey?: string;
}
export interface OpacityResult {
  levels: ResolvedOpacityLevel[];
  issues: string[];
  weight: number;
  modeKey: string;
}
export const OPACITY_PARAMETERS = [
  "color.backgroundLightness",
  "color.backgroundScaleId",
] as const;

export function opacityAxes(source: OpacitySource): ModeSet[] {
  const owners = parameterOwners(source.modeSets);
  const ids = new Set(
    OPACITY_PARAMETERS.flatMap((id) => (owners[id] ? [owners[id]] : [])),
  );
  for (const level of source.opacity?.levels ?? [])
    for (const key of Object.keys(
      source.browserTokenEdits?.[level.id]?.values ?? {},
    ))
      for (const [id] of tokenModePairs(key)) ids.add(id);
  return source.modeSets.filter((set) => ids.has(set.id) && set.modes.length);
}
export function opacityModeKey(
  source: OpacitySource,
  modes: readonly Mode[],
): string {
  const axes = opacityAxes(source);
  return canonicalTokenModeKey(
    selectionForModes(axes, alignedModes(axes, modes)),
  );
}
function alignedModes(
  axes: readonly ModeSet[],
  modes: readonly Mode[],
): Mode[] {
  return axes.map(
    (axis) =>
      modes.find((mode) => axis.modes.some((item) => item.id === mode.id)) ??
      modeSetDefaultMode(axis)!,
  );
}
export function opacityContexts(source: OpacitySource) {
  const axes = opacityAxes(source);
  return modeCombinations(axes).map((modes) => ({
    modes,
    key: opacityModeKey(source, modes),
    context: contextForModes(axes, modes),
  }));
}
export function synchronizeOpacityRows(
  source: OpacitySource,
): OpacityDocument | undefined {
  if (!source.opacity) return undefined;
  const keys = opacityContexts(source).map((context) => context.key);
  let changed = false;
  const levels = source.opacity.levels.map((level) => {
    const rows = { ...level.rows };
    for (const key of keys)
      if (!rows[key]) {
        rows[key] = crypto.randomUUID();
        changed = true;
      }
    return { ...level, rows };
  });
  return changed ? { ...source.opacity, levels } : source.opacity;
}
export function resolveOpacity(
  source: OpacitySource,
  modes: readonly Mode[],
  preview?: PreviewOverrides,
): OpacityResult {
  const result: OpacityResult = {
    levels: [],
    issues: [],
    weight: 0,
    modeKey: "",
  };
  if (!isOpacityDocument(source.opacity)) {
    result.issues.push(
      "Opacity data is unavailable. Restore or repair the opacity foundation.",
    );
    return result;
  }
  try {
    result.modeKey = opacityModeKey(source, modes);
    const background = resolveColorDocument(
      source.colorSystem,
      modes,
      preview,
      {
        modeSets: source.modeSets,
        applyMultiplier: false,
        applyPolarity: false,
      },
    );
    result.weight = polarityWeight(backgroundLuminance(background), "light");
    const axes = source.modeSets.filter((axis) => axis.modes.length);
    const selection = selectionForModes(axes, alignedModes(axes, modes));
    result.levels = source.opacity.levels.map((level, index) => {
      const generatedValue =
        Math.round(
          compensatedOpacity(
            level.value,
            source.opacity!.polarityCompensation,
            result.weight,
          ) * 100,
        ) / 100;
      const values = source.browserTokenEdits?.[level.id]?.values ?? {};
      const matches = Object.entries(values)
        .filter(([key]) =>
          tokenModePairs(key).every(([set, mode]) => selection[set] === mode),
        )
        .sort(
          ([a], [b]) => tokenModePairs(b).length - tokenModePairs(a).length,
        );
      const override = matches[0]?.[1];
      if (override && !isAlpha(override.value)) {
        result.issues.push(
          `Opacity ${(index + 1) * 100} has an invalid manual value.`,
        );
      }
      return {
        id: level.id,
        uuid: level.rows[result.modeKey],
        scaleIndex: (index + 1) * 100,
        name: `opacity-${(index + 1) * 100}`,
        generatedValue,
        value:
          override && isAlpha(override.value)
            ? Math.round(override.value * 100) / 100
            : generatedValue,
        overridden: !!override,
        stale:
          !!override &&
          (isAlpha(override.baseline)
            ? Math.round(override.baseline * 100) / 100
            : override.baseline) !== generatedValue,
        ...(matches[0] && { overrideKey: matches[0][0] }),
      };
    });
  } catch (failure) {
    result.issues.push(
      `Opacity output is unavailable: ${failure instanceof Error ? failure.message : String(failure)}`,
    );
  }
  return result;
}
