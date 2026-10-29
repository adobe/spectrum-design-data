// Copyright 2026 Adobe. All rights reserved.
import {
  assertTaxonomy,
  projectClassification,
  taxonomyValueKey,
  type Classification,
  type TaxonomyCategory,
  type TaxonomyDocument,
  type TaxonomyScope,
  type TaxonomyTerm,
  type TaxonomyValue,
} from "./model";
import { taxonomyValueIssue } from "./valueDomains";
import {
  assertClassificationStandard,
  classificationStandard,
  type ClassificationStandard,
} from "./standardContract";
import type { NominalFontSizeMeasurement } from "../tokens/browserModel";

export type StandardizationCode =
  | "unreviewed-term"
  | "definition-review"
  | "wrong-owner"
  | "retired-term"
  | "source-reference-review"
  | "unsupported-facet"
  | "facet-review"
  | "multiple-terms"
  | "missing-projection"
  | "projection-review"
  | "measurement-review";
export interface StandardizationIssue {
  code: StandardizationCode;
  reason: string;
  fix: string;
  owner: "joint";
  gapId: "LTAX-011";
}
export interface StandardizationOccurrence {
  id: string;
  recordId: string;
  recordKind:
    | "category-definition"
    | "term-definition"
    | "stored-assignment"
    | "token-usage"
    | "alias-usage";
  pointer: string;
  status: "standard" | "non-standard";
  fixRequired: boolean;
  categoryId?: string;
  termId?: string;
  value?: TaxonomyValue;
  targetId?: string;
  issues: StandardizationIssue[];
}
export interface StandardizationUsage {
  id: string;
  recordKind?: "token-usage" | "alias-usage";
  classification?: Classification;
  projectionIssues?: readonly string[];
  measurement?: NominalFontSizeMeasurement;
  scope?: TaxonomyScope | "motion";
}
export interface ClassificationAssessment {
  schemaVersion: 1;
  profileId: ClassificationStandard["profileId"];
  adoption: "proposed";
  gapId: "LTAX-011";
  reference: ClassificationStandard["reference"];
  completeStandardConformance: boolean;
  counts: { occurrences: number; standard: number; nonStandard: number };
  occurrences: StandardizationOccurrence[];
  limitations: string[];
}

export const COMPATIBILITY_ALIAS_REVIEW =
  "This retained compatibility alias name has no reviewed binding to the proposed classification standard.";

const pointerSegment = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");
const problem = (
  code: StandardizationCode,
  reason: string,
  fix: string,
): StandardizationIssue => ({
  code,
  reason,
  fix,
  owner: "joint",
  gapId: "LTAX-011",
});

export function assessTaxonomyCategory(
  category: TaxonomyCategory,
  standard: ClassificationStandard = classificationStandard,
): StandardizationIssue[] {
  const facet = standard.facets.find((entry) =>
    entry.sourceKeys.includes(category.key),
  );
  const issues: StandardizationIssue[] = [];
  if (!facet)
    issues.push(
      problem(
        "unsupported-facet",
        `${category.name} has no reviewed applicability contract in this proposed profile.`,
        "Review the category question, value type and allowed records.",
      ),
    );
  else {
    if (facet.review === "provisional")
      issues.push(
        problem(
          "source-reference-review",
          `${facet.name} source-reference ownership remains provisional.`,
          "Review the source identity, name ownership and explicit reference binding.",
        ),
      );
    if (category.description.trim() !== facet.question)
      issues.push(
        problem(
          "facet-review",
          `${category.name} does not bind the shared category question.`,
          `Review its applicability and explicitly use this question: ${facet.question}`,
        ),
      );
    if (category.valueType !== facet.valueType)
      issues.push(
        problem(
          "facet-review",
          `${facet.name} requires ${facet.valueType} values.`,
          "Use an explicit typed migration without changing existing value types silently.",
        ),
      );
    if (taxonomyValueKey(category.name) !== taxonomyValueKey(facet.name))
      issues.push(
        problem(
          "facet-review",
          `The saved category label is ${category.name}; the proposed category is ${facet.name}.`,
          `Review and rename the category to ${facet.name}, preserving its field key and references.`,
        ),
      );
  }
  if (category.cardinality !== "one")
    issues.push(
      problem(
        "multiple-terms",
        "The standard requires one assigned term per category.",
        "Retain the imported representation as non-standard until its conditions and migration are reviewed.",
      ),
    );
  return issues;
}

