// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { createColorDefaults } from "../../../data/defaults";
import { resolvedBackgroundLinear } from "../../../features/color-system/surfaceGeneration";
import { STANDARD_SCALE_NAMING_RULE } from "../../../features/logic/scaleNaming";
import { generateScaleColorTokens } from "../../../features/tokens/colorGeneration";
import { resolveToken } from "../../../features/tokens/model";
import { compileContinuousScale } from "../../../features/color-system/data-vis/continuous";
import {
  finalUiSwatches,
  resolveDataVisPoints,
} from "../../../features/color-system/data-vis/resolution";
import type { SuggestionResult } from "../../../features/color-system/data-vis/categorical";
import type {
  CategoricalDataVisScale,
  ContinuousDataVisScale,
  DataVisPoint,
} from "../../../features/color-system/data-vis/model";
import type { PrimitiveColor } from "../../../features/color-system/data-vis/primitiveColors";
import { tokenStableKey, tokenUuid } from "../../../features/tokens/model";
import { governedColorContext } from "../../../features/taxonomy/colorGovernance";
import { projectClassification } from "../../../features/taxonomy/model";
import { designSystemDefaults } from "../../../data/defaults";
import { generatePaletteTokens } from "../../../features/tokens/paletteGeneration";
import { PALETTE_SCALE_ID } from "../../../features/tokens/model";
import { dataVisMemberId } from "../../../features/color-system/data-vis/identity";
import { foundationNameSegment } from "../../../features/taxonomy/formatting";

export const storySurface = style({
  backgroundColor: "base",
  color: "neutral",
  padding: 16,
  minHeight: "[100vh]",
  boxSizing: "border-box",
});
export const storyDocument = createColorDefaults();
const background = resolvedBackgroundLinear(storyDocument);
function scaleId(name: string) {
  const scale = storyDocument.scales.find((scale) => scale.name === name);
  if (!scale)
    throw new Error(`The data vis story needs the shipped ${name} UI scale.`);
  return scale.id;
}
export const storySwatches = ["Blue", "Orange", "Purple"].flatMap((name) => {
  const scale = storyDocument.scales.find(
    (scale) => scale.id === scaleId(name),
  )!;
  const token = generateScaleColorTokens(
    scale,
    storyDocument.contrasts,
    background,
    storyDocument.settings,
    storyDocument.settings.colorOutput,
    [STANDARD_SCALE_NAMING_RULE],
  )[6];
  if (!token)
    throw new Error("The data vis story needs a generated UI swatch.");
  return finalUiSwatches(storyDocument, [resolveToken(token, undefined)]);
});
export const storyPoint: DataVisPoint = {
  id: "story-point",
  position: 0.25,
  source: { kind: "ui-scale", scaleId: scaleId("Blue") },
  contrast: { value: 2.4 },
};
export const storyPrimitiveColors: PrimitiveColor[] = storySwatches.map(
  (swatch) => {
    const registry = designSystemDefaults.system.taxonomy;
    const context = governedColorContext(
      storyDocument,
      registry,
      swatch.source.scaleId,
      swatch.source.contrastId,
      [STANDARD_SCALE_NAMING_RULE],
    );
    const projection = projectClassification(
      registry,
      context.governed!,
      "colors",
    );
    if (projection.issues.length) throw new Error(projection.issues.join(" "));
    return {
      id: tokenUuid(
        tokenStableKey(swatch.source.scaleId, swatch.source.contrastId),
      ),
      origin: swatch.source,
      hidden: false,
      name: projection.name,
      value: swatch.value,
      generatedValue: swatch.generatedValue,
      manuallyOverridden: false,
    };
  },
);
export const storyCategorical: CategoricalDataVisScale = {
  id: "story-categorical",
  name: "Story categories",
  kind: "categorical",
  members: storySwatches.slice(0, 2).map((swatch, index) => ({
    id: `story-member-${index}`,
    source: swatch.source,
  })),
  preferences: {
    size: { kind: "count", count: 2 },
    minimumBackgroundContrast: 1,
    minimumDeltaE: 0,
    cvdProfiles: [],
    style: "balanced",
  },
};
const palette = storyDocument.palette[0];
const paletteToken = generatePaletteTokens(
  [palette],
  storyDocument.settings.colorOutput,
)[0];
storyPrimitiveColors.push(
  {
    id: tokenUuid(tokenStableKey(PALETTE_SCALE_ID, palette.id)),
    origin: { kind: "palette", paletteColorId: palette.id },
    name: `${foundationNameSegment(palette.name)}-color`,
    value: paletteToken.value,
    generatedValue: paletteToken.value,
    hidden: false,
    manuallyOverridden: false,
  },
  {
    id: dataVisMemberId(storyCategorical.id, storyCategorical.members[0].id),
    origin: {
      kind: "categorical",
      scaleId: storyCategorical.id,
      memberId: storyCategorical.members[0].id,
    },
    name: "story-categories-color-1",
    value: storySwatches[0].value,
    generatedValue: storySwatches[0].value,
    hidden: false,
    manuallyOverridden: false,
  },
);
export const storySuggestions: SuggestionResult = {
  status: "ready",
  message: "Two deterministic example options.",
  suggestions: [
    {
      style: "balanced",
      sourceIds: storySwatches.slice(0, 2).map((swatch) => swatch.id),
      sizeLabel: "requested count",
      score: 95,
      aestheticVersion: "fixed-token-order-1",
    },
    {
      style: "bold",
      sourceIds: [storySwatches[2].id, storySwatches[0].id],
      sizeLabel: "requested count",
      score: 20,
      aestheticVersion: "fixed-token-order-1",
    },
  ],
  exclusions: [],
  stats: {
    pool: 3,
    eligible: 3,
    distinct: 3,
    largestFound: 2,
    measurements: 0,
    operations: 0,
    conversions: 0,
    cacheHits: 0,
  },
};
const sequential: ContinuousDataVisScale = {
  id: "story-sequential",
  name: "Story sequence",
  kind: "sequential",
  points: [
    {
      id: "start",
      position: 0,
      source: { kind: "ui-scale", scaleId: scaleId("Blue") },
      contrast: { value: 1.4 },
    },
    {
      id: "end",
      position: 1,
      source: { kind: "ui-scale", scaleId: scaleId("Blue") },
      contrast: { value: 12 },
    },
  ],
};
const diverging: ContinuousDataVisScale = {
  id: "story-diverging",
  name: "Story divergence",
  kind: "diverging",
  points: [
    {
      id: "start",
      position: 0,
      source: { kind: "ui-scale", scaleId: scaleId("Blue") },
      contrast: { value: 8 },
    },
    {
      id: "center",
      position: 0.5,
      source: { kind: "ui-scale", scaleId: scaleId("Gray") },
      contrast: { value: 1.4 },
    },
    {
      id: "end",
      position: 1,
      source: { kind: "ui-scale", scaleId: scaleId("Orange") },
      contrast: { value: 8 },
    },
  ],
};
export const storySequential = compileContinuousScale(
  sequential,
  resolveDataVisPoints(storyDocument, sequential, storySwatches),
);
export const storyDiverging = compileContinuousScale(
  diverging,
  resolveDataVisPoints(storyDocument, diverging, storySwatches),
);
