// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { rulesAtom } from "../logic/library";
import { structuresDocumentAtom } from "./documentState";
import {
  assertStructureTaxonomy,
  STRUCTURES_SCHEMA_VERSION,
  structureGeneration,
  structureSelection,
  type Structure,
  type StructuresDocument,
} from "./model";
import {
  assertElementReferences,
  createElement,
  elementBindingId,
  isStructureElement,
  type ElementKind,
  type ElementSlot,
} from "./elements";
import { resolveElements, templateTargets } from "./elementResolution";
import {
  isLeaf,
  leafElements,
  type StructureChild,
  type StructureInsertionContext,
} from "./children";
import { STRUCTURE_TERM_IDS } from "./vocabulary";

function assertInsertionPosition(
  structure: Structure,
  index: number,
  expected?: StructureInsertionContext,
) {
  const children = structure.elements ?? [];
  if (!Number.isInteger(index) || index < 0 || index > children.length)
    throw new Error("The insertion location is no longer available.");
  if (!expected) return;
  const direction = structureSelection(structure, "direction");
  const column =
    direction &&
    "value" in direction &&
    direction.value.kind === "term" &&
    direction.value.termId === STRUCTURE_TERM_IDS.vertical;
  if (
    expected.direction !== (column ? "vertical" : "horizontal") ||
    expected.childIds.length !== children.length ||
    expected.childIds.some((id, position) => id !== children[position].id)
  ) {
    throw new Error(
      "The Structure changed while its picker was open. Choose the insertion location again.",
    );
  }
}

