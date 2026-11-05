// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import {
  assignStructure,
  structureSelection,
  structureSlotDefinition,
  type Structure,
  type StructureSelection,
  type StructureSlot,
} from "./model";
import { STRUCTURE_TERM_IDS as terms } from "./vocabulary";

export interface PreviewLayoutContext {
  availableWidth: number | null;
  availableHeight: number | null;
  naturalWidth: number | null;
  naturalHeight: number | null;
}
export const UNMEASURED_LAYOUT: PreviewLayoutContext = {
  availableWidth: null,
  availableHeight: null,
  naturalWidth: null,
  naturalHeight: null,
};
const lengthSlots = {
  width: "width",
  height: "height",
  minWidth: "minWidth",
  minHeight: "minHeight",
  maxWidth: "maxWidth",
  maxHeight: "maxHeight",
  gap: "gap",
  indent: "marginInlineStart",
  paddingTop: "paddingTop",
  paddingRight: "paddingRight",
  paddingBottom: "paddingBottom",
  paddingLeft: "paddingLeft",
  radiusTopLeft: "borderTopLeftRadius",
  radiusTopRight: "borderTopRightRadius",
  radiusBottomRight: "borderBottomRightRadius",
  radiusBottomLeft: "borderBottomLeftRadius",
} as const;
export type ConstraintSlot =
  | "minWidth"
  | "maxWidth"
  | "minHeight"
  | "maxHeight";
export const isConstraintSlot = (slot: string): slot is ConstraintSlot =>
  slot === "minWidth" ||
  slot === "maxWidth" ||
  slot === "minHeight" ||
  slot === "maxHeight";

/** Shared by preview and generation: padding that centers content inside Min height, in whole pixels. */
export function centerInMinHeight(minHeight: number, content: number) {
  const raw = Math.round((minHeight - content) / 2);
  return raw < 0
    ? {
        value: 0,
        issue: `The content height (${content}px) is taller than Min height (${minHeight}px). Padding is set to 0.`,
      }
    : { value: raw };
}

function resolveDerived(
  structure: Structure,
  contentRef: string,
  references: readonly PrimitiveReference[],
  layout: PreviewLayoutContext,
): { value?: number; error?: string } {
  const minimum = structureSelection(structure, "minHeight");
  if (!minimum)
    return { error: "Set a Min height so the content can be centered." };
  const height = resolveLength(minimum, "minHeight", references, layout);
  if (height.error) return { error: `Min height: ${height.error}` };
  const content = references.find((item) => item.id === contentRef);
  if (
    !content ||
    content.error ||
    typeof content.value !== "number" ||
    !Number.isFinite(content.value)
  )
    return {
      error:
        content?.error ??
        "The content height token is unavailable. Choose another line height.",
    };
  const centered = centerInMinHeight(height.value!, content.value);
  return centered.issue
    ? { value: centered.value, error: centered.issue }
    : { value: centered.value };
}

function resolveLength(
  selection: StructureSelection | null,
  slot: StructureSlot,
  references: readonly PrimitiveReference[],
  layout: PreviewLayoutContext,
) {
  if (!selection) return { value: undefined };
  if ("$ref" in selection) {
    const reference = references.find((item) => item.id === selection.$ref);
    if (!reference || reference.family !== structureSlotDefinition(slot).family)
      return {
        error:
          "The linked token is unavailable or belongs to another foundation.",
      };
    if (reference.error) return { error: reference.error };
    if (
      typeof reference.value !== "number" ||
      !Number.isFinite(reference.value) ||
      reference.value < 0
    )
      return {
        error: "This token does not resolve to a finite, non-negative length.",
      };
    return { value: reference.value };
  }
  if (selection.value.kind === "number")
    return selection.value.unit === "px"
      ? { value: selection.value.value }
      : { error: "Choose a pixel value for this length property." };
  if (selection.value.kind !== "sizing")
    return { error: "Choose a size token, Hug, or Fill." };
  const vertical =
    slot === "height" || slot === "minHeight" || slot === "maxHeight";
  const value =
    selection.value.preset === "hug"
      ? vertical
        ? layout.naturalHeight
        : layout.naturalWidth
      : vertical
        ? layout.availableHeight
        : layout.availableWidth;
  return value === null || !Number.isFinite(value) || value < 0
    ? { error: "The preview must be measured before comparing Hug or Fill." }
    : { value };
}

