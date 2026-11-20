// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "./model";
import { renderGamutForOutput } from "./colorMath";
import { buildScaleData } from "./scaleGeneration";
import { generateColors } from "./dynamicGeneration";
import { generateSelectedColor } from "./colorScaleType";
import { scaleContrasts } from "./contrastSteps";
import {
  resolvedBackgroundLinear,
  surfaceCss,
  surfaceLinear,
} from "./surfaceGeneration";

export interface ColorPreviewInput {
  document: ColorSystemDocument;
  surfaceId: string | null;
}

export function computeColorPreview({
  document,
  surfaceId,
}: ColorPreviewInput) {
  const surface =
    document.surfaces.find((item) => item.id === surfaceId) ??
    document.surfaces[0];
  if (!surface) throw new Error("Choose an available Color preview surface.");
  const background = surface.base
    ? resolvedBackgroundLinear(document)
    : surfaceLinear(surface, document);
  return {
    background,
    backgroundCss: surfaceCss(surface, document),
    gamut: renderGamutForOutput(document.settings.colorOutput),
    generatedByScale: new Map(
      document.scales.map((scale) => {
        const data = buildScaleData(scale, document.settings.colorOutput);
        return [
          scale.id,
          scaleContrasts(document, scale).map((contrast) => ({
            selected: generateSelectedColor(
              data,
              background,
              contrast,
              document.settings,
            ),
            comparison: generateColors(
              data,
              background,
              contrast.value,
              document.settings,
            ),
          })),
        ];
      }),
    ),
  };
}

export type ColorPreviewOutput = ReturnType<typeof computeColorPreview>;
