// Copyright 2026 Adobe. All rights reserved.
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { adaptiveClaimsAtom } from "./adaptive";
import { normalizeModeStateAtom } from "./integrity";
import { modeSelectionAtom } from "./selection";
import { modeSetsAtom } from "./state";

/** Re-checks mode invariants after loads, edits, and reverts from any surface. */
export function useModeIntegrity() {
  const modeSets = useAtomValue(modeSetsAtom);
  const selection = useAtomValue(modeSelectionAtom);
  const claims = useAtomValue(adaptiveClaimsAtom);
  const normalize = useSetAtom(normalizeModeStateAtom);
  useEffect(() => {
    normalize();
  }, [modeSets, selection, claims, normalize]);
}
