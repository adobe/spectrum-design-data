// Copyright 2026 Adobe. All rights reserved.
import {
  registerTerm,
  taxonomyValueKey,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { termLabel } from "../taxonomy/termPresentation";
import type { Structure, StructuresDocument } from "./model";

const label = (value: string | number) => {
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const resolvedNames = new WeakMap<
  StructuresDocument,
  WeakMap<TaxonomyDocument, StructuresDocument>
>();

export function resolveStructureNames(
  document: StructuresDocument,
  taxonomy: TaxonomyDocument,
): StructuresDocument {
  const cached = resolvedNames.get(document)?.get(taxonomy);
  if (cached) return cached;
  const resolved = {
    ...document,
    structures: document.structures.map((structure) => {
      const registered =
        structure.nameRef &&
        taxonomy.terms.find(
          (term) =>
            term.id === structure.nameRef!.termId &&
            term.categoryId === structure.nameRef!.categoryId,
        );
      return {
        ...structure,
        ...(registered && { name: label(registered.value) }),
        ...(structure.editor && {
          editor: {
            ...structure.editor,
            properties: structure.editor.properties.map((property) => {
              if (property.kind !== "variant" || !property.categoryId)
                return property;
              const category = taxonomy.categories.find(
                (category) => category.id === property.categoryId,
              );
              return {
                ...property,
                ...(category && { name: category.name }),
                options: property.options.map((option) => {
                  const termId = option.classification[property.categoryId!];
                  const term = taxonomy.terms.find(
                    (term) =>
                      term.id === termId &&
                      term.categoryId === property.categoryId,
                  );
                  return term
                    ? { ...option, name: termLabel(term.value) }
                    : option;
                }),
              };
            }),
          },
        }),
      };
    }),
  };
  const entries = resolvedNames.get(document) ?? new WeakMap();
  entries.set(taxonomy, resolved);
  resolvedNames.set(document, entries);
  return resolved;
}

/**
 * Legacy names are matched only during migration. Existing UUID bindings are
 * authoritative thereafter; editing a name registers/reuses a term atomically.
 */
export function reconcileStructureNames(
  taxonomy: TaxonomyDocument,
  before: StructuresDocument,
  after: StructuresDocument,
  allocate: (key: string) => string = () => crypto.randomUUID(),
): { taxonomy: TaxonomyDocument; document: StructuresDocument } {
  let next = taxonomy;
  const category = taxonomy.categories.find(
    (category) => category.key === "structure",
  );
  if (!category)
    throw new Error("Choose an available Structure Registry category.");
  const structures = after.structures.map((structure): Structure => {
    const previous = before.structures.find(
      (source) => source.conceptId === structure.conceptId,
    );
    if (structure.parentStructureId && !structure.nameRef) return structure;
    const renamed = previous !== undefined && previous.name !== structure.name;
    const categoryId = previous?.nameRef?.categoryId ?? category.id;
    let nameRef = structure.nameRef;
    if (!nameRef || renamed) {
      const existing = next.terms.find(
        (term) =>
          taxonomyValueKey(term.value) === taxonomyValueKey(structure.name),
      );
      // Reuse historic Element names such as Text without relaxing Registry uniqueness.
      if (existing && (!renamed || existing.categoryId === categoryId)) {
        nameRef = { categoryId: existing.categoryId, termId: existing.id };
      } else {
        next = registerTerm(
          next,
          categoryId,
          structure.name,
          allocate(
            `structure-term:${categoryId}:${taxonomyValueKey(structure.name)}`,
          ),
        );
        const term = next.terms.find(
          (term) =>
            term.categoryId === categoryId &&
            taxonomyValueKey(term.value) === taxonomyValueKey(structure.name),
        )!;
        nameRef = { categoryId, termId: term.id };
      }
    }
    const editor = structure.editor;
    return {
      ...structure,
      nameRef,
      ...(editor && {
        editor: {
          ...editor,
          properties: editor.properties.map((property) => {
            if (property.kind !== "variant" || property.categoryId)
              return property;
            const registeredCategory = taxonomy.categories.find(
              (category) =>
                taxonomyValueKey(category.name) ===
                  taxonomyValueKey(property.name) &&
                category.scopes.includes("structures") &&
                property.options.every((option) => {
                  const id = option.classification[category.id];
                  return (
                    typeof id === "string" &&
                    taxonomy.terms.some(
                      (term) =>
                        term.id === id && term.categoryId === category.id,
                    )
                  );
                }),
            );
            return registeredCategory
              ? { ...property, categoryId: registeredCategory.id }
              : property;
          }),
        },
      }),
    };
  });
  return {
    taxonomy: next,
    document: resolveStructureNames({ ...after, structures }, next),
  };
}
