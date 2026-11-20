// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  COMPONENT_SIZING_DEFAULTS,
  type ComponentSizingDocument,
} from "./componentSizing";
import { deferNumericProposal } from "../edit-session/numericProposal";

// The authoring envelope owns persistence for this system-level source.
const sourceAtom = atom<ComponentSizingDocument>({
  ...COMPONENT_SIZING_DEFAULTS,
});
export const componentSizingDocumentAtom = atom(
  (get) => get(sourceAtom),
  (
    get,
    set,
    update:
      | ComponentSizingDocument
      | ((previous: ComponentSizingDocument) => ComponentSizingDocument),
  ) => {
    const previous = get(sourceAtom);
    const next = typeof update === "function" ? update(previous) : update;
    if (deferNumericProposal({ source: "componentSizing", previous, next }))
      return;
    set(sourceAtom, next);
  },
);
