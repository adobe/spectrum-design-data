// Copyright 2026 Adobe. All rights reserved.
import type { FoundationImpactSource, TokenImpactSource } from "../model";
import { colorFoundationSource } from "./colorFoundation";
import { browserTokenImpactRecordsAtom } from "../../tokens/browserSavedState";
import { modeFoundationSource } from "./modeFoundation";
import {
  sizeFoundationSource,
  spacingFoundationSource,
  radiusFoundationSource,
} from "./spacingFoundation";
import { typographyFoundationSource } from "./typographyFoundation";
import { ruleSource } from "./logic";
import { atom } from "jotai";
import { taxonomyDocumentAtom } from "../../taxonomy/state";
import { taxonomyFields } from "../../taxonomy/changes";
import { designSystemDefaults } from "../../../data/defaults";
import { elevationDocumentAtom } from "../../elevation/state";
import { ELEVATION_DEFAULTS } from "../../elevation/defaults";
import { elevationFields } from "../../elevation/changes";
import { semanticTokenSource, structureFoundationSource } from "./structures";
import { opacityFoundationSource } from "./opacityFoundation";

const taxonomySource: FoundationImpactSource = {
  id: "registry",
  recordsAtom: atom((get) => {
    const before = taxonomyFields(designSystemDefaults.system.taxonomy);
    const after = taxonomyFields(get(taxonomyDocumentAtom));
    return [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
      id: `taxonomy/${id}`,
      category: "registry",
      edited: before.get(id) !== after.get(id),
    }));
  }),
};

export const TOKEN_IMPACT_SOURCES: readonly TokenImpactSource[] = [
  {
    id: "browser-primitive-tokens",
    recordsAtom: browserTokenImpactRecordsAtom,
  },
  semanticTokenSource,
];
const elevationSource: FoundationImpactSource = {
  id: "elevation-foundation",
  recordsAtom: atom((get) => {
    const before = elevationFields(ELEVATION_DEFAULTS),
      after = elevationFields(get(elevationDocumentAtom));
    return [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
      id: `elevation/${id}`,
      category: "elevation",
      edited: JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)),
    }));
  }),
};

export const FOUNDATION_IMPACT_SOURCES: readonly FoundationImpactSource[] = [
  opacityFoundationSource,
  colorFoundationSource,
  typographyFoundationSource,
  spacingFoundationSource,
  sizeFoundationSource,
  radiusFoundationSource,
  elevationSource,
  modeFoundationSource,
  ruleSource,
  taxonomySource,
  structureFoundationSource,
];
