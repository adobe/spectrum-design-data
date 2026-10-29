// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import { modeSetsAtom } from "../modes/state";
import { activeModesAtom } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { scaleTypesAtom } from "../logic/scaleTypeLibrary";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { registeredSourceName } from "../taxonomy/naming";
import { registerTerm } from "../taxonomy/model";
import { setActiveModeParameterAtom } from "../modes/selection";
import { isOpaqueShadowColor } from "./model";
import { ELEVATION_DEFAULTS } from "./defaults";
import {
  ELEVATION_LAYER_MAX,
  isElevationDocument,
  finiteRange,
  type ElevationDocument,
  type ShadowLayer,
} from "./model";
import { ELEVATION_POWER_FORMULA_ID } from "./formulas";
import { generateElevation } from "./generate";
import { resolveElevationDocument } from "./resolution";
import type { ScaleType } from "../scales/scaleType";
import type { ModeSet } from "../modes/model";
import type { TaxonomyDocument } from "../taxonomy/model";
import { structuresDocumentAtom } from "../structures/documentState";
import { assertStructureReferences } from "../structures/model";
import { elevationReferenceIds } from "../tokens/primitiveIdentity";
import { taxonomyContributionsEnabledAtom } from "../taxonomy/contributions";
import { colorOutputSettingsAtom } from "../color-system/state";
import { opacitySourceAtom } from "../opacity/state";
import { DEFAULT_SHADOW_OPACITY_ID } from "../opacity/defaults";
import type { OpacitySource } from "../opacity/generation";
import { modeCombinations } from "../modes/combinations";
import { scaleStepName } from "../scales/stepNames";
import { registerAuthoringGuard } from "../../state/authoringGuards";
import { isOpacityDocument } from "../opacity/model";

function validateCandidate(
  document: ElevationDocument,
  sets: ModeSet[],
  formulas: ScaleType[],
  opacitySource: OpacitySource,
) {
  for (const modes of modeCombinations(sets)) {
    generateElevation(
      resolveElevationDocument(document, modes, sets, {}, opacitySource),
      formulas,
    );
  }
}
function registerSteps(
  document: ElevationDocument,
  taxonomy: TaxonomyDocument,
) {
  if (!document.layers.length) return taxonomy;
  const category = taxonomy.categories.find(
    (category) =>
      category.key === "scaleIndex" && category.scopes.includes("elevation"),
  );
  if (!category)
    throw new Error("Elevation requires the registered Scale index category.");
  for (
    let position = 0;
    position <= document.below + document.above;
    position++
  )
    taxonomy = registerTerm(
      taxonomy,
      category.id,
      scaleStepName(position - document.below, document.below),
      crypto.randomUUID(),
    );
  return taxonomy;
}

