// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../color-system/contrastSteps";
import type { Rule } from "../logic/model";
import { STANDARD_SCALE_NAMING_RULE } from "../logic/scaleNaming";
import { PALETTE_SCALE_ID, tokenStableKey, tokenUuid } from "../tokens/model";
import {
  assertTaxonomy,
  type Classification,
  type TaxonomyDocument,
  type TaxonomySourceContext,
} from "./model";
import {
  dataVisMemberId,
  dataVisSourceId,
} from "../color-system/data-vis/identity";

function governedTerm(
  document: TaxonomyDocument,
  key: string,
  value: string | number,
): [string, string] {
  const category = document.categories.find((category) => category.key === key);
  const term = document.terms.find(
    (term) => term.categoryId === category?.id && term.value === value,
  );
  if (
    !category ||
    category.cardinality !== "one" ||
    !category.scopes.includes("colors") ||
    category.valueType !== typeof value ||
    !term
  ) {
    throw new Error(
      `The color foundation requires a registered ${key} term for ${value}. Color type and shared steps cannot be overridden.`,
    );
  }
  return [category.id, term.id];
}

export function governedColorContext(
  color: ColorSystemDocument,
  taxonomy: TaxonomyDocument,
  scaleId: string,
  contrastId: string,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
): TaxonomySourceContext {
  const palette = scaleId === PALETTE_SCALE_ID;
  const source = palette
    ? color.palette.find((source) => source.id === contrastId)
    : color.scales.find((source) => source.id === scaleId);
  if (!source?.nameRef)
    throw new Error("A color source must reference its registered name.");
  const classification: Classification = {
    ...Object.fromEntries([governedTerm(taxonomy, "property", "color")]),
    [source.nameRef.categoryId]: source.nameRef.termId,
  };
  if (!palette) {
    const scale = color.scales.find((scale) => scale.id === scaleId);
    if (!scale) throw new Error(`Unresolved color scale ${scaleId}.`);
    const position = scaleContrasts(color, scale).findIndex(
      (swatch) => swatch.id === contrastId,
    );
    if (position < 0)
      throw new Error(`Unresolved shared contrast swatch ${contrastId}.`);
    const [categoryId, termId] = governedTerm(
      taxonomy,
      "scaleIndex",
      contrastStepIndex(position, scale, rules),
    );
    classification[categoryId] = termId;
  }
  return {
    id: `${palette ? "palette" : "color-scale"}:${source.id}`,
    ...(!palette && { stepId: contrastId }),
    governed: classification,
  };
}

export function assertColorGovernance(
  color: ColorSystemDocument,
  taxonomy: TaxonomyDocument,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
): void {
  assertTaxonomy(taxonomy);
  governedTerm(taxonomy, "property", "color");
  for (let position = 0; position < color.contrasts.length; position++)
    governedTerm(taxonomy, "scaleIndex", contrastStepIndex(position));
  for (const scale of color.scales)
    scaleContrasts(color, scale).forEach((_, position) =>
      governedTerm(
        taxonomy,
        "scaleIndex",
        contrastStepIndex(position, scale, rules),
      ),
    );
  const ids = [
    ...color.palette.map((source) =>
      tokenUuid(tokenStableKey(PALETTE_SCALE_ID, source.id)),
    ),
    ...color.scales.flatMap((source) =>
      scaleContrasts(color, source).map((swatch) =>
        tokenUuid(tokenStableKey(source.id, swatch.id)),
      ),
    ),
    ...color.dataVisScales.flatMap((source) =>
      source.kind === "categorical"
        ? source.members.map((member) => dataVisMemberId(source.id, member.id))
        : [],
    ),
  ];
  if (ids.some((id) => taxonomy.classifications[id])) {
    throw new Error(
      "Generated color token classifications cannot override the foundation's type, names or shared contrast steps.",
    );
  }
}

export function governedDataVisContext(
  color: ColorSystemDocument,
  taxonomy: TaxonomyDocument,
  scaleId: string,
  memberId: string,
): TaxonomySourceContext & { governed: Classification } {
  const scale = color.dataVisScales.find((scale) => scale.id === scaleId);
  if (!scale?.nameRef || scale.kind !== "categorical")
    throw new Error("A categorical source must reference its registered name.");
  const index = scale.members.findIndex((member) => member.id === memberId);
  if (index < 0) throw new Error("The categorical member is unavailable.");
  return {
    id: dataVisSourceId(scaleId),
    stepId: memberId,
    governed: {
      ...Object.fromEntries([
        governedTerm(taxonomy, "property", "color"),
        governedTerm(taxonomy, "number", index + 1),
      ]),
      [scale.nameRef.categoryId]: scale.nameRef.termId,
    },
  };
}

export function governedSurfaceContext(
  color: ColorSystemDocument,
  taxonomy: TaxonomyDocument,
  surfaceId: string,
): TaxonomySourceContext {
  const surface = color.surfaces.find((item) => item.id === surfaceId);
  if (!surface?.nameRef)
    throw new Error("A surface must reference its registered name.");
  return {
    id: `surface:${surface.id}`,
    governed: {
      ...Object.fromEntries([governedTerm(taxonomy, "property", "color")]),
      [surface.nameRef.categoryId]: surface.nameRef.termId,
    },
  };
}
