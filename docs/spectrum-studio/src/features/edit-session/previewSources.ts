// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { numericPreviewSource } from "./numericState";
import {
  colorSystemDocumentAtom,
  resolveColorDocument,
} from "../color-system/state";
import { isColorSystemDocument } from "../color-system/model";
import { typographyDocumentAtom } from "../typography/state";
import { isTypographyDocument } from "../typography/model";
import { resolveTypographyDocument } from "../typography/resolution";
import { rulesAtom } from "../logic/library";
import { isRuleList } from "../logic/model";
import {
  scaleTypesAtom,
  interpolationsAtom,
  isScaleTypeList,
  isInterpolationList,
} from "../logic/scaleTypeLibrary";
import { modeSetsAtom } from "../modes/documentState";
import { isModeSetList, type Mode } from "../modes/model";
import { modeSelectionAtom, resolveActiveMode } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { isTaxonomyDocument } from "../taxonomy/model";
import { iconsDocumentAtom } from "../icons/documentState";
import { isIconsDocument } from "../icons/model";
import { opacityDocumentAtom } from "../opacity/state";
import { isOpacityDocument } from "../opacity/model";
import { browserTokenEditsAtom } from "../tokens/browserEdits";

export const colorPreviewSourceAtom = numericPreviewSource(
  colorSystemDocumentAtom,
  "colorSystem",
  isColorSystemDocument,
);
export const typographyPreviewSourceAtom = numericPreviewSource(
  typographyDocumentAtom,
  "typography",
  isTypographyDocument,
);
export const previewRulesAtom = numericPreviewSource(
  rulesAtom,
  "rules",
  isRuleList,
);
export const previewScaleTypesAtom = numericPreviewSource(
  scaleTypesAtom,
  "scaleTypes",
  isScaleTypeList,
);
export const previewInterpolationsAtom = numericPreviewSource(
  interpolationsAtom,
  "interpolations",
  isInterpolationList,
);
export const previewModeSetsAtom = numericPreviewSource(
  modeSetsAtom,
  "modeSets",
  isModeSetList,
);
export const previewTaxonomyAtom = numericPreviewSource(
  taxonomyDocumentAtom,
  "taxonomy",
  isTaxonomyDocument,
);
export const previewIconsAtom = numericPreviewSource(
  iconsDocumentAtom,
  "icons",
  isIconsDocument,
);
const previewOpacityAtom = numericPreviewSource(
  opacityDocumentAtom,
  "opacity",
  isOpacityDocument,
);
const previewActiveModesAtom = atom((get) =>
  get(previewModeSetsAtom)
    .map((set) => resolveActiveMode(set, get(modeSelectionAtom)))
    .filter((mode): mode is Mode => mode !== undefined),
);
export const liveColorDocumentAtom = atom((get) =>
  resolveColorDocument(
    get(colorPreviewSourceAtom),
    get(previewActiveModesAtom),
    get(previewOverridesAtom),
    {
      modeSets: get(previewModeSetsAtom),
      opacity: get(previewOpacityAtom),
      browserTokenEdits: get(browserTokenEditsAtom),
    },
  ),
);
export const liveTypographyDocumentAtom = atom((get) =>
  resolveTypographyDocument(
    get(typographyPreviewSourceAtom),
    get(previewActiveModesAtom),
    get(previewOverridesAtom),
    { modeSets: get(previewModeSetsAtom) },
  ),
);
