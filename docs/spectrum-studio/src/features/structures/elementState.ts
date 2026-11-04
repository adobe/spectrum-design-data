// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { registerTerm, type TaxonomyDocument } from "../taxonomy/model";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { rulesAtom } from "../logic/library";
import { structuresDocumentAtom } from "./documentState";
import {
  assertStructureTaxonomy,
  createStructure,
  STRUCTURES_SCHEMA_VERSION,
  structureGeneration,
  type Structure,
  type StructureNumberLiteral,
} from "./model";
import {
  assertElementReferences,
  ELEMENT_CATEGORY_ID,
  ELEMENT_TYPES,
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
  ownedStructureIds,
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
  reconcileOwnedConfigurations,
  ownedLayoutAt,
  withLayoutConfiguration,
} from "./configuration";
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
  taxonomy?: TaxonomyDocument;
  addedLayouts?: { structure: Structure; index: number }[];
  removedLayoutIds?: ReadonlySet<string>;
  configurations?: { structureId: string; editor?: StructureEditorData }[];
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
  const structures = document.structures
    .filter((structure) => !input.removedLayoutIds?.has(structure.conceptId))
    .map((structure) => (structure === current ? next : structure));
  for (const layout of [...(input.addedLayouts ?? [])].sort(
    (a, b) => a.index - b.index,
  ))
    structures.splice(
      Math.min(layout.index, structures.length),
      0,
      layout.structure,
    );
  const updated = reconcileOwnedConfigurations(document, {
    schemaVersion: STRUCTURES_SCHEMA_VERSION,
    structures: structures.map((structure) => {
      const restored = input.configurations?.find(
        (item) => item.structureId === structure.conceptId,
      );
      return restored ? { ...structure, editor: restored.editor } : structure;
    }),
  });
  const taxonomy = input.taxonomy ?? get(taxonomyDocumentAtom);
  assertStructureTaxonomy(updated, taxonomy);
  assertElementReferences(leafElements(next), get(primitiveReferencesAtom));
  const resolved = resolveElements(
    next,
    get(primitiveReferencesAtom),
    get(rulesAtom),
  );
  if (resolved.some((element) => element.issues.length))
    throw new Error(resolved.flatMap((element) => element.issues).join(" "));
  const updates = new Map<string, unknown>([["design/structures", updated]]);
  if (input.taxonomy) updates.set("registry/taxonomy", taxonomy);
  withValidatedAuthoringUpdates(get, updates, () => {
    if (input.taxonomy) set(taxonomyDocumentAtom, taxonomy);
    set(structuresDocumentAtom, updated);
  });
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
    const taxonomy =
      input.kind === "slot"
        ? registerTerm(
            get(taxonomyDocumentAtom),
            ELEMENT_CATEGORY_ID,
            "slot",
            ELEMENT_TYPES.slot.termId,
          )
        : undefined;
    elements.splice(plan.sharedIndex, 0, element);
    set(editElementsAtom, {
      structureId: input.structureId,
      elements,
      ...(taxonomy && { taxonomy }),
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
      value?: StructureNumberLiteral;
      glyph?: string;
      orientation?: string;
      name?: string;
      optionId?: string;
      configuration?: { rootId: string; path: string };
    },
  ) => {
    const current = get(structuresDocumentAtom).structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    const root = input.configuration
      ? get(structuresDocumentAtom).structures.find(
          (item) => item.conceptId === input.configuration!.rootId,
        )
      : current;
    if (
      input.configuration &&
      (!root ||
        ownedLayoutAt(
          root,
          input.configuration.path,
          get(structuresDocumentAtom).structures,
        )?.conceptId !== current?.conceptId)
    )
      throw new Error(
        "The selected layer is not owned by this parent Structure.",
      );
    const configuration = input.configuration
      ? root?.editor?.layouts?.[input.configuration.path]
      : undefined;
    const element =
      (input.optionId && current
        ? (input.configuration
            ? configuration?.overrides
            : current.editor?.overrides)?.[input.optionId]?.elements?.[
            input.elementId
          ]
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
      ...(input.name !== undefined && { name: input.name.trim() }),
    };
    if (input.slot) {
      const previous = element.bindings.find(
        (binding) => binding.slot === input.slot,
      );
      if (input.value) {
        if (
          !Number.isFinite(input.value.value) ||
          input.value.value < 0 ||
          !["px", "multiplier"].includes(input.value.unit) ||
          (input.value.unit === "multiplier" &&
            (input.slot !== "lineHeight" ||
              (previous && previous.family !== "typography")))
        )
          throw new Error("Choose a finite, non-negative value.");
        const family =
          previous?.family ??
          (input.slot === "fontSize" || input.slot === "lineHeight"
            ? "typography"
            : "size");
        next = {
          ...next,
          bindings: [
            ...element.bindings.filter(
              (binding) => binding.slot !== input.slot,
            ),
            {
              id: elementBindingId(element.id, input.slot),
              slot: input.slot,
              family,
              value: input.value,
            },
          ],
        };
      } else {
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
            ...element.bindings.filter(
              (binding) => binding.slot !== input.slot,
            ),
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
      const editor = structureEditor(root!);
      const override =
        (input.configuration ? configuration?.overrides : editor.overrides)?.[
          input.optionId
        ] ?? {};
      const changes = {
        ...override,
        elements: { ...override.elements, [next.id]: next },
      };
      set(updateStructureEditorAtom, {
        structureId: root!.conceptId,
        editor: input.configuration
          ? withLayoutConfiguration(editor, input.configuration.path, {
              ...configuration,
              overrides: {
                ...configuration?.overrides,
                [input.optionId]: changes,
              },
            })
          : updateOptionOverrides(editor, input.optionId, changes),
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
  layouts?: { structure: Structure; index: number }[];
  selectionId?: string;
  configurations?: {
    structureId: string;
    before?: StructureEditorData;
    after?: StructureEditorData;
  }[];
}
export const removeElementAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      elementId: string;
      confirmed: boolean;
      selectionId?: string;
    },
  ): RemovedElement => {
    const document = get(structuresDocumentAtom);
    const current = document.structures.find(
      (structure) => structure.conceptId === input.structureId,
    );
    const index =
      current?.elements?.findIndex(
        (element) => element.id === input.elementId,
      ) ?? -1;
    if (!current || index < 0)
      throw new Error("The selected element is unavailable.");
    const element = current.elements![index];
    const target = !isLeaf(element)
      ? document.structures.find(
          (structure) => structure.conceptId === element.structureId,
        )
      : undefined;
    const removeLayout =
      target?.parentStructureId === current.conceptId &&
      !current.elements!.some(
        (child) =>
          child.id !== element.id &&
          !isLeaf(child) &&
          child.structureId === target.conceptId,
      );
    const removedLayoutIds = removeLayout
      ? ownedStructureIds(document.structures, target.conceptId)
      : undefined;
    const layouts = document.structures.flatMap((structure, index) =>
      removedLayoutIds?.has(structure.conceptId) ? [{ structure, index }] : [],
    );
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
      removedLayoutIds,
    });
    set(selectedElementIdAtom, null);
    return {
      structureId: current.conceptId,
      element,
      selectionId: input.selectionId,
      index,
      generation: current.generation,
      afterGeneration,
      ...(layouts.length && { layouts }),
      editor: current.editor,
      afterEditor: get(structuresDocumentAtom).structures.find(
        (item) => item.conceptId === current.conceptId,
      )?.editor,
      configurations: document.structures.flatMap((source) => {
        if (source.conceptId === current.conceptId) return [];
        const after = get(structuresDocumentAtom).structures.find(
          (item) => item.conceptId === source.conceptId,
        );
        return after &&
          JSON.stringify(source.editor) !== JSON.stringify(after.editor)
          ? [
              {
                structureId: source.conceptId,
                before: source.editor,
                after: after.editor,
              },
            ]
          : [];
      }),
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
    for (const configuration of removed.configurations ?? []) {
      const source = get(structuresDocumentAtom).structures.find(
        (item) => item.conceptId === configuration.structureId,
      );
      if (
        !source ||
        JSON.stringify(source.editor) !== JSON.stringify(configuration.after)
      )
        throw new Error(
          "Parent properties changed. Undo those changes before restoring this layer.",
        );
    }
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
      addedLayouts: removed.layouts,
      configurations: removed.configurations?.map((item) => ({
        structureId: item.structureId,
        editor: item.before,
      })),
    });
    set(selectedElementIdAtom, removed.selectionId ?? removed.element.id);
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
      layout?: Structure;
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
      ...(input.layout && {
        addedLayouts: [
          {
            structure: input.layout,
            index: get(structuresDocumentAtom).structures.length,
          },
        ],
      }),
      ...(current.editor && {
        editor: editorAfterLayerInsertion(current, plan, child.id),
      }),
    });
    set(selectedElementIdAtom, child.id);
    return child.id;
  },
);

export const insertLayoutAtom = atom(
  null,
  (
    get,
    set,
    input: {
      structureId: string;
      index: number;
      expected?: StructureInsertionContext;
      preview?: StructurePreviewState;
    },
  ) => {
    const document = get(structuresDocumentAtom);
    let number = 1;
    while (
      document.structures.some(
        (structure) =>
          structure.parentStructureId === input.structureId &&
          structure.name.toLowerCase() === `layout ${number}`,
      )
    )
      number++;
    const layout = {
      ...createStructure(`Layout ${number}`),
      parentStructureId: input.structureId,
    };
    return set(insertStructureInstanceAtom, {
      ...input,
      targetId: layout.conceptId,
      layout,
    });
  },
);
