// Copyright 2026 Adobe. All rights reserved.
import { isPaletteToken, tokenDisplayName, type ResolvedToken } from "./model";
import type { BrowserTokenSource } from "./browserModel";
import { temporaryTokenGroupForPrimitiveColorTokens } from "./view/temporaryTokenTermOrdering";
import {
  taxonomyColorSourceId,
  taxonomyPaletteSourceId,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { governedColorContext } from "../taxonomy/colorGovernance";
import type { ColorSystemDocument } from "../color-system/model";
import type { Rule } from "../logic/model";

export function browserColorSources(
  colors: ResolvedToken[],
  naming?: {
    document: ColorSystemDocument;
    registry: TaxonomyDocument;
    rules?: readonly Rule[];
  },
): BrowserTokenSource[] {
  return temporaryTokenGroupForPrimitiveColorTokens(colors).flatMap((group) =>
    group.tokens.map((token) => ({
      id: token.uuid,
      tier: "primitive",
      type: "colors",
      groupId: group.id,
      groupLabel: group.label,
      name: tokenDisplayName(token.name),
      value: token.value,
      generatedName: tokenDisplayName(token.generated.name),
      generatedValue: token.generated.value,
      unit: "",
      legacyOverridden: token.valueOverridden,
      legacyStale: token.stale,
      taxonomyEvidence: {
        property: "color",
        colorFamily: token.generated.name.colorName,
        ...(token.generated.name.contrastValue
          ? { contrastLabel: token.generated.name.contrastValue }
          : {}),
      },
      taxonomySource: naming
        ? governedColorContext(
            naming.document,
            naming.registry,
            token.source.scaleId,
            token.source.contrastId,
            naming.rules,
          )
        : isPaletteToken(token)
          ? { id: taxonomyPaletteSourceId(token.source.contrastId) }
          : {
              id: taxonomyColorSourceId(token.source.scaleId),
              stepId: token.source.contrastId,
            },
      ...(isPaletteToken(token) && {
        paletteColorId: token.source.contrastId,
      }),
    })),
  );
}
