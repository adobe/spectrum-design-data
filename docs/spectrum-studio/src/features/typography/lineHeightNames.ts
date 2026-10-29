// Copyright 2026 Adobe. All rights reserved.
import type { TypographyDocument } from "./model";
import { typographyMetricIds } from "./model";
import {
  assertTaxonomy,
  registerTerm,
  taxonomyValueKey,
  type TaxonomyDocument,
} from "../taxonomy/model";
import {
  assertRegisteredSourceNames,
  registeredSourceName,
} from "../taxonomy/naming";
import { classificationFromValues } from "../taxonomy/orderedVocabulary";

export function lineHeightName(
  document: TypographyDocument,
  registry: TaxonomyDocument,
  id: string,
): string {
  const reference = document.metricNames[`${id}-lineHeight`];
  if (!reference) throw new Error("This line height has no registered name.");
  return registeredSourceName(registry, reference, "typography").replace(
    /-lineHeight$/,
    "",
  );
}

export function assertTypographyNames(
  document: TypographyDocument,
  registry: TaxonomyDocument,
) {
  assertRegisteredSourceNames(
    typographyMetricIds(document).map((id) => ({
      id,
      name: id,
      nameRef: document.metricNames[id],
    })),
    registry,
    "typography",
  );
}

export function withLineHeightName(
  document: TypographyDocument,
  registry: TaxonomyDocument,
  id: string,
  name: string,
) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a line height name.");
  const categoryId = registry.categories.find(
    (category) => category.key === "element",
  )?.id;
  if (!categoryId)
    throw new Error("Add the Element category before adding a line height.");
  let taxonomy = registry;
  const metricNames = { ...document.metricNames };
  const existing = metricNames[`${id}-lineHeight`];
  const unitless = metricNames[`${id}-unitlessLineHeight`];
  if (existing && unitless && existing.termId !== unitless.termId) {
    const terms = taxonomy.terms.map((term) =>
      term.id === existing.termId
        ? { ...term, value: `${trimmed}-lineHeight` }
        : term.id === unitless.termId
          ? { ...term, value: `${trimmed}-unitlessLineHeight` }
          : term,
    );
    taxonomy = { ...taxonomy, terms };
    assertTaxonomy(taxonomy);
    assertTypographyNames(document, taxonomy);
    return { document, taxonomy };
  }
  if (existing) {
    taxonomy = {
      ...taxonomy,
      terms: taxonomy.terms.map((term) =>
        term.id === existing.termId ? { ...term, value: trimmed } : term,
      ),
    };
  } else
    taxonomy = registerTerm(taxonomy, categoryId, trimmed, crypto.randomUUID());
  const element = taxonomy.terms.find(
    (term) =>
      term.id === existing?.termId ||
      (term.categoryId === categoryId &&
        taxonomyValueKey(term.value) === taxonomyValueKey(trimmed)),
  );
  if (!element)
    throw new Error("The line height name could not be registered.");
  for (const suffix of ["lineHeight", "unitlessLineHeight"] as const) {
    const key = `${id}-${suffix}` as const;
    metricNames[key] = {
      categoryId: element.categoryId,
      termId: element.id,
      classification: {
        [element.categoryId]: element.id,
        ...classificationFromValues(taxonomy, {
          property:
            suffix === "lineHeight" ? "Line height" : "Unitless line height",
        }),
      },
    };
  }
  const next = { ...document, metricNames };
  assertTaxonomy(taxonomy);
  assertTypographyNames(next, taxonomy);
  return { document: next, taxonomy };
}
