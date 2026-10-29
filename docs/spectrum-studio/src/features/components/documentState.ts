// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { designSystemDefaults } from "../../data/defaults";
import { EMPTY_COMPONENTS, type ComponentsDocument } from "./model";
import { isComponentsDocument } from "./validation";

export const componentsDocumentAtom = persistedAtom<ComponentsDocument>({
  key: "components",
  schemaVersion: 2,
  initialize: () =>
    structuredClone(designSystemDefaults.system.components ?? EMPTY_COMPONENTS),
  validate: isComponentsDocument,
});
export const selectedComponentIdAtom = atom<string | null>(null);
export const componentDraftRevisionAtom = atom(0);
