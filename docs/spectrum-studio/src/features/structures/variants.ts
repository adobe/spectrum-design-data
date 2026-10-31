// Copyright 2026 Adobe. All rights reserved.
import {
  mergeClassifications,
  type OptionProperty,
} from "../option-groups/model";
import {
  assignStructure,
  structureSelection,
  type Structure,
  type StructureSelection,
  type StructureSlot,
} from "./model";
import { isLeaf } from "./children";
import type { StructureElement } from "./elements";
import type { VariantSemanticIdentities } from "./semanticIdentity";

export interface VisibilityBinding {
  propertyId: string;
  inverted: boolean;
}
export interface StructureOptionOverrides {
  slots?: Partial<Record<StructureSlot, StructureSelection | null>>;
  order?: string[];
  visibility?: Record<string, boolean>;
  elements?: Record<string, StructureElement>;
}
export interface StructureEditorData {
  semanticIdentities?: VariantSemanticIdentities;
  properties: OptionProperty[];
  visibility: Record<string, boolean>;
  visibilityBindings: Record<string, VisibilityBinding>;
  overrides: Record<string, StructureOptionOverrides>;
}
export interface StructurePreviewState {
  activePropertyId: string | null;
  options: Record<string, string>;
  booleans: Record<string, boolean>;
}
export const EMPTY_STRUCTURE_PREVIEW: StructurePreviewState = {
  activePropertyId: null,
  options: {},
  booleans: {},
};
export const emptyStructureEditor = (): StructureEditorData => ({
  properties: [],
  visibility: {},
  visibilityBindings: {},
  overrides: {},
});
export const structureEditor = (structure: Structure): StructureEditorData =>
  structure.editor ?? emptyStructureEditor();

export function structureVariantIssues(structure: Structure): string[] {
  const editor = structureEditor(structure);
  const issues: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const children = new Set((structure.elements ?? []).map((child) => child.id));
  const options = new Set<string>();
  for (const property of editor.properties) {
    if (ids.has(property.id))
      issues.push("Property identities must be unique.");
    ids.add(property.id);
    if (!property.name.trim()) issues.push("Give every property a name.");
    const name = property.name.trim().toLowerCase();
    if (names.has(name)) issues.push("Give every property a distinct name.");
    names.add(name);
    if (property.kind === "variant") {
      const optionNames = new Set<string>();
      const classifications = new Set<string>();
      if (
        !property.options.some(
          (option) => option.id === property.defaultOptionId,
        )
      )
        issues.push(`${property.name}: its default option is unavailable.`);
      for (const option of property.options) {
        const name = option.name.trim().toLowerCase();
        if (!name) issues.push("Give every option a name.");
        if (optionNames.has(name))
          issues.push(`${property.name}: give every option a distinct name.`);
        optionNames.add(name);
        const classification = JSON.stringify(
          Object.entries(option.classification).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        );
        if (classifications.has(classification))
          issues.push(
            `${property.name}: choose distinct Registry assignments for each option.`,
          );
        classifications.add(classification);
        issues.push(
          ...mergeClassifications(
            property.classification,
            option.classification,
          ).issues,
        );
        if (ids.has(option.id))
          issues.push("Option identities must be unique.");
        ids.add(option.id);
        options.add(option.id);
      }
      if (editor.overrides[property.defaultOptionId])
        issues.push(
          `${property.name}: edit the shared structure instead of overriding its default option.`,
        );
    }
  }
  for (const [childId, binding] of Object.entries(editor.visibilityBindings)) {
    if (!children.has(childId))
      issues.push("A boolean binding targets a removed layer.");
    if (
      !editor.properties.some(
        (property) =>
          property.id === binding.propertyId && property.kind === "boolean",
      )
    )
      issues.push("A layer references an unavailable boolean.");
  }
  for (const childId of Object.keys(editor.visibility)) {
    if (!children.has(childId))
      issues.push("Visibility targets a removed layer.");
  }
  for (const [id, override] of Object.entries(editor.overrides)) {
    if (!options.has(id))
      issues.push("Differences reference an unavailable option.");
    if (
      override.order &&
      (override.order.length !== children.size ||
        new Set(override.order).size !== children.size ||
        override.order.some((childId) => !children.has(childId)))
    )
      issues.push("An option's layer order does not match the shared layers.");
    for (const childId of Object.keys(override.visibility ?? {}))
      if (!children.has(childId))
        issues.push("An option's visibility targets a removed layer.");
    for (const [childId, element] of Object.entries(override.elements ?? {})) {
      const child = structure.elements?.find((item) => item.id === childId);
      if (
        !child ||
        !isLeaf(child) ||
        child.kind !== element.kind ||
        element.id !== childId
      )
        issues.push("An option cannot replace a layer's identity or type.");
    }
  }
  return issues;
}

export function normalizeStructureEditorAfterReset(
  editor: Partial<StructureEditorData>,
): StructureEditorData | undefined {
  const overrides = Object.fromEntries(
    Object.entries(editor.overrides ?? {}).flatMap(([id, override]) => {
      const fields: StructureOptionOverrides = {
        ...(override.slots &&
          Object.keys(override.slots).length && { slots: override.slots }),
        ...(override.visibility &&
          Object.keys(override.visibility).length && {
            visibility: override.visibility,
          }),
        ...(override.elements &&
          Object.keys(override.elements).length && {
            elements: override.elements,
          }),
        ...(override.order && { order: override.order }),
      };
      return Object.keys(fields).length ? [[id, fields]] : [];
    }),
  );
  const normalized: StructureEditorData = {
    ...editor,
    properties: editor.properties ?? [],
    visibility: editor.visibility ?? {},
    visibilityBindings: editor.visibilityBindings ?? {},
    overrides,
  };
  return normalized.properties.length ||
    Object.keys(normalized.visibility).length ||
    Object.keys(normalized.visibilityBindings).length ||
    Object.keys(overrides).length
    ? normalized
    : undefined;
}

