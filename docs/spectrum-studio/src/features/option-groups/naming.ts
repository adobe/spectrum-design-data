// Copyright 2026 Adobe. All rights reserved.
import type { OptionProperty, VariantOption, VariantProperty } from "./model";
import {
  registerTerm,
  taxonomyEmissionKey,
  taxonomyValueKey,
  type Classification,
  type TaxonomyCategory,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { isUnchangedTermInput, termLabel } from "../taxonomy/termPresentation";

export interface PropertiesEditor {
  properties: OptionProperty[];
}

export type VariantNamingScope = "structures" | "styles";
export interface VariantRegistryRequest {
  categoryId?: string;
  name: string;
  entries?: string[];
}

function variantCategory(
  property: VariantProperty,
  taxonomy: TaxonomyDocument,
  scope: VariantNamingScope,
) {
  const matches = taxonomy.categories.filter((category) =>
    property.categoryId
      ? category.id === property.categoryId
      : taxonomyValueKey(category.name) === taxonomyValueKey(property.name) ||
        taxonomyValueKey(category.key) === taxonomyValueKey(property.name),
  );
  if (matches.length > 1)
    throw new Error(
      "More than one Registry category has this name. Review the categories in the Registry.",
    );
  const category = matches[0];
  if (property.categoryId && !category)
    throw new Error("The variant's Registry category is unavailable.");
  if (
    category &&
    (category.cardinality !== "one" ||
      category.valueType !== "string" ||
      !category.scopes.includes(scope))
  )
    throw new Error(
      `Choose a single-value text category available to ${scope === "styles" ? "Styles" : "Structures"}.`,
    );
  return category;
}

function optionTerm(
  taxonomy: TaxonomyDocument,
  category: TaxonomyCategory | undefined,
  option: VariantOption,
) {
  const { name } = option;
  const assigned = category && option.classification[category.id];
  if (category && assigned !== undefined) {
    if (typeof assigned !== "string")
      throw new Error("Edit this option's ordered terms in the Registry.");
    const term = taxonomy.terms.find(
      (item) => item.id === assigned && item.categoryId === category.id,
    );
    if (!term) throw new Error("The option's Registry term is unavailable.");
    return term;
  }
  if (!name.trim()) throw new Error("Give every option a name.");
  const matching = taxonomy.terms.filter((term) =>
    isUnchangedTermInput(name, term.value),
  );
  const existing = matching.find((term) => term.categoryId === category?.id);
  if (!existing && matching.length) {
    const owner = taxonomy.categories.find(
      (item) => item.id === matching[0].categoryId,
    );
    throw new Error(
      `"${name.trim()}" already belongs to ${owner?.name ?? "another Registry category"}. Use that category or choose a different option name.`,
    );
  }
  return existing;
}

export function variantRegistrationRequest(
  property: VariantProperty,
  taxonomy: TaxonomyDocument,
  scope: VariantNamingScope = "structures",
): VariantRegistryRequest | null {
  if (!property.name.trim()) throw new Error("Give the variant a name.");
  const category = variantCategory(property, taxonomy, scope);
  const entries = category ? [] : [`Category: ${property.name.trim()}`];
  const names = new Set<string>();
  for (const option of property.options) {
    if (!option.name.trim()) throw new Error("Give every option a name.");
    const key = taxonomyValueKey(termLabel(option.name));
    if (names.has(key)) throw new Error("Give every option a distinct name.");
    names.add(key);
  }
  for (const option of property.options) {
    if (!optionTerm(taxonomy, category, option))
      entries.push(`Option: ${option.name.trim()}`);
  }
  return entries.length
    ? { categoryId: category?.id, name: property.name.trim(), entries }
    : null;
}

export function registerVariantProperty(
  property: VariantProperty,
  taxonomy: TaxonomyDocument,
  createEntries = false,
  scope: VariantNamingScope = "structures",
) {
  const request = variantRegistrationRequest(property, taxonomy, scope);
  if (request && !createEntries)
    throw new Error("Confirm the new Registry entries before saving.");
  let category = variantCategory(property, taxonomy, scope);
  if (!category) {
    const id = crypto.randomUUID();
    category = {
      id,
      key: taxonomyEmissionKey(id),
      name: property.name.trim(),
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["structures", "styles"],
      required: false,
      includeInProjections: true,
    };
    taxonomy = {
      ...taxonomy,
      categories: [...taxonomy.categories, category],
      order: [...taxonomy.order, id],
    };
  }
  const categoryId = category.id;
  const options = property.options.map((option) => {
    const assigned = option.classification[categoryId];
    if (assigned !== undefined && typeof assigned !== "string")
      throw new Error("Edit this option's ordered terms in the Registry.");
    let term = optionTerm(taxonomy, category, option);
    if (!term) {
      const id = crypto.randomUUID();
      taxonomy = registerTerm(taxonomy, categoryId, option.name.trim(), id);
      term = taxonomy.terms.find((item) => item.id === id)!;
    }
    return {
      ...option,
      name: termLabel(term.value),
      classification: { ...option.classification, [categoryId]: term.id },
    };
  });
  return {
    taxonomy,
    property: { ...property, name: category.name, categoryId, options },
  };
}

export function registeredPropertyNames<T extends PropertiesEditor>(
  editor: T,
  taxonomy: TaxonomyDocument,
): T {
  return {
    ...editor,
    properties: editor.properties.map((property) => {
      if (property.kind !== "variant" || !property.categoryId) return property;
      const category = taxonomy.categories.find(
        (item) => item.id === property.categoryId,
      );
      if (!category) return property;
      return {
        ...property,
        name: category.name,
        options: property.options.map((option) => {
          const term = taxonomy.terms.find(
            (item) =>
              item.id === option.classification[category.id] &&
              item.categoryId === category.id,
          );
          return term ? { ...option, name: termLabel(term.value) } : option;
        }),
      };
    }),
  };
}

function renamedOptionDraft(
  property: VariantProperty,
  optionId: string,
  name: string,
): VariantProperty {
  return {
    ...property,
    options: property.options.map((option) => {
      if (option.id !== optionId) return option;
      const classification = { ...option.classification };
      if (property.categoryId) delete classification[property.categoryId];
      return { ...option, name: name.trim(), classification };
    }),
  };
}

export function renameVariantOption<T extends PropertiesEditor>(
  editor: T,
  propertyId: string,
  optionId: string,
  name: string,
  taxonomy: TaxonomyDocument,
  createTerm = false,
  scope: VariantNamingScope = "structures",
) {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (!property || property.kind !== "variant")
    throw new Error("The variant property is unavailable.");
  const option = property.options.find((item) => item.id === optionId);
  if (!option) throw new Error("The selected variant option is unavailable.");
  if (property.categoryId || !Object.keys(option.classification).length) {
    const next = registerVariantProperty(
      renamedOptionDraft(property, optionId, name),
      taxonomy,
      createTerm,
      scope,
    );
    return {
      taxonomy: next.taxonomy,
      editor: {
        ...editor,
        properties: editor.properties.map((entry) =>
          entry.id === propertyId ? next.property : entry,
        ),
      },
    };
  }
  const renamed = renameAssignment(
    option.classification,
    name,
    taxonomy,
    createTerm,
  );
  return {
    taxonomy: renamed.taxonomy,
    editor: {
      ...editor,
      properties: editor.properties.map((item) =>
        item.id === property.id
          ? {
              ...property,
              options: property.options.map((entry) =>
                entry.id === optionId
                  ? { ...entry, ...renamed.assignment }
                  : entry,
              ),
            }
          : item,
      ),
    },
  };
}

export function renameVariantProperty<T extends PropertiesEditor>(
  editor: T,
  propertyId: string,
  name: string,
  taxonomy: TaxonomyDocument,
  createTerm = false,
  scope: VariantNamingScope = "structures",
) {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (!property || property.kind !== "variant")
    throw new Error("The variant property is unavailable.");
  if (property.categoryId) {
    const category = taxonomy.categories.find(
      (category) => category.id === property.categoryId,
    );
    if (!category || !name.trim())
      throw new Error(
        "Choose an available Registry category and give it a name.",
      );
    return {
      taxonomy: {
        ...taxonomy,
        categories: taxonomy.categories.map((entry) =>
          entry.id === category.id ? { ...entry, name: name.trim() } : entry,
        ),
      },
      editor: {
        ...editor,
        properties: editor.properties.map((entry) =>
          entry.id === propertyId ? { ...property, name: name.trim() } : entry,
        ),
      },
    };
  }
  if (!Object.keys(property.classification).length) {
    const next = registerVariantProperty(
      { ...property, name: name.trim() },
      taxonomy,
      createTerm,
      scope,
    );
    return {
      taxonomy: next.taxonomy,
      editor: {
        ...editor,
        properties: editor.properties.map((entry) =>
          entry.id === propertyId ? next.property : entry,
        ),
      },
    };
  }
  const renamed = renameAssignment(
    property.classification,
    name,
    taxonomy,
    createTerm,
  );
  return {
    taxonomy: renamed.taxonomy,
    editor: {
      ...editor,
      properties: editor.properties.map((item) =>
        item.id === propertyId ? { ...property, ...renamed.assignment } : item,
      ),
    },
  };
}

export function variantNameTermRequest(
  editor: PropertiesEditor,
  propertyId: string,
  optionId: string | undefined,
  name: string,
  taxonomy: TaxonomyDocument,
  scope: VariantNamingScope = "structures",
): VariantRegistryRequest | null {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (!property || property.kind !== "variant")
    throw new Error("The variant property is unavailable.");
  const selected = optionId
    ? property.options.find((option) => option.id === optionId)
    : property;
  if (!selected) throw new Error("The variant option is unavailable.");
  if (!optionId && property.categoryId) return null;
  if (
    (optionId && property.categoryId) ||
    !Object.keys(selected.classification).length
  )
    return variantRegistrationRequest(
      {
        ...(optionId ? renamedOptionDraft(property, optionId, name) : property),
        name: optionId ? property.name : name.trim(),
      },
      taxonomy,
      scope,
    );
  const target = assignmentRenameTerm(selected.classification, name, taxonomy);
  return target && !target.existing
    ? { categoryId: target.categoryId, name: name.trim() }
    : null;
}

function assignmentRenameTerm(
  classification: Classification,
  name: string,
  taxonomy: TaxonomyDocument,
) {
  const assignments = Object.entries(classification);
  if (!name.trim()) throw new Error("Give the option a name.");
  if (!assignments.length) return null;
  if (assignments.length !== 1 || typeof assignments[0][1] !== "string")
    throw new Error("Edit this option's ordered terms in the Registry.");
  const [categoryId] = assignments[0];
  const existing = taxonomy.terms.find(
    (term) =>
      term.categoryId === categoryId &&
      taxonomyValueKey(term.value) === taxonomyValueKey(name.trim()),
  );
  return { categoryId, existing };
}

function renameAssignment(
  classification: Classification,
  name: string,
  taxonomy: TaxonomyDocument,
  createTerm: boolean,
) {
  const target = assignmentRenameTerm(classification, name, taxonomy);
  if (!target)
    return { taxonomy, assignment: { name: name.trim(), classification } };
  const { categoryId, existing } = target;
  if (!existing && !createTerm)
    throw new Error("Choose an existing Registry term or create this term.");
  const nextTaxonomy = existing
    ? taxonomy
    : registerTerm(taxonomy, categoryId, name.trim(), crypto.randomUUID());
  const term =
    existing ??
    nextTaxonomy.terms.find(
      (item) =>
        item.categoryId === categoryId &&
        taxonomyValueKey(item.value) === taxonomyValueKey(name.trim()),
    );
  if (!term) throw new Error("The option's Registry term is unavailable.");
  return {
    taxonomy: nextTaxonomy,
    assignment: {
      name: termLabel(term.value),
      classification: { [categoryId]: term.id },
    },
  };
}
