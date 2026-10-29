// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyDocument } from "./model";
import { classificationStandard } from "./standardContract";
import type {
  StandardizationIssue,
  StandardizationOccurrence,
} from "./standardization";

export const CLASSIFICATION_REVIEW_LABEL = "Classification review needed";
export const CLASSIFICATION_REVIEW_CONTEXT =
  "This checks how tokens are named and organized against a proposed set of shared definitions. It is not a check of color values or proof that a token fails the published Spectrum design-data specification.";
export const ALIAS_REVIEW_MESSAGE =
  "This older token name is kept as an alias. The app has not yet confirmed how that name fits the proposed definitions. Review the alias and its source token; changing its value will not resolve this warning.";

function issueMessage(
  document: TaxonomyDocument,
  entry: StandardizationOccurrence,
  issue: StandardizationIssue,
): string {
  const category = document.categories.find(
    (item) => item.id === entry.categoryId,
  );
  const term = document.terms.find((item) => item.id === entry.termId);
  const facet = classificationStandard.facets.find((item) =>
    item.sourceKeys.includes(category?.key ?? ""),
  );
  const concept = classificationStandard.concepts.find(
    (item) => item.id === entry.targetId,
  );
  const location = category
    ? `Registry > Taxonomy > ${category.name}`
    : "Registry > Taxonomy";
  switch (issue.code) {
    case "facet-review": {
      if (!category || !facet)
        return `${issue.reason} Review the category in ${location}.`;
      const differences = [
        category.description.trim() !== facet.question
          ? `Category description: "${facet.question}"`
          : "",
        category.name.trim().toLowerCase() !== facet.name.trim().toLowerCase()
          ? `Category name: "${facet.name}"`
          : "",
        category.valueType !== facet.valueType
          ? `Value type: ${facet.valueType === "string" ? "Text" : "Number"}`
          : "",
      ].filter(Boolean);
      return `${category.name} does not match the proposed category definition. In ${location}, review these expected settings: ${differences.join("; ")}. Choose Edit and apply category changes only if they describe your intended use. Shared category changes affect every token using this category.`;
    }
    case "definition-review":
      return `"${String(term?.value ?? entry.value)}" has a different description from the proposed shared definition. In ${location}, review the term's Description${concept ? ` against: "${concept.definition}"` : ""}. Update it only if that meaning is correct. Changing this token's own Description will not resolve a shared definition warning.`;
    case "source-reference-review":
      return `${category?.name ?? "This category"} points to an authored source, such as a color scale. The app's proposed standard has not finalized how these source names should be recorded. Check that the token refers to the intended source. Full approval also needs a decision about the shared standard; renaming the color or changing its value will not resolve this warning.`;
    case "wrong-owner":
      return `${issue.reason} Review the term in ${location}. Its category or catalog assignment needs an agreed change, including the tokens that use it. Do not move or rename it just to clear the warning.`;
    case "retired-term":
      return `${issue.reason} Review what this term describes in ${location} and agree on its replacement before changing the tokens that use it.`;
    case "unreviewed-term":
      return `${issue.reason} In ${location}, document what the term means and where it should be used. The shared definition still needs review; adding a description alone does not approve it.`;
    case "unsupported-facet":
      return `${category?.name ?? "This category"} is not yet covered by the proposed definitions. Review its purpose, value type and intended uses in ${location}. The shared standard needs to cover it before this review can pass.`;
    case "multiple-terms":
      return `The proposed definitions allow one term per category, but this data allows or uses several. Review the assigned terms in ${location} and the tokens that use them before deciding which to keep. Do not delete terms just to clear the warning.`;
    case "missing-projection":
      return "The app does not have a complete category-and-term assignment for this token. Review its categories in token details and its foundation source. Use registered terms that describe it; do not guess from the token's name.";
    case "projection-review":
      return `The app could not confirm this token's category-and-term assignments. Details: ${issue.reason} Review the assignments in token details and the source definitions in Registry > Taxonomy. Keep existing names until their meaning is confirmed.`;
    case "measurement-review":
      return "This size token needs to state what it measures and which units it uses. For text, confirm that it is font size, not the width or height of rendered text. Review the typography source and its measurement information; changing the number alone will not resolve this warning.";
  }
}

export function classificationReviewMessages(
  document: TaxonomyDocument,
  entries: readonly StandardizationOccurrence[],
): string[] {
  return [
    ...new Set(
      entries.flatMap((entry) =>
        entry.issues.map((issue) => issueMessage(document, entry, issue)),
      ),
    ),
  ];
}