const storedElevationAtom = persistedAtom<ElevationDocument>({
  key: "foundations/elevation",
  schemaVersion: 1,
  initialize: () => structuredClone(ELEVATION_DEFAULTS),
  validate: isElevationDocument,
});
export const elevationDocumentAtom = atom(
  (get) => get(storedElevationAtom),
  (
    get,
    set,
    update:
      | ElevationDocument
      | ((previous: ElevationDocument) => ElevationDocument),
  ) => {
    const next =
      typeof update === "function" ? update(get(storedElevationAtom)) : update;
    if (get(taxonomyContributionsEnabledAtom))
      assertStructureReferences(
        get(structuresDocumentAtom),
        new Map(
          [...elevationReferenceIds(next)].map((id) => [
            id,
            "elevation" as const,
          ]),
        ),
        "elevation",
      );
    registerAuthoringGuard("opacity-shadow-references", (get, updates) => {
      const opacity = updates.get("foundations/opacity");
      if (!isOpacityDocument(opacity)) return;
      const candidate = updates.get("foundations/elevation");
      const elevation = isElevationDocument(candidate)
        ? candidate
        : get(elevationDocumentAtom);
      if (
        elevation.layers.some(
          (layer) =>
            layer.opacityTokenId &&
            !opacity.levels.some((level) => level.id === layer.opacityTokenId),
        )
      )
        throw new Error(
          "Choose another opacity token for the shadows using this level before removing it.",
        );
    });
    set(storedElevationAtom, next);
  },
);
export const elevationNameAtom = atom((get) =>
  registeredSourceName(
    get(taxonomyDocumentAtom),
    get(elevationDocumentAtom).name,
    "elevation",
  ),
);
export const resolvedElevationAtom = atom((get) =>
  resolveElevationDocument(
    get(elevationDocumentAtom),
    get(activeModesAtom),
    get(modeSetsAtom),
    get(previewOverridesAtom),
    get(opacitySourceAtom),
  ),
);
export const generatedElevationAtom = atom((get) =>
  generateElevation(
    get(resolvedElevationAtom),
    get(scaleTypesAtom),
    get(colorOutputSettingsAtom),
  ),
);
export const updateElevationAtom = atom(
  null,
  (
    get,
    set,
    patch: Partial<
      Pick<
        ElevationDocument,
        "below" | "above" | "depth" | "color" | "hideFromPublishing"
      >
    >,
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change Elevation.");
    const candidate = { ...get(elevationDocumentAtom), ...patch };
    validateCandidate(
      candidate,
      get(modeSetsAtom),
      get(scaleTypesAtom),
      get(opacitySourceAtom),
    );
    assertStructureReferences(
      get(structuresDocumentAtom),
      new Map(
        [...elevationReferenceIds(candidate)].map((id) => [
          id,
          "elevation" as const,
        ]),
      ),
      "elevation",
    );
    const taxonomy = registerSteps(candidate, get(taxonomyDocumentAtom));
    set(taxonomyDocumentAtom, taxonomy);
    set(elevationDocumentAtom, candidate);
  },
);
export const updateShadowLayerAtom = atom(
  null,
  (
    get,
    set,
    input: { id: string; patch: Partial<Omit<ShadowLayer, "id">> },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change shadows.");
    const document = get(elevationDocumentAtom);
    if (!document.layers.some((layer) => layer.id === input.id))
      throw new Error("This shadow is no longer available.");
    const candidate = {
      ...document,
      layers: document.layers.map((layer) =>
        layer.id === input.id
          ? {
              ...layer,
              ...(input.patch.opacityTokenId !== undefined ||
              input.patch.manualOpacity !== undefined
                ? {
                    opacity: undefined,
                    opacityTokenId: undefined,
                    manualOpacity: undefined,
                  }
                : {}),
              ...input.patch,
              id: layer.id,
            }
          : layer,
      ),
    };
    validateCandidate(
      candidate,
      get(modeSetsAtom),
      get(scaleTypesAtom),
      get(opacitySourceAtom),
    );
    set(elevationDocumentAtom, candidate);
  },
);
export const addShadowLayerAtom = atom(null, (get, set) => {
  if (!get(editModeAtom)) throw new Error("Enter edit mode to add shadows.");
  const document = get(elevationDocumentAtom);
  if (document.layers.length >= ELEVATION_LAYER_MAX)
    throw new Error("You can add up to eight shadows.");
  let number = 1;
  while (
    document.layers.some(
      (layer) => layer.label.trim().toLowerCase() === `shadow ${number}`,
    )
  )
    number++;
  const layer: ShadowLayer = {
    id: crypto.randomUUID(),
    label: `Shadow ${number}`,
    scaleTypeId: ELEVATION_POWER_FORMULA_ID,
    base: 4,
    scale: 2,
    opacityTokenId: DEFAULT_SHADOW_OPACITY_ID,
  };
  const candidate = { ...document, layers: [...document.layers, layer] };
  validateCandidate(
    candidate,
    get(modeSetsAtom),
    get(scaleTypesAtom),
    get(opacitySourceAtom),
  );
  const taxonomy = registerSteps(candidate, get(taxonomyDocumentAtom));
  set(taxonomyDocumentAtom, taxonomy);
  set(elevationDocumentAtom, candidate);
  return layer.id;
});
export const moveShadowLayerAtom = atom(
  null,
  (get, set, input: { id: string; direction: -1 | 1 }) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to reorder shadows.");
    const document = get(elevationDocumentAtom);
    const index = document.layers.findIndex((layer) => layer.id === input.id);
    const target = index + input.direction;
    if (index < 0 || target < 0 || target >= document.layers.length)
      throw new Error("This shadow cannot move in that direction.");
    const layers = [...document.layers];
    [layers[index], layers[target]] = [layers[target], layers[index]];
    set(elevationDocumentAtom, { ...document, layers });
  },
);
export interface RemovedShadow {
  layer: ShadowLayer;
  index: number;
}
export const removeShadowLayerAtom = atom(
  null,
  (get, set, id: string): RemovedShadow => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to remove shadows.");
    const document = get(elevationDocumentAtom);
    const index = document.layers.findIndex((layer) => layer.id === id);
    if (index < 0) throw new Error("This shadow is no longer available.");
    const candidate = {
      ...document,
      layers: document.layers.filter((layer) => layer.id !== id),
    };
    assertStructureReferences(
      get(structuresDocumentAtom),
      new Map(
        [...elevationReferenceIds(candidate)].map((reference) => [
          reference,
          "elevation" as const,
        ]),
      ),
      "elevation",
    );
    set(elevationDocumentAtom, candidate);
    return { layer: document.layers[index], index };
  },
);
export const restoreShadowLayerAtom = atom(
  null,
  (get, set, removed: RemovedShadow) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to restore shadows.");
    const document = get(elevationDocumentAtom);
    if (
      document.layers.length >= ELEVATION_LAYER_MAX ||
      document.layers.some((layer) => layer.id === removed.layer.id)
    )
      throw new Error("This shadow cannot be restored.");
    const layers = [...document.layers];
    layers.splice(Math.min(removed.index, layers.length), 0, removed.layer);
    const candidate = { ...document, layers };
    validateCandidate(
      candidate,
      get(modeSetsAtom),
      get(scaleTypesAtom),
      get(opacitySourceAtom),
    );
    const taxonomy = registerSteps(candidate, get(taxonomyDocumentAtom));
    set(taxonomyDocumentAtom, taxonomy);
    set(elevationDocumentAtom, candidate);
  },
);
export const updateElevationModeParameterAtom = atom(
  null,
  (
    get,
    set,
    input: {
      parameterId: "elevation.depth" | "elevation.color";
      value: string | number;
    },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change Elevation.");
    if (
      input.parameterId === "elevation.depth"
        ? !finiteRange(input.value, 0, 200)
        : !isOpaqueShadowColor(input.value)
    )
      throw new Error(
        "Choose a valid opaque color or Depth between 0% and 200%.",
      );
    generateElevation(
      resolveElevationDocument(
        {
          ...get(elevationDocumentAtom),
          ...(input.parameterId === "elevation.depth"
            ? { depth: Number(input.value) }
            : { color: String(input.value) }),
        },
        get(activeModesAtom),
        get(modeSetsAtom),
        {},
        get(opacitySourceAtom),
      ),
      get(scaleTypesAtom),
    );
    const target = set(setActiveModeParameterAtom, input);
    if (!target)
      set(
        updateElevationAtom,
        input.parameterId === "elevation.depth"
          ? { depth: Number(input.value) }
          : { color: String(input.value) },
      );
    return target;
  },
);
