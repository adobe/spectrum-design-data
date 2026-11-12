// Copyright 2026 Adobe. All rights reserved.
import {
  projectClassification,
  withTaxonomyProjection,
  type Classification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import {
  mergeClassifications,
  hasVariantTokenNaming,
} from "../option-groups/model";
import {
  conditionSources,
  evaluateConditionalRule,
  offsetAvailableToken,
} from "../logic/conditional";
import { ruleAppliesTo } from "../logic/applicability";
import type { Rule } from "../logic/model";
import type { ModeSet } from "../modes/model";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { PREVIEW_TERM_IDS } from "../tokens/valuePreview";
import { ORDERED_CATEGORY_IDS } from "../taxonomy/orderedVocabulary";
import { concreteColor } from "../color-system/data-vis/colors";
import { serializeOutputColor } from "../color-system/outputSerialization";
import type { ColorOutputSettings } from "../color-system/outputSettings";
import {
  STYLE_PROPERTIES,
  type StyleAppearance,
  type StyleColor,
  type StyleProperty,
  type StylePublication,
  type StyleRecipe,
  type StylesDocument,
} from "./model";

export interface StyleReference {
  id: string;
  browserId?: string;
  uuid: string;
  familyId: string;
  index?: number;
  metricId?: string;
  property: StyleProperty;
  name: string;
  value: string | number;
  unit?: string;
  classification?: Classification;
}
export interface StyleContext {
  colorOutput?: ColorOutputSettings;
  selection: Record<string, string>;
  modes: Record<string, string | number>;
  references: StyleReference[];
}
export interface StyleRow {
  conceptId: string;
  recipeId: string;
  key: string;
  name: string;
  classification: Classification;
  property: StyleProperty;
  value: string | number;
  unit: string;
  optionIds: string[];
  familyId?: string;
  outputId?: string;
  referenceId?: string;
  scaleIndex?: number;
  metricId?: string;
  context: Record<string, string | number>;
  modeKey: string;
  token: { uuid: string; name: Record<string, string | number> } & (
    | { $ref: string; value?: never }
    | { value: string | number; $ref?: never }
  );
}
export interface StyleIssue {
  recipeId: string;
  message: string;
}
export interface StyleArtifacts {
  rows: StyleRow[];
  issues: StyleIssue[];
}
function publicationIndex(publications: readonly StylePublication[]) {
  const index = new Map<string, Map<string, StylePublication>>();
  for (const publication of publications) {
    let recipe = index.get(publication.recipeId);
    if (!recipe) {
      recipe = new Map();
      index.set(publication.recipeId, recipe);
    }
    if (!recipe.has(publication.key)) recipe.set(publication.key, publication);
  }
  return index;
}
const propertyValues: Record<StyleProperty, string[]> = {
  color: ["color"],
  fontFamily: ["font-family", "font family"],
  fontWeight: ["font-weight", "font weight"],
  lineHeight: ["unitless line height", "line-height", "line height"],
  borderWidth: ["thickness", "border-width", "width"],
};
export function styleColorIndex(
  color: Extract<StyleColor, { kind: "families" }>,
  selection: Record<string, string>,
) {
  const modes = color.indexModes;
  const modeId = modes && selection[modes.modeSetId];
  return modes && modeId && Object.hasOwn(modes.values, modeId)
    ? modes.values[modeId]
    : color.scaleIndex;
}
function literalValue(
  property: StyleProperty,
  value: string | number,
  settings?: ColorOutputSettings,
) {
  if (property === "color") {
    const color = concreteColor(String(value));
    return settings ? serializeOutputColor(color, settings) : String(value);
  }
  if (property === "fontFamily" && (typeof value !== "string" || !value.trim()))
    throw new Error("Enter a font-family name.");
  if (
    property === "fontWeight" &&
    !(
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 1000
    ) &&
    !["normal", "bold"].includes(String(value))
  )
    throw new Error("Enter a font weight from 1 to 1000, normal or bold.");
  if (
    property === "borderWidth" &&
    !(typeof value === "number" && Number.isFinite(value) && value >= 0) &&
    !/^(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em)$/.test(String(value))
  )
    throw new Error("Enter a non-negative border width in px, rem or em.");
  return value;
}
export function styleName(recipe: StyleRecipe, taxonomy: TaxonomyDocument) {
  const term = taxonomy.terms.find(
    (term) =>
      term.id === recipe.name.termId &&
      term.categoryId === recipe.name.categoryId,
  );
  return term ? String(term.value) : "Unavailable style name";
}
export function styleVariants(recipe: StyleRecipe) {
  return recipe.options.reduce<
    {
      optionIds: string[];
      appearance: StyleAppearance;
      classification: Classification;
      publish: boolean;
      issues: string[];
    }[]
  >(
    (rows, property) =>
      property.kind === "boolean"
        ? rows
        : rows.flatMap((row) =>
            property.options.map((option) => {
              const merged = mergeClassifications(
                row.classification,
                property.classification,
                option.classification,
              );
              return {
                optionIds: [...row.optionIds, option.id],
                appearance: {
                  ...row.appearance,
                  ...recipe.differences[option.id],
                },
                classification: merged.classification,
                publish:
                  row.publish &&
                  (option.id === property.defaultOptionId ||
                    hasVariantTokenNaming(property, option)),
                issues: [...row.issues, ...merged.issues],
              };
            }),
          ),
    [
      {
        optionIds: [],
        appearance: recipe.appearance,
        classification: recipe.classification,
        publish: true,
        issues: [],
      },
    ],
  );
}
function typeClassification(recipe: StyleRecipe, taxonomy: TaxonomyDocument) {
  const declaredElement =
    recipe.classification[ORDERED_CATEGORY_IDS.element] ??
    recipe.name.classification?.[ORDERED_CATEGORY_IDS.element];
  const element =
    recipe.kind === "text"
      ? PREVIEW_TERM_IDS.text
      : recipe.kind === "icon"
        ? typeof declaredElement === "string"
          ? declaredElement
          : PREVIEW_TERM_IDS.workflowIcon
        : undefined;
  const attribute =
    recipe.kind === "background"
      ? PREVIEW_TERM_IDS.background
      : recipe.kind === "border"
        ? PREVIEW_TERM_IDS.border
        : undefined;
  const result: Classification = {};
  if (
    element &&
    recipe.name.categoryId !== ORDERED_CATEGORY_IDS.element &&
    taxonomy.terms.some((term) => term.id === element)
  )
    result[ORDERED_CATEGORY_IDS.element] = element;
  if (attribute && taxonomy.terms.some((term) => term.id === attribute))
    result[ORDERED_CATEGORY_IDS.attribute] = attribute;
  return mergeClassifications(
    { [recipe.name.categoryId]: recipe.name.termId },
    recipe.name.classification ?? {},
    result,
  );
}
export function mergeStyleArtifacts(
  artifacts: readonly StyleArtifacts[],
  checkNames = true,
): StyleArtifacts {
  const rows = artifacts.flatMap((artifact) => artifact.rows);
  const issues: StyleIssue[] = [];
  const seen = new Set<string>();
  const report = (issue: StyleIssue) => {
    const key = JSON.stringify([issue.recipeId, issue.message]);
    if (!seen.has(key)) {
      seen.add(key);
      issues.push(issue);
    }
  };
  for (const artifact of artifacts) artifact.issues.forEach(report);
  const names = new Map<string, string>();
  if (checkNames)
    for (const row of rows) {
      const key = JSON.stringify([row.name, row.modeKey]);
      if (names.has(key) && names.get(key) !== row.conceptId)
        report({
          recipeId: row.recipeId,
          message: `Generated token name ${row.name} collides with another style output.`,
        });
      names.set(key, row.conceptId);
    }
  return { rows, issues };
}
export function buildStyleArtifacts(
  document: StylesDocument,
  taxonomy: TaxonomyDocument,
  rules: readonly Rule[],
  modeSets: ModeSet[],
  contexts: StyleContext[],
  publications = document.publications,
  includeLocalVariants = false,
  checkNames = true,
): StyleArtifacts {
  const rows: StyleRow[] = [],
    issues: StyleIssue[] = [];
  const indexedPublications = publicationIndex(publications);
  const report = (recipeId: string, message: string) => {
    if (
      !issues.some(
        (issue) => issue.recipeId === recipeId && issue.message === message,
      )
    )
      issues.push({ recipeId, message });
  };
  return withTaxonomyProjection(taxonomy, () => {
    for (const recipe of document.recipes) {
      if (recipe.options.some((property) => property.kind === "boolean")) {
        report(
          recipe.id,
          "Use variant options to define Style appearances; Boolean properties are not supported.",
        );
        continue;
      }
      const variants = styleVariants(recipe);
      for (const context of contexts)
        for (const variant of variants) {
          if (!variant.publish && !includeLocalVariants) continue;
          const type = typeClassification(recipe, taxonomy);
          const base = mergeClassifications(
            type.classification,
            variant.classification,
          );
          [...type.issues, ...base.issues, ...variant.issues].forEach((issue) =>
            report(recipe.id, issue),
          );
          if (type.issues.length || base.issues.length || variant.issues.length)
            continue;
          const outputs: {
            id?: string;
            classification: Classification;
            rule?: Extract<Rule, { type: "conditional" }>;
          }[] = [{ classification: {} }];
          for (const application of recipe.applications) {
            const rule = rules.find((rule) => rule.id === application.ruleId);
            if (!rule || rule.type !== "conditional") {
              report(recipe.id, "Choose an available interaction rule.");
              continue;
            }
            if (!ruleAppliesTo(rule, "color")) {
              report(
                recipe.id,
                "Choose an interaction rule that supports color.",
              );
              continue;
            }
            for (const id of application.outputIds) {
              const output = rule.outputs?.find((output) => output.id === id);
              if (!output)
                report(
                  recipe.id,
                  "An interaction output is no longer supported by its rule.",
                );
              else
                outputs.push({
                  id: output.id,
                  classification: output.classification,
                  rule,
                });
            }
          }
          for (const property of STYLE_PROPERTIES[recipe.kind]) {
            const appearance = variant.appearance;
            const colorIndex =
              appearance.color.kind === "families"
                ? styleColorIndex(appearance.color, context.selection)
                : undefined;
            if (
              property === "color" &&
              appearance.color.kind === "families" &&
              appearance.color.indexModes
            ) {
              const { modeSetId, values } = appearance.color.indexModes;
              const axis = modeSets.find((axis) => axis.id === modeSetId);
              const selectedMode = context.selection[modeSetId];
              if (
                !axis ||
                !axis.modes.some((mode) => mode.id === selectedMode) ||
                Object.keys(values).some(
                  (id) => !axis.modes.some((mode) => mode.id === id),
                )
              ) {
                report(
                  recipe.id,
                  "Choose an available mode set and modes for the color scale index.",
                );
                continue;
              }
            }
            const binding =
              property === "color" && appearance.color.kind === "single"
                ? appearance.color.binding
                : property === "lineHeight" || property === "color"
                  ? undefined
                  : appearance[property];
            const families =
              property === "color" && appearance.color.kind === "families"
                ? appearance.color.familyIds
                : [undefined];
            if (property === "color" && !families.length)
              report(recipe.id, "Choose at least one color family.");
            for (const familyId of families) {
              const candidates: (StyleReference | undefined)[] =
                property === "lineHeight"
                  ? appearance.lineHeight
                    ? context.references.filter(
                        (reference) =>
                          reference.property === property &&
                          reference.metricId ===
                            appearance.lineHeight!.metricId,
                      )
                    : []
                  : familyId
                    ? context.references.filter(
                        (reference) =>
                          reference.property === "color" &&
                          reference.familyId === familyId &&
                          appearance.color.kind === "families" &&
                          reference.index === colorIndex,
                      )
                    : binding && "$ref" in binding
                      ? context.references.filter(
                          (reference) =>
                            reference.id === binding.$ref &&
                            reference.property === property,
                        )
                      : binding
                        ? [undefined]
                        : [];
              if (
                !candidates.length &&
                (binding ||
                  familyId ||
                  (property === "lineHeight" && appearance.lineHeight))
              ) {
                report(
                  recipe.id,
                  `${property}: the selected reference or scale index is unavailable.`,
                );
                continue;
              }
              if (property !== "lineHeight" && candidates.length > 1) {
                report(
                  recipe.id,
                  `${property}: the selected reference or scale index is ambiguous.`,
                );
                continue;
              }
              for (const candidate of candidates)
                for (const output of outputs) {
                  // State rules affect only their declared property capabilities.
                  if (
                    output.rule &&
                    (property !== "color" ||
                      !ruleAppliesTo(output.rule, "color"))
                  )
                    continue;
                  let reference = candidate;
                  const outputClass = mergeClassifications(
                    base.classification,
                    output.classification,
                  );
                  if (outputClass.issues.length) {
                    outputClass.issues.forEach((issue) =>
                      report(recipe.id, issue),
                    );
                    continue;
                  }
                  const derived: Classification = {};
                  const propertyCategory = taxonomy.categories.find(
                    (category) => category.key === "property",
                  );
                  const propertyTerm = propertyValues[property]
                    .map((value) =>
                      taxonomy.terms.find(
                        (term) =>
                          term.categoryId === propertyCategory?.id &&
                          String(term.value) === value,
                      ),
                    )
                    .find((term) => term !== undefined);
                  if (!propertyCategory || !propertyTerm) {
                    report(
                      recipe.id,
                      `${property}: choose a registered Property term.`,
                    );
                    continue;
                  }
                  derived[propertyCategory.id] = propertyTerm.id;
                  if (familyId && reference?.classification) {
                    const category = taxonomy.categories.find(
                      (category) => category.key === "colorFamily",
                    );
                    if (category && reference.classification[category.id])
                      derived[category.id] =
                        reference.classification[category.id];
                  }
                  if (
                    property === "lineHeight" &&
                    reference?.index !== undefined
                  ) {
                    const index = reference.index;
                    const category = taxonomy.categories.find(
                      (category) => category.key === "scaleIndex",
                    );
                    const term = taxonomy.terms.find(
                      (term) =>
                        term.categoryId === category?.id &&
                        term.value === index,
                    );
                    if (!category || !term) {
                      report(
                        recipe.id,
                        "The line-height scale index needs a Registry term.",
                      );
                      continue;
                    }
                    derived[category.id] = term.id;
                  }
                  const combined = mergeClassifications(
                    outputClass.classification,
                    derived,
                  );
                  if (combined.issues.length) {
                    combined.issues.forEach((issue) =>
                      report(recipe.id, issue),
                    );
                    continue;
                  }
                  const classification = combined.classification;
                  if (output.rule) {
                    const evaluation = evaluateConditionalRule(
                      output.rule,
                      {
                        classification,
                        modes: context.selection,
                      },
                      conditionSources(taxonomy, modeSets),
                    );
                    if (evaluation.status === "unavailable") {
                      evaluation.issues.forEach((issue) =>
                        report(recipe.id, issue),
                      );
                      continue;
                    }
                    if (!evaluation.matched) continue;
                    if (evaluation.offset && !reference) {
                      report(
                        recipe.id,
                        "Interaction color offsets require a color-scale reference.",
                      );
                      continue;
                    }
                    if (reference && evaluation.offset) {
                      try {
                        const shifted = offsetAvailableToken(
                          reference.id,
                          context.references
                            .filter(
                              (entry) =>
                                entry.property === "color" &&
                                entry.index !== undefined,
                            )
                            .map((entry) => ({
                              id: entry.id,
                              sourceId: entry.familyId,
                              index: entry.index!,
                              name: entry.name,
                              value: String(entry.value),
                            })),
                          evaluation.offset,
                          "strict",
                        );
                        reference = context.references.find(
                          (entry) => entry.id === shifted.token.id,
                        )!;
                      } catch (failure) {
                        report(
                          recipe.id,
                          failure instanceof Error
                            ? failure.message
                            : String(failure),
                        );
                        continue;
                      }
                    }
                  }
                  const projection = projectClassification(
                    taxonomy,
                    classification,
                    "styles",
                    "semantic",
                  );
                  if (projection.issues.length) {
                    projection.issues.forEach((issue) =>
                      report(recipe.id, issue),
                    );
                    continue;
                  }
                  const key = JSON.stringify([
                    property,
                    [...variant.optionIds].sort(),
                    familyId ?? null,
                    output.id ?? null,
                    property === "lineHeight" ? reference?.index : null,
                  ]);
                  const publication = indexedPublications
                    .get(recipe.id)
                    ?.get(key);
                  const modeKey = canonicalTokenModeKey(context.selection);
                  const uuid = publication?.rows[modeKey];
                  if (!publication || !uuid) {
                    report(
                      recipe.id,
                      "Style publication identities need to be prepared before generation.",
                    );
                    continue;
                  }
                  let value = reference?.value ?? binding?.value;
                  if (value === undefined) continue;
                  if (!reference) {
                    try {
                      value = literalValue(
                        property,
                        value,
                        context.colorOutput,
                      );
                    } catch (failure) {
                      report(
                        recipe.id,
                        failure instanceof Error
                          ? failure.message
                          : String(failure),
                      );
                      continue;
                    }
                  }
                  rows.push({
                    conceptId: publication.id,
                    recipeId: recipe.id,
                    key,
                    name: projection.name,
                    classification,
                    property,
                    value,
                    unit:
                      reference?.unit ??
                      (property === "borderWidth" && typeof value === "number"
                        ? "px"
                        : ""),
                    optionIds: variant.optionIds,
                    familyId,
                    outputId: output.id,
                    scaleIndex: reference?.index,
                    metricId: reference?.metricId,
                    referenceId: reference?.browserId ?? reference?.id,
                    context: context.modes,
                    modeKey,
                    token: {
                      uuid,
                      name: {
                        ...Object.fromEntries(
                          Object.entries(projection.flat).filter(
                            (entry): entry is [string, string | number] =>
                              typeof entry[1] === "string" ||
                              typeof entry[1] === "number",
                          ),
                        ),
                        ...context.modes,
                      },
                      ...(reference
                        ? { $ref: reference.uuid }
                        : {
                            value:
                              property === "borderWidth" &&
                              typeof value === "number"
                                ? `${value}px`
                                : value,
                          }),
                    },
                  });
                }
            }
          }
        }
    }
    return mergeStyleArtifacts(
      [{ rows, issues }],
      checkNames && !includeLocalVariants,
    );
  });
}

export function synchronizeStylePublications(
  document: StylesDocument,
  contexts: StyleContext[],
  rules: readonly Rule[],
) {
  let publications = document.publications;
  const indexedPublications = publicationIndex(publications);
  const positions = new Map(
    publications.map((publication, index) => [publication, index]),
  );
  const modeKeys = [
    ...new Set(
      contexts.map((context) => canonicalTokenModeKey(context.selection)),
    ),
  ];
  const lineHeightIndices = new Map<
    string | undefined,
    Set<number | undefined>
  >();
  for (const context of contexts)
    for (const reference of context.references) {
      if (reference.property !== "lineHeight") continue;
      let indices = lineHeightIndices.get(reference.metricId);
      if (!indices) {
        indices = new Set();
        lineHeightIndices.set(reference.metricId, indices);
      }
      indices.add(reference.index);
    }
  const replace = (publication: StylePublication, position?: number) => {
    if (publications === document.publications)
      publications = [...publications];
    if (position === undefined) publications.push(publication);
    else publications[position] = publication;
    positions.set(publication, position ?? publications.length - 1);
    let recipe = indexedPublications.get(publication.recipeId);
    if (!recipe) {
      recipe = new Map();
      indexedPublications.set(publication.recipeId, recipe);
    }
    recipe.set(publication.key, publication);
  };
  for (const recipe of document.recipes)
    for (const variant of styleVariants(recipe)) {
      const outputs = [
        undefined,
        ...recipe.applications.flatMap((application) =>
          rules.flatMap((rule) =>
            rule.id === application.ruleId && rule.type === "conditional"
              ? (rule.outputs ?? [])
                  .filter((output) => application.outputIds.includes(output.id))
                  .map((output) => output.id)
              : [],
          ),
        ),
      ];
      for (const property of STYLE_PROPERTIES[recipe.kind]) {
        const families =
          property === "color" && variant.appearance.color.kind === "families"
            ? variant.appearance.color.familyIds
            : [undefined];
        const indices =
          property === "lineHeight"
            ? [
                ...(lineHeightIndices.get(
                  variant.appearance.lineHeight?.metricId,
                ) ?? []),
              ]
            : [undefined];
        for (const family of families)
          for (const output of outputs)
            for (const index of indices) {
              const key = JSON.stringify([
                property,
                [...variant.optionIds].sort(),
                family ?? null,
                output ?? null,
                index ?? null,
              ]);
              let publication = indexedPublications.get(recipe.id)?.get(key);
              if (!publication) {
                publication = {
                  id: crypto.randomUUID(),
                  recipeId: recipe.id,
                  key,
                  rows: {},
                };
                replace(publication);
              }
              const missing = modeKeys.filter((key) => !publication.rows[key]);
              if (missing.length) {
                const rows = { ...publication.rows };
                for (const modeKey of missing)
                  rows[modeKey] = crypto.randomUUID();
                replace({ ...publication, rows }, positions.get(publication));
              }
            }
      }
    }
  return publications === document.publications
    ? document
    : { ...document, publications };
}