export const selectedElementIdAtom = atom<string | null>(null);
interface ElementEdit {
  structureId: string;
  elements: StructureChild[];
  generation?: Structure["generation"];
}
export const editElementsAtom = atom(null, (get, set, input: ElementEdit) => {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to change template elements.");
  const document = get(structuresDocumentAtom);
  const current = document.structures.find(
    (structure) => structure.conceptId === input.structureId,
  );
  if (!current) throw new Error("The selected Structure is unavailable.");
  const next = {
    ...current,
    elements: input.elements,
    generation: Object.hasOwn(input, "generation")
      ? input.generation
      : current.generation,
  };
  const updated: StructuresDocument = {
    schemaVersion: STRUCTURES_SCHEMA_VERSION,
    structures: document.structures.map((structure) =>
      structure === current ? next : structure,
    ),
  };
  assertStructureTaxonomy(updated, get(taxonomyDocumentAtom));
  assertElementReferences(leafElements(next), get(primitiveReferencesAtom));
  const resolved = resolveElements(
    next,
    get(primitiveReferencesAtom),
    get(rulesAtom),
  );
  if (resolved.some((element) => element.issues.length))
    throw new Error(resolved.flatMap((element) => element.issues).join(" "));
  set(structuresDocumentAtom, updated);
});
export const insertElementAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      kind: ElementKind;
      index: number;
      expected?: StructureInsertionContext;
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    if (!current) throw new Error("The selected Structure is unavailable.");
    const elements = [...(current.elements ?? [])];
    assertInsertionPosition(current, input.index, input.expected);
    const element = createElement(input.kind);
    elements.splice(input.index, 0, element);
    set(editElementsAtom, { structureId: input.structureId, elements });
    set(selectedElementIdAtom, element.id);
    return element.id;
  },
);
export const updateElementAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      elementId: string;
      slot?: ElementSlot;
      referenceId?: string | null;
      glyph?: string;
      orientation?: string;
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    const element = current?.elements?.find(
      (element) => element.id === input.elementId,
    );
    if (!element || !current || !isLeaf(element))
      throw new Error(
        "The selected leaf element is unavailable. Edit a referenced Structure at its source.",
      );
    let next = {
      ...element,
      ...(input.glyph !== undefined && { glyph: input.glyph }),
      ...(input.orientation !== undefined && {
        orientation: input.orientation,
      }),
    };
    if (input.slot) {
      const reference = get(primitiveReferencesAtom).find(
        (reference) => reference.id === input.referenceId,
      );
      if (
        input.referenceId &&
        (!reference ||
          (reference.family !== "size" && reference.family !== "typography"))
      )
        throw new Error("Choose an available element token.");
      next = {
        ...next,
        bindings: [
          ...element.bindings.filter((binding) => binding.slot !== input.slot),
          ...(reference &&
          (reference.family === "size" || reference.family === "typography")
            ? [
                {
                  id: elementBindingId(element.id, input.slot),
                  slot: input.slot,
                  $ref: reference.id,
                  family: reference.family,
                },
              ]
            : []),
        ],
      };
    }
    if (!isStructureElement(next))
      throw new Error("The element settings are invalid.");
    set(editElementsAtom, {
      structureId: current.conceptId,
      elements: current.elements!.map((element) =>
        element.id === next.id ? next : element,
      ),
    });
  },
);
export interface RemovedElement {
  structureId: string;
  element: StructureChild;
  index: number;
  generation: Structure["generation"];
  afterGeneration: Structure["generation"];
}
export const removeElementAtom = atom(
  null,
  (
    get,
    set,
    input: { structureId: string; elementId: string; confirmed: boolean },
  ): RemovedElement => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    const index =
      current?.elements?.findIndex(
        (element) => element.id === input.elementId,
      ) ?? -1;
    if (!current || index < 0)
      throw new Error("The selected element is unavailable.");
    const element = current.elements![index];
    const ids = new Set(
      isLeaf(element) ? element.bindings.map((binding) => binding.id) : [],
    );
    const generation = structureGeneration(current);
    const affected = generation.applications.some((application) => {
      const targets = templateTargets(application);
      return (
        targets.kind === "custom" &&
        targets.bindingIds.some((id) => ids.has(id))
      );
    });
    if (affected && !input.confirmed)
      throw new Error(
        "Confirm removal of this element's Custom preview targets.",
      );
    const afterGeneration = affected
      ? {
          ...generation,
          applications: generation.applications.map((application) => {
            const targets = templateTargets(application);
            return targets.kind === "custom" &&
              targets.bindingIds.some((id) => ids.has(id))
              ? {
                  ...application,
                  previewTargets: {
                    kind: "custom" as const,
                    bindingIds: targets.bindingIds.filter((id) => !ids.has(id)),
                  },
                }
              : application;
          }),
        }
      : current.generation;
    set(editElementsAtom, {
      structureId: current.conceptId,
      elements: current.elements!.filter(
        (element) => element.id !== input.elementId,
      ),
      generation: afterGeneration,
    });
    set(selectedElementIdAtom, null);
    return {
      structureId: current.conceptId,
      element,
      index,
      generation: current.generation,
      afterGeneration,
    };
  },
);
export const restoreElementAtom = atom(
  null,
  (get, set, removed: RemovedElement) => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === removed.structureId,
    );
    if (
      !current ||
      current.elements?.some((element) => element.id === removed.element.id)
    )
      throw new Error("This element cannot be restored here.");
    if (
      JSON.stringify(current.generation) !==
      JSON.stringify(removed.afterGeneration)
    )
      throw new Error(
        "The sizing applications changed. Restore their previous selections before undoing this deletion.",
      );
    const elements = [...(current.elements ?? [])];
    elements.splice(
      Math.min(removed.index, elements.length),
      0,
      removed.element,
    );
    set(editElementsAtom, {
      structureId: removed.structureId,
      elements,
      generation: removed.generation,
    });
    set(selectedElementIdAtom, removed.element.id);
  },
);
export const insertStructureInstanceAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      targetId: string;
      index: number;
      expected?: StructureInsertionContext;
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (source) => source.conceptId === input.structureId,
    );
    if (!current) throw new Error("The selected Structure is unavailable.");
    const elements = [...(current.elements ?? [])];
    assertInsertionPosition(current, input.index, input.expected);
    const child: StructureChild = {
      id: crypto.randomUUID(),
      kind: "structureReference",
      structureId: input.targetId,
    };
    elements.splice(input.index, 0, child);
    set(editElementsAtom, { structureId: input.structureId, elements });
    set(selectedElementIdAtom, child.id);
    return child.id;
  },
);
