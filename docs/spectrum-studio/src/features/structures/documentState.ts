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

export const structuresDocumentAtom = persistedAtom<StructuresDocument>({
  key: "design/structures",
  schemaVersion: STRUCTURES_SCHEMA_VERSION,
  initialize: () => structuredClone(designSystemDefaults.system.structures),
  validate: isStructuresDocument,
  migrate: (data) => upgradeStructuresDocument(data),
});
export const selectedStructureIdAtom = atom<string | null>(null);
