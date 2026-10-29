// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import {
  structuresDocumentAtom,
  selectedStructureIdAtom,
} from "./documentState";
import {
  assignStructure,
  assertStructureReferences,
  assertStructureTaxonomy,
  createStructure,
  structureGeneration,
  structureSlotDefinition,
  type Structure,
  type StructureRuleApplication,
  type StructureSelection,
  type StructureSlot,
  type StructuresDocument,
} from "./model";
import {
  constraintChoiceIssue,
  isConstraintSlot,
  type PreviewLayoutContext,
} from "./resolution";
import { governStructureName, structureName } from "./generation";
import { captureSnapshot } from "../edit-session/state";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";
import { updateTaxonomy } from "../taxonomy/model";
import { assertElementReferences } from "./elements";
import { resolveElements } from "./elementResolution";
import { eligibleStructureBindings } from "./generation";
import { rulesAtom } from "../logic/library";
import { STRUCTURES_SCHEMA_VERSION } from "./model";
import { assertStructureGraph, leafElements } from "./children";
import { registerTerm } from "../taxonomy/model";
import { ELEMENT_CATEGORY_ID } from "./elements";
import { VARIANT_CATEGORY_IDS } from "../taxonomy/variantVocabulary";

export { selectedStructureIdAtom, structuresDocumentAtom };
export const resolvedStructuresAtom = atom((get) =>
  get(structuresDocumentAtom).structures.map((structure) => ({
    ...structure,
    name: structureName(structure, get(taxonomyDocumentAtom)),
  })),
);
export const selectedStructureAtom = atom(
  (get) =>
    get(resolvedStructuresAtom).find(
      (item) => item.conceptId === get(selectedStructureIdAtom),
    ) ?? null,
);
const requireEditing = (editing: boolean) => {
  if (!editing) throw new Error("Enter edit mode to change structures.");
};

