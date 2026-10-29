// Copyright 2026 Adobe. All rights reserved.
import type {
  ColorSystemDocument,
  ColorScale,
  PaletteColor,
  Surface,
} from "../color-system/model";
import type {
  CategoricalDataVisScale,
  ContinuousDataVisScale,
} from "../color-system/data-vis/model";
import type { SpacingDocument } from "../spacing/model";
import type { SizeDocument } from "../size/model";
import type { RadiusDocument } from "../radius/model";
import type { DimensionScope } from "./model";
import type { TypographyDocument } from "../typography/model";
import type { DimensionDocument } from "../scales/foundation";
import {
  assertTaxonomy,
  projectClassification,
  registerTerm,
  taxonomyValueKey,
  type Classification,
  type TaxonomyDocument,
  type TaxonomyScope,
} from "./model";
import { foundationNameSegment } from "./formatting";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../color-system/contrastSteps";
import type { Rule } from "../logic/model";
import { STANDARD_SCALE_NAMING_RULE } from "../logic/scaleNaming";
import { assertColorGovernance } from "./colorGovernance";
import { dimensionNameClassification } from "./foundationNames";

export interface TaxonomyNameReference {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  categoryId: string;
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  termId: string;
  /** Explicit foundation-owned name segments; source labels are not parsed. */
  classification?: Classification;
}

export function selectSourceName(
  reference: TaxonomyNameReference,
  termId: string,
): TaxonomyNameReference {
  return {
    ...reference,
    termId,
    ...(reference.classification && {
      classification: {
        ...reference.classification,
        [reference.categoryId]: termId,
      },
    }),
  };
}

export type CanonicalNamedSource<T> = Omit<T, "name" | "nameRef"> & {
  name: TaxonomyNameReference;
};
export interface CanonicalSurface extends Omit<
  Surface,
  "name" | "nameRef" | "source"
> {
  name: TaxonomyNameReference;
  source?: "base";
}
export type CanonicalDataVisScale =
  | CanonicalNamedSource<ContinuousDataVisScale>
  | CanonicalNamedSource<CategoricalDataVisScale>;
export interface CanonicalColorDocument extends Omit<
  ColorSystemDocument,
  "palette" | "scales" | "surfaces" | "dataVisScales"
> {
  palette: CanonicalNamedSource<PaletteColor>[];
  scales: CanonicalNamedSource<ColorScale>[];
  surfaces: CanonicalSurface[];
  dataVisScales: CanonicalDataVisScale[];
}
export interface CanonicalSpacingDocument extends Omit<
  SpacingDocument,
  "scales"
> {
  scales: CanonicalNamedSource<SpacingDocument["scales"][number]>[];
}
export interface CanonicalSizeDocument extends Omit<SizeDocument, "scales"> {
  scales: CanonicalNamedSource<SizeDocument["scales"][number]>[];
}
export interface CanonicalRadiusDocument extends Omit<
  RadiusDocument,
  "scales"
> {
  scales: CanonicalNamedSource<RadiusDocument["scales"][number]>[];
}
export type CanonicalTypographyDocument = TypographyDocument;

export function registeredSourceName(
  taxonomy: TaxonomyDocument,
  reference: TaxonomyNameReference,
  scope: TaxonomyScope,
): string {
  const category = taxonomy.categories.find(
    (category) => category.id === reference.categoryId,
  );
  const term = taxonomy.terms.find((term) => term.id === reference.termId);
  if (
    !category ||
    !category.scopes.includes(scope) ||
    category.valueType !== "string" ||
    category.cardinality !== "one" ||
    !term ||
    term.categoryId !== category.id ||
    typeof term.value !== "string"
  ) {
    throw new Error(
      `Unresolved or incompatible ${scope} source name reference ${reference.categoryId}/${reference.termId}.`,
    );
  }
  foundationNameSegment(term.value);
  if (reference.classification) {
    const projection = projectClassification(
      taxonomy,
      reference.classification,
      scope,
    );
    if (projection.issues.length) throw new Error(projection.issues.join(" "));
  }
  return term.value;
}

export function resolveNamedSource<T extends { name: TaxonomyNameReference }>(
  source: T,
  taxonomy: TaxonomyDocument,
  scope: TaxonomyScope,
): Omit<T, "name"> & { name: string; nameRef: TaxonomyNameReference } {
  return {
    ...source,
    name: registeredSourceName(taxonomy, source.name, scope),
    nameRef: source.name,
  };
}

export function canonicalNamedSource<
  T extends { name: string; nameRef?: TaxonomyNameReference },
