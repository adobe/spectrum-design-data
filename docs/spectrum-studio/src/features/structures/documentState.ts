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
import type { StructurePreviewState } from "./variants";

export const structuresDocumentAtom = persistedAtom<StructuresDocument>({
  key: "design/structures",
  schemaVersion: STRUCTURES_SCHEMA_VERSION,
  initialize: () => structuredClone(designSystemDefaults.system.structures),
  validate: isStructuresDocument,
  migrate: (data) => upgradeStructuresDocument(data),
});
export const selectedStructureIdAtom = atom<string | null>(null);
const previewsAtom = atom<Record<string, StructurePreviewState>>({});
export const clearStructurePreviewsAtom = atom(null, (_get, set) =>
  set(previewsAtom, {}),
);
export const structurePreviewStateAtom = atom(
  (get): StructurePreviewState => {
    const id = get(selectedStructureIdAtom);
    const structure = get(structuresDocumentAtom).structures.find(
      (item) => item.conceptId === id,
    );
    const stored = id ? get(previewsAtom)[id] : undefined;
    const properties = structure?.editor?.properties ?? [];
    const variants = properties.filter(
      (property) => property.kind === "variant",
    );
    const active =
      variants.find((property) => property.id === stored?.activePropertyId) ??
      variants[0];
    return {
      activePropertyId: active?.id ?? null,
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
    };
  },
  (get, set, patch: Partial<StructurePreviewState>) => {
    const id = get(selectedStructureIdAtom);
    if (!id) throw new Error("Select a structure before changing its preview.");
    set(previewsAtom, {
      ...get(previewsAtom),
      [id]: { ...get(structurePreviewStateAtom), ...patch },
    });
  },
);
