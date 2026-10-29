// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { isFoundationPublished } from "../../foundations/types";
import { SPACING_DEFAULTS } from "../../spacing/defaults";
import { generateSpacingScale } from "../../spacing/generate";
import type { SpacingDocument } from "../../spacing/model";
import { spacingDocumentAtom } from "../../spacing/state";
import type { Rule } from "../../logic/model";
import { RULE_DEFAULTS } from "../../logic/defaults";
import { rulesAtom } from "../../logic/library";
import { scaleTypesAtom } from "../../logic/scaleTypeLibrary";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../../scales/scaleType";
import type { TokenImpactRecord, TokenImpactSource } from "../model";

/** Spacing has no modes or overrides, so each token is a single value; removed tokens leave the denominator. */
export function spacingPrimitiveTokenRecords(
  document: SpacingDocument,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
): TokenImpactRecord[] {
  const baseline = new Map(
    SPACING_DEFAULTS.scales
      .flatMap((scale) => generateSpacingScale(scale))
      .map((value) => [`${value.scaleId}/${value.index}`, value]),
  );
  const library = document.pendingRules
    ? [...rules, ...document.pendingRules]
    : rules;
  return document.scales
    .filter(isFoundationPublished)
    .flatMap((scale) => generateSpacingScale(scale, library, scaleTypes))
    .map((value) => {
      const tokenId = `${value.scaleId}/${value.index}`;
      const before = baseline.get(tokenId);
      return {
        tokenId,
        tier: "primitive",
        category: "spacing",
        modeValues: [
          { valueId: tokenId, changed: before?.value !== value.value },
        ],
        nameChanged: before?.name !== value.name,
        manuallyOverridden: false,
      };
    });
}

export const spacingPrimitiveTokenSource: TokenImpactSource = {
  id: "spacing-primitive-tokens",
  recordsAtom: atom((get) =>
    spacingPrimitiveTokenRecords(
      get(spacingDocumentAtom),
      get(rulesAtom),
      get(scaleTypesAtom),
    ),
  ),
};
