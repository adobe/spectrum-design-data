// Copyright 2026 Adobe. All rights reserved.
import { registerTerm, type TaxonomyDocument } from "../taxonomy/model";

export const STYLE_CATEGORY_ID = "6248662b-d1a7-45e1-b89d-521c08eea9b5";
export function withStylesVocabulary(
  document: TaxonomyDocument,
): TaxonomyDocument {
  const property = document.categories.find(
    (category) => category.key === "property",
  );
  const missingWeight =
    property &&
    !document.terms.some(
      (term) =>
        term.categoryId === property.id &&
        ["font-weight", "font weight"].includes(
          String(term.value).trim().toLowerCase(),
        ),
    ) &&
    !document.terms.some(
      (term) =>
        term.id === "042b4793-1403-4c88-a6e8-e8b993b3c254" ||
        String(term.value).trim().toLowerCase() === "font-weight",
    );
  const missingSemanticIndex = document.categories.some(
    (category) =>
      category.key === "scaleIndex" &&
      category.allowedTokenTiers &&
      !category.allowedTokenTiers.includes("semantic"),
  );
  if (
    !missingWeight &&
    !missingSemanticIndex &&
    document.categories.some((category) => category.key === "style") &&
    document.categories.every((category) => category.scopes.includes("styles"))
  )
    return document;
  const next = structuredClone(document);
  for (const category of next.categories) {
    if (!category.scopes.includes("styles")) category.scopes.push("styles");
    if (
      category.key === "scaleIndex" &&
      category.allowedTokenTiers &&
      !category.allowedTokenTiers.includes("semantic")
    )
      category.allowedTokenTiers.push("semantic");
  }
  if (!next.categories.some((category) => category.key === "style")) {
    next.categories.push({
      id: STYLE_CATEGORY_ID,
      key: "style",
      name: "Style",
      description: "",
      valueType: "string",
      cardinality: "one",
      scopes: ["styles"],
      required: false,
      includeInProjections: true,
    });
    const property = next.order.findIndex(
      (id) =>
        next.categories.find((category) => category.id === id)?.key ===
        "property",
    );
    next.order.splice(
      property < 0 ? next.order.length : property,
      0,
      STYLE_CATEGORY_ID,
    );
  }
  return missingWeight && property
    ? registerTerm(
        next,
        property.id,
        "font-weight",
        "042b4793-1403-4c88-a6e8-e8b993b3c254",
      )
    : next;
}
export function registerStyleName(document: TaxonomyDocument, name: string) {
  if (!name.trim()) throw new Error("Give the style a name.");
  const existing = document.terms.find((term) => {
    const category = document.categories.find(
      (category) => category.id === term.categoryId,
    );
    return (
      typeof term.value === "string" &&
      term.value.trim().toLowerCase() === name.trim().toLowerCase() &&
      category?.valueType === "string" &&
      category.cardinality === "one" &&
      category.scopes.includes("styles") &&
      (!category.allowedTokenTiers ||
        category.allowedTokenTiers.includes("semantic"))
    );
  });
  if (existing)
    return {
      taxonomy: document,
      name: { categoryId: existing.categoryId, termId: existing.id },
    };
  const category = document.categories.find(
    (category) => category.key === "style",
  );
  if (!category)
    throw new Error("Choose an available Style Registry category.");
  const termId = crypto.randomUUID();
  return {
    taxonomy: registerTerm(document, category.id, name.trim(), termId),
    name: { categoryId: category.id, termId },
  };
}