export function assessTaxonomyTerm(
  category: TaxonomyCategory,
  term: TaxonomyTerm,
  standard: ClassificationStandard = classificationStandard,
): { targetId?: string; issues: StandardizationIssue[] } {
  const value = taxonomyValueKey(term.value);
  const facet = standard.facets.find((entry) =>
    entry.sourceKeys.includes(category.key),
  );
  const component = standard.components.find(
    (entry) => taxonomyValueKey(entry.name) === value,
  );
  if (component)
    return {
      targetId: component.id,
      issues: [
        problem(
          "wrong-owner",
          `${term.value} belongs to the shared component catalog, not an Element or a copied taxonomy definition.`,
          "Bind the component catalog identity and its abstract Element references through an explicit versioned migration.",
        ),
      ],
    };
  const retired = standard.retired.find(
    (entry) => taxonomyValueKey(entry.value) === value,
  );
  if (retired)
    return {
      issues: [
        problem(
          "retired-term",
          retired.reason,
          "Define the actual target and measurement; preserve the original instance as non-standard until reviewed.",
        ),
      ],
    };
  if (standard.sourceReferenceKeys.includes(category.key))
    return {
      issues: [
        problem(
          "source-reference-review",
          `${category.name} identifies an authored source, not meaning inferred from its label. Source-reference conformance remains provisional.`,
          "Verify the source identity/binding and ownership; review the reference category without parsing the name.",
        ),
      ],
    };
  if (!facet)
    return {
      issues: [
        problem(
          "unsupported-facet",
          `${category.name} has no reviewed applicability contract in this proposed profile.`,
          "Review the facet question, definition and allowed record kinds before claiming standard conformance.",
        ),
      ],
    };
  if (typeof term.value === "number") {
    const issue = taxonomyValueIssue(category, term.value);
    if (!issue && ["scaleIndex", "number"].includes(facet.key))
      return { targetId: `${facet.key}:${term.value}`, issues: [] };
    return {
      issues: [
        problem(
          "unreviewed-term",
          issue ?? "This numeric value has no reviewed category domain.",
          "Retain its numeric type and review the category domain.",
        ),
      ],
    };
  }
  const concept = standard.concepts.find(
    (entry) => taxonomyValueKey(entry.value) === value,
  );
  if (!concept)
    return {
      issues: [
        problem(
          "unreviewed-term",
          `${term.value} has no reviewed standard definition.`,
          "Define and review its meaning, owner and applicability; an edited description alone does not establish adoption.",
        ),
      ],
    };
  if (concept.facet !== facet.key)
    return {
      targetId: concept.id,
      issues: [
        problem(
          "wrong-owner",
          `${term.value} belongs to ${concept.facet}, not ${category.name}.`,
          "Explicitly remap every dependent reference before retiring the old owner.",
        ),
      ],
    };
  const issues =
    term.description.trim() === concept.definition
      ? []
      : [
          problem(
            "definition-review",
            `"${term.value}" has a reviewed shared meaning, but this record does not bind its definition. Matching words alone are not proof.`,
            "Review the shared definition and applicability, then explicitly use that definition or propose a reviewed binding.",
          ),
        ];
  return { targetId: concept.id, issues };
}

export function standardCategoryName(
  category: Pick<TaxonomyCategory, "key" | "name">,
): string {
  return category.key === "visibility" && category.name === "Visibility"
    ? "Prominence"
    : category.name;
}