export function constraintIssue(
  structure: Structure,
  axis: "width" | "height",
  references: readonly PrimitiveReference[],
  layout: PreviewLayoutContext,
): string | undefined {
  const minimumSlot = axis === "width" ? "minWidth" : "minHeight";
  const maximumSlot = axis === "width" ? "maxWidth" : "maxHeight";
  const minimumSelection = structureSelection(structure, minimumSlot);
  const maximumSelection = structureSelection(structure, maximumSlot);
  if (!minimumSelection || !maximumSelection) return;
  const minimum = resolveLength(
    minimumSelection,
    minimumSlot,
    references,
    layout,
  );
  const maximum = resolveLength(
    maximumSelection,
    maximumSlot,
    references,
    layout,
  );
  if (minimum.error || maximum.error) return minimum.error ?? maximum.error;
  if (minimum.value! > maximum.value!)
    return `Minimum ${axis} (${minimum.value}px) exceeds maximum ${axis} (${maximum.value}px) in this preview. Choose a compatible bound.`;
}

export function constraintChoiceIssue(
  structure: Structure,
  slot: ConstraintSlot,
  selection: StructureSelection,
  references: readonly PrimitiveReference[],
  layout: PreviewLayoutContext,
): string | undefined {
  const candidate = resolveLength(selection, slot, references, layout);
  if (candidate.error)
    return `${structureSlotDefinition(slot).label}: ${candidate.error}`;
  const next = assignStructure(structure, { [slot]: selection });
  return constraintIssue(
    next,
    slot === "minWidth" || slot === "maxWidth" ? "width" : "height",
    references,
    layout,
  );
}

export function constraintChoiceAllowed(
  structure: Structure,
  slot: ConstraintSlot,
  selection: StructureSelection,
  references: readonly PrimitiveReference[],
  layout: PreviewLayoutContext,
) {
  return !constraintChoiceIssue(structure, slot, selection, references, layout);
}

export function resolveStructure(
  structure: Structure,
  references: readonly PrimitiveReference[],
  layout: PreviewLayoutContext = UNMEASURED_LAYOUT,
  indentationLevel: 0 | 1 | 2 = 1,
) {
  const direction = structureSelection(structure, "direction");
  const column =
    direction &&
    "value" in direction &&
    direction.value.kind === "term" &&
    direction.value.termId === terms.vertical;
  const styles: CSSProperties = {
    display: "flex",
    flexDirection: column ? "column" : "row",
    boxSizing: "border-box",
  };
  const issues: Partial<Record<StructureSlot, string>> = {};
  for (const [slot, property] of Object.entries(lengthSlots) as [
    keyof typeof lengthSlots,
    (typeof lengthSlots)[keyof typeof lengthSlots],
  ][]) {
    const selection = structureSelection(structure, slot);
    if (!selection) continue;
    if (
      (slot === "width" || slot === "height") &&
      "value" in selection &&
      selection.value.kind === "sizing"
    ) {
      styles[property] =
        selection.value.preset === "hug" ? "max-content" : "100%";
      continue;
    }
    const resolved =
      "value" in selection && selection.value.kind === "derived"
        ? resolveDerived(
            structure,
            selection.value.contentRef,
            references,
            layout,
          )
        : resolveLength(selection, slot, references, layout);
    if (resolved.error) issues[slot] = resolved.error;
    if (resolved.value !== undefined)
      styles[property] =
        slot === "indent" ? resolved.value * indentationLevel : resolved.value;
  }
  const horizontal = structureSelection(structure, "horizontal");
  const vertical = structureSelection(structure, "vertical");
  if (horizontal && "value" in horizontal && horizontal.value.kind === "term") {
    styles[column ? "alignItems" : "justifyContent"] =
      horizontal.value.termId === terms.left
        ? "flex-start"
        : horizontal.value.termId === terms.center
          ? "center"
          : "flex-end";
  }
  if (vertical && "value" in vertical && vertical.value.kind === "term") {
    styles[column ? "justifyContent" : "alignItems"] =
      vertical.value.termId === terms.top
        ? "flex-start"
        : vertical.value.termId === terms.middle
          ? "center"
          : "flex-end";
  }
  const elevation = structureSelection(structure, "elevation");
  if (elevation && "$ref" in elevation) {
    const reference = references.find((item) => item.id === elevation.$ref);
    if (
      !reference ||
      reference.family !== "elevation" ||
      reference.error ||
      typeof reference.value !== "string"
    )
      issues.elevation =
        reference?.error ?? "The linked complete elevation is unavailable.";
    else styles.boxShadow = reference.value;
  }
  for (const axis of ["width", "height"] as const) {
    const issue = constraintIssue(structure, axis, references, layout);
    if (issue) {
      issues[axis === "width" ? "minWidth" : "minHeight"] = issue;
      issues[axis === "width" ? "maxWidth" : "maxHeight"] = issue;
    }
  }
  const intrinsicStyles: CSSProperties = {
    ...styles,
    width: "max-content",
    height: "max-content",
    minWidth: undefined,
    minHeight: undefined,
    maxWidth: undefined,
    maxHeight: undefined,
  };
  return { styles, intrinsicStyles, issues };
}
