// Copyright 2026 Adobe. All rights reserved.
import {
  createNumericValidationStore,
  type EditSessionSnapshot,
} from "./state";
import { modeSelectionAtom } from "../modes/selection";
import {
  previewOverridesAtom,
  type PreviewOverrides,
} from "../modes/previewState";
import {
  selectedStyleIdAtom,
  stylePreviewArtifactsAtom,
  stylePreviewContextsStateAtom,
  previewTextStyleSourceAtom,
} from "../styles/state";
import {
  selectedStructureIdAtom,
  structuresDocumentAtom,
} from "../structures/documentState";
import { selectedStructureAtom } from "../structures/state";
import { primitiveReferencesAtom } from "../tokens/primitiveReferenceState";
import { focusedTshirtArtifactsAtom } from "../design-data/tshirtState";
import { browserModeContextAtom } from "../tokens/browserState";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { rulesAtom } from "../logic/library";
import type { ExtractAtomValue } from "jotai";
import { spacingDocumentAtom, generatedSpacingAtom } from "../spacing/state";
import { sizeDocumentAtom, generatedSizeAtom } from "../size/state";
import { radiusDocumentAtom, generatedRadiusAtom } from "../radius/state";
import {
  elevationDocumentAtom,
  resolvedElevationAtom,
  generatedElevationAtom,
} from "../elevation/state";
import { activeModesAtom } from "../modes/selection";
import { generatedIconsAtom } from "../icons/state";
import { foundationDocumentsAtom } from "../modes/foundationDocuments";
import { modeParameterValuesAtom } from "../modes/parameterValues";
import { modeSetsAtom } from "../modes/documentState";
import { scaleTypesAtom } from "../logic/scaleTypeLibrary";
import { interpolationsAtom } from "../logic/scaleTypeLibrary";
import { iconsDocumentAtom } from "../icons/documentState";
import {
  resolvedTypographyDocumentAtom,
  typographyDocumentAtom,
} from "../typography/state";
import { buildIconScaleComparisons } from "../icons/comparisons";
import { opacityResultAtom, opacitySourceAtom } from "../opacity/state";
import { opacityObservations } from "../opacity/analysis";
import type { DimensionDocument } from "../scales/foundation";

export interface EditorPreviewInput {
  kind:
    | "styles"
    | "structures"
    | "spacing"
    | "size"
    | "radius"
    | "elevation"
    | "elevation-analysis"
    | "icons"
    | "icon-analysis"
    | "opacity";
  source: EditSessionSnapshot;
  selection: ExtractAtomValue<typeof modeSelectionAtom>;
  overrides: PreviewOverrides;
  selectedId: string | null;
}

export interface StructurePreviewReferencesCache {
  key?: string;
  value?: ExtractAtomValue<typeof primitiveReferencesAtom>;
}

export function computeEditorPreview(
  input: EditorPreviewInput,
  referencesCache?: StructurePreviewReferencesCache,
) {
  const store = createNumericValidationStore(input.source);
  store.set(modeSelectionAtom, input.selection);
  store.set(previewOverridesAtom, input.overrides);
  if (
    input.kind === "spacing" ||
    input.kind === "size" ||
    input.kind === "radius"
  ) {
    const state = {
      spacing: {
        document: spacingDocumentAtom,
        generated: generatedSpacingAtom,
      },
      size: { document: sizeDocumentAtom, generated: generatedSizeAtom },
      radius: { document: radiusDocumentAtom, generated: generatedRadiusAtom },
    }[input.kind];
    return {
      kind: "dimension" as const,
      document: store.get<DimensionDocument>(state.document),
      scales: store.get(state.generated),
      documents: store.get(foundationDocumentsAtom),
      current: store.get(modeParameterValuesAtom),
      rules: store.get(rulesAtom),
      scaleTypes: store.get(scaleTypesAtom),
      modeSets: store.get(modeSetsAtom),
    };
  }
  if (input.kind === "elevation")
    return {
      kind: "elevation" as const,
      document: store.get(resolvedElevationAtom),
      levels: store.get(generatedElevationAtom),
      registry: store.get(taxonomyDocumentAtom),
    };
  if (input.kind === "elevation-analysis")
    return {
      kind: "elevation-analysis" as const,
      document: store.get(elevationDocumentAtom),
      modeSets: store.get(modeSetsAtom),
      activeModes: store.get(activeModesAtom),
      preview: input.overrides,
      opacitySource: store.get(opacitySourceAtom),
    };
  if (input.kind === "icons")
    return {
      kind: "icons" as const,
      scales: store.get(generatedIconsAtom),
    };
  if (input.kind === "icon-analysis") {
    const icons = store.get(iconsDocumentAtom);
    const typography = store.get(typographyDocumentAtom);
    const library = {
      rules: store.get(rulesAtom),
      scaleTypes: store.get(scaleTypesAtom),
      interpolations: store.get(interpolationsAtom),
    };
    return {
      kind: "icon-analysis" as const,
      comparisons: icons.scales.map((scale) => {
        try {
          return {
            scale,
            datasets: buildIconScaleComparisons(
              icons,
              scale,
              typography,
              store.get(modeSetsAtom),
              library,
              store.get(resolvedTypographyDocumentAtom),
            ),
          };
        } catch (failure) {
          return {
            scale,
            error: failure instanceof Error ? failure.message : String(failure),
          };
        }
      }),
    };
  }
  if (input.kind === "opacity") {
    const source = store.get(opacitySourceAtom);
    const result = store.get(opacityResultAtom);
    let profile: ReturnType<typeof opacityObservations> | undefined;
    let error: string | undefined;
    try {
      profile = opacityObservations(
        result,
        source.colorSystem.settings.colorOutput,
      );
    } catch (failure) {
      error = failure instanceof Error ? failure.message : String(failure);
    }
    return { kind: "opacity" as const, source, result, profile, error };
  }
  if (input.kind === "styles") {
    store.set(selectedStyleIdAtom, input.selectedId);
    return {
      kind: "styles" as const,
      artifacts: store.get(stylePreviewArtifactsAtom),
      contexts: store.get(stylePreviewContextsStateAtom),
    };
  }
  store.set(selectedStructureIdAtom, input.selectedId);
  // Structure edits do not change the upstream primitive reference inputs.
  const referenceKey = referencesCache
    ? JSON.stringify({
        ...input,
        source: { ...input.source, structures: undefined },
      })
    : undefined;
  const references =
    referencesCache?.key === referenceKey && referencesCache?.value
      ? referencesCache.value
      : store.get(primitiveReferencesAtom);
  if (referencesCache) {
    referencesCache.key = referenceKey;
    referencesCache.value = references;
  }
  return {
    kind: "structures" as const,
    structure: store.get(selectedStructureAtom),
    references,
    taxonomy: store.get(taxonomyDocumentAtom),
    rules: store.get(rulesAtom),
    catalog: store.get(structuresDocumentAtom).structures,
    generation: store.get(focusedTshirtArtifactsAtom),
    mode: store.get(browserModeContextAtom),
    textStyles: store.get(previewTextStyleSourceAtom),
  };
}
export type EditorPreviewOutput = ReturnType<typeof computeEditorPreview>;
