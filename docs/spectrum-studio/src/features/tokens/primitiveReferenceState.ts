// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { generatedSpacingAtom } from "../spacing/state";
import { generatedSizeAtom } from "../size/state";
import { generatedRadiusAtom } from "../radius/state";
import {
  elevationDocumentAtom,
  generatedElevationAtom,
} from "../elevation/state";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { browserTokenEditsAtom } from "./browserEdits";
import { browserModeContextAtom } from "./browserState";
import { primitiveReferencesFromOutputs } from "./primitiveReferences";
import {
  dataVisInputDocumentAtom,
  dataVisUiSwatchesAtom,
} from "../color-system/data-vis/state";
import { categoricalBrowserSources } from "../color-system/data-vis/output";
import {
  generatedTypographyAtom,
  typographyDocumentAtom,
} from "../typography/state";

export const primitiveReferencesAtom = atom((get) =>
  primitiveReferencesFromOutputs(
    {
      spacing: get(generatedSpacingAtom),
      size: get(generatedSizeAtom),
      radius: get(generatedRadiusAtom),
      elevation: {
        document: get(elevationDocumentAtom),
        levels: get(generatedElevationAtom),
      },
      color: categoricalBrowserSources(
        get(dataVisInputDocumentAtom),
        get(dataVisUiSwatchesAtom),
        get(taxonomyDocumentAtom),
        { includeUnpublished: true },
      ),
      typography: {
        document: get(typographyDocumentAtom),
        values: get(generatedTypographyAtom),
        naming: {
          registry: get(taxonomyDocumentAtom),
          names: get(typographyDocumentAtom).metricNames,
          outputUnit: get(typographyDocumentAtom).outputUnit,
        },
      },
    },
    get(taxonomyDocumentAtom),
    get(browserTokenEditsAtom),
    get(browserModeContextAtom).key,
  ),
);
