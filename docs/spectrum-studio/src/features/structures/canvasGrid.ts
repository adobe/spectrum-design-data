// Copyright 2026 Adobe. All rights reserved.
import type { OptionProperty } from "../option-groups/model";
import type { StructurePreviewState } from "./variants";

export interface StructureCanvasCell {
  key: string;
  label: string;
  preview: StructurePreviewState;
  isActive: boolean;
}

export interface StructureCanvasColumn {
  propertyId: string | null;
  label: string;
  cells: StructureCanvasCell[];
}

export function canvasLabel(text: string) {
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

const sameState = (
  a: Pick<StructurePreviewState, "options" | "booleans">,
  b: Pick<StructurePreviewState, "options" | "booleans">,
) =>
  Object.entries(a.options).every(([id, value]) => b.options[id] === value) &&
  Object.entries(a.booleans).every(([id, value]) => b.booleans[id] === value);

/**
 * One column per property; each cell changes only that property and keeps
 * every other property at its default. `selectedKey` is the last clicked cell,
 * which disambiguates identical default cells across columns.
 */
export function structureCanvasGrid(
  properties: readonly OptionProperty[],
  preview: StructurePreviewState,
  selectedKey?: string | null,
): StructureCanvasColumn[] {
  if (!properties.length)
    return [
      {
        propertyId: null,
        label: "",
        cells: [{ key: "default", label: "", preview, isActive: true }],
      },
    ];
  const defaults: Pick<StructurePreviewState, "options" | "booleans"> = {
    options: {},
    booleans: {},
  };
  for (const property of properties) {
    if (property.kind === "variant")
      defaults.options[property.id] = property.defaultOptionId;
    else defaults.booleans[property.id] = property.defaultValue;
  }
  const columns: StructureCanvasColumn[] = properties.map((property) => ({
    propertyId: property.id,
    label: canvasLabel(property.name),
    cells:
      property.kind === "variant"
        ? property.options.map((option) => ({
            key: `${property.id}:${option.id}`,
            label: canvasLabel(option.name),
            preview: {
              ...preview,
              activePropertyId: property.id,
              options: { ...defaults.options, [property.id]: option.id },
              booleans: { ...defaults.booleans },
            },
            isActive: false,
          }))
        : [true, false].map((value) => ({
            key: `${property.id}:${value}`,
            label: value ? "On" : "Off",
            preview: {
              ...preview,
              options: { ...defaults.options },
              booleans: { ...defaults.booleans, [property.id]: value },
            },
            isActive: false,
          })),
  }));
  const cells = columns.flatMap((column) => column.cells);
  const current = {
    options: { ...defaults.options, ...preview.options },
    booleans: { ...defaults.booleans, ...preview.booleans },
  };
  const clicked = cells.find((cell) => cell.key === selectedKey);
  const activeColumn =
    columns.find((column) => column.propertyId === preview.activePropertyId) ??
    columns[0];
  const active =
    (clicked && sameState(clicked.preview, current) ? clicked : undefined) ??
    activeColumn.cells.find((cell) => sameState(cell.preview, current)) ??
    cells.find((cell) => sameState(cell.preview, current)) ??
    activeColumn.cells.find(
      (cell) =>
        cell.preview.options[activeColumn.propertyId!] ===
          current.options[activeColumn.propertyId!] &&
        cell.preview.booleans[activeColumn.propertyId!] ===
          current.booleans[activeColumn.propertyId!],
    );
  if (active) active.isActive = true;
  return columns;
}
