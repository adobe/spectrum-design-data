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
import {
  resolveElements,
  templateTargets,
  hasCustomElementTargets,
} from "./elementResolution";
import {
  isLeaf,
  leafElements,
  type StructureChild,
  type StructureInsertionContext,
} from "./children";
import {
  reconcileVariantLayers,
  type StructureEditorData,
  type StructurePreviewState,
} from "./variants";
import { updateStructureEditorAtom } from "./variantState";
import { structureEditor } from "./variants";
import {
  updateOptionOverrides,
  planLayerInsertion,
  editorAfterLayerInsertion,
} from "./variantOperations";

export const selectedElementIdAtom = atom<string | null>(null);
interface ElementEdit {
  structureId: string;
  elements: StructureChild[];
  generation?: Structure["generation"];
  editor?: StructureEditorData;
}
export const editElementsAtom = atom(null, (get, set, input: ElementEdit) => {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to change template elements.");
  const document = get(structuresDocumentAtom);
  const current = document.structures.find(
    (structure) => structure.conceptId === input.structureId,
  );
  if (!current) throw new Error("The selected Structure is unavailable.");
  const next = reconcileVariantLayers({
    ...current,
    elements: input.elements,
    generation: Object.hasOwn(input, "generation")
      ? input.generation
      : current.generation,
    ...(input.editor && { editor: input.editor }),
  });
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
      preview?: StructurePreviewState;
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    if (!current) throw new Error("The selected Structure is unavailable.");
    const elements = [...(current.elements ?? [])];
    const plan = planLayerInsertion(
      current,
      input.index,
      input.expected,
      input.preview,
    );
    const element = createElement(input.kind);
    elements.splice(plan.sharedIndex, 0, element);
    set(editElementsAtom, {
      structureId: input.structureId,
      elements,
      ...(current.editor && {
        editor: editorAfterLayerInsertion(current, plan, element.id),
      }),
    });
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
      optionId?: string;
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    const element =
      (input.optionId && current
        ? current.editor?.overrides[input.optionId]?.elements?.[input.elementId]
        : undefined) ??
      current?.elements?.find((element) => element.id === input.elementId);
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
    if (input.optionId) {
      const resolved = resolveElements(
        {
          ...current,
          elements: current.elements!.map((child) =>
            child.id === next.id ? next : child,
          ),
        },
        get(primitiveReferencesAtom),
        get(rulesAtom),
      ).find((item) => item.element.id === next.id);
      if (resolved?.issues.length) throw new Error(resolved.issues.join(" "));
      const editor = structureEditor(current);
      const override = editor.overrides[input.optionId] ?? {};
      set(updateStructureEditorAtom, {
        structureId: current.conceptId,
        editor: updateOptionOverrides(editor, input.optionId, {
          ...override,
          elements: { ...override.elements, [next.id]: next },
        }),
      });
      return;
    }
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
  editor?: StructureEditorData;
  afterEditor?: StructureEditorData;
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
    const affected = hasCustomElementTargets(current, element.id);
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
      editor: current.editor,
      afterEditor: get(structuresDocumentAtom).structures.find(
        (item) => item.conceptId === current.conceptId,
      )?.editor,
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
    if (JSON.stringify(current.editor) !== JSON.stringify(removed.afterEditor))
      throw new Error(
        "Layer properties changed. Undo those changes before restoring this layer.",
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
      editor: removed.editor,
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
      preview?: StructurePreviewState;
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (source) => source.conceptId === input.structureId,
    );
    if (!current) throw new Error("The selected Structure is unavailable.");
    const elements = [...(current.elements ?? [])];
    const plan = planLayerInsertion(
      current,
      input.index,
      input.expected,
      input.preview,
    );
    const child: StructureChild = {
      id: crypto.randomUUID(),
      kind: "structureReference",
      structureId: input.targetId,
    };
    elements.splice(plan.sharedIndex, 0, child);
    set(editElementsAtom, {
      structureId: input.structureId,
      elements,
      ...(current.editor && {
        editor: editorAfterLayerInsertion(current, plan, child.id),
      }),
    });
    set(selectedElementIdAtom, child.id);
    return child.id;
  },
);
