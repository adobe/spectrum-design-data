// Copyright 2026 Adobe. All rights reserved.
import type { ChangeField } from "../changelog/changes";
import type { TaxonomyDocument } from "./model";
export function taxonomyFields(
  document: TaxonomyDocument,
): Map<string, string> {
  return new Map([
    ["Global category order", JSON.stringify(document.order)],
    ...document.categories.map((category): [string, string] => [
      `Category ${category.id}`,
      JSON.stringify(category),
    ]),
    ...document.terms.map((term): [string, string] => [
      `Term ${term.id}`,
      JSON.stringify(term),
    ]),
    ...Object.entries(document.classifications).map(
      ([id, classification]): [string, string] => [
        `Classification ${id}`,
        JSON.stringify(classification),
      ],
    ),
  ]);
}
export function taxonomyChangeFields(
  before: TaxonomyDocument,
  after: TaxonomyDocument,
): ChangeField[] {
  const left = taxonomyFields(before),
    right = taxonomyFields(after);
  return [...new Set([...left.keys(), ...right.keys()])].flatMap((key) =>
    left.get(key) === right.get(key)
      ? []
      : [
          {
            key,
            before: left.get(key),
            after: right.get(key),
          },
        ],
  );
}
