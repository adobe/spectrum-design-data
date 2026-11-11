// Copyright 2026 Adobe. All rights reserved.
import type { StyleRecipe, StyleColor } from "./model";
import type { StyleReference } from "./generation";
import { styleColorIndex } from "./generation";
import type { OptionProperty, VariantOption } from "../option-groups/model";

export interface StylePropertiesEditor {
  properties: OptionProperty[];
  differences: StyleRecipe["differences"];
}

export function stylePropertiesEditor(
  recipe: Pick<StyleRecipe, "options" | "differences">,
): StylePropertiesEditor {
  return { properties: recipe.options, differences: recipe.differences };
}

export function switchStyleColor(
  color: StyleColor,
  kind: StyleColor["kind"],
  references: StyleReference[],
  selection: Record<string, string> = {},
): StyleColor {
  if (color.kind === kind) return color;
  if (kind === "families") {
    const selected =
      color.kind === "single"
        ? references.find(
            (reference) =>
              reference.id === color.binding.$ref &&
              reference.property === "color" &&
              reference.index !== undefined,
          )
        : undefined;
    return {
      kind,
      familyIds: selected ? [selected.familyId] : [],
      scaleIndex: selected?.index ?? 100,
    };
  }
  const selected =
    color.kind === "families"
      ? references.find(
          (reference) =>
            reference.property === "color" &&
            reference.familyId === color.familyIds[0] &&
            reference.index === styleColorIndex(color, selection),
        )
      : undefined;
  return { kind, binding: selected ? { $ref: selected.id } : { value: "" } };
}

export function stylePreviewOptions(
  recipe: StyleRecipe,
  selections: Record<string, string>,
) {
  return Object.fromEntries(
    recipe.options.flatMap((property) =>
      property.kind === "variant"
        ? [
            [
              property.id,
              property.options.some(
                (option) => option.id === selections[property.id],
              )
                ? selections[property.id]
                : property.defaultOptionId,
            ],
          ]
        : [],
    ),
  );
}
export function removeStyleProperty<
  T extends Pick<StyleRecipe, "options" | "differences">,
>(recipe: T, propertyId: string): T {
  const property = recipe.options.find(
    (property) => property.id === propertyId,
  );
  if (!property) throw new Error("This Style property is no longer available.");
  const removed = new Set(
    property.kind === "variant"
      ? property.options.map((option) => option.id)
      : [],
  );
  return {
    ...recipe,
    options: recipe.options.filter((property) => property.id !== propertyId),
    differences: Object.fromEntries(
      Object.entries(recipe.differences).filter(([id]) => !removed.has(id)),
    ),
  };
}
export function removeStyleOption<
  T extends Pick<StyleRecipe, "options" | "differences">,
>(recipe: T, propertyId: string, optionId: string): T {
  const property = recipe.options.find(
    (property) => property.id === propertyId,
  );
  if (
    !property ||
    property.kind !== "variant" ||
    !property.options.some((option) => option.id === optionId)
  )
    throw new Error("This Style option is no longer available.");
  if (property.options.length <= 1)
    throw new Error("Keep at least one option, or remove the property.");
  const options = property.options.filter((option) => option.id !== optionId);
  return {
    ...recipe,
    options: recipe.options.map((entry) =>
      entry.id === property.id
        ? {
            ...property,
            options,
            defaultOptionId:
              property.defaultOptionId === optionId
                ? options[0].id
                : property.defaultOptionId,
          }
        : entry,
    ),
    differences: Object.fromEntries(
      Object.entries(recipe.differences).filter(([id]) => id !== optionId),
    ),
  };
}

export const stylePropertyOperations = {
  removeProperty(
    editor: StylePropertiesEditor,
    propertyId: string,
  ): StylePropertiesEditor {
    return stylePropertiesEditor(
      removeStyleProperty(
        { options: editor.properties, differences: editor.differences },
        propertyId,
      ),
    );
  },
  duplicateVariantOption(
    editor: StylePropertiesEditor,
    propertyId: string,
    sourceId: string,
    option: VariantOption,
  ): StylePropertiesEditor {
    const property = editor.properties.find((entry) => entry.id === propertyId);
    if (
      !property ||
      property.kind !== "variant" ||
      !property.options.some((entry) => entry.id === sourceId)
    )
      throw new Error("The selected variant option is unavailable.");
    if (
      editor.properties.some(
        (entry) =>
          entry.id === option.id ||
          (entry.kind === "variant" &&
            entry.options.some((item) => item.id === option.id)),
      )
    )
      throw new Error("The new option needs its own identity.");
    return {
      ...editor,
      properties: editor.properties.map((entry) =>
        entry.id === propertyId
          ? {
              ...property,
              options: [...property.options, structuredClone(option)],
            }
          : entry,
      ),
      differences: {
        ...editor.differences,
        ...(editor.differences[sourceId] && {
          [option.id]: structuredClone(editor.differences[sourceId]),
        }),
      },
    };
  },
  makeVariantOptionDefault(
    editor: StylePropertiesEditor,
    propertyId: string,
    optionId: string,
  ): StylePropertiesEditor {
    const property = editor.properties.find((entry) => entry.id === propertyId);
    if (
      !property ||
      property.kind !== "variant" ||
      !property.options.some((entry) => entry.id === optionId)
    )
      throw new Error("The selected variant option is unavailable.");
    if (Object.keys(editor.differences[optionId] ?? {}).length)
      throw new Error(
        "Choose the default before saving differences for this option.",
      );
    return {
      ...editor,
      properties: editor.properties.map((entry) =>
        entry.id === propertyId
          ? { ...property, defaultOptionId: optionId }
          : entry,
      ),
      differences: Object.fromEntries(
        Object.entries(editor.differences).filter(([id]) => id !== optionId),
      ),
    };
  },
  removeVariantOption(
    editor: StylePropertiesEditor,
    propertyId: string,
    optionId: string,
  ): StylePropertiesEditor {
    const property = editor.properties.find((entry) => entry.id === propertyId);
    if (property?.kind === "variant" && property.defaultOptionId === optionId)
      throw new Error("The default option cannot be deleted.");
    return stylePropertiesEditor(
      removeStyleOption(
        { options: editor.properties, differences: editor.differences },
        propertyId,
        optionId,
      ),
    );
  },
  removeBooleanProperty(
    editor: StylePropertiesEditor,
    propertyId: string,
  ): StylePropertiesEditor {
    const property = editor.properties.find((entry) => entry.id === propertyId);
    if (!property || property.kind !== "boolean")
      throw new Error("The boolean property is unavailable.");
    return stylePropertiesEditor(
      removeStyleProperty(
        { options: editor.properties, differences: editor.differences },
        propertyId,
      ),
    );
  },
};
