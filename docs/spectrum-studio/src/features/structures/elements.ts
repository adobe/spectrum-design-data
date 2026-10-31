// Copyright 2026 Adobe. All rights reserved.
import { tokenUuid } from "../tokens/model";
import { authoringReferencePattern } from "../tokens/primitiveIdentity";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import { taxonomyIdPattern, type TaxonomyDocument } from "../taxonomy/model";
import { STRUCTURE_TERM_IDS } from "./vocabulary";
import { isSpectrumIconName } from "../icons/spectrumIconNames.generated";

export const ELEMENT_CATEGORY_ID = "1c9dc5cf-5df3-4d4b-a25a-cf24c7e53efa";
export const ELEMENT_TYPES = {
  text: {
    termId: "34e351e7-37c2-4df2-ac75-4f04e25272f3",
    label: "Text",
    slots: ["fontSize", "lineHeight"],
  },
  visual: {
    termId: "44d05161-a960-4fed-ac11-723b4021cca0",
    label: "Visual",
    slots: [
      "width",
      "height",
      "minWidth",
      "minHeight",
      "maxWidth",
      "maxHeight",
    ],
  },
  workflowIcon: {
    termId: "b8b5a40d-a9c1-49bd-8df7-ed52571b4206",
    label: "Workflow-icon",
    slots: ["size"],
  },
  uiIcon: {
    termId: "c8bb5451-b245-4de7-806a-ea006a15a1ae",
    label: "UI-icon",
    slots: ["size"],
  },
  bar: {
    termId: "03556ff4-f6e6-48bd-89a8-91d9c78ce730",
    label: "Bar",
    slots: ["thickness", "length"],
  },
} as const;
export type ElementKind = keyof typeof ELEMENT_TYPES;
export type ElementSlot = (typeof ELEMENT_TYPES)[ElementKind]["slots"][number];
export interface ElementBinding {
  id: string;
  slot: ElementSlot;
  $ref: string;
  family: "size" | "typography";
}
export interface StructureElement {
  id: string;
  kind: ElementKind;
  termId: string;
  bindings: ElementBinding[];
  glyph?: string;
  orientation?: string;
}
export const ELEMENT_SLOT_LABELS: Record<ElementSlot, string> = {
  fontSize: "Font size",
  lineHeight: "Line height",
  width: "Width",
  height: "Height",
  minWidth: "Minimum width",
  minHeight: "Minimum height",
  maxWidth: "Maximum width",
  maxHeight: "Maximum height",
  size: "Size",
  thickness: "Thickness",
  length: "Length",
};
export const UI_GLYPHS = [
  "ChevronDown",
  "ChevronUp",
  "ChevronLeft",
  "ChevronRight",
  "Checkmark",
  "Close",
] as const;
export const elementSlots = (kind: ElementKind): readonly ElementSlot[] =>
  ELEMENT_TYPES[kind].slots;
export const elementBindingId = (id: string, slot: ElementSlot) =>
  tokenUuid(`template-element-slot:v1:${id}:${slot}`);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const fields = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

export function isStructureElement(value: unknown): value is StructureElement {
  if (
    !record(value) ||
    !fields(value, [
      "id",
      "kind",
      "termId",
      "bindings",
      "glyph",
      "orientation",
    ]) ||
    typeof value.id !== "string" ||
    !taxonomyIdPattern.test(value.id) ||
    typeof value.kind !== "string" ||
    !Object.hasOwn(ELEMENT_TYPES, value.kind) ||
    !Array.isArray(value.bindings)
  )
    return false;
  const kind = value.kind as ElementKind;
  if (value.termId !== ELEMENT_TYPES[kind].termId) return false;
  if (kind === "workflowIcon" || kind === "uiIcon") {
    if (
      !isSpectrumIconName(value.glyph) ||
      (kind === "uiIcon" && !UI_GLYPHS.some((glyph) => glyph === value.glyph))
    )
      return false;
  } else if (value.glyph !== undefined) return false;
  if (kind === "bar") {
    if (
      value.orientation !== STRUCTURE_TERM_IDS.horizontal &&
      value.orientation !== STRUCTURE_TERM_IDS.vertical
    )
      return false;
  } else if (value.orientation !== undefined) return false;
  const slots = new Set<string>();
  return value.bindings.every((binding) => {
    if (
      !record(binding) ||
      !fields(binding, ["id", "slot", "$ref", "family"]) ||
      !["size", "typography"].includes(String(binding.family)) ||
      typeof binding.slot !== "string" ||
      !elementSlots(kind).some((slot) => slot === binding.slot) ||
      slots.has(binding.slot) ||
      binding.id !==
        elementBindingId(value.id as string, binding.slot as ElementSlot) ||
      typeof binding.$ref !== "string" ||
      !authoringReferencePattern.test(binding.$ref)
    )
      return false;
    slots.add(binding.slot);
    return true;
  });
}
export function createElement(
  kind: ElementKind,
  id = crypto.randomUUID(),
): StructureElement {
  return {
    id,
    kind,
    termId: ELEMENT_TYPES[kind].termId,
    bindings: [],
    ...(kind === "workflowIcon"
      ? { glyph: "Home" }
      : kind === "uiIcon"
        ? { glyph: "ChevronDown" }
        : {}),
    ...(kind === "bar" ? { orientation: STRUCTURE_TERM_IDS.horizontal } : {}),
  };
}
export function elementReferenceAllowed(
  slot: ElementSlot,
  reference: PrimitiveReference,
) {
  if (reference.family === "typography")
    return elementMetricAllowed(slot, reference.metricId);
  if (slot === "fontSize" || slot === "lineHeight") return false;
  return reference.family === "size";
}
export function elementMetricAllowed(
  slot: ElementSlot,
  metricId: string | undefined,
) {
  return slot === "fontSize"
    ? metricId === "font-size"
    : slot === "lineHeight"
      ? !!(
          metricId?.endsWith("-lineHeight") ||
          metricId?.endsWith("-unitlessLineHeight")
        )
      : slot === "size" && metricId === "workflow-icon-size";
}
export function assertElementTaxonomy(
  elements: readonly StructureElement[],
  taxonomy: TaxonomyDocument,
) {
  const category = taxonomy.categories.find(
    (item) => item.id === ELEMENT_CATEGORY_ID,
  );
  for (const element of elements) {
    if (
      !category ||
      category.key !== "element" ||
      !category.scopes.includes("structures") ||
      !taxonomy.terms.some(
        (term) => term.id === element.termId && term.categoryId === category.id,
      )
    ) {
      throw new Error(
        "A template element's Registry type is unavailable. Restore its term before editing the template.",
      );
    }
    if (
      element.orientation &&
      !taxonomy.terms.some((term) => term.id === element.orientation)
    )
      throw new Error("A Bar orientation term is unavailable.");
  }
}
export function assertElementReferences(
  elements: readonly StructureElement[],
  references: readonly PrimitiveReference[],
) {
  for (const element of elements)
    for (const binding of element.bindings) {
      const reference = references.find((item) => item.id === binding.$ref);
      if (
        !reference ||
        reference.family !== binding.family ||
        !elementReferenceAllowed(binding.slot, reference) ||
        reference.error
      ) {
        throw new Error(
          `${ELEMENT_TYPES[element.kind].label} - ${ELEMENT_SLOT_LABELS[binding.slot]}: ${reference?.error ?? "the referenced token is unavailable or incompatible."}`,
        );
      }
    }
}
