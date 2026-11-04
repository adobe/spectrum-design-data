// Copyright 2026 Adobe. All rights reserved.
import { taxonomyIdPattern } from "../taxonomy/model";
import type { StructureElement } from "./elements";
import type { Structure } from "./model";

export interface StructureInstance {
  id: string;
  kind: "structureReference";
  structureId: string;
}
export type StructureChild = StructureElement | StructureInstance;
export interface StructureInsertionContext {
  childIds: string[];
  direction: "horizontal" | "vertical";
}
export const topLevelStructures = (structures: readonly Structure[]) =>
  structures.filter((structure) => !structure.parentStructureId);
export function ownedStructureIds(
  structures: readonly Structure[],
  id: string,
) {
  const ids = new Set([id]);
  for (const ownerId of ids)
    for (const structure of structures)
      if (structure.parentStructureId === ownerId) ids.add(structure.conceptId);
  return ids;
}
export const isLeaf = (child: StructureChild): child is StructureElement =>
  child.kind !== "structureReference";
export const leafElements = (structure: Pick<Structure, "elements">) =>
  (structure.elements ?? []).filter(isLeaf);
export function isStructureInstance(
  value: unknown,
): value is StructureInstance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    Object.keys(item).every((key) =>
      ["id", "kind", "structureId"].includes(key),
    ) &&
    item.kind === "structureReference" &&
    typeof item.id === "string" &&
    taxonomyIdPattern.test(item.id) &&
    typeof item.structureId === "string" &&
    taxonomyIdPattern.test(item.structureId)
  );
}
export function assertStructureGraph(structures: readonly Structure[]) {
  const catalog = new Map(
    structures.map((structure) => [structure.conceptId, structure]),
  );
  if (catalog.size !== structures.length)
    throw new Error("Structure definitions must have unique identities.");
  for (const structure of structures)
    if (
      structure.parentStructureId &&
      !catalog.has(structure.parentStructureId)
    )
      throw new Error(
        `${structure.name}: its containing Structure is unavailable.`,
      );
  const complete = new Set<string>(),
    active = new Set<string>();
  const visit = (id: string) => {
    const source = catalog.get(id);
    if (!source)
      throw new Error(
        `Referenced Structure ${id} is unavailable. Remove its instances before deleting the source.`,
      );
    if (active.has(id))
      throw new Error(
        `${source.name}: Structures cannot reference themselves, directly or indirectly.`,
      );
    if (complete.has(id)) return;
    active.add(id);
    for (const child of source.elements ?? [])
      if (!isLeaf(child)) visit(child.structureId);
    active.delete(id);
    complete.add(id);
  };
  for (const source of structures) visit(source.conceptId);
}
export function structureCandidates(
  structures: readonly Structure[],
  parentId: string,
) {
  const reaches = (id: string, visited = new Set<string>()): boolean => {
    if (id === parentId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return (
      structures.find((source) => source.conceptId === id)?.elements ?? []
    ).some((child) => !isLeaf(child) && reaches(child.structureId, visited));
  };
  return structures.filter(
    (source) => !source.parentStructureId && !reaches(source.conceptId),
  );
}
