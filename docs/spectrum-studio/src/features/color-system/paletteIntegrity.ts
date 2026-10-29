// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { modeSetsAtom } from "../modes/state";
import { normalizePaletteReferences } from "./paletteReferences";
import { colorSystemDocumentAtom } from "./state";

/** Drops palette links whose color no longer exists, e.g. after a changelog revert or cancelled edit session. */
export const normalizePaletteReferencesAtom = atom(null, (get, set) => {
  const result = normalizePaletteReferences(
    get(colorSystemDocumentAtom),
    get(modeSetsAtom),
  );
  if (!result.changed) return;
  set(colorSystemDocumentAtom, result.document);
  set(modeSetsAtom, result.modeSets);
});

export function usePaletteIntegrity() {
  const document = useAtomValue(colorSystemDocumentAtom);
  const modeSets = useAtomValue(modeSetsAtom);
  const normalize = useSetAtom(normalizePaletteReferencesAtom);
  useEffect(() => {
    normalize();
  }, [document, modeSets, normalize]);
}
