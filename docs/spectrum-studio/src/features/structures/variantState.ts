// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { classificationIssues } from "../option-groups/model";
import { updateTaxonomy, type TaxonomyDocument } from "../taxonomy/model";
import { structuresDocumentAtom } from "./documentState";
import {
  assertStructureReferences,
  assertStructureTaxonomy,
  type Structure,
} from "./model";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { restoreEditorRemoval } from "./variantOperations";
import { synchronizeVariantIdentities } from "./semanticIdentity";
import { modeSetsAtom } from "../modes/state";
import {
  structureEditor,
  structureVariantIssues,
  type StructureEditorData,
} from "./variants";

export { structurePreviewStateAtom } from "./documentState";

export const updateStructureEditorAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      editor?: StructureEditorData;
      description?: string;
      taxonomy?: TaxonomyDocument;
    },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change Structures.");
    const document = get(structuresDocumentAtom);
    const current = document.structures.find(
      (item) => item.conceptId === input.structureId,
    );
    if (!current) throw new Error("The selected structure is unavailable.");
    const editor = input.editor ?? structureEditor(current);
    const taxonomy = input.taxonomy ?? get(taxonomyDocumentAtom);
    if (input.taxonomy) updateTaxonomy(get(taxonomyDocumentAtom), taxonomy);
    const next: Structure = {
      ...current,
      ...(input.editor && { editor }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
    };
    if (
      input.editor &&
      !editor.properties.length &&
      !Object.keys(editor.visibility).length &&
      !Object.keys(editor.visibilityBindings).length &&
      !Object.keys(editor.overrides).length
    )
      delete next.editor;
    const issues = [
      ...structureVariantIssues(next),
      ...editor.properties.flatMap((property) =>
        property.kind === "boolean"
          ? []
          : [
              ...classificationIssues(property.classification, taxonomy),
              ...property.options.flatMap((option) =>
                classificationIssues(option.classification, taxonomy),
              ),
            ],
      ),
    ];
    if (issues.length) throw new Error(issues.join(" "));
    const updated = synchronizeVariantIdentities(
      {
        ...document,
        structures: document.structures.map((item) =>
          item.conceptId === input.structureId ? next : item,
        ),
      },
      get(modeSetsAtom),
    );
    assertStructureTaxonomy(updated, taxonomy);
    assertStructureReferences(
      updated,
      new Map(
        get(primitiveReferencesAtom).map((reference) => [
          reference.id,
          reference.family,
        ]),
      ),
    );
    const updates = new Map<string, unknown>([["design/structures", updated]]);
    if (input.taxonomy) updates.set("registry/taxonomy", taxonomy);
    withValidatedAuthoringUpdates(get, updates, () => {
      if (input.taxonomy) set(taxonomyDocumentAtom, taxonomy);
      set(structuresDocumentAtom, updated);
    });
  },
);

export const restoreStructureEditorRemovalAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      before: StructureEditorData;
      after: StructureEditorData;
    },
  ) => {
    const structure = get(structuresDocumentAtom).structures.find(
      (item) => item.conceptId === input.structureId,
    );
    if (!structure)
      throw new Error("The structure was removed after this edit.");
    set(updateStructureEditorAtom, {
      structureId: input.structureId,
      editor: restoreEditorRemoval(
        structureEditor(structure),
        input.before,
        input.after,
      ),
    });
  },
);
