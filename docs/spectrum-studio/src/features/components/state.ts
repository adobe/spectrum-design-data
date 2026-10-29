// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { captureSnapshot } from "../edit-session/state";
import { classificationStandard } from "../taxonomy/standardContract";
import { componentsDocumentAtom } from "./documentState";
import { assertComponentDocument } from "./validation";
import { assertComponentReferences, componentTokenCatalog } from "./references";
import type { ComponentsDocument } from "./model";
import { componentKey } from "./model";
import { componentColorWitnessAtom } from "./colorWitness";

export const componentTokensAtom = atom((get) =>
  componentTokenCatalog(captureSnapshot(get), get(componentColorWitnessAtom)),
);
export const componentCatalogAtom = atom((get) => {
  const configured = get(componentsDocumentAtom).components;
  return [
    ...configured.map((record) => ({
      id: record.id,
      name: record.declaration.displayName,
      group: record.declaration.meta.category,
      configured: true,
    })),
    ...classificationStandard.components
      .filter(
        (entry) => !configured.some((record) => record.catalogId === entry.id),
      )
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        group: entry.group,
        configured: false,
      })),
  ];
});
export const editComponentsAtom = atom(
  null,
  (get, set, document: ComponentsDocument) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change component data.");
    const snapshot = captureSnapshot(get);
    for (const component of document.components) {
      const entry = classificationStandard.components.find(
        (entry) => componentKey(entry.name) === component.declaration.name,
      );
      if (entry && component.catalogId !== entry.id)
        throw new Error(
          "Choose the existing shared catalog entry to add its component data.",
        );
      if (
        component.catalogId &&
        !classificationStandard.components.some(
          (entry) => entry.id === component.catalogId,
        )
      )
        throw new Error("This shared catalog entry is no longer available.");
    }
    assertComponentDocument(document, snapshot.taxonomy);
    assertComponentReferences(
      document,
      snapshot.taxonomy!,
      get(componentTokensAtom),
    );
    set(componentsDocumentAtom, document);
  },
);