>(source: T): CanonicalNamedSource<T> {
  if (!source.nameRef)
    throw new Error(
      "A foundation source must reference a registered name before it can be serialized.",
    );
  const { name, nameRef, ...fields } = source;
  void name;
  return { ...fields, name: nameRef };
}

export function canonicalDimensionDocument<T extends DimensionDocument>(
  document: T,
) {
  return { ...document, scales: document.scales.map(canonicalNamedSource) };
}

export function canonicalColorDocument(
  document: ColorSystemDocument,
): CanonicalColorDocument {
  return {
    ...document,
    palette: document.palette.map(canonicalNamedSource),
    scales: document.scales.map(canonicalNamedSource),
    dataVisScales: document.dataVisScales.map((scale) =>
      scale.kind === "categorical"
        ? canonicalNamedSource(scale)
        : canonicalNamedSource(scale),
    ),
    surfaces: document.surfaces.map((surface) => {
      const named = canonicalNamedSource(surface);
      const { source, ...fields } = named;
      if (fields.sourceScaleId) return fields;
      if (source !== undefined && source !== "base")
        throw new Error(
          `Surface ${surface.id} needs a typed tint source reference.`,
        );
      return { ...fields, ...(source && { source }) };
    }),
  };
}

interface NamedSource {
  id: string;
  name: string;
  nameRef?: TaxonomyNameReference;
}

export function assertRegisteredSourceNames(
  sources: readonly NamedSource[],
  taxonomy: TaxonomyDocument,
  scope: TaxonomyScope,
) {
  const owners = new Map<string, string>();
  for (const source of sources) {
    if (!source.nameRef)
      throw new Error(`Source ${source.id} has no registered name reference.`);
    registeredSourceName(taxonomy, source.nameRef, scope);
    const name = source.nameRef.classification
      ? projectClassification(taxonomy, source.nameRef.classification, scope)
          .name
      : foundationNameSegment(
          registeredSourceName(taxonomy, source.nameRef, scope),
        );
    if (owners.has(name))
      throw new Error(
        `Serialized name collision "${name}" between sources ${owners.get(name)} and ${source.id}. Select distinct names.`,
      );
    owners.set(name, source.id);
  }
}

function reconcileName<T extends NamedSource>(
  previous: T | undefined,
  source: T,
  taxonomy: TaxonomyDocument,
  categoryId: string,
  scope: TaxonomyScope,
): { source: T; taxonomy: TaxonomyDocument } {
  let next = taxonomy;
  let reference = source.nameRef;
  if (!previous || !previous.nameRef) {
    next = registerTerm(next, categoryId, source.name, crypto.randomUUID());
    const term = next.terms.find(
      (term) =>
        term.categoryId === categoryId &&
        taxonomyValueKey(term.value) === taxonomyValueKey(source.name),
    );
    if (!term)
      throw new Error("A source name must resolve to a registered term.");
    reference = { categoryId, termId: term.id };
  } else if (
    reference &&
    (reference.termId !== previous.nameRef.termId ||
      reference.categoryId !== previous.nameRef.categoryId)
  ) {
    if (reference.categoryId !== categoryId)
      throw new Error("Select a term from this source's naming category.");
    registeredSourceName(next, reference, scope);
  } else {
    reference = previous.nameRef;
    if (source.name !== previous.name) {
      next = {
        ...next,
        terms: next.terms.map((term) =>
          term.id === reference!.termId
            ? { ...term, value: source.name.trim() }
            : term,
        ),
      };
      assertTaxonomy(next);
    }
  }
  if (!reference) throw new Error("Missing registered source name.");
  return {
    source: {
      ...source,
      nameRef: reference,
      name: registeredSourceName(next, reference, scope),
    },
    taxonomy: next,
  };
}

export function resolveColorSourceNames(
  document: ColorSystemDocument,
  taxonomy: TaxonomyDocument,
): ColorSystemDocument {
  const resolve = <T extends NamedSource>(source: T): T => {
    if (!source.nameRef)
      throw new Error(
        `Color source ${source.id} has no registered name reference.`,
      );
    return {
      ...source,
      name: registeredSourceName(taxonomy, source.nameRef, "colors"),
    };
  };
  const scales = document.scales.map(resolve);
  for (const sources of [
    document.palette,
    document.scales,
    document.surfaces,
    document.dataVisScales,
  ])
    assertRegisteredSourceNames(sources, taxonomy, "colors");
  return {
    ...document,
    palette: document.palette.map(resolve),
    scales,
    dataVisScales: document.dataVisScales.map(resolve),
    surfaces: document.surfaces.map((source) => {
      const named = resolve(source);
      if (!named.sourceScaleId) return named;
      const target = scales.find((scale) => scale.id === named.sourceScaleId);
      if (!target)
        throw new Error(
          `Surface ${source.id} references an unavailable color scale ${named.sourceScaleId}.`,
        );
      return { ...named, source: target.name };
    }),
  };
}

