// Copyright 2026 Adobe. All rights reserved.
import type { ElementSlot } from "../../features/structures/elements";
import type { StructureSlot } from "../../features/structures/model";

export type AppearanceSlot = StructureSlot | ElementSlot;

/**
 * Inspector sections, in display order. Presentation only: grouping does not
 * change any authored data or generated output.
 */
export const APPEARANCE_SECTIONS = [
  { id: "layout", label: "Layout" },
  { id: "typography", label: "Typography" },
  { id: "color", label: "Color" },
  { id: "elevation", label: "Elevation" },
] as const;
export type AppearanceSectionId = (typeof APPEARANCE_SECTIONS)[number]["id"];

/** Every slot must be placed in a section, so new slots fail to compile until categorized. */
export const APPEARANCE_SLOT_SECTIONS: Record<
  AppearanceSlot,
  AppearanceSectionId
> = {
  direction: "layout",
  horizontal: "layout",
  vertical: "layout",
  width: "layout",
  height: "layout",
  minWidth: "layout",
  minHeight: "layout",
  maxWidth: "layout",
  maxHeight: "layout",
  size: "layout",
  thickness: "layout",
  length: "layout",
  gap: "layout",
  indent: "layout",
  paddingTop: "layout",
  paddingRight: "layout",
  paddingBottom: "layout",
  paddingLeft: "layout",
  radiusTopLeft: "layout",
  radiusTopRight: "layout",
  radiusBottomRight: "layout",
  radiusBottomLeft: "layout",
  fontSize: "typography",
  lineHeight: "typography",
  elevation: "elevation",
};

/** Sections that have at least one of the given slots, in display order. */
export function appearanceSectionsFor(
  slots: readonly AppearanceSlot[],
  extra: readonly AppearanceSectionId[] = [],
) {
  const used = new Set<AppearanceSectionId>([
    ...slots.map((slot) => APPEARANCE_SLOT_SECTIONS[slot]),
    ...extra,
  ]);
  return APPEARANCE_SECTIONS.filter((section) => used.has(section.id));
}
