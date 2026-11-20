// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { activePageAtom } from "../../state/view/navigation";
import {
  selectedColorScaleIdAtom,
  selectedColorStopIdAtom,
} from "../../state/view/colorSystemView";
import { browserModeContextAtom } from "../tokens/browserState";
import {
  selectedStructureIdAtom,
  structurePreviewsAtom,
} from "../structures/documentState";
import { selectedStyleIdAtom } from "../styles/state";
import { selectedElementIdAtom } from "../structures/elementState";
import { selectedDataVisScaleIdAtom } from "../../state/view/dataVisView";

export const numericFieldScopeAtom = atom((get) =>
  JSON.stringify([
    get(activePageAtom),
    get(browserModeContextAtom).key,
    get(selectedColorScaleIdAtom),
    get(selectedColorStopIdAtom),
    get(selectedDataVisScaleIdAtom),
    get(selectedStructureIdAtom),
    get(selectedElementIdAtom),
    Object.entries(get(structurePreviewsAtom)).map(([id, preview]) => [
      id,
      preview.activePropertyId,
      preview.options,
    ]),
    get(selectedStyleIdAtom),
  ]),
);
