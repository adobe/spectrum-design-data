// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyProjection } from "../taxonomy/model";
import type { TokenPanelId } from "../tokens/view/tokenPanelRegistry";

/**
 * Translates Studio Registry classifications into design-data name fields
 * where the two taxonomies differ. Studio classifies primitive colors by
 * Color family and Scale index only; design-data still expects
 * `property: "color"` on every color token.
 */
export function designDataNameFields(
  flat: TaxonomyProjection["flat"],
  type: TokenPanelId,
): TaxonomyProjection["flat"] {
  if (type === "colors" && flat.property === undefined)
    return { property: "color", ...flat };
  return flat;
}
