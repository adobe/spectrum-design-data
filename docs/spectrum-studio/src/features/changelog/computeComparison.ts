// Copyright 2026 Adobe. All rights reserved.
import type {
  ComparisonOutput,
  ComparisonProgress,
  ComparisonRequest,
} from "./comparisonWork";
import { prepareAuthoringSnapshot } from "../edit-session/snapshotPreparation";
import { compareAuthoring } from "./registry";
import {
  comparePrimitiveTokens,
  compareSemanticTokens,
} from "./tokenComparison";
import { mergeChangeGroups } from "./mergeGroups";
import { componentImpactForSnapshots } from "../impact/componentImpact";

export function computeComparison(
  input: ComparisonRequest,
  progress: (value: ComparisonProgress) => void,
): ComparisonOutput {
  const working = prepareAuthoringSnapshot(input.working);
  const authored = compareAuthoring(input.shipped, working, input.attachments);
  const partial = { working, authored, groups: mergeChangeGroups(authored) };
  progress(partial);
  const componentImpact = componentImpactForSnapshots(input.shipped, working);
  try {
    const primitive = comparePrimitiveTokens(input.shipped, working, authored);
    const semantic = compareSemanticTokens(input.shipped, working, authored);
    const comparison = {
      items: [...primitive.items, ...semantic.items],
      records: [...primitive.records, ...semantic.records],
    };
    return {
      ...partial,
      groups: mergeChangeGroups(authored, comparison),
      tokens: { status: "ready", comparison },
      componentImpact,
    };
  } catch (failure) {
    return {
      ...partial,
      tokens: {
        status: "unavailable",
        error: failure instanceof Error ? failure.message : String(failure),
      },
      componentImpact,
    };
  }
}
