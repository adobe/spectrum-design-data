// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  COMPONENT_SIZING_DEFAULTS,
  type ComponentSizingDocument,
} from "./componentSizing";

// The authoring envelope owns persistence for this system-level source.
export const componentSizingDocumentAtom = atom<ComponentSizingDocument>({
  ...COMPONENT_SIZING_DEFAULTS,
});
