// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "./model";
import type { Mode, ModeSet } from "../modes/model";
import type { PreviewOverrides } from "../modes/previewState";
import { capabilityOwners } from "../modes/ownership";
import { applyStopPatch, resolvePaletteLinks } from "./paletteReferences";
import { applyContrastMultiplier, applyPolarityCompensation } from "./polarity";
import { patchDataVisScales } from "./data-vis/model";

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
  const scaleOwner = owners?.["color.scales"];
  for (const mode of modes) {
    const color = mode.foundations.color;
    if (!color) continue;
    const modeSet = modeSets?.find((item) =>
      item.modes.some((candidate) => candidate.id === mode.id),
    );
    if (modeSet && mode.id === modeSet.defaultModeId) continue;
    const scaleStops =
      !owners || modeSet?.id === scaleOwner ? color.scaleStops : undefined;
    const scaleContrasts =
      !owners || modeSet?.id === owners["color.contrastMultiplier"]
        ? color.scaleContrasts
        : undefined;
    const dataVisSources =
      !owners || modeSet?.id === scaleOwner ? color.dataVisSources : undefined;
    const dataVisContrasts =
      !owners || modeSet?.id === owners["color.contrastMultiplier"]
        ? color.dataVisContrasts
        : undefined;
    resolved = {
      ...resolved,
      ...((dataVisSources || dataVisContrasts) && {
        dataVisScales: patchDataVisScales(
          resolved.dataVisScales,
          dataVisSources,
          dataVisContrasts,
        ),
      }),
      ...((scaleStops || scaleContrasts) && {
        scales: resolved.scales.map((scale) => ({
          ...scale,
          ...(scaleStops && {
            stops: scale.stops.map((stop) =>
              applyStopPatch(
                stop,
                scaleStops[scale.id]?.[stop.id],
                resolved.palette,
              ),
            ),
          }),
          ...(scale.customContrasts &&
            scaleContrasts && {
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
  resolved = resolvePaletteLinks(resolved);
  if (preview) {
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
