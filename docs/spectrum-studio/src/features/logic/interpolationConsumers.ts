// Copyright 2026 Adobe. All rights reserved.
import type { TypographyDocument } from "../typography/model";
import type { ScaleType } from "../scales/scaleType";
import type { TaxonomyDocument } from "../taxonomy/model";
import { lineHeightName } from "../typography/lineHeightNames";

export interface InterpolationConsumer {
  id: string;
  interpolationId: string;
  label: string;
}

export function interpolationConsumers(
  typography: TypographyDocument,
  formulas: readonly ScaleType[] = [],
  registry?: TaxonomyDocument,
): InterpolationConsumer[] {
  return [
    ...typography.lineHeights.map((card) => ({
      id: `typography/${card.id}`,
      interpolationId: card.adaptive.interpolationId,
      label: `Typography › ${registry ? lineHeightName(typography, registry, card.id) : card.id} line height`,
    })),
    ...formulas.flatMap((formula) =>
      formula.textSizeAdaptation
        ? [
            {
              id: `formula/${formula.id}`,
              interpolationId: formula.textSizeAdaptation.interpolationId,
              label: `${formula.name} adaptive ratio`,
            },
          ]
        : [],
    ),
  ];
}
