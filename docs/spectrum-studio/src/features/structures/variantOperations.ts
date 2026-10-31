// Copyright 2026 Adobe. All rights reserved.
import type { VariantOption, VariantProperty } from "../option-groups/model";
import {
  structureEditor,
  resolveStructureOptions,
  type StructureEditorData,
  type StructureOptionOverrides,
  type StructurePreviewState,
} from "./variants";
import { structureSelection, type Structure } from "./model";
import type { StructureInsertionContext } from "./children";
import { STRUCTURE_TERM_IDS } from "./vocabulary";
import {
  registerTerm,
  taxonomyValueKey,
  type Classification,
  type TaxonomyDocument,
} from "../taxonomy/model";
import { termLabel } from "../taxonomy/termPresentation";

export function reorderLayers(
  order: readonly string[],
  moving: ReadonlySet<string>,
  target: string,
  position: "before" | "after",
) {
  if (!order.includes(target) || moving.has(target))
    throw new Error("Choose another layer as the reorder destination.");
  if (!moving.size || [...moving].some((id) => !order.includes(id)))
    throw new Error("A dragged layer is no longer available.");
  const kept = order.filter((id) => !moving.has(id));
  const index = kept.indexOf(target) + (position === "after" ? 1 : 0);
  return [
    ...kept.slice(0, index),
    ...order.filter((id) => moving.has(id)),
    ...kept.slice(index),
  ];
}

export function planLayerInsertion(
  structure: Structure,
  index: number,
  expected?: StructureInsertionContext,
  preview?: StructurePreviewState,
) {
  const resolved = resolveStructureOptions(structure, preview);
  if (resolved.issues.length) throw new Error(resolved.issues.join(" "));
  const visible = (resolved.structure.elements ?? []).map((child) => child.id);
  if (!Number.isInteger(index) || index < 0 || index > visible.length)
    throw new Error("The insertion location is no longer available.");
  const direction = structureSelection(resolved.structure, "direction");
  const column =
    direction &&
    "value" in direction &&
    direction.value.kind === "term" &&
    direction.value.termId === STRUCTURE_TERM_IDS.vertical;
  if (
    expected &&
    (expected.direction !== (column ? "vertical" : "horizontal") ||
      expected.childIds.length !== visible.length ||
      expected.childIds.some((id, position) => id !== visible[position]))
  )
    throw new Error(
      "The Structure changed while its picker was open. Choose the insertion location again.",
    );
  const shared = (structure.elements ?? []).map((child) => child.id);
  const active = activeVariant(
    structure,
    preview?.activePropertyId ?? null,
    preview?.options ?? {},
  );
  const order =
    active.option && !active.isDefault
      ? (structureEditor(structure).overrides[active.option.id]?.order ??
        shared)
      : shared;
  const before = visible[index];
  const after = visible[index - 1];
  return {
    sharedIndex: before
      ? shared.indexOf(before)
      : after
        ? shared.indexOf(after) + 1
        : shared.length,
    optionId: active.option && !active.isDefault ? active.option.id : undefined,
    order,
    optionIndex: before
      ? order.indexOf(before)
      : after
        ? order.indexOf(after) + 1
        : order.length,
  };
}

export function editorAfterLayerInsertion(
  structure: Structure,
  plan: ReturnType<typeof planLayerInsertion>,
  childId: string,
) {
  const editor = structureEditor(structure);
  if (!plan.optionId) return editor;
  const order = [...plan.order];
  order.splice(plan.optionIndex, 0, childId);
  return updateOptionOverrides(editor, plan.optionId, {
    ...editor.overrides[plan.optionId],
    order,
  });
}

export function activeVariant(
  structure: Structure,
  propertyId: string | null,
  selections: Record<string, string>,
) {
  const property = structureEditor(structure).properties.find(
    (item): item is VariantProperty =>
      item.kind === "variant" && item.id === propertyId,
  );
  const option = property?.options.find(
    (item) => item.id === (selections[property.id] ?? property.defaultOptionId),
  );
  return {
    property,
    option,
    isDefault: !property || option?.id === property.defaultOptionId,
  };
}

export function updateOptionOverrides(
  editor: StructureEditorData,
  optionId: string,
  patch: StructureOptionOverrides,
): StructureEditorData {
  const property = editor.properties.find(
    (item) =>
      item.kind === "variant" &&
      item.options.some((option) => option.id === optionId),
  );
  if (
    !property ||
    property.kind !== "variant" ||
    property.defaultOptionId === optionId
  )
    throw new Error("Choose a non-default option before saving differences.");
  return { ...editor, overrides: { ...editor.overrides, [optionId]: patch } };
}

export function duplicateVariantOption(
  editor: StructureEditorData,
  propertyId: string,
  sourceId: string,
  option: VariantOption,
): StructureEditorData {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (
    !property ||
    property.kind !== "variant" ||
    !property.options.some((item) => item.id === sourceId)
  )
    throw new Error("The selected variant option is unavailable.");
  if (
    editor.properties.some(
      (item) =>
        item.id === option.id ||
        (item.kind === "variant" &&
          item.options.some((entry) => entry.id === option.id)),
    )
  )
    throw new Error("The new option needs its own identity.");
  return {
    ...editor,
    properties: editor.properties.map((item) =>
      item.id === property.id
        ? {
            ...property,
            options: [...property.options, structuredClone(option)],
          }
        : item,
    ),
    overrides: {
      ...editor.overrides,
      [option.id]: structuredClone(editor.overrides[sourceId] ?? {}),
    },
  };
}

