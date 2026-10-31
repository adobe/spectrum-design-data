// Copyright 2026 Adobe. All rights reserved.
import {
  SIZE_TERM_IDS,
  SIZE_TERMS,
  sizeFromTerm,
} from "../taxonomy/variantVocabulary";
import type { TaxonomyDocument } from "../taxonomy/model";
import { foundationNameSegment } from "../taxonomy/formatting";
import type { TshirtSizingRule } from "./model";

/** Legacy keys stay stable in generated artifacts; new options use Registry UUIDs. */
export function generatorSizeKey(termId: string): string {
  return sizeFromTerm(termId) ?? termId;
}
export function generatorTermId(size: string): string {
  return (
    Object.entries(SIZE_TERM_IDS).find(([key]) => key === size)?.[1] ?? size
  );
}
export function generatorDefault(rule: TshirtSizingRule): string {
  return rule.defaultTermId ?? SIZE_TERM_IDS.m;
}
export function generatorOutputName(
  termId: string,
  taxonomy: TaxonomyDocument,
): string {
  const term = taxonomy.terms.find((item) => item.id === termId);
  if (!term)
    throw new Error("The Size option is no longer available in the Registry.");
  const shipped = SIZE_TERMS.find((item) => item.id === termId);
  return shipped && term.value === shipped.value
    ? generatorSizeKey(termId)
    : foundationNameSegment(String(term.value));
}
export function rebaseGenerator(
  rule: TshirtSizingRule,
  termId: string,
): TshirtSizingRule {
  const selected = rule.mappings.find((mapping) => mapping.termId === termId);
  if (!selected) throw new Error("Choose an existing option as the default.");
  const mappings = rule.mappings.map((mapping) => ({
    ...mapping,
    offset: mapping.offset - selected.offset,
  }));
  if (mappings.some((mapping) => !Number.isSafeInteger(mapping.offset)))
    throw new Error("The rebased offsets exceed the supported integer range.");
  return { ...rule, defaultTermId: termId, mappings };
}
