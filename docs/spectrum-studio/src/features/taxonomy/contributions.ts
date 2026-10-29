// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter, type WritableAtom } from "jotai";
import { taxonomyDocumentAtom } from "./state";
import {
  registerTerm,
  taxonomyValueKey,
  type TaxonomyDocument,
  type TaxonomyValue,
} from "./model";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";

export const taxonomyContributionsEnabledAtom = atom(true);
export interface TermContribution {
  sourceId?: string;
  field: string;
  value: TaxonomyValue;
}
export function contributeTerms(
  document: TaxonomyDocument,
  before: TermContribution[],
  after: TermContribution[],
): TaxonomyDocument {
  let next = document;
  const key = (item: TermContribution) =>
    JSON.stringify([
      item.sourceId ?? "",
      item.field,
      taxonomyValueKey(item.value),
    ]);
  const old = new Set(before.map(key));
  for (const item of after) {
    if (old.has(key(item))) continue;
    const category = document.categories.find(
      (category) => category.key === item.field,
    );
    if (!category)
      throw new Error(
        `Foundation contribution requires registered category ${item.field}.`,
      );
    next = registerTerm(next, category.id, item.value, crypto.randomUUID());
  }
  return next;
}
export function withTaxonomyContributions<T>(
  stored: WritableAtom<T, [T | ((previous: T) => T)], void>,
  evidence: (document: T) => TermContribution[],
  validate: (value: unknown) => value is T,
  sourceKey: string,
  naming?: {
    resolve: (document: T, taxonomy: TaxonomyDocument) => T;
    reconcile: (
      taxonomy: TaxonomyDocument,
      previous: T,
      next: T,
      get: Getter,
    ) => { document: T; taxonomy: TaxonomyDocument };
  },
) {
  return atom(
    (get) =>
      naming
        ? naming.resolve(get(stored), get(taxonomyDocumentAtom))
        : get(stored),
    (get, set, update: T | ((previous: T) => T)) => {
      const enabled = get(taxonomyContributionsEnabledAtom);
      const previous =
        naming && enabled
          ? naming.resolve(get(stored), get(taxonomyDocumentAtom))
          : get(stored);
      let next =
        typeof update === "function"
          ? (update as (previous: T) => T)(previous)
          : update;
      if (!validate(next))
        throw new Error(
          "Invalid foundation data cannot contribute terms or be persisted.",
        );
      if (enabled) {
        const named = naming?.reconcile(
          get(taxonomyDocumentAtom),
          previous,
          next,
          get,
        );
        if (named) next = named.document;
        const previousTaxonomy = named?.taxonomy ?? get(taxonomyDocumentAtom);
        const taxonomy = contributeTerms(
          previousTaxonomy,
          evidence(previous),
          evidence(next),
        );
        return withValidatedAuthoringUpdates(
          get,
          new Map<string, unknown>([
            [sourceKey, next],
            ["registry/taxonomy", taxonomy],
          ]),
          () => {
            if (taxonomy !== get(taxonomyDocumentAtom))
              set(taxonomyDocumentAtom, taxonomy);
            set(stored, next);
          },
        );
      }
      set(stored, next);
    },
  );
}