export function removeVariantOption(
  editor: StructureEditorData,
  propertyId: string,
  optionId: string,
) {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (!property || property.kind !== "variant")
    throw new Error("The variant property is unavailable.");
  if (property.defaultOptionId === optionId)
    throw new Error("The default option cannot be deleted.");
  if (!property.options.some((item) => item.id === optionId))
    throw new Error("The variant option is unavailable.");
  return {
    ...editor,
    properties: editor.properties.map((item) =>
      item.id === propertyId
        ? {
            ...property,
            options: property.options.filter(
              (option) => option.id !== optionId,
            ),
          }
        : item,
    ),
    overrides: Object.fromEntries(
      Object.entries(editor.overrides).filter(([id]) => id !== optionId),
    ),
  };
}

export function removeBooleanProperty(
  editor: StructureEditorData,
  propertyId: string,
) {
  if (
    !editor.properties.some(
      (item) => item.id === propertyId && item.kind === "boolean",
    )
  )
    throw new Error("The boolean property is unavailable.");
  return {
    ...editor,
    properties: editor.properties.filter((item) => item.id !== propertyId),
    visibilityBindings: Object.fromEntries(
      Object.entries(editor.visibilityBindings).filter(
        ([, binding]) => binding.propertyId !== propertyId,
      ),
    ),
  };
}

export function renameVariantOption(
  editor: StructureEditorData,
  propertyId: string,
  optionId: string,
  name: string,
  taxonomy: TaxonomyDocument,
  createTerm = false,
) {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (!property || property.kind !== "variant")
    throw new Error("The variant property is unavailable.");
  const option = property.options.find((item) => item.id === optionId);
  if (!option) throw new Error("The selected variant option is unavailable.");
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

export function renameVariantProperty(
  editor: StructureEditorData,
  propertyId: string,
  name: string,
  taxonomy: TaxonomyDocument,
  createTerm = false,
) {
  const property = editor.properties.find((item) => item.id === propertyId);
  if (!property || property.kind !== "variant")
    throw new Error("The variant property is unavailable.");
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

function renameAssignment(
  classification: Classification,
  name: string,
  taxonomy: TaxonomyDocument,
  createTerm: boolean,
) {
  const assignments = Object.entries(classification);
  if (assignments.length !== 1 || typeof assignments[0][1] !== "string")
    throw new Error("Edit this option's ordered terms in the Registry.");
  const [categoryId] = assignments[0];
  if (!name.trim()) throw new Error("Give the option a name.");
  const existing = taxonomy.terms.find(
    (term) =>
      term.categoryId === categoryId &&
      taxonomyValueKey(term.value) === taxonomyValueKey(name.trim()),
  );
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

export function restoreEditorRemoval(
  current: StructureEditorData,
  before: StructureEditorData,
  after: StructureEditorData,
): StructureEditorData {
  const next = structuredClone(current);
  for (const [index, property] of before.properties.entries()) {
    const remaining = after.properties.find((item) => item.id === property.id);
    if (!remaining) {
      if (next.properties.some((item) => item.id === property.id))
        throw new Error("This property has already been restored.");
      next.properties.splice(index, 0, structuredClone(property));
    } else if (property.kind === "variant" && remaining.kind === "variant") {
      if (
        property.options.every((option) =>
          remaining.options.some((item) => item.id === option.id),
        )
      )
        continue;
      const target = next.properties.find((item) => item.id === property.id);
      if (!target || target.kind !== "variant")
        throw new Error("The variant property was removed after this option.");
      for (const [optionIndex, option] of property.options.entries()) {
        if (remaining.options.some((item) => item.id === option.id)) continue;
        if (target.options.some((item) => item.id === option.id))
          throw new Error("This option has already been restored.");
        target.options.splice(optionIndex, 0, structuredClone(option));
      }
    }
  }
  for (const key of ["visibilityBindings", "overrides"] as const) {
    for (const id of Object.keys(before[key])) {
      if (Object.hasOwn(after[key], id)) continue;
      if (Object.hasOwn(next[key], id))
        throw new Error(
          "A later edit changed this binding or option. Undo cannot overwrite it.",
        );
    }
  }
  for (const [id, binding] of Object.entries(before.visibilityBindings))
    if (!Object.hasOwn(after.visibilityBindings, id))
      next.visibilityBindings[id] = structuredClone(binding);
  for (const [id, override] of Object.entries(before.overrides))
    if (!Object.hasOwn(after.overrides, id)) {
      next.overrides[id] = structuredClone(override);
      if (before.semanticIdentities?.[id]) {
        next.semanticIdentities ??= {};
        next.semanticIdentities[id] = structuredClone(
          before.semanticIdentities[id],
        );
      }
    }
  return next;
}
