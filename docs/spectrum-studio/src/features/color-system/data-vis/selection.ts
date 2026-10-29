// Copyright 2026 Adobe. All rights reserved.
import {
  resolveBrowserTokens,
  type BrowserTokenEdits,
} from "../../tokens/browserModel";
import { dataVisMemberId } from "./identity";
import type { CategoricalDataVisScale } from "./model";
import { linkedUiSwatch, type UiSwatch } from "./resolution";
import { concreteColor } from "./colors";
import { categoricalMemberValue } from "./categoricalValues";

export function categoricalSelection(
  scale: CategoricalDataVisScale,
  swatches: readonly UiSwatch[],
  edits: BrowserTokenEdits,
  modeKey: string,
): UiSwatch[] {
  return scale.members.map((member, index) => {
    const id = dataVisMemberId(scale.id, member.id);
    const output = categoricalMemberValue(scale, member.id, swatches);
    const linked = scale.staticColors
      ? {
          id,
          source: member.source,
          label: "",
          value: output.value,
          generatedValue: output.generatedValue,
          manuallyOverridden: output.overridden,
        }
      : linkedUiSwatch(member.source, swatches);
    const name = `${scale.name} ${index + 1}`;
    const [token] = resolveBrowserTokens(
      [
        {
          id,
          type: "colors",
          groupId: scale.id,
          groupLabel: scale.name,
          name,
          generatedName: name,
          value: output.value,
          generatedValue: output.generatedValue,
          unit: "",
          legacyOverridden: output.overridden,
          dataVis: {
            scaleId: scale.id,
            memberId: member.id,
            ordinal: index + 1,
            source: member.source,
            hidden: false,
            static: !!scale.staticColors,
          },
        },
      ],
      edits,
      modeKey,
    );
    if (typeof token.value !== "string")
      throw new Error("A categorical member requires a concrete color.");
    concreteColor(token.value);
    return {
      ...linked,
      id,
      value: token.value,
      manuallyOverridden: token.valueOverridden,
      label: name,
    };
  });
}
