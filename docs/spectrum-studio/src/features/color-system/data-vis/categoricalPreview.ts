// Copyright 2026 Adobe. All rights reserved.
import type { BrowserToken } from "../../tokens/browserModel";
import { dataVisMemberId } from "./identity";
import { concreteColor } from "./colors";
import type { CategoricalDataVisScale } from "./model";
import type { UiSwatch } from "./resolution";

export function categoricalPreviewMembers(
  scale: CategoricalDataVisScale,
  tokens: readonly BrowserToken[],
): UiSwatch[] {
  const bySource = new Map(
    tokens.map((token) => [token.sourceId ?? token.id, token]),
  );
  return scale.members.map((member, index) => {
    const token = bySource.get(dataVisMemberId(scale.id, member.id));
    if (!token || token.validationError)
      throw new Error(
        token?.validationError ?? "A categorical output is unavailable.",
      );
    if (typeof token.value !== "string")
      throw new Error("A categorical token needs a concrete color value.");
    concreteColor(token.value);
    return {
      id: token.id,
      source: member.source,
      label: `Color ${index + 1}`,
      value: token.value,
      generatedValue: token.value,
      manuallyOverridden: token.valueOverridden,
    };
  });
}
