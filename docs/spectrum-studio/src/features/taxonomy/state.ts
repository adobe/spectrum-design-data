// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { designSystemDefaults } from "../../data/defaults";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import {
  assertTaxonomy,
  isTaxonomyDocument,
  updateTaxonomy,
  type TaxonomyDocument,
} from "./model";
import { structuresDocumentAtom } from "../structures/documentState";
import { assertStructureTaxonomy } from "../structures/model";
import { taxonomyContributionsEnabledAtom } from "./contributions";

const stored = persistedAtom<TaxonomyDocument>({
  key: "registry/taxonomy",
  schemaVersion: 1,
  initialize: () => structuredClone(designSystemDefaults.system.taxonomy),
  validate: isTaxonomyDocument,
  preserveInvalid: true,
});
export const taxonomyDocumentAtom = atom(
  (get) => get(stored),
  (
    get,
    set,
    update:
      | TaxonomyDocument
      | ((previous: TaxonomyDocument) => TaxonomyDocument),
  ) => {
    const previous = get(stored);
    const next = typeof update === "function" ? update(previous) : update;
    assertTaxonomy(next);
    if (get(taxonomyContributionsEnabledAtom))
      assertStructureTaxonomy(get(structuresDocumentAtom), next);
    set(stored, updateTaxonomy(previous, next));
  },
);
export const editTaxonomyAtom = atom(
  null,
  (get, set, document: TaxonomyDocument) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change the taxonomy.");
    set(taxonomyDocumentAtom, document);
  },
);
export const restoreTaxonomySnapshotAtom = atom(
  null,
  (_get, set, document: TaxonomyDocument) => {
    assertTaxonomy(document);
    set(stored, structuredClone(document));
  },
);
