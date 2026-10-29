// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyDocument } from "../taxonomy/model";
import { foundationNameSegment } from "../taxonomy/formatting";
import type { ComponentRecord, ComponentRelationship } from "./model";

export function componentRelationships(
  component: ComponentRecord,
  taxonomy: TaxonomyDocument,
): ComponentRelationship[] {
  return component.assignments.map((row) => {
    const category = taxonomy.categories.find(
      (category) => category.id === row.property.categoryId,
    );
    const term = taxonomy.terms.find(
      (term) =>
        term.id === row.property.termId && term.categoryId === category?.id,
    );
    if (category?.key !== "property" || !term || typeof term.value !== "string")
      throw new Error(
        `${component.declaration.displayName}: choose an available Property term.`,
      );
    const part = row.partId
      ? Object.entries(component.identities.parts).find(
          ([, id]) => id === row.partId,
        )?.[0]
      : undefined;
    if (row.partId && !part)
      throw new Error(
        `${component.declaration.displayName}: this assignment references an unavailable part.`,
      );
    return {
      uuid: row.id,
      scope: {
        component: component.declaration.name,
        property: foundationNameSegment(term.value),
        ...(part && { part }),
        ...(row.options &&
          Object.keys(row.options).length && {
            options: structuredClone(row.options),
          }),
      },
      ...(row.description !== undefined && { description: row.description }),
      ...(row.context !== undefined && { context: row.context }),
      ...(row.$valueType !== undefined && { $valueType: row.$valueType }),
      ...("$ref" in row
        ? { $ref: row.$ref }
        : { value: structuredClone(row.value) }),
    };
  });
}
