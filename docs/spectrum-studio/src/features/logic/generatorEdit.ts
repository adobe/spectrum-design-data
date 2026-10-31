// Copyright 2026 Adobe. All rights reserved.
import {
  assertTaxonomy,
  normalizeTaxonomyTerms,
  type TaxonomyDocument,
  type TaxonomyTerm,
} from "../taxonomy/model";
import { VARIANT_CATEGORY_IDS } from "../taxonomy/variantVocabulary";
import {
  assertStructureTaxonomy,
  structureGeneration,
  type StructuresDocument,
} from "../structures/model";
import { isRule, type TshirtSizingRule } from "./model";
import type { TshirtArtifactBundle } from "../design-data/tshirtTypes";
import type { ComponentsDocument } from "../components/model";
import { canonicalJson } from "../design-data/canonicalJson";

export interface GeneratorEdit {
  terms: TaxonomyTerm[];
  replacements: Record<string, string>;
}
export const emptyGeneratorEdit = (): GeneratorEdit => ({
  terms: [],
  replacements: {},
});

export function prepareGeneratorEdit(
  rule: TshirtSizingRule,
  edit: GeneratorEdit,
  taxonomy: TaxonomyDocument,
  structures: StructuresDocument,
) {
  if (!isRule(rule))
    throw new Error("Review the Generator options and supported token types.");
  const ids = new Set(edit.terms.map((term) => term.id));
  if (ids.size !== edit.terms.length)
    throw new Error("A Size term cannot have multiple edits.");
  if (
    edit.terms.some(
      (term) =>
        term.categoryId !== VARIANT_CATEGORY_IDS.size ||
        taxonomy.terms.some(
          (existing) =>
            existing.id === term.id && existing.categoryId !== term.categoryId,
        ),
    )
  )
    throw new Error("Generator options must use Registry Size terms.");
  const nextTaxonomy = normalizeTaxonomyTerms({
    ...taxonomy,
    terms: [
      ...taxonomy.terms.map(
        (term) => edit.terms.find((draft) => draft.id === term.id) ?? term,
      ),
      ...edit.terms.filter(
        (term) => !taxonomy.terms.some((existing) => existing.id === term.id),
      ),
    ],
  });
  assertTaxonomy(nextTaxonomy);
  const allowed = new Set(rule.mappings.map((mapping) => mapping.termId));
  if (
    rule.mappings.some(
      (mapping) =>
        !nextTaxonomy.terms.some(
          (term) =>
            term.id === mapping.termId &&
            term.categoryId === VARIANT_CATEGORY_IDS.size,
        ),
    )
  )
    throw new Error("Choose or create a Registry Size term for every option.");
  const nextStructures = {
    ...structures,
    structures: structures.structures.map((structure) => {
      const generation = structureGeneration(structure);
      if (
        !generation.applications.some(
          (application) => application.ruleId === rule.id,
        )
      )
        return structure;
      const sizeTermIds = generation.sizeTermIds.map((id) => {
        if (allowed.has(id)) return id;
        const replacement = edit.replacements[id];
        if (!replacement || !allowed.has(replacement))
          throw new Error(
            `${structure.name}: choose a replacement for the removed Size option.`,
          );
        return replacement;
      });
      return {
        ...structure,
        generation: { ...generation, sizeTermIds: [...new Set(sizeTermIds)] },
      };
    }),
  };
  assertStructureTaxonomy(nextStructures, nextTaxonomy);
  return { taxonomy: nextTaxonomy, structures: nextStructures };
}

export function replaceGeneratorComponentTargets(
  components: ComponentsDocument,
  before: TshirtArtifactBundle,
  after: TshirtArtifactBundle,
  replacements: Record<string, string>,
): ComponentsDocument {
  const rows = new Map(after.semantics.map((row) => [row.token.uuid, row]));
  const targets = new Map<string, string>();
  for (const row of before.semantics) {
    if (rows.has(row.token.uuid)) continue;
    const term = row.classification[VARIANT_CATEGORY_IDS.size];
    if (typeof term !== "string" || !replacements[term]) continue;
    const classification = {
      ...row.classification,
      [VARIANT_CATEGORY_IDS.size]: replacements[term],
    };
    const replacement = after.semantics.find(
      (candidate) =>
        candidate.structureId === row.structureId &&
        candidate.optionId === row.optionId &&
        canonicalJson(candidate.context) === canonicalJson(row.context) &&
        canonicalJson(candidate.classification) ===
          canonicalJson(classification),
    );
    if (replacement) targets.set(row.token.uuid, replacement.token.uuid);
  }
  return {
    ...components,
    components: components.components.map((component) => ({
      ...component,
      assignments: component.assignments.map((assignment) =>
        assignment.$ref && targets.has(assignment.$ref)
          ? { ...assignment, $ref: targets.get(assignment.$ref)! }
          : assignment,
      ),
    })),
  };
}
