// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { activeModesAtom } from "./selection";
import { foundationDocumentsAtom } from "./foundationDocuments";
import { previewOverridesAtom } from "./previewState";
import { modeSetsAtom } from "./state";
import { resolveModeParameterValues } from "./parameterResolution";
export {
  resolveModeParameterValues,
  type ModeParameterValues,
} from "./parameterResolution";

export const modeParameterValuesAtom = atom((get) =>
  resolveModeParameterValues(
    get(foundationDocumentsAtom),
    get(activeModesAtom),
    get(previewOverridesAtom),
    { modeSets: get(modeSetsAtom) },
  ),
);