export const validateStructuresAtom = atom(
  null,
  (get, _set, document: StructuresDocument) => {
    assertStructureTaxonomy(document, get(taxonomyDocumentAtom));
    assertStructureReferences(
      document,
      new Map(
        get(primitiveReferencesAtom).map((item) => [item.id, item.family]),
      ),
    );
    for (const structure of document.structures) {
      assertElementReferences(
        leafElements(structure),
        get(primitiveReferencesAtom),
      );
      const issues = resolveElements(
        structure,
        get(primitiveReferencesAtom),
        get(rulesAtom),
      ).flatMap((element) => element.issues);
      if (issues.length) throw new Error(issues.join(" "));
    }
  },
);
export const addStructureAtom = atom(null, (get, set) => {
  requireEditing(get(editModeAtom));
  const document = get(structuresDocumentAtom);
  let number = 1;
  while (
    document.structures.some(
      (item) => item.name.toLowerCase() === `structure ${number}`,
    )
  )
    number++;
  const structure = createStructure(`Structure ${number}`);
  const next = { ...document, structures: [...document.structures, structure] };
  set(validateStructuresAtom, next);
  set(structuresDocumentAtom, next);
  set(selectedStructureIdAtom, structure.conceptId);
  return structure.conceptId;
});
export const renameStructureAtom = atom(
  null,
  (get, set, input: { id: string; name: string }) => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    if (!document.structures.some((item) => item.conceptId === input.id))
      throw new Error("This structure is no longer available.");
    const name = input.name.trim();
    if (!name) throw new Error("Give the structure a name.");
    const current = document.structures.find(
      (item) => item.conceptId === input.id,
    )!;
    const previousTaxonomy = get(taxonomyDocumentAtom);
    const named = {
      structure: { ...current, name },
      taxonomy: previousTaxonomy,
    };
    const next = {
      ...document,
      structures: document.structures.map((item) =>
        item.conceptId === input.id ? named.structure : item,
      ),
    };
    assertStructureTaxonomy(next, named.taxonomy);
    updateTaxonomy(previousTaxonomy, named.taxonomy);
    buildTshirtArtifacts({
      ...captureSnapshot(get),
      structures: next,
      taxonomy: named.taxonomy,
    });
    if (named.taxonomy !== previousTaxonomy)
      set(taxonomyDocumentAtom, named.taxonomy);
    set(structuresDocumentAtom, next);
  },
);
export const setStructureTokenNamingAtom = atom(
  null,
  (
    get,
    set,
    input: { structureId: string; termId?: string | null; createName?: string },
  ) => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    const current = document.structures.find(
      (source) => source.conceptId === input.structureId,
    );
    if (!current) throw new Error("The selected Structure is unavailable.");
    const previous = get(taxonomyDocumentAtom);
    const termId =
      input.createName === undefined ? input.termId : crypto.randomUUID();
    const taxonomy =
      input.createName === undefined
        ? previous
        : registerTerm(
            previous,
            VARIANT_CATEGORY_IDS.structure,
            input.createName.trim(),
            termId!,
          );
    const term = taxonomy.terms.find((term) => term.id === termId);
    if (
      termId &&
      (!term ||
        ![VARIANT_CATEGORY_IDS.structure, ELEMENT_CATEGORY_ID].includes(
          term.categoryId,
        ))
    )
      throw new Error("Choose an Element or Structure naming term.");
    const generation = structureGeneration(current);
    const { nameRef: oldNameRef, ...settings } = generation;
    void oldNameRef;
    const source = {
      ...current,
      generation: {
        ...settings,
        ...(term && {
          nameRef: { categoryId: term.categoryId, termId: term.id },
        }),
      },
    };
    const next = {
      ...document,
      structures: document.structures.map((item) =>
        item === current ? source : item,
      ),
    };
    assertStructureTaxonomy(next, taxonomy);
    updateTaxonomy(previous, taxonomy);
    buildTshirtArtifacts({
      ...captureSnapshot(get),
      taxonomy,
      structures: next,
    });
    set(taxonomyDocumentAtom, taxonomy);
    set(structuresDocumentAtom, next);
  },
);
export const assignStructureAtom = atom(
  null,
  (
    get,
    set,
    input: {
      id: string;
      changes: Partial<Record<StructureSlot, StructureSelection | null>>;
      layout: PreviewLayoutContext;
    },
  ) => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    const current = document.structures.find(
      (item) => item.conceptId === input.id,
    );
    if (!current) throw new Error("This structure is no longer available.");
    const references = get(primitiveReferencesAtom);
    for (const [slot, selection] of Object.entries(input.changes) as [
      StructureSlot,
      StructureSelection | null,
    ][]) {
      if (selection && "$ref" in selection) {
        const reference = references.find((item) => item.id === selection.$ref);
        if (
          !reference ||
          reference.family !== structureSlotDefinition(slot).family ||
          reference.error
        )
          throw new Error(
            reference?.error ??
              "This token is no longer available for the selected property.",
          );
      }
    }
    const structure = assignStructure(current, input.changes);
    for (const slot of Object.keys(input.changes) as StructureSlot[]) {
      const selection = input.changes[slot];
      if (!isConstraintSlot(slot) || !selection) continue;
      const issue = constraintChoiceIssue(
        structure,
        slot,
        selection,
        references,
        input.layout,
      );
      if (issue) throw new Error(issue);
    }
    const next = {
      ...document,
      structures: document.structures.map((item) =>
        item.conceptId === input.id ? structure : item,
      ),
    };
    set(validateStructuresAtom, next);
    set(structuresDocumentAtom, next);
  },
);
export interface RemovedStructure {
  structure: Structure;
  index: number;
  wasSelected: boolean;
}
export const removeStructureAtom = atom(
  null,
  (get, set, id: string): RemovedStructure => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    const index = document.structures.findIndex(
      (item) => item.conceptId === id,
    );
    if (index < 0) throw new Error("This structure is no longer available.");
    const wasSelected = get(selectedStructureIdAtom) === id;
    const dependents = document.structures.filter((source) =>
      source.elements?.some(
        (child) =>
          child.kind === "structureReference" && child.structureId === id,
      ),
    );
    if (dependents.length)
      throw new Error(
        `${document.structures[index].name} is used by ${dependents.map((source) => source.name).join(", ")}. Remove those instances before deleting the source.`,
      );
    assertStructureGraph(
      document.structures.filter((source) => source.conceptId !== id),
    );
    set(structuresDocumentAtom, {
      ...document,
      structures: document.structures.filter((item) => item.conceptId !== id),
    });
    if (wasSelected) set(selectedStructureIdAtom, null);
    return { structure: document.structures[index], index, wasSelected };
  },
);
export const restoreStructureAtom = atom(
  null,
  (get, set, removed: RemovedStructure) => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    if (
      document.structures.some(
        (item) => item.conceptId === removed.structure.conceptId,
      )
    )
      throw new Error("This structure has already been restored.");
    const structures = [...document.structures];
    structures.splice(
      Math.min(removed.index, structures.length),
      0,
      removed.structure,
    );
    const next = { ...document, structures };
    set(validateStructuresAtom, next);
    buildTshirtArtifacts({ ...captureSnapshot(get), structures: next });
    set(structuresDocumentAtom, next);
    if (removed.wasSelected && get(selectedStructureIdAtom) === null)
      set(selectedStructureIdAtom, removed.structure.conceptId);
  },
);

