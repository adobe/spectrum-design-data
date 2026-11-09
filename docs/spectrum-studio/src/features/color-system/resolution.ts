// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "./model";
import type { Mode, ModeSet } from "../modes/model";
import type { PreviewOverrides } from "../modes/previewState";
import { capabilityOwners } from "../modes/ownership";
import { resolvePaletteLinks } from "./paletteReferences";
import { applyContrastMultiplier, applyPolarityCompensation } from "./polarity";
import { patchDataVisContrasts } from "./data-vis/model";
import { applyScaleAdjustment, type ScaleAdjustment } from "./scaleAdjustment";

export function resolveColorDocument(
  base: ColorSystemDocument,
  modes: readonly Mode[],
  preview?: PreviewOverrides,
  {
    applyMultiplier = true,
    applyPolarity = true,
    modeSets,
  }: {
    applyMultiplier?: boolean;
    applyPolarity?: boolean;
    modeSets?: ModeSet[];
  } = {},
): ColorSystemDocument {
  let resolved = base;
  const owners = modeSets ? capabilityOwners(modeSets) : undefined;
  let adjustment: ScaleAdjustment | undefined;
  for (const mode of modes) {
    const color = mode.foundations.color;
    if (!color) continue;
    const modeSet = modeSets?.find((item) =>
      item.modes.some((candidate) => candidate.id === mode.id),
    );
    if (modeSet && mode.id === modeSet.defaultModeId) continue;
    const scaleContrasts =
      !owners || modeSet?.id === owners["color.contrastMultiplier"]
        ? color.scaleContrasts
        : undefined;
    const dataVisContrasts =
      !owners || modeSet?.id === owners["color.contrastMultiplier"]
        ? color.dataVisContrasts
        : undefined;
    if (
      color.scaleAdjustment &&
      (!owners || modeSet?.id === owners["color.scaleAdjustment"])
    )
      adjustment = color.scaleAdjustment;
    resolved = {
      ...resolved,
      ...(dataVisContrasts && {
        dataVisScales: patchDataVisContrasts(
          resolved.dataVisScales,
          dataVisContrasts,
        ),
      }),
      ...(scaleContrasts && {
        scales: resolved.scales.map((scale) => ({
          ...scale,
          ...(scale.customContrasts && {
            customContrasts: {
              ...scale.customContrasts,
              steps: scale.customContrasts.steps.map((step) => ({
                ...step,
                value: scaleContrasts[scale.id]?.[step.id] ?? step.value,
              })),
            },
          }),
        })),
      }),
      ...(color.backgroundScaleId !== undefined &&
      (!owners || modeSet?.id === owners["color.backgroundScaleId"])
        ? { backgroundScaleId: color.backgroundScaleId }
        : {}),
      ...(color.backgroundLightness !== undefined &&
      (!owners || modeSet?.id === owners["color.backgroundLightness"])
        ? { backgroundLightness: color.backgroundLightness }
        : {}),
      ...(color.contrastMultiplier !== undefined &&
      (!owners || modeSet?.id === owners["color.contrastMultiplier"])
        ? {
            settings: {
              ...resolved.settings,
              contrastMultiplier: color.contrastMultiplier,
            },
          }
        : {}),
    };
  }
  resolved = applyScaleAdjustment(resolvePaletteLinks(resolved), adjustment);
  if (preview) {
    const hue = preview["color.hueShift"];
    const chroma = preview["color.saturation"];
    if (typeof hue === "number" || typeof chroma === "number")
      resolved = applyScaleAdjustment(resolved, {
        method: "relative",
        ...(typeof hue === "number" && { hue }),
        ...(typeof chroma === "number" && { chroma }),
      });
    const scaleId = preview["color.backgroundScaleId"];
    const lightness = preview["color.backgroundLightness"];
    const multiplier = preview["color.contrastMultiplier"];
    resolved = {
      ...resolved,
      ...(typeof scaleId === "string" ? { backgroundScaleId: scaleId } : {}),
      ...(typeof lightness === "number"
        ? { backgroundLightness: lightness }
        : {}),
      ...(typeof multiplier === "number"
        ? { settings: { ...resolved.settings, contrastMultiplier: multiplier } }
        : {}),
    };
  }
  const compensated = applyPolarity
    ? applyPolarityCompensation(resolved)
    : resolved;
  return applyMultiplier ? applyContrastMultiplier(compensated) : compensated;
}
