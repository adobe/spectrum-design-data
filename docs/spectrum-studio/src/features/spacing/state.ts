// Copyright 2026 Adobe. All rights reserved.
import {
  createDimensionFoundationState,
  isDimensionScaleNameTaken,
  type DimensionScalePatch,
} from "../scales/foundationState";
import {
  migrateDimensionScalesToFormulas,
  type DimensionDocument,
} from "../scales/foundation";
import { SPACING_SCALE_TYPE_ID } from "../scales/scaleType";
import { SPACING_DEFAULTS } from "./defaults";
import { SPACING_SCHEMA_VERSION } from "./model";

const foundation = createDimensionFoundationState({
  key: "foundations/spacing",
  schemaVersion: SPACING_SCHEMA_VERSION,
  defaults: SPACING_DEFAULTS,
  tokenPrefix: "spacing",
  customIdPrefix: "spacing-scale-custom",
  migrate: (data, fromVersion) =>
    fromVersion === 3
      ? migrateDimensionScalesToFormulas(
          data,
          SPACING_SCHEMA_VERSION,
          SPACING_SCALE_TYPE_ID,
        )
      : null,
});

export const spacingDocumentAtom = foundation.documentAtom;
export const generatedSpacingAtom = foundation.generatedAtom;
export const addSpacingScaleAtom = foundation.addScaleAtom;
export const updateSpacingScaleAtom = foundation.updateScaleAtom;
export const removeSpacingScaleAtom = foundation.removeScaleAtom;
export const restoreSpacingScaleAtom = foundation.restoreScaleAtom;

export type SpacingScalePatch = DimensionScalePatch;

/** Names must be unique by token slug, since the slug is part of every token name. */
export function isSpacingScaleNameTaken(
  document: DimensionDocument,
  name: string,
  exceptId?: string,
) {
  return isDimensionScaleNameTaken(document, name, exceptId);
}
