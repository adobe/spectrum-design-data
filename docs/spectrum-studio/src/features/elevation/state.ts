// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { persistedAtom } from "../../state/persist";
import { editModeAtom } from "../../state/view/editMode";
import { modeSetsAtom } from "../modes/state";
import { activeModesAtom } from "../modes/selection";
import { previewOverridesAtom } from "../modes/previewState";
import { capabilityOwners } from "../modes/parameters";
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

function validateCandidate(
  document: ElevationDocument,
  sets: ModeSet[],
  formulas: ScaleType[],
) {
  generateElevation(document, formulas);
  for (const modeSet of sets)
    for (const mode of modeSet.modes) {
      generateElevation(
        resolveElevationDocument(document, [mode], sets),
        formulas,
      );
    }
}
function registerSteps(
  document: ElevationDocument,
  taxonomy: TaxonomyDocument,
  formulas: ScaleType[],
) {
  const category = taxonomy.categories.find(
    (category) =>
      category.key === "scaleIndex" && category.scopes.includes("elevation"),
  );
  if (!category)
    throw new Error("Elevation requires the registered Scale index category.");
  for (const level of generateElevation(document, formulas))
    taxonomy = registerTerm(
      taxonomy,
      category.id,
      level.step,
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
    validateCandidate(candidate, get(modeSetsAtom), get(scaleTypesAtom));
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
    const taxonomy = registerSteps(
      candidate,
      get(taxonomyDocumentAtom),
      get(scaleTypesAtom),
    );
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
          ? { ...layer, ...input.patch, id: layer.id }
          : layer,
      ),
    };
    validateCandidate(candidate, get(modeSetsAtom), get(scaleTypesAtom));
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
    opacity: 20,
  };
  const candidate = { ...document, layers: [...document.layers, layer] };
  validateCandidate(candidate, get(modeSetsAtom), get(scaleTypesAtom));
  const taxonomy = registerSteps(
    candidate,
    get(taxonomyDocumentAtom),
    get(scaleTypesAtom),
  );
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
  opacities: { setId: string; modeId: string; value: number }[];
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
    const opacities: RemovedShadow["opacities"] = [];
    set(
      modeSetsAtom,
      get(modeSetsAtom).map((modeSet) => ({
        ...modeSet,
        modes: modeSet.modes.map((mode) => {
          const patch = mode.foundations.elevation;
          if (patch?.layerOpacities?.[id] === undefined) return mode;
          opacities.push({
            setId: modeSet.id,
            modeId: mode.id,
            value: patch.layerOpacities[id],
          });
          const layerOpacities = { ...patch.layerOpacities };
          delete layerOpacities[id];
          return {
            ...mode,
            foundations: {
              ...mode.foundations,
              elevation: { ...patch, layerOpacities },
            },
          };
        }),
      })),
    );
    set(elevationDocumentAtom, candidate);
    return { layer: document.layers[index], index, opacities };
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
    const owner = capabilityOwners(get(modeSetsAtom))[
      "elevation.layerOpacities"
    ];
    const modeSets = get(modeSetsAtom).map((modeSet) => ({
      ...modeSet,
      modes: modeSet.modes.map((mode) => {
        const saved = removed.opacities.find(
          (item) => item.setId === modeSet.id && item.modeId === mode.id,
        );
        return saved && owner === modeSet.id
          ? {
              ...mode,
              foundations: {
                ...mode.foundations,
                elevation: {
                  ...mode.foundations.elevation,
                  layerOpacities: {
                    ...mode.foundations.elevation?.layerOpacities,
                    [removed.layer.id]: saved.value,
                  },
                },
              },
            }
          : mode;
      }),
    }));
    const candidate = { ...document, layers };
    validateCandidate(candidate, modeSets, get(scaleTypesAtom));
    const taxonomy = registerSteps(
      candidate,
      get(taxonomyDocumentAtom),
      get(scaleTypesAtom),
    );
    set(taxonomyDocumentAtom, taxonomy);
    set(elevationDocumentAtom, candidate);
    set(modeSetsAtom, modeSets);
  },
);
export const setShadowModeOpacityAtom = atom(
  null,
  (
    get,
    set,
    input: {
      modeSetId: string;
      modeId: string;
      layerId: string;
      opacity?: number;
    },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change shadow opacity.");
    if (input.opacity !== undefined && !finiteRange(input.opacity, 0, 100))
      throw new Error("Opacity must be between 0% and 100%.");
    const sets = get(modeSetsAtom);
    const owner = sets.find((modeSet) => modeSet.id === input.modeSetId);
    if (
      !owner ||
      capabilityOwners(sets)["elevation.layerOpacities"] !== owner.id ||
      !owner.modes.some((mode) => mode.id === input.modeId)
    )
      throw new Error("This mode does not manage shadow opacities.");
    if (
      !get(elevationDocumentAtom).layers.some(
        (layer) => layer.id === input.layerId,
      )
    )
      throw new Error("This shadow is no longer available.");
    if (owner.defaultModeId === input.modeId) {
      if (input.opacity === undefined)
        throw new Error("The default shadow needs an opacity.");
      set(updateShadowLayerAtom, {
        id: input.layerId,
        patch: { opacity: input.opacity },
      });
      return;
    }
    set(
      modeSetsAtom,
      sets.map((modeSet) =>
        modeSet.id !== owner.id
          ? modeSet
          : {
              ...modeSet,
              modes: modeSet.modes.map((mode) => {
                if (mode.id !== input.modeId) return mode;
                const layerOpacities = {
                  ...mode.foundations.elevation?.layerOpacities,
                };
                if (input.opacity === undefined)
                  delete layerOpacities[input.layerId];
                else layerOpacities[input.layerId] = input.opacity;
                return {
                  ...mode,
                  foundations: {
                    ...mode.foundations,
                    elevation: {
                      ...mode.foundations.elevation,
                      layerOpacities,
                    },
                  },
                };
              }),
            },
      ),
    );
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
      {
        ...get(elevationDocumentAtom),
        ...(input.parameterId === "elevation.depth"
          ? { depth: Number(input.value) }
          : { color: String(input.value) }),
      },
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