export function assessClassificationStandard(
  document: TaxonomyDocument,
  usages: readonly StandardizationUsage[] = [],
  standard: ClassificationStandard = classificationStandard,
): ClassificationAssessment {
  assertTaxonomy(document);
  assertClassificationStandard(standard);
  const occurrences: StandardizationOccurrence[] = [];
  const terms = new Map<
    string,
    { term: TaxonomyTerm; review: ReturnType<typeof assessTaxonomyTerm> }
  >();
  const categoryReviews = new Map<string, StandardizationIssue[]>();
  for (const [index, category] of document.categories.entries()) {
    const issues = assessTaxonomyCategory(category, standard);
    categoryReviews.set(category.id, issues);
    occurrences.push({
      id: `category:${category.id}`,
      recordId: category.id,
      recordKind: "category-definition",
      pointer: `/categories/${index}`,
      categoryId: category.id,
      status: issues.length ? "non-standard" : "standard",
      fixRequired: issues.length > 0,
      issues,
    });
  }
  for (const [index, term] of document.terms.entries()) {
    const category = document.categories.find(
      (entry) => entry.id === term.categoryId,
    );
    if (!category)
      throw new Error(
        `Unresolved classification category: ${term.categoryId}.`,
      );
    const termReview = assessTaxonomyTerm(category, term, standard);
    const review = {
      ...termReview,
      issues: [
        ...(categoryReviews.get(category.id) ?? []),
        ...termReview.issues,
      ],
    };
    terms.set(term.id, { term, review });
    occurrences.push({
      id: `term:${term.id}`,
      recordId: term.id,
      recordKind: "term-definition",
      pointer: `/terms/${index}`,
      categoryId: term.categoryId,
      termId: term.id,
      value: term.value,
      status: review.issues.length ? "non-standard" : "standard",
      fixRequired: review.issues.length > 0,
      targetId: review.targetId,
      issues: review.issues,
    });
  }
  function assignments(
    recordId: string,
    classification: Classification,
    pointer: string,
    occurrenceId: string,
    recordKind: "stored-assignment" | "token-usage" | "alias-usage",
  ) {
    for (const [categoryId, assignment] of Object.entries(classification)) {
      const ids = Array.isArray(assignment) ? assignment : [assignment];
      for (const [index, termId] of ids.entries()) {
        const reviewed = terms.get(termId);
        if (!reviewed || reviewed.term.categoryId !== categoryId)
          throw new Error(
            `${recordId}: unresolved classification reference ${termId}.`,
          );
        const issues = [...reviewed.review.issues];
        if (Array.isArray(assignment))
          issues.push(
            problem(
              "multiple-terms",
              "The proposed standard permits one assigned term per category; preserve this array for review.",
              "Review the original conditions and representation without dropping array members or broadening cardinality.",
            ),
          );
        occurrences.push({
          id: `${occurrenceId}:${pointerSegment(categoryId)}:${index}`,
          recordId,
          recordKind,
          pointer: `${pointer}/${pointerSegment(categoryId)}${Array.isArray(assignment) ? `/${index}` : ""}`,
          categoryId,
          termId,
          value: reviewed.term.value,
          targetId: reviewed.review.targetId,
          status: issues.length ? "non-standard" : "standard",
          fixRequired: issues.length > 0,
          issues,
        });
      }
    }
  }
  for (const [id, classification] of Object.entries(document.classifications))
    assignments(
      id,
      classification,
      `/classifications/${pointerSegment(id)}`,
      `stored:${pointerSegment(id)}`,
      "stored-assignment",
    );
  const usageIds = new Set<string>();
  for (const [index, usage] of usages.entries()) {
    if (!usage.id.trim() || usageIds.has(usage.id))
      throw new Error(
        `Missing or duplicate classification usage identity: ${usage.id}.`,
      );
    usageIds.add(usage.id);
    const recordKind = usage.recordKind ?? "token-usage";
    if (usage.classification)
      assignments(
        usage.id,
        usage.classification,
        `/usages/${index}/classification`,
        `usage:${index}`,
        recordKind,
      );
    const projectionIssues = [
      ...(usage.projectionIssues ?? []),
      ...(recordKind === "alias-usage" ? [COMPATIBILITY_ALIAS_REVIEW] : []),
      ...(usage.classification && usage.scope && usage.scope !== "motion"
        ? projectClassification(document, usage.classification, usage.scope)
            .issues
        : []),
      ...(usage.scope === "motion"
        ? ["Motion has no reviewed native classification profile."]
        : []),
      ...(usage.scope
        ? []
        : ["The record's applicability scope has not been declared."]),
    ];
    if (
      !usage.classification ||
      !Object.keys(usage.classification).length ||
      projectionIssues.length
    ) {
      const issue =
        !usage.classification || !Object.keys(usage.classification).length
          ? problem(
              "missing-projection",
              "This output has no complete explicit classification.",
              "Supply a reviewed projection or declare and assess its separate record profile.",
            )
          : problem(
              "projection-review",
              [...new Set(projectionIssues)].join(" "),
              "Repair the explicit projection and applicability without inventing classifications from serialized names.",
            );
      occurrences.push({
        id: `usage:${index}:projection`,
        recordId: usage.id,
        recordKind,
        pointer: `/usages/${index}`,
        status: "non-standard",
        fixRequired: true,
        issues: [issue],
      });
    }
    const targetIds = Object.values(usage.classification ?? {})
      .flatMap((assignment) =>
        Array.isArray(assignment) ? assignment : [assignment],
      )
      .map((id) => terms.get(id)?.review.targetId);
    if (
      targetIds.includes("property:size") &&
      (!targetIds.includes("element:text") ||
        !usage.measurement?.reference.trim())
    ) {
      occurrences.push({
        id: `usage:${index}:measurement`,
        recordId: usage.id,
        recordKind,
        pointer: `/usages/${index}`,
        status: "non-standard",
        fixRequired: true,
        issues: [
          problem(
            "measurement-review",
            "Nominal Size needs an explicit target, font-size metric and units; measured Width or Height are different quantities.",
            "Supply Text with a nominal-font-size measurement reference and units, or review the separate nominal target contract.",
          ),
        ],
      });
    }
  }
  const nonStandard = occurrences.filter(
    (entry) => entry.status === "non-standard",
  ).length;
  return {
    schemaVersion: 1,
    profileId: standard.profileId,
    adoption: standard.adoption,
    gapId: standard.gapId,
    reference: structuredClone(standard.reference),
    completeStandardConformance: occurrences.length > 0 && nonStandard === 0,
    counts: {
      occurrences: occurrences.length,
      standard: occurrences.length - nonStandard,
      nonStandard,
    },
    occurrences,
    limitations: [
      ...standard.limitations,
      "This assessment is source/occurrence evidence, not canonical token or saved mode-value accounting.",
    ],
  };
}

