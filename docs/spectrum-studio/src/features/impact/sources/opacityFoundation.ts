// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { OPACITY_DEFAULTS } from "../../opacity/defaults";
import { opacityDocumentAtom } from "../../opacity/state";
import { opacityFields } from "../../opacity/changes";
import type { FoundationImpactSource } from "../model";

export const opacityFoundationSource: FoundationImpactSource = {
  id: "opacity-foundation",
  recordsAtom: atom((get) => {
    const before = opacityFields(OPACITY_DEFAULTS);
    const after = opacityFields(get(opacityDocumentAtom));
    return [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
      id: `opacity/${id}`,
      category: "opacity",
      edited: JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)),
    }));
  }),
};