export const applyStructureRuleAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      application: StructureRuleApplication;
      nameTermId?: string;
    },
  ) => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    const current = document.structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    if (!current) throw new Error("This structure is no longer available.");
    const previousTaxonomy = get(taxonomyDocumentAtom);
    const hasLayout =
      input.application.targets.kind === "all"
        ? eligibleStructureBindings(current).length > 0
        : input.application.targets.bindingIds.length > 0;
    if (hasLayout && !structureGeneration(current).nameRef)
      throw new Error(
        "Choose Token naming in Structure settings before generating layout tokens.",
      );
    const named = hasLayout
      ? governStructureName(
          current,
          previousTaxonomy,
          structureName(current, previousTaxonomy),
          input.nameTermId,
        )
      : { structure: current, taxonomy: previousTaxonomy };
    const generation = structureGeneration(named.structure);
    const found = generation.applications.some(
      (application) => application.id === input.application.id,
    );
    const structure = {
      ...named.structure,
      generation: {
        ...generation,
        applications: found
          ? generation.applications.map((application) =>
              application.id === input.application.id
                ? input.application
                : application,
            )
          : [...generation.applications, input.application],
      },
    };
    const next: StructuresDocument = {
      schemaVersion: STRUCTURES_SCHEMA_VERSION,
      structures: document.structures.map((item) =>
        item.conceptId === structure.conceptId ? structure : item,
      ),
    };
    assertStructureTaxonomy(next, named.taxonomy);
    assertStructureReferences(
      next,
      new Map(
        get(primitiveReferencesAtom).map((item) => [item.id, item.family]),
      ),
    );
    const previewIssues = resolveElements(
      structure,
      get(primitiveReferencesAtom),
      get(rulesAtom),
    ).flatMap((element) => element.issues);
    if (previewIssues.length) throw new Error(previewIssues.join(" "));
    updateTaxonomy(previousTaxonomy, named.taxonomy);
    buildTshirtArtifacts({
      ...captureSnapshot(get),
      structures: next,
      taxonomy: named.taxonomy,
    });
    if (named.taxonomy !== previousTaxonomy)
      set(taxonomyDocumentAtom, named.taxonomy);
    set(structuresDocumentAtom, next);
  },
);

export const setStructureSizesAtom = atom(
  null,
  (get, set, input: { structureId: string; sizeTermIds: string[] }) => {
    requireEditing(get(editModeAtom));
    if (!input.sizeTermIds.includes(SIZE_TERM_IDS.m))
      throw new Error("Medium is required.");
    const document = get(structuresDocumentAtom);
    if (
      !document.structures.some(
        (structure) => structure.conceptId === input.structureId,
      )
    )
      throw new Error("This structure is no longer available.");
    const next: StructuresDocument = {
      schemaVersion: STRUCTURES_SCHEMA_VERSION,
      structures: document.structures.map((structure) =>
        structure.conceptId === input.structureId
          ? {
              ...structure,
              generation: {
                ...structureGeneration(structure),
                sizeTermIds: [...input.sizeTermIds],
              },
            }
          : structure,
      ),
    };
    set(validateStructuresAtom, next);
    buildTshirtArtifacts({ ...captureSnapshot(get), structures: next });
    set(structuresDocumentAtom, next);
  },
);

export interface RemovedStructureApplication {
  structureId: string;
  application: StructureRuleApplication;
  index: number;
}
export const removeStructureRuleAtom = atom(
  null,
  (
    get,
    set,
    input: { structureId: string; applicationId: string },
  ): RemovedStructureApplication => {
    requireEditing(get(editModeAtom));
    const document = get(structuresDocumentAtom);
    const structure = document.structures.find(
      (item) => item.conceptId === input.structureId,
    );
    if (!structure) throw new Error("This structure is no longer available.");
    const generation = structureGeneration(structure);
    const index = generation.applications.findIndex(
      (application) => application.id === input.applicationId,
    );
    if (index < 0) throw new Error("This application is no longer available.");
    set(structuresDocumentAtom, {
      schemaVersion: STRUCTURES_SCHEMA_VERSION,
      structures: document.structures.map((item) =>
        item.conceptId === input.structureId
          ? {
              ...item,
              generation: {
                ...generation,
                applications: generation.applications.filter(
                  (application) => application.id !== input.applicationId,
                ),
              },
            }
          : item,
      ),
    });
    return {
      structureId: input.structureId,
      application: generation.applications[index],
      index,
    };
  },
);
export const restoreStructureRuleAtom = atom(
  null,
  (get, set, removed: RemovedStructureApplication) => {
    const structure = get(structuresDocumentAtom).structures.find(
      (item) => item.conceptId === removed.structureId,
    );
    if (!structure)
      throw new Error(
        "Restore its Structure before restoring this application.",
      );
    if (
      structureGeneration(structure).applications.some(
        (application) => application.id === removed.application.id,
      )
    )
      throw new Error("This application has already been restored.");
    set(applyStructureRuleAtom, {
      structureId: removed.structureId,
      application: removed.application,
    });
    const document = get(structuresDocumentAtom);
    set(structuresDocumentAtom, {
      ...document,
      structures: document.structures.map((item) => {
        if (item.conceptId !== removed.structureId) return item;
        const generation = structureGeneration(item);
        const applications = generation.applications.filter(
          (application) => application.id !== removed.application.id,
        );
        applications.splice(
          Math.min(removed.index, applications.length),
          0,
          removed.application,
        );
        return { ...item, generation: { ...generation, applications } };
      }),
    });
  },
);