export function assertStandardClassification(
  assessment: ClassificationAssessment,
): void {
  if (!assessment.completeStandardConformance) {
    const affected = assessment.occurrences.filter(
      (entry) => entry.fixRequired,
    );
    throw new Error(
      `Standard-compliant export blocked: ${affected.length.toLocaleString("en")} classification entries need review against the app's proposed definitions.${assessment.counts.occurrences ? "" : " An empty assessment does not establish conformance."} This is not a color-value check. Open a flagged token for reasons and next steps, or open Registry > Taxonomy > Migration review for the affected entries. Export taxonomy compatibility packet keeps your data and includes the full review without clearing warnings.`,
    );
  }
}

export function classificationAssessmentMarkdown(
  assessment: ClassificationAssessment,
): string {
  const escape = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "# Classification standard review",
    "",
    `Profile: ${assessment.profileId}. Adoption: proposed, not upstream accepted.`,
    `Reference: ${assessment.reference.repository} @ ${assessment.reference.revision}. Gap: ${assessment.gapId}.`,
    `Occurrences: ${assessment.counts.occurrences}. Standard: ${assessment.counts.standard}. Non-standard: ${assessment.counts.nonStandard}.`,
    "Non-standard data remains editable/saveable with warnings; standard-compliant export is blocked until fixed.",
    "",
    "| Record | Location | Status | Meaning or required fix |",
    "| --- | --- | --- | --- |",
    ...assessment.occurrences.map(
      (entry) =>
        `| ${escape(entry.recordId)} | ${escape(entry.pointer)} | ${entry.status}${entry.fixRequired ? ": needs a fix" : ""} | ${escape(entry.issues.map((issue) => `${issue.reason} ${issue.fix}`).join(" ") || (entry.targetId ? `Shared definition ${entry.targetId}` : "Shared category question and source binding."))} |`,
    ),
    "",
    ...assessment.limitations.map((limitation) => `- ${limitation}`),
  ].join("\n");
}
