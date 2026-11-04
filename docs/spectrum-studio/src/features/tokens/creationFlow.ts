// Copyright 2026 Adobe. All rights reserved.
import {
  projectClassification,
  type Classification,
  type TaxonomyCategory,
  type TaxonomyDocument,
  type TaxonomyScope,
  type TaxonomyTerm,
} from "../taxonomy/model";
import type { BrowserTokenEdit, BrowserTokenEdits } from "./browserEditTypes";

export type NewTokenTier = "raw" | "purpose";
export type NewTokenType = NonNullable<
  NonNullable<BrowserTokenEdit["authoring"]>["manual"]
>["type"];
export const NEW_TOKEN_TYPES: readonly NewTokenType[] = [
  "colors",
  "spacing",
  "size",
  "radius",
  "opacity",
  "typography",
  "elevation",
];

export interface NewTokenAnswers {
  tier?: NewTokenTier;
  type?: NewTokenType;
  /** Category id to term id. Skipped categories are absent. */
  terms: Record<string, string>;
}

export interface NewTokenQuestion {
  category: TaxonomyCategory;
  terms: TaxonomyTerm[];
}

export type NewTokenStep =
  | { kind: "tier" }
  | { kind: "type" }
  | ({ kind: "category" } & NewTokenQuestion)
  | { kind: "review" };

export const classificationScopeFor = (
  tier: NewTokenTier,
  type: NewTokenType,
): TaxonomyScope => (tier === "purpose" ? "structures" : type);

/** Categories asked for this tier and type, in the taxonomy's name order. */
export function newTokenQuestions(
  taxonomy: TaxonomyDocument,
  tier: NewTokenTier,
  type: NewTokenType,
): NewTokenQuestion[] {
  const scope = classificationScopeFor(tier, type);
  return taxonomy.order.flatMap((id) => {
    const category = taxonomy.categories.find((item) => item.id === id);
    if (
      !category ||
      !category.scopes.includes(scope) ||
      ![tier, "both"].includes(category.appliesTo ?? "both")
    )
      return [];
    const terms = taxonomy.terms.filter((term) => term.categoryId === id);
    return terms.length ? [{ category, terms }] : [];
  });
}

export function newTokenSteps(
  taxonomy: TaxonomyDocument,
  answers: NewTokenAnswers,
): NewTokenStep[] {
  const steps: NewTokenStep[] = [{ kind: "tier" }, { kind: "type" }];
  if (answers.tier && answers.type)
    steps.push(
      ...newTokenQuestions(taxonomy, answers.tier, answers.type).map(
        (question) => ({ kind: "category" as const, ...question }),
      ),
    );
  steps.push({ kind: "review" });
  return steps;
}

export function newTokenClassification(
  taxonomy: TaxonomyDocument,
  answers: NewTokenAnswers,
): Classification {
  if (!answers.tier || !answers.type) return {};
  const asked = new Set(
    newTokenQuestions(taxonomy, answers.tier, answers.type).map(
      (question) => question.category.id,
    ),
  );
  return Object.fromEntries(
    Object.entries(answers.terms).filter(([id]) => asked.has(id)),
  );
}

export interface NewTokenPreview {
  name: string;
  issues: string[];
  duplicate?: { id: string; name: string };
}

export function newTokenPreview(
  taxonomy: TaxonomyDocument,
  answers: NewTokenAnswers,
  existing: readonly { id: string; name: string }[],
): NewTokenPreview {
  if (!answers.tier || !answers.type)
    return { name: "", issues: ["Choose a token kind and value type."] };
  const classification = newTokenClassification(taxonomy, answers);
  if (!Object.keys(classification).length)
    return { name: "", issues: ["Answer at least one question."] };
  const projection = projectClassification(
    taxonomy,
    classification,
    classificationScopeFor(answers.tier, answers.type),
  );
  const duplicate = projection.name
    ? existing.find((token) => token.name === projection.name)
    : undefined;
  return {
    name: projection.name,
    issues: projection.issues,
    ...(duplicate
      ? { duplicate: { id: duplicate.id, name: duplicate.name } }
      : {}),
  };
}

export const newTokenUnit = (type: NewTokenType): "px" | "" =>
  ["spacing", "size", "radius", "typography"].includes(type) ? "px" : "";

/** Adds an untargeted draft token; values are set afterwards in the Token Dialog. */
export function createNewTokenEdit(
  taxonomy: TaxonomyDocument,
  answers: NewTokenAnswers,
  edits: BrowserTokenEdits,
  existing: readonly { id: string; name: string }[],
  id: string = crypto.randomUUID(),
): BrowserTokenEdits {
  const preview = newTokenPreview(taxonomy, answers, existing);
  if (preview.duplicate)
    throw new Error(`${preview.duplicate.name} already exists.`);
  if (preview.issues.length) throw new Error(preview.issues.join(" "));
  if (edits[id] || existing.some((token) => token.id === id))
    throw new Error("This token identity already exists.");
  const type = answers.type!;
  return {
    ...edits,
    [id]: {
      values: {},
      authoring: {
        assignments: {},
        classification: newTokenClassification(taxonomy, answers),
        manual: {
          type,
          unit: newTokenUnit(type),
          groupId: `manual-${type}`,
          ...(answers.tier === "purpose"
            ? { scope: "structures" as const }
            : {}),
        },
      },
    },
  };
}
