// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "./model";
import type { Rule } from "../logic/model";
import { contrastStepIndex, scaleContrasts } from "./contrastSteps";
import { tokenStableKey, tokenUuid } from "../tokens/model";

export function reindexedCustomContrastTokenIds(
  before: ColorSystemDocument,
  after: ColorSystemDocument,
  beforeRules: readonly Rule[],
  afterRules: readonly Rule[],
): Set<string> {
  const ids = new Set<string>();
  for (const scale of after.scales) {
    const previous = before.scales.find(
      (candidate) => candidate.id === scale.id,
    );
    if (!previous || (!previous.customContrasts && !scale.customContrasts))
      continue;
    const oldSteps = scaleContrasts(before, previous);
    scaleContrasts(after, scale).forEach((step, position) => {
      const oldPosition = oldSteps.findIndex(
        (candidate) => candidate.id === step.id,
      );
      if (
        oldPosition >= 0 &&
        contrastStepIndex(oldPosition, previous, beforeRules) !==
          contrastStepIndex(position, scale, afterRules)
      ) {
        ids.add(tokenUuid(tokenStableKey(scale.id, step.id)));
      }
    });
  }
  return ids;
}
