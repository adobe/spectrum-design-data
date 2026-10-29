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
import { SIZE_DEFAULTS } from "./defaults";
import { SIZE_SCHEMA_VERSION } from "./model";

const foundation = createDimensionFoundationState({
  key: "foundations/size",
  schemaVersion: SIZE_SCHEMA_VERSION,
  defaults: SIZE_DEFAULTS,
  tokenPrefix: "size",
  customIdPrefix: "size-scale-custom",
  migrate: (data, fromVersion) =>
    fromVersion === 1
      ? migrateDimensionScalesToFormulas(
          data,
          SIZE_SCHEMA_VERSION,
          SPACING_SCALE_TYPE_ID,
        )
      : null,
});

export const sizeDocumentAtom = foundation.documentAtom;
export const generatedSizeAtom = foundation.generatedAtom;
export const addSizeScaleAtom = foundation.addScaleAtom;
export const updateSizeScaleAtom = foundation.updateScaleAtom;
export const removeSizeScaleAtom = foundation.removeScaleAtom;
export const restoreSizeScaleAtom = foundation.restoreScaleAtom;

export type SizeScalePatch = DimensionScalePatch;

export function isSizeScaleNameTaken(
  document: DimensionDocument,
  name: string,
  exceptId?: string,
) {
  return isDimensionScaleNameTaken(document, name, exceptId);
}
