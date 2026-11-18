// Copyright 2026 Adobe. All rights reserved.
import {
  resolveSourceClassification,
  withTaxonomyProjection,
  type Classification,
  type TaxonomyDocument,
  type TaxonomyScope,
} from "./model";
import type { ReferencedTaxonomySource } from "./referenceValidation";
import type { RuleConditionNode } from "../logic/model";
import { ELEMENT_CATEGORY_ID } from "../structures/elements";
import { STRUCTURE_CATEGORY_IDS } from "../structures/vocabulary";
import { leafElements } from "../structures/children";
import { termLabel } from "./termPresentation";

export interface RegistryReference {
  id: string;
  label: string;
  group: "Token uses" | "Authoring references";
  owner: string;
  href: string;
  foundation?: TaxonomyScope;
  designSection?: "concepts" | "structures";
  classification: Classification;
}

export function indexRegistryReferences(records: readonly RegistryReference[]) {
  const categories = new Map<string, RegistryReference[]>();
  const terms = new Map<string, RegistryReference[]>();
  for (const record of new Map(records.map((row) => [row.id, row])).values())
    for (const [categoryId, assignment] of Object.entries(
      record.classification,
    )) {
      categories.set(categoryId, [
        ...(categories.get(categoryId) ?? []),
        record,
      ]);
      for (const termId of new Set(
        Array.isArray(assignment) ? assignment : [assignment],
      ))
        terms.set(termId, [...(terms.get(termId) ?? []), record]);
    }
  return { categories, terms };
}
export type RegistryReferenceIndex = ReturnType<typeof indexRegistryReferences>;

export function registryReferences(
  document: TaxonomyDocument,
  source: ReferencedTaxonomySource,
): RegistryReferenceIndex {
  const records: RegistryReference[] = [];
  const tokens = new Set(source.tokens.map((item) => item.id));
  withTaxonomyProjection(document, () => {
    for (const item of source.sources) {
      const token = item.referenceKind === "token" || tokens.has(item.id);
      const kind = item.referenceKind;
      records.push({
        id: `${kind ?? "source"}:${item.id}`,
        label: item.name,
        group: token ? "Token uses" : "Authoring references",
        owner: token
          ? "Tokens"
          : kind === "foundation"
            ? "Foundations"
            : kind === "rule"
              ? "Logic"
              : "Structures",
        href: token
          ? "#tokens"
          : kind === "foundation"
            ? "#foundations"
            : kind === "rule"
              ? "#logic"
              : "#design",
        ...(!token &&
          kind !== "foundation" &&
          kind !== "rule" && { designSection: "structures" as const }),
        ...(kind === "foundation" && { foundation: item.scope }),
        classification: resolveSourceClassification(
          document,
          item.id,
          item.evidence,
          item.scope,
          item.context,
          item.tier,
        ).classification,
      });
    }
  });
  const add = (
    id: string,
    label: string,
    owner: string,
    href: string,
    classification: Classification,
    designSection?: RegistryReference["designSection"],
  ) =>
    records.push({
      id,
      label,
      owner,
      href,
      classification,
      designSection,
      group: "Authoring references",
    });
  for (const structure of source.snapshot.structures?.structures ?? [])
    for (const element of leafElements(structure))
      add(
        `element:${structure.conceptId}:${element.id}`,
        `${structure.name} template element`,
        "Structures",
        "#design",
        {
          [ELEMENT_CATEGORY_ID]: element.termId,
          ...(element.orientation && {
            [STRUCTURE_CATEGORY_IDS.axis]: element.orientation,
          }),
        },
        "structures",
      );
  for (const component of source.snapshot.components?.components ?? [])
    for (const row of component.assignments)
      add(
        `component:${component.id}:${row.id}`,
        `${component.declaration.displayName} property assignment`,
        "Components",
        "#components",
        {
          [row.property.categoryId]: row.property.termId,
        },
      );
  for (const recipe of source.snapshot.styles?.recipes ?? []) {
    const label = termLabel(
      document.terms.find((term) => term.id === recipe.name.termId)?.value ??
        recipe.kind,
    );
    add(
      `style-name:${recipe.id}`,
      `${label} name`,
      "Styles",
      "#design",
      {
        [recipe.name.categoryId]: recipe.name.termId,
        ...recipe.name.classification,
      },
      "concepts",
    );
    add(
      `style:${recipe.id}`,
      label,
      "Styles",
      "#design",
      recipe.classification,
      "concepts",
    );
    for (const property of recipe.options) {
      if (property.kind !== "variant") continue;
      add(
        `style-property:${recipe.id}:${property.id}`,
        `${label} ${property.name}`,
        "Styles",
        "#design",
        property.classification,
        "concepts",
      );
      for (const option of property.options)
        add(
          `style-option:${recipe.id}:${property.id}:${option.id}`,
          `${label} ${option.name}`,
          "Styles",
          "#design",
          option.classification,
          "concepts",
        );
    }
  }
  for (const role of source.snapshot.styles?.colorRoles ?? []) {
    const term = document.terms.find((entry) => entry.id === role.roleTermId);
    if (term)
      add(
        `style-color-role:${role.id}`,
        termLabel(term.value),
        "Styles",
        "#design",
        { [term.categoryId]: term.id },
        "concepts",
      );
  }
  function condition(node: RuleConditionNode, ruleId: string, name: string) {
    if (node.kind === "group")
      node.children.forEach((child) => condition(child, ruleId, name));
    else if (node.source === "taxonomy")
      add(`condition:${ruleId}:${node.id}`, name, "Logic", "#logic", {
        [node.sourceId]: node.valueId,
      });
  }
  for (const rule of source.snapshot.rules ?? []) {
    if (rule.type !== "conditional") continue;
    condition(rule.when, rule.id, rule.name);
    rule.branches.forEach((branch) =>
      condition(branch.when, rule.id, rule.name),
    );
    for (const output of rule.outputs ?? [])
      add(
        `rule-output:${rule.id}:${output.id}`,
        rule.name,
        "Logic",
        "#logic",
        output.classification,
      );
  }
  return indexRegistryReferences(records);
}
