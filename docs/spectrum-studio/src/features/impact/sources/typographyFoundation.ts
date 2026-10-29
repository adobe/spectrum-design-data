// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { TYPOGRAPHY_DEFAULTS } from "../../typography/defaults";
import type { TypographyDocument } from "../../typography/model";
import { typographyDocumentAtom } from "../../typography/state";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

function parameters(document: TypographyDocument): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const key of [
    "scaleTypeId",
    "outputUnit",
    "smallSizes",
    "largeSizes",
    "componentSize",
    "textZoom",
    "minTextSize",
    "maxTextSize",
    "textRoundingRuleId",
    "lineHeightRoundingRuleId",
  ] as const)
    values.set(key, document[key]);
  values.set("hideFromPublishing", document.hideFromPublishing ?? false);
  values.set(
    "lineHeightOrder",
    document.lineHeights.map((card) => card.id),
  );
  values.set("iconography/alignment", document.iconography.alignment);
  values.set("iconography/baseSize", document.iconography.baseSize);
  values.set(
    "iconography/lineHeightId",
    document.iconography.alignment === "line-height"
      ? document.iconography.lineHeightId
      : undefined,
  );
  for (const [id, reference] of Object.entries(document.metricNames))
    values.set(`metricNames/${id}`, reference);
  for (const card of document.lineHeights) {
    for (const key of [
      "defaultValue",
      "isAdaptive",
      "hasAdaptiveSettings",
    ] as const)
      values.set(`lineHeights/${card.id}/${key}`, card[key]);
    for (const key of [
      "interpolationId",
      "from",
      "to",
      "outputAtFrom",
      "outputAtTo",
    ] as const)
      values.set(`lineHeights/${card.id}/adaptive/${key}`, card.adaptive[key]);
  }
  return values;
}

export function typographyFoundationParameters(
  document: TypographyDocument,
): FoundationParameterRecord[] {
  const before = parameters(TYPOGRAPHY_DEFAULTS),
    after = parameters(document);
  return [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
    id: `typography/${id}`,
    category: "typography",
    edited:
      before.has(id) !== after.has(id) ||
      JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)),
  }));
}

export const typographyFoundationSource: FoundationImpactSource = {
  id: "typography-foundation",
  recordsAtom: atom((get) =>
    typographyFoundationParameters(get(typographyDocumentAtom)),
  ),
};
