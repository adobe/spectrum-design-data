// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { designSystemDefaults } from "../../data/defaults";
import {
  STRUCTURES_SCHEMA_VERSION,
  isStructuresDocument,
  upgradeStructuresDocument,
  type StructuresDocument,
} from "./model";
import {
  EMPTY_STRUCTURE_PREVIEW,
  type StructurePreviewState,
} from "./variants";
import { structureLayerPreview } from "./layers";
import { withTaxonomyContributions } from "../taxonomy/contributions";
import {
  reconcileStructureNames,
  resolveStructureNames,
} from "./registeredNames";

const storedStructuresDocumentAtom = persistedAtom<StructuresDocument>({
  key: "design/structures",
  schemaVersion: STRUCTURES_SCHEMA_VERSION,
  initialize: () => structuredClone(designSystemDefaults.system.structures),
  validate: isStructuresDocument,
  migrate: (data) => upgradeStructuresDocument(data),
});
export const structuresDocumentAtom = withTaxonomyContributions(
  storedStructuresDocumentAtom,
  () => [],
  isStructuresDocument,
  "design/structures",
  {
    resolve: resolveStructureNames,
    reconcile: (taxonomy, previous, next) =>
      reconcileStructureNames(taxonomy, previous, next),
  },
);
export const selectedStructureIdAtom = atom<string | null>(null);
export const structurePreviewsAtom = atom<
  Record<string, StructurePreviewState>
>({});
export const clearStructurePreviewsAtom = atom(null, (_get, set) =>
  set(structurePreviewsAtom, {}),
);
export const structurePreviewStateAtom = atom(
  (get): StructurePreviewState => {
    const id = get(selectedStructureIdAtom);
    const structure = get(structuresDocumentAtom).structures.find(
      (item) => item.conceptId === id,
    );
    return structure
      ? structureLayerPreview(structure, get(structurePreviewsAtom))
      : EMPTY_STRUCTURE_PREVIEW;
  },
  (get, set, patch: Partial<StructurePreviewState>) => {
    const id = get(selectedStructureIdAtom);
    if (!id) throw new Error("Select a structure before changing its preview.");
    set(structurePreviewsAtom, {
      ...get(structurePreviewsAtom),
      [id]: { ...get(structurePreviewStateAtom), ...patch },
    });
  },
);
