// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../modes/model";
import {
  comparisonDatasets,
  textSizeComparisonSettings,
  type ComparisonDatasets,
  type ComparisonSample,
} from "../typography/comparisons";
import type { TypographyDocument } from "../typography/model";
import { generateIconScale, type IconGenerationLibrary } from "./generate";
import type { IconScale, IconsDocument } from "./model";

/** One icon scale compared across named modes and Adaptive text scaling steps, because icons follow Typography's text zoom. */
export function buildIconScaleComparisons(
  icons: IconsDocument,
  scale: IconScale,
  typography: TypographyDocument,
  modeSets: readonly ModeSet[],
  library: IconGenerationLibrary = {},
  preview?: Pick<TypographyDocument, "textZoom" | "textSize">,
): ComparisonDatasets {
  let steps: ComparisonSample["steps"] | undefined;
  return comparisonDatasets(
    textSizeComparisonSettings(typography, modeSets, preview),
    (textZoom, textSize) => {
      const values = generateIconScale(
        icons,
        scale,
        { ...typography, textSize },
        textZoom,
        library,
      );
      steps ??= values.map((value) => ({
        id: String(value.step),
        label: `${value.step}${value.index === 0 ? " (base)" : ""}`,
        position: value.index,
        isRequired: value.index === 0,
      }));
      return {
        steps,
        metrics: [
          {
            id: scale.id,
            label: scale.name,
            unit: "px",
            tokenNames: values.map((value) => `Step ${value.step}`),
          },
        ],
        values: [values.map(({ raw, value }) => ({ raw, value }))],
      };
    },
  );
}
