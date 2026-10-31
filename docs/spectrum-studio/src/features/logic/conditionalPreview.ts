// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import { resolveColorDocument } from "../color-system/resolution";
import { resolvedBackgroundLinear } from "../color-system/surfaceGeneration";
import { generateColorTokensForScale } from "../tokens/generation";
import { tokenDisplayName } from "../tokens/model";
import type { ModeSet } from "../modes/model";
import type { Rule } from "./model";
import type { OffsetToken } from "./conditional";

export function conditionalColorTokens(
  document: ColorSystemDocument,
  modeSets: ModeSet[],
  selection: Record<string, string>,
  rules: readonly Rule[],
): OffsetToken[] {
  const modes = modeSets.flatMap((set) => {
    const mode = set.modes.find((mode) => mode.id === selection[set.id]);
    if (!mode)
      throw new Error(`${set.name}: choose an available preview mode.`);
    return [mode];
  });
  const resolved = resolveColorDocument(document, modes, undefined, {
    modeSets,
  });
  const background = resolvedBackgroundLinear(resolved);
  return resolved.scales.flatMap((scale) =>
    generateColorTokensForScale(
      scale,
      resolved.contrasts,
      background,
      resolved.settings,
      resolved.settings.colorOutput,
      rules,
    ).map((token, index) => ({
      id: token.uuid,
      sourceId: scale.id,
      index,
      name: tokenDisplayName(token.name),
      value: token.value,
    })),
  );
}
