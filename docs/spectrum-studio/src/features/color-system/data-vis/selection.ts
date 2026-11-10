// Copyright 2026 Adobe. All rights reserved.
import type {
  BrowserTokenEdits,
  BrowserTokenSource,
} from "../../tokens/browserModel";
import { resolveBrowserTokens } from "../../tokens/browserResolution";
import type { CategoricalDataVisScale } from "./model";
import { linkedUiSwatch, type UiSwatch } from "./resolution";
import { concreteColor } from "./colors";
import { categoricalMemberSources } from "./categoricalValues";

export function categoricalSelection(
  scale: CategoricalDataVisScale,
  swatches: readonly UiSwatch[],
  edits: BrowserTokenEdits,
  modeKey: string,
  referenceSources: BrowserTokenSource[] = [],
): UiSwatch[] {
  const sources = categoricalMemberSources(scale, swatches);
  return resolveBrowserTokens([...referenceSources, ...sources], edits, modeKey)
    .filter((token) => token.dataVis?.scaleId === scale.id)
    .map((token, index) => {
      const member = scale.members[index];
      const output = sources[index];
      if (token.validationError) throw new Error(token.validationError);
      if (
        typeof token.value !== "string" ||
        typeof output.value !== "string" ||
        typeof output.generatedValue !== "string"
      )
        throw new Error("A categorical member requires a concrete color.");
      const linked = scale.staticColors
        ? {
            id: output.id,
            source: member.source,
            label: "",
            value: output.value,
            generatedValue: output.generatedValue,
            manuallyOverridden: !!output.legacyOverridden,
          }
        : linkedUiSwatch(member.source, swatches);
      concreteColor(token.value);
      return {
        ...linked,
        id: output.id,
        value: token.value,
        manuallyOverridden: token.valueOverridden,
        label: token.name,
      };
    });
}
