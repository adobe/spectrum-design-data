// Copyright 2026 Adobe. All rights reserved.
import { isLeaf, type StructureChild } from "./children";
import type { Structure } from "./model";
import { structureEditor, type StructurePreviewState } from "./variants";
import { configuredStructure } from "./configuration";

export function structureLayerPreview(
  structure: Structure,
  previews: Readonly<Record<string, StructurePreviewState>>,
): StructurePreviewState {
  const stored = previews[structure.conceptId];
  const properties = structureEditor(structure).properties;
  const variants = properties.filter((property) => property.kind === "variant");
  return {
    activePropertyId:
      variants.find((property) => property.id === stored?.activePropertyId)
        ?.id ??
      variants[0]?.id ??
      null,
    options: Object.fromEntries(
      variants.map((property) => [
        property.id,
        property.options.find(
          (option) => option.id === stored?.options[property.id],
        )?.id ?? property.defaultOptionId,
      ]),
    ),
    booleans: Object.fromEntries(
      properties
        .filter((property) => property.kind === "boolean")
        .map((property) => [
          property.id,
          stored?.booleans[property.id] ?? property.defaultValue,
        ]),
    ),
    indentationLevel:
      stored?.indentationLevel === 1 || stored?.indentationLevel === 2
        ? stored.indentationLevel
        : 0,
  };
}

export interface StructureLayer {
  key: string;
  child: StructureChild;
  owner: Structure;
  layout?: Structure;
  path: string;
  configuration: ReturnType<typeof configuredStructure>;
  children: StructureLayer[];
}

export function structureLayers(
  structure: Structure,
  catalog: readonly Structure[],
  previews: Readonly<Record<string, StructurePreviewState>> = {},
  path = "",
  root = structure,
): StructureLayer[] {
  const resolved = configuredStructure(root, path, catalog, previews);
  return resolved.order.flatMap((id) => {
    const child =
      resolved.structure.elements?.find((item) => item.id === id) ??
      structure.elements?.find((item) => item.id === id);
    if (!child) return [];
    const target = !isLeaf(child)
      ? catalog.find((item) => item.conceptId === child.structureId)
      : undefined;
    const layout =
      target?.parentStructureId === structure.conceptId ? target : undefined;
    const childPath = `${path}/${id}`;
    return [
      {
        key: path ? childPath : id,
        child,
        owner: structure,
        layout,
        path: childPath,
        configuration: resolved,
        children: layout
          ? structureLayers(layout, catalog, previews, childPath, root)
          : [],
      },
    ];
  });
}

export function findStructureLayer(
  layers: readonly StructureLayer[],
  id: string | null,
): StructureLayer | undefined {
  for (const layer of layers) {
    if (layer.key === id) return layer;
    const nested = findStructureLayer(layer.children, id);
    if (nested) return nested;
  }
}
