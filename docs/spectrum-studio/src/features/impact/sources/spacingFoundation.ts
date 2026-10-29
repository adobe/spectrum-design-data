// Copyright 2026 Adobe. All rights reserved.
import { atom, type Atom } from "jotai";
import { SPACING_DEFAULTS } from "../../spacing/defaults";
import { spacingDocumentAtom } from "../../spacing/state";
import { SIZE_DEFAULTS } from "../../size/defaults";
import { sizeDocumentAtom } from "../../size/state";
import { radiusDocumentAtom } from "../../radius/state";
import { RADIUS_DEFAULTS } from "../../radius/defaults";
import type { DimensionScope } from "../../taxonomy/model";
import type { DimensionDocument } from "../../scales/foundation";
import { SPACING_SCALE_FIELDS } from "../../changelog/changes";
import type {
  FoundationImpactSource,
  FoundationParameterRecord,
} from "../model";

/** Each authored field of each scale is one parameter; added or removed scales count every field. */
export function dimensionFoundationParameters(
  category: DimensionScope,
  defaults: DimensionDocument,
  document: DimensionDocument,
): FoundationParameterRecord[] {
  const before = new Map(defaults.scales.map((scale) => [scale.id, scale]));
  const after = new Map(document.scales.map((scale) => [scale.id, scale]));
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((id) =>
    SPACING_SCALE_FIELDS.map((field) => {
      const old = before.get(id) as Record<string, unknown> | undefined;
      const next = after.get(id) as Record<string, unknown> | undefined;
      return {
        id: `${category}/${id}/${field}`,
        category,
        edited:
          !old ||
          !next ||
          (field === "hideFromPublishing"
            ? (old[field] === true) !== (next[field] === true)
            : JSON.stringify(old[field]) !== JSON.stringify(next[field])),
      };
    }),
  );
}

function dimensionFoundationSource(
  category: DimensionScope,
  defaults: DimensionDocument,
  documentAtom: Atom<DimensionDocument>,
): FoundationImpactSource {
  return {
    id: `${category}-foundation`,
    recordsAtom: atom((get) =>
      dimensionFoundationParameters(category, defaults, get(documentAtom)),
    ),
  };
}

export const spacingFoundationSource = dimensionFoundationSource(
  "spacing",
  SPACING_DEFAULTS,
  spacingDocumentAtom,
);
export const sizeFoundationSource = dimensionFoundationSource(
  "size",
  SIZE_DEFAULTS,
  sizeDocumentAtom,
);
export const radiusFoundationSource = dimensionFoundationSource(
  "radius",
  RADIUS_DEFAULTS,
  radiusDocumentAtom,
);
