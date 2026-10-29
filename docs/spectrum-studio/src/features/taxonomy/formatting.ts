// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomySegment, TaxonomyValue } from "./model";

export interface TaxonomyNameFormatter {
  formatValue: (value: TaxonomyValue) => string;
  separator: string;
}

export const kebabCaseNameFormatter: TaxonomyNameFormatter = {
  formatValue: (value) =>
    typeof value === "number"
      ? String(value)
          .replace(/^-/, "minus-")
          .replace("+", "plus-")
          .replace(".", "-")
      : value
          .trim()
          .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}-]+/gu, "-")
          .replace(/^-+|-+$/g, ""),
  separator: "-",
};

export function serializeTaxonomyPath(
  segments: readonly Pick<TaxonomySegment, "values">[],
  formatter: TaxonomyNameFormatter = kebabCaseNameFormatter,
): string {
  return segments
    .flatMap((segment) => segment.values.map(formatter.formatValue))
    .join(formatter.separator);
}

export function foundationNameSegment(value: string): string {
  const name = kebabCaseNameFormatter.formatValue(value);
  if (!name)
    throw new Error(
      "A foundation name must contain letters or numbers to generate a token name.",
    );
  return name;
}