export function resolveStructureOptions(
  structure: Structure,
  preview: StructurePreviewState = EMPTY_STRUCTURE_PREVIEW,
): {
  structure: Structure;
  issues: string[];
  visibility: Record<string, boolean>;
  order: string[];
} {
  const editor = structureEditor(structure);
  const issues = structureVariantIssues(structure);
  const writes = new Map<string, { value: unknown; owner: string }>();
  const slots: StructureOptionOverrides["slots"] = {};
  let order = (structure.elements ?? []).map((child) => child.id);
  const visibility = { ...editor.visibility };
  const elements = new Map(
    (structure.elements ?? []).map((child) => [child.id, child]),
  );
  const write = (
    key: string,
    value: unknown,
    owner: string,
    apply: () => void,
  ) => {
    const previous = writes.get(key);
    if (previous && JSON.stringify(previous.value) !== JSON.stringify(value)) {
      issues.push(
        `${previous.owner} and ${owner} both change ${key}. Resolve their conflicting differences.`,
      );
      return;
    }
    writes.set(key, { value, owner });
    apply();
  };
  for (const property of editor.properties) {
    if (property.kind !== "variant") continue;
    const id = preview.options[property.id] ?? property.defaultOptionId;
    const option = property.options.find((item) => item.id === id);
    if (!option) {
      issues.push(`${property.name}: the selected option is unavailable.`);
      continue;
    }
    if (id === property.defaultOptionId) continue;
    const override = editor.overrides[id];
    if (!override) continue;
    const owner = `${property.name}: ${option.name}`;
    for (const [slot, value] of Object.entries(override.slots ?? {}))
      write(slot, value, owner, () => {
        slots[slot as StructureSlot] = value;
      });
    if (override.order)
      write("layer order", override.order, owner, () => {
        order = override.order!;
      });
    for (const [childId, visible] of Object.entries(override.visibility ?? {}))
      write(`${childId} visibility`, visible, owner, () => {
        visibility[childId] = visible;
      });
    for (const [childId, element] of Object.entries(override.elements ?? {})) {
      const base = structure.elements?.find(
        (element) => element.id === childId,
      );
      if (!base || !isLeaf(base)) continue;
      for (const key of ["bindings", "glyph", "orientation"] as const) {
        if (JSON.stringify(base[key]) !== JSON.stringify(element[key]))
          write(`${childId} ${key}`, element[key], owner, () => {
            const current = elements.get(childId);
            if (current && isLeaf(current))
              elements.set(childId, { ...current, [key]: element[key] });
          });
      }
    }
  }
  for (const [childId, binding] of Object.entries(editor.visibilityBindings)) {
    const property = editor.properties.find(
      (item) => item.id === binding.propertyId,
    );
    if (property?.kind !== "boolean") continue;
    const value = preview.booleans[property.id] ?? property.defaultValue;
    visibility[childId] =
      visibility[childId] !== false && (binding.inverted ? !value : value);
  }
  const resolved = assignStructure(structure, slots);
  return {
    structure: {
      ...resolved,
      editor: undefined,
      elements: order.flatMap((id) => {
        const element = elements.get(id);
        return element && visibility[id] !== false ? [element] : [];
      }),
    },
    issues,
    visibility,
    order,
  };
}

export function optionSlotChanges(
  structure: Structure,
  previous: StructureOptionOverrides,
  changes: NonNullable<StructureOptionOverrides["slots"]>,
): StructureOptionOverrides {
  const slots = { ...previous.slots };
  for (const [key, value] of Object.entries(changes)) {
    const slot = key as StructureSlot;
    if (
      JSON.stringify(value) ===
      JSON.stringify(structureSelection(structure, slot))
    )
      delete slots[slot];
    else slots[slot] = value;
  }
  return { ...previous, slots };
}

export function reconcileVariantLayers(structure: Structure): Structure {
  if (!structure.editor) return structure;
  const ids = (structure.elements ?? []).map((child) => child.id);
  const retained = <T>(records: Record<string, T> = {}) =>
    Object.fromEntries(
      Object.entries(records).filter(([id]) => ids.includes(id)),
    );
  return {
    ...structure,
    editor: {
      ...structure.editor,
      visibility: retained(structure.editor.visibility),
      visibilityBindings: retained(structure.editor.visibilityBindings),
      overrides: Object.fromEntries(
        Object.entries(structure.editor.overrides).map(([id, override]) => [
          id,
          {
            ...override,
            ...(override.order && {
              order: [
                ...override.order.filter((child) => ids.includes(child)),
                ...ids.filter((child) => !override.order!.includes(child)),
              ],
            }),
            ...(override.visibility && {
              visibility: retained(override.visibility),
            }),
            ...(override.elements && { elements: retained(override.elements) }),
          },
        ]),
      ),
    },
  };
}
