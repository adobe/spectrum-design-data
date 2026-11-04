// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { normalizePaletteReferences } from "./paletteReferences";
import { colorSystemDocumentAtom } from "./state";

/** Drops palette links whose color no longer exists, e.g. after a changelog revert or cancelled edit session. */
export const normalizePaletteReferencesAtom = atom(null, (get, set) => {
  const result = normalizePaletteReferences(get(colorSystemDocumentAtom));
  if (!result.changed) return;
  set(colorSystemDocumentAtom, result.document);
});

export function usePaletteIntegrity() {
  const document = useAtomValue(colorSystemDocumentAtom);
  const normalize = useSetAtom(normalizePaletteReferencesAtom);
  useEffect(() => {
    normalize();
  }, [document, normalize]);
}
