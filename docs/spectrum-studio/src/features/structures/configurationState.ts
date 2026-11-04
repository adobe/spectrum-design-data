// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { structuresDocumentAtom, structurePreviewsAtom } from "./documentState";
import {
  configuredStructure,
  ownedLayoutAt,
  withLayoutConfiguration,
} from "./configuration";
import {
  structureEditor,
  optionSlotChanges,
  type StructureOptionOverrides,
} from "./variants";
import { updateStructureEditorAtom } from "./variantState";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import {
  constraintChoiceIssue,
  isConstraintSlot,
  type PreviewLayoutContext,
} from "./resolution";
import type { StructureTarget } from "./portableModel";
import type { StructureSlot } from "./model";

/** Root and owned-occurrence edits share ownership, validation and write routing. */
export const editStructureOptionBindingsAtom = atom(
  null,
  (
    get,
    set,
    input: {
      target: StructureTarget;
      valueId: string;
      changes: NonNullable<StructureOptionOverrides["slots"]>;
      layout: PreviewLayoutContext;
    },
  ) => {
    const catalog = get(structuresDocumentAtom).structures;
    const owner = catalog.find(
      (structure) => structure.conceptId === input.target.structureId,
    );
    const path = input.target.path.length
      ? `/${input.target.path.join("/")}`
      : "";
    const source =
      owner && (path ? ownedLayoutAt(owner, path, catalog) : owner);
    if (!owner || !source)
      throw new Error("The selected owned layout is unavailable.");
    const editor = structureEditor(owner);
    const property = editor.properties.find(
      (property) =>
        property.kind === "variant" &&
        property.options.some((option) => option.id === input.valueId),
    );
    if (
      !property ||
      property.kind !== "variant" ||
      property.defaultOptionId === input.valueId
    )
      throw new Error(
        "Select an available nondefault option before saving differences.",
      );
    const effective = configuredStructure(
      owner,
      path,
      catalog,
      get(structurePreviewsAtom),
    ).structure;
    for (const [key, selection] of Object.entries(input.changes)) {
      const slot = key as StructureSlot;
      if (!selection || !isConstraintSlot(slot)) continue;
      const issue = constraintChoiceIssue(
        effective,
        slot,
        selection,
        get(primitiveReferencesAtom),
        input.layout,
      );
      if (issue) throw new Error(issue);
    }
    const scope = path ? (editor.layouts?.[path] ?? {}) : editor;
    const configuration = {
      ...scope,
      overrides: {
        ...scope.overrides,
        [input.valueId]: optionSlotChanges(
          source,
          scope.overrides?.[input.valueId] ?? {},
          input.changes,
        ),
      },
    };
    set(updateStructureEditorAtom, {
      structureId: owner.conceptId,
      editor: path
        ? withLayoutConfiguration(editor, path, configuration)
        : { ...editor, overrides: configuration.overrides },
    });
  },
);
