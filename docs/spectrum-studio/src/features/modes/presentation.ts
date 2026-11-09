// Copyright 2026 Adobe. All rights reserved.
import type { FoundationId } from "./parameters";
import { AUTHORING_CAPABILITY_OPTIONS } from "./parameters";
import type { Mode, ModeSet } from "./model";
import { paletteColorCss } from "../color-system/paletteValue";
import type { ColorOutputSettings } from "../color-system/outputSettings";

export function modeSetFoundationSelection(
  modeSet: ModeSet | undefined,
  attachedFoundations: readonly FoundationId[],
  pendingFoundation?: FoundationId | null,
): FoundationId[] {
  const capabilityFoundations = (modeSet?.authoringCapabilities ?? [])
    .map(
      (capability) =>
        AUTHORING_CAPABILITY_OPTIONS.find((option) => option.id === capability)
          ?.foundation,
    )
    .filter((foundation): foundation is FoundationId => !!foundation);
  return [
    ...new Set([
      ...attachedFoundations,
      ...(pendingFoundation ? [pendingFoundation] : []),
      ...capabilityFoundations,
    ]),
  ];
}

export interface ModeSetDraftState {
  modeSet: ModeSet | null | undefined;
  foundations: readonly FoundationId[];
  adaptiveParameterIds: readonly string[];
  polarityCompensation: number;
}

export function modeSetDraftHasChanges(
  original: ModeSetDraftState,
  current: ModeSetDraftState,
): boolean {
  if (!original.modeSet) return true;
  const normalize = (state: ModeSetDraftState) =>
    JSON.stringify([
      state.modeSet,
      [...state.foundations].sort(),
      [...state.adaptiveParameterIds].sort(),
      state.polarityCompensation,
    ]);
  return normalize(original) !== normalize(current);
}

export function modeSetPreviewFoundation(
  modeSet: ModeSet,
  attachedFoundations: readonly FoundationId[] = [],
): FoundationId | undefined {
  const capabilities = modeSet.authoringCapabilities ?? [];
  const foundations = new Set([
    ...AUTHORING_CAPABILITY_OPTIONS.filter((option) =>
      capabilities.includes(option.id),
    ).map((option) => option.foundation),
    ...attachedFoundations,
  ]);
  return (["color", "typography", "elevation"] as const).find((foundation) =>
    foundations.has(foundation),
  );
}

export function previewContrastIndices(length: number) {
  if (length < 3) return [];
  const middle = Math.floor(length / 2);
  const start = Math.min(length - 3, Math.max(0, middle - 1));
  return [start, start + 1, start + 2];
}

export function typographyPreviewPositions(positions: readonly number[]) {
  const available = new Set(positions);
  return [-1, 0, 1].filter((position) => available.has(position));
}

export function modeAdjustmentRows(
  mode: Mode,
  modeSet: ModeSet,
  output?: ColorOutputSettings,
) {
  const stored = mode.foundations.color?.scaleAdjustment;
  const adjustment = stored?.enabled === false ? undefined : stored;
  const adjustments = modeSet.modes.map((candidate) => {
    const value = candidate.foundations.color?.scaleAdjustment;
    return value?.enabled === false ? undefined : value;
  });
  if (new Set(adjustments.map((value) => JSON.stringify(value))).size < 2)
    return [];
  if (adjustment?.method === "absolute")
    return [
      {
        id: "color",
        label: "Color",
        value: paletteColorCss(adjustment.color, output ?? "srgb"),
      },
    ];
  const channels = ["hue", "chroma"] as const;
  const different = new Set(
    channels.filter((channel) => {
      const values = adjustments.map((value) =>
        value?.method === "relative" ? (value[channel] ?? null) : null,
      );
      return new Set(values.map((value) => JSON.stringify(value))).size > 1;
    }),
  );
  const rows: { id: string; label: string; value: string }[] = [];
  if (different.has("hue"))
    rows.push({
      id: "hue",
      label: "Hue",
      value: adjustment?.hue
        ? `${adjustment.hue > 0 ? "+" : ""}${adjustment.hue}°`
        : "0°",
    });
  if (different.has("chroma"))
    rows.push({
      id: "chroma",
      label: "Saturation",
      value:
        adjustment?.chroma !== undefined ? `${adjustment.chroma}%` : "100%",
    });
  return rows;
}
