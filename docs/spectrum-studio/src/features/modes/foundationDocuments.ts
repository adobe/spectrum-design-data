// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { colorSystemDocumentAtom } from "../color-system/state";
import { typographyDocumentAtom } from "../typography/state";
import type { FoundationDocuments } from "./parameters";
import { elevationDocumentAtom } from "../elevation/state";

/** Saved base documents that mode parameters inherit from. */
export const foundationDocumentsAtom = atom(
  (get): FoundationDocuments => ({
    color: get(colorSystemDocumentAtom),
    typography: get(typographyDocumentAtom),
    elevation: get(elevationDocumentAtom),
  }),
);