export function reconcileColorSourceNames(
  taxonomy: TaxonomyDocument,
  previous: ColorSystemDocument,
  document: ColorSystemDocument,
  rules: readonly Rule[] = [STANDARD_SCALE_NAMING_RULE],
) {
  let next = taxonomy;
  const reconcile = <T extends NamedSource>(
    before: T[],
    after: T[],
    categoryId: string,
  ): T[] =>
    after.map((source) => {
      const result = reconcileName(
        before.find((candidate) => candidate.id === source.id),
        source,
        next,
        categoryId,
        "colors",
      );
      next = result.taxonomy;
      return result.source;
    });
  const result = {
    ...document,
    palette: reconcile(
      previous.palette,
      document.palette,
      "b8fbee94-999d-4776-bf18-1b807b3f60b0",
    ),
    scales: reconcile(
      previous.scales,
      document.scales,
      "b8fbee94-999d-4776-bf18-1b807b3f60b0",
    ),
    dataVisScales: reconcile(
      previous.dataVisScales,
      document.dataVisScales,
      "b8fbee94-999d-4776-bf18-1b807b3f60b0",
    ),
    surfaces: reconcile(
      previous.surfaces,
      document.surfaces,
      "d8be9a69-fac3-495d-8be4-6a12311817a3",
    ),
  };
  for (let position = 0; position < document.contrasts.length; position++) {
    next = registerTerm(
      next,
      "fe55c281-7565-40c8-b9d1-3b5f1cfff917",
      contrastStepIndex(position),
      crypto.randomUUID(),
    );
  }
  for (const scale of document.scales) {
    scaleContrasts(document, scale).forEach((_, position) => {
      next = registerTerm(
        next,
        "fe55c281-7565-40c8-b9d1-3b5f1cfff917",
        contrastStepIndex(position, scale, rules),
        crypto.randomUUID(),
      );
    });
  }
  const numberCategory = next.categories.find(
    (category) => category.key === "number",
  );
  for (const scale of document.dataVisScales)
    if (scale.kind === "categorical") {
      if (!numberCategory)
        throw new Error(
          "Categorical colors require the existing Number category.",
        );
      scale.members.forEach((_, index) => {
        next = registerTerm(
          next,
          numberCategory.id,
          index + 1,
          crypto.randomUUID(),
        );
      });
    }
  assertColorGovernance(result, next, rules);
  return { taxonomy: next, document: resolveColorSourceNames(result, next) };
}

export function resolveDimensionSourceNames<T extends DimensionDocument>(
  document: T,
  taxonomy: TaxonomyDocument,
  scope: DimensionScope,
): T {
  assertRegisteredSourceNames(document.scales, taxonomy, scope);
  return {
    ...document,
    scales: document.scales.map((source) => {
      if (!source.nameRef)
        throw new Error(
          `${scope} source ${source.id} has no registered name reference.`,
        );
      return {
        ...source,
        name: registeredSourceName(taxonomy, source.nameRef, scope),
      };
    }),
  };
}

export function reconcileDimensionSourceNames<T extends DimensionDocument>(
  taxonomy: TaxonomyDocument,
  previous: T,
  document: T,
  scope: DimensionScope,
) {
  let next = taxonomy;
  const scales = document.scales.map((source) => {
    const before = previous.scales.find(
      (candidate) => candidate.id === source.id,
    );
    const result = reconcileName(
      before,
      source,
      next,
      "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
      scope,
    );
    next = result.taxonomy;
    if (
      result.source.nameRef &&
      (!before || source.nameRef?.termId !== before.nameRef?.termId)
    ) {
      const reference = result.source.nameRef;
      result.source = {
        ...result.source,
        nameRef: {
          ...reference,
          classification: before?.nameRef?.classification
            ? {
                ...before.nameRef.classification,
                [reference.categoryId]: reference.termId,
              }
            : dimensionNameClassification(scope, reference, next),
        },
      };
    }
    return result.source;
  });
  return {
    taxonomy: next,
    document: resolveDimensionSourceNames({ ...document, scales }, next, scope),
  };
}
