// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";
import { createColorDefaults } from "../../data/defaults";
import {
  COLOR_SYSTEM_SCHEMA_VERSION,
  isColorSystemDocument,
  migrateColorSystemDocument,
  type ColorScale,
  type ColorSystemDocument,
  type ContrastReference,
  type ContrastToken,
  type PaletteColor,
  type Surface,
  type SurfaceRole,
} from "./model";
import {
  buildScaleData,
  resolveScaleColorAtLightness,
} from "./scaleGeneration";
import {
  detachPaletteColor,
  paletteConsumers,
  type PaletteConsumer,
} from "./paletteReferences";
import { resolveColorDocument } from "./resolution";
export { resolveColorDocument } from "./resolution";
import {
  createPaletteColor,
  findPaletteValueDuplicate,
  validatePaletteName,
  PALETTE_NAME_ERRORS,
} from "./palette";
import {
  collapsedContrastIds,
  contrastForEffectiveEdit,
  contrastMultiplier,
  divideContrast,
  MAX_CONTRAST_MULTIPLIER,
  polarityContext,
} from "./polarity";
import {
  selectedColorScaleIdAtom,
  selectedColorStopIdAtom,
} from "../../state/view/colorSystemView";
import { persistedAtom } from "../../state/persist";
import { assertAuthoringUpdate } from "../../state/authoringGuards";
import {
  activeModesAtom,
  setActiveModeParameterAtom,
} from "../modes/selection";
import { modeSelectionAtom, resolveActiveMode } from "../modes/selection";
import {
  clearPreviewParametersAtom,
  previewOverridesAtom,
  setPreviewParameterAtom,
} from "../modes/previewState";
import { editModeAtom } from "../../state/view/editMode";
import { modeSetsAtom } from "../modes/state";
import {
  COLOR_SCHEME_MODE_SET_KEY,
  createMode,
  ensureModeSetKeys,
} from "../modes/model";
import {
  capabilityOwners,
  effectiveParameterValue,
  parameterOwners,
  setParameterValue,
} from "../modes/parameters";
import { modeCombinationCount, modeCombinations } from "../modes/combinations";
import type {
  ContrastLibraryMode,
  CustomContrastLibraryMode,
  ScaleLibraryMode,
} from "./cssLibrary";
import { dataAttribute, sanitizeTokenName } from "./cssLibrary";
import { withTaxonomyContributions } from "../taxonomy/contributions";
import {
  taxonomyColorSourceId,
  taxonomyPaletteSourceId,
  taxonomySurfaceSourceId,
} from "../taxonomy/model";
import {
  reconcileColorSourceNames,
  resolveColorSourceNames,
} from "../taxonomy/naming";
import { rulesAtom } from "../logic/library";
import { pruneCustomContrastPatches } from "./customContrastPatches";
import type { ModeSet } from "../modes/model";
import {
  scaleContrasts,
  assertCustomContrastNaming,
  sortContrastSteps,
} from "./contrastSteps";
import { tokenStableKey, tokenUuid } from "../tokens/model";
import {
  removeColorTokenRecords,
  restoreColorTokenRecords,
  type RemovedColorTokenRecords,
} from "./colorTokenCleanup";
import { assertCustomContrastPatchRestore } from "./customContrastPatches";
import { dataVisSourceId } from "./data-vis/identity";
import { pruneDataVisPatches } from "./data-vis/patches";
import {
  assertNoDataVisSourceLoss,
  blockedUiSourceRemoval,
} from "./data-vis/references";
import {
  updateColorOutputSettings,
  type ColorOutputSettings,
} from "./outputSettings";
import { MAX_AUTHORED_CHROMA } from "./paletteValue";

const storedColorSystemDocumentAtom = persistedAtom<ColorSystemDocument>({
  key: "foundations/color",
  schemaVersion: COLOR_SYSTEM_SCHEMA_VERSION,
  initialize: createColorDefaults,
  validate: isColorSystemDocument,
  migrate: migrateColorSystemDocument,
});
const namedColorSystemDocumentAtom = withTaxonomyContributions(
  storedColorSystemDocumentAtom,
  (document) => [
    ...document.scales.flatMap((source) => [
      {
        sourceId: taxonomyColorSourceId(source.id),
        field: "colorFamily",
        value: source.name,
      },
    ]),
    ...document.palette.map((source) => ({
      sourceId: taxonomyPaletteSourceId(source.id),
      field: "colorFamily",
      value: source.name,
    })),
    ...document.surfaces.map((surface) => ({
      sourceId: taxonomySurfaceSourceId(surface.id),
      field: "surfaceName",
      value: surface.name,
    })),
    ...document.dataVisScales.map((source) => ({
      sourceId: dataVisSourceId(source.id),
      field: "colorFamily",
      value: source.name,
    })),
  ],
  isColorSystemDocument,
  "foundations/color",
  {
    resolve: resolveColorSourceNames,
    reconcile: (taxonomy, previous, next, get) =>
      reconcileColorSourceNames(taxonomy, previous, next, get(rulesAtom)),
  },
);
export const colorSystemDocumentAtom = atom(
  (get) => get(namedColorSystemDocumentAtom),
  (
    get,
    set,
    update:
      | ColorSystemDocument
      | ((previous: ColorSystemDocument) => ColorSystemDocument),
  ) => {
    const previous = get(storedColorSystemDocumentAtom);
    const next = typeof update === "function" ? update(previous) : update;
    if (!isColorSystemDocument(next))
      throw new Error("Invalid Color foundation data cannot be saved.");
    const sets = get(modeSetsAtom);
    const pruned = pruneDataVisPatches(
      pruneCustomContrastPatches(sets, next.scales),
      next.dataVisScales,
    );
    assertNoDataVisSourceLoss(previous, next, pruned);
    set(namedColorSystemDocumentAtom, next);
    if (JSON.stringify(sets) !== JSON.stringify(pruned))
      set(modeSetsAtom, pruned);
  },
);

/** Base document plus mode and preview overrides, then polarity compensation, then the contrast multiplier. */
export const resolvedColorSystemDocumentAtom = atom((get) =>
  resolveColorDocument(
    get(colorSystemDocumentAtom),
    get(activeModesAtom),
    get(previewOverridesAtom),
    { modeSets: get(modeSetsAtom) },
  ),
);

/** Resolved document before the contrast multiplier, which CSS applies with calc(). */
export const cssBaseDocumentAtom = atom((get) =>
  resolveColorDocument(
    get(colorSystemDocumentAtom),
    get(activeModesAtom),
    get(previewOverridesAtom),
    { applyMultiplier: false, modeSets: get(modeSetsAtom) },
  ),
);

export const customContrastModeDocumentsAtom = atom(
  (get): CustomContrastLibraryMode[] => {
    const base = get(colorSystemDocumentAtom);
    if (!base.scales.some((scale) => scale.customContrasts)) return [];
    const sets = get(modeSetsAtom);
    const owners = parameterOwners(sets);
    const ownerIds = new Set([
      owners["color.contrastMultiplier"],
      owners["color.backgroundLightness"],
      owners["color.backgroundScaleId"],
      capabilityOwners(sets)["color.scales"],
    ]);
    const axes = sets.filter(
      (axis) => ownerIds.has(axis.id) && axis.modes.length,
    );
    if (modeCombinationCount(axes) > 4096)
      throw new Error("Too many color mode combinations to export.");
    const combinations = modeCombinations(axes);
    return combinations.flatMap((modes) => {
      const selector =
        modes
          .map((mode, index) => {
            const axis = axes[index],
              attribute = dataAttribute(axis.key);
            return mode.id === axis.defaultModeId
              ? `:is(:root:not([${attribute}]), :root[${attribute}="${sanitizeTokenName(mode.key)}"])`
              : `[${attribute}="${sanitizeTokenName(mode.key)}"]`;
          })
          .join("") || ":root";
      const document = resolveColorDocument(base, modes, undefined, {
        applyMultiplier: false,
        modeSets: sets,
      });
      const result: CustomContrastLibraryMode[] = [{ selector, document }];
      const contrastIndex = axes.findIndex(
        (axis) => axis.id === owners["color.contrastMultiplier"],
      );
      const contrast = modes[contrastIndex];
      if (contrast && (contrast.key === "high" || contrast.key === "more")) {
        const attribute = dataAttribute(axes[contrastIndex].key);
        result.push({
          document,
          prefersContrast: true,
          selector: modes
            .map((mode, index) =>
              index === contrastIndex
                ? `:root:not([${attribute}])`
                : mode.id === axes[index].defaultModeId
                  ? `:is(:root:not([${dataAttribute(axes[index].key)}]), :root[${dataAttribute(axes[index].key)}="${sanitizeTokenName(mode.key)}"])`
                  : `[${dataAttribute(axes[index].key)}="${sanitizeTokenName(mode.key)}"]`,
            )
            .join(""),
        });
      }
      return result;
    });
  },
);

/** Multiplier per mode of whichever mode set owns the contrast multiplier. */
export const contrastModesAtom = atom((get): ContrastLibraryMode[] => {
  const modeSets = get(modeSetsAtom);
  const ownerId = parameterOwners(modeSets)["color.contrastMultiplier"];
  const modeSet = modeSets.find((candidate) => candidate.id === ownerId);
  if (!modeSet || modeSet.modes.length === 0) return [];
  const base = get(colorSystemDocumentAtom);
  const defaultId = modeSet.modes.some(
    (mode) => mode.id === modeSet.defaultModeId,
  )
    ? modeSet.defaultModeId
    : modeSet.modes[0].id;
  return modeSet.modes.map((mode) => ({
    modeSetKey: modeSet.key,
    key: mode.key,
    isDefault: mode.id === defaultId,
    multiplier: Number(
      effectiveParameterValue(mode, "color.contrastMultiplier", {
        color: base,
      }) ?? 1,
    ),
  }));
});

export interface ColorSchemeDocument {
  key: string;
  name: string;
  isDefault: boolean;
  document: ColorSystemDocument;
}

/** One pre-multiplier document per color scheme mode for CSS, which applies the multiplier with calc(). */
export const colorSchemeDocumentsAtom = atom((get): ColorSchemeDocument[] => {
  const modeSet = get(modeSetsAtom).find(
    (candidate) =>
      candidate.key === COLOR_SCHEME_MODE_SET_KEY &&
      candidate.authoringCapabilities?.some((id) => id.startsWith("color.")),
  );
  if (!modeSet || modeSet.modes.length === 0) return [];
  const base = get(colorSystemDocumentAtom);
  const active = get(activeModesAtom);
  const defaultId = modeSet.modes.some(
    (mode) => mode.id === modeSet.defaultModeId,
  )
    ? modeSet.defaultModeId
    : modeSet.modes[0].id;
  return modeSet.modes.map((mode) => ({
    key: mode.key,
    name: mode.name,
    isDefault: mode.id === defaultId,
    document: resolveColorDocument(
      base,
      active.map((candidate) =>
        modeSet.modes.some((item) => item.id === candidate.id)
          ? mode
          : candidate,
      ),
      undefined,
      { applyMultiplier: false, modeSets: get(modeSetsAtom) },
    ),
  }));
});

export const scaleModeDocumentsAtom = atom((get): ScaleLibraryMode[] => {
  const sets = get(modeSetsAtom);
  const owner = sets.find(
    (item) => item.id === capabilityOwners(sets)["color.scales"],
  );
  if (!owner?.modes.length) return [];
  const active = get(activeModesAtom);
  const base = get(colorSystemDocumentAtom);
  const defaultMode =
    owner.modes.find((mode) => mode.id === owner.defaultModeId) ??
    owner.modes[0];
  return owner.modes.map((mode) => ({
    modeSetKey: owner.key,
    key: mode.key,
    isDefault: mode.id === defaultMode.id,
    document: resolveColorDocument(
      base,
      active.map((candidate) =>
        owner.modes.some((item) => item.id === candidate.id) ? mode : candidate,
      ),
      undefined,
      { applyMultiplier: false, modeSets: sets },
    ),
  }));
});

export const updateColorSystemBackgroundAtom = atom(
  null,
  (get, set, background: string) => {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, { ...document, background });
  },
);

export const updateBackgroundScaleAtom = atom(
  null,
  (get, set, scaleId: string) => {
    const document = get(colorSystemDocumentAtom);
    if (!document.scales.some((scale) => scale.id === scaleId)) return;
    if (!get(editModeAtom)) {
      set(setPreviewParameterAtom, {
        parameterId: "color.backgroundScaleId",
        value: scaleId,
      });
      return;
    }
    const target = set(setActiveModeParameterAtom, {
      parameterId: "color.backgroundScaleId",
      value: scaleId,
    });
    if (target === "pending") return;
    set(clearPreviewParametersAtom, ["color.backgroundScaleId"]);
    if (target) return;
    set(colorSystemDocumentAtom, { ...document, backgroundScaleId: scaleId });
  },
);

export const updateBackgroundLightnessAtom = atom(
  null,
  (get, set, lightness: number) => {
    const document = get(colorSystemDocumentAtom);
    const clamped = Math.min(1, Math.max(0, lightness));
    if (!get(editModeAtom)) {
      set(setPreviewParameterAtom, {
        parameterId: "color.backgroundLightness",
        value: clamped,
      });
      return;
    }
    const target = set(setActiveModeParameterAtom, {
      parameterId: "color.backgroundLightness",
      value: clamped,
    });
    if (target === "pending") return;
    set(clearPreviewParametersAtom, ["color.backgroundLightness"]);
    if (target) return;
    set(colorSystemDocumentAtom, {
      ...document,
      backgroundLightness: clamped,
    });
  },
);

export const contrastMultiplierAtom = atom((get) =>
  contrastMultiplier(get(resolvedColorSystemDocumentAtom)),
);

export const updateContrastMultiplierAtom = atom(
  null,
  (get, set, multiplier: number) => {
    const document = get(colorSystemDocumentAtom);
    const clamped = Math.min(MAX_CONTRAST_MULTIPLIER, Math.max(0, multiplier));
    if (!get(editModeAtom)) {
      set(setPreviewParameterAtom, {
        parameterId: "color.contrastMultiplier",
        value: clamped,
      });
      return;
    }
    const target = set(setActiveModeParameterAtom, {
      parameterId: "color.contrastMultiplier",
      value: clamped,
    });
    if (target === "pending") return;
    set(clearPreviewParametersAtom, ["color.contrastMultiplier"]);
    if (target) return;
    set(colorSystemDocumentAtom, {
      ...document,
      settings: { ...document.settings, contrastMultiplier: clamped },
    });
  },
);

export const resolvedBackgroundAtom = atom((get) => {
  const document = get(resolvedColorSystemDocumentAtom);
  const scale =
    document.scales.find((item) => item.id === document.backgroundScaleId) ??
    document.scales[0];
  return resolveScaleColorAtLightness(
    scale,
    document.backgroundLightness,
    document.settings.colorOutput,
  );
});

export const updateColorSystemSettingsAtom = atom(
  null,
  (
    get,
    set,
    patch: Partial<{
      extOffset: number;
      extSteep: number;
      colorOutput: ColorOutputSettings;
      contrastReference: ContrastReference;
      polarityCompensation: number;
    }>,
  ) => {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, {
      ...document,
      settings: {
        ...document.settings,
        ...(patch.extOffset !== undefined && {
          extOffset: Math.min(1, Math.max(0, patch.extOffset)),
        }),
        ...(patch.extSteep !== undefined && {
          extSteep: Math.min(1, Math.max(-1, patch.extSteep)),
        }),
        ...(patch.colorOutput !== undefined && {
          colorOutput: patch.colorOutput,
        }),
        ...(patch.contrastReference !== undefined && {
          contrastReference: patch.contrastReference,
        }),
        ...(patch.polarityCompensation !== undefined && {
          polarityCompensation: Math.min(
            1,
            Math.max(0, patch.polarityCompensation),
          ),
        }),
      },
    });
  },
);

export const colorOutputSettingsAtom = atom(
  (get) => get(colorSystemDocumentAtom).settings.colorOutput,
);

export const updateColorOutputSettingsAtom = atom(
  null,
  (get, set, patch: Partial<ColorOutputSettings>) => {
    if (!get(editModeAtom))
      throw new Error(
        "Choose Edit before changing color authoring or output settings.",
      );
    const result = updateColorOutputSettings(
      get(colorOutputSettingsAtom),
      patch,
    );
    const document = get(colorSystemDocumentAtom);
    assertAuthoringUpdate(get, "foundations/color", {
      ...document,
      settings: { ...document.settings, colorOutput: result.settings },
    });
    set(updateColorSystemSettingsAtom, { colorOutput: result.settings });
    return result.message;
  },
);

export const polarityContextAtom = atom((get) =>
  polarityContext(get(resolvedColorSystemDocumentAtom)),
);

export const canEditContrastStepsAtom = atom((get) => {
  const sets = get(modeSetsAtom);
  const selection = get(modeSelectionAtom);
  return (
    !Object.keys(get(previewOverridesAtom)).some((id) =>
      id.startsWith("color."),
    ) &&
    sets
      .filter((set) =>
        set.authoringCapabilities?.some((id) => id.startsWith("color.")),
      )
      .every(
        (set) => resolveActiveMode(set, selection)?.id === set.defaultModeId,
      )
  );
});

function assertContrastAuthoring(get: Getter) {
  if (!get(editModeAtom))
    throw new Error("Enter edit mode to change contrast steps.");
  if (!get(canEditContrastStepsAtom))
    throw new Error(
      "Select the default Color modes to edit shared contrast steps.",
    );
}

/** Final contrasts at the current background; edits undo the multiplier, then route to authored or opposite values. */
export const updateContrastTokenAtom = atom(
  null,
  (get, set, update: { id: string; value: number }) => {
    assertContrastAuthoring(get);
    const document = get(colorSystemDocumentAtom);
    const context = get(polarityContextAtom);
    const target = divideContrast(update.value, get(contrastMultiplierAtom));
    set(colorSystemDocumentAtom, {
      ...document,
      contrasts: document.contrasts.map((contrast) =>
        contrast.id === update.id
          ? contrastForEffectiveEdit(contrast, target, context)
          : contrast,
      ),
    });
  },
);

function withoutOpposite(contrast: ContrastToken): ContrastToken {
  const next = { ...contrast };
  delete next.oppositeValue;
  return next;
}

export const resetOppositeContrastAtom = atom(null, (get, set, id: string) => {
  assertContrastAuthoring(get);
  const document = get(colorSystemDocumentAtom);
  set(colorSystemDocumentAtom, {
    ...document,
    contrasts: document.contrasts.map((contrast) =>
      contrast.id === id ? withoutOpposite(contrast) : contrast,
    ),
  });
});

export const removeContrastOverridesAtom = atom(null, (get, set) => {
  assertContrastAuthoring(get);
  const document = get(colorSystemDocumentAtom);
  set(colorSystemDocumentAtom, {
    ...document,
    contrasts: document.contrasts.map(withoutOpposite),
  });
});

export const addContrastTokenAtom = atom(null, (get, set) => {
  assertContrastAuthoring(get);
  const document = get(colorSystemDocumentAtom);
  const maximum = Math.max(
    ...document.contrasts.map((contrast) => contrast.value),
  );
  set(colorSystemDocumentAtom, {
    ...document,
    contrasts: [
      ...document.contrasts,
      {
        id: `contrast-custom-${crypto.randomUUID()}`,
        value: Math.min(21, maximum + 0.5),
      },
    ],
  });
});

export const removeContrastTokenAtom = atom(null, (get, set, id: string) => {
  assertContrastAuthoring(get);
  const document = get(colorSystemDocumentAtom);
  if (document.contrasts.length <= 1) {
    return;
  }
  set(colorSystemDocumentAtom, {
    ...document,
    contrasts: document.contrasts.filter((contrast) => contrast.id !== id),
  });
});

export const restoreContrastTokenAtom = atom(
  null,
  (get, set, input: { contrast: ContrastToken; index: number }) => {
    const document = get(colorSystemDocumentAtom);
    if (
      document.contrasts.some((contrast) => contrast.id === input.contrast.id)
    ) {
      return;
    }
    const index = Math.min(Math.max(0, input.index), document.contrasts.length);
    set(colorSystemDocumentAtom, {
      ...document,
      contrasts: [
        ...document.contrasts.slice(0, index),
        input.contrast,
        ...document.contrasts.slice(index),
      ],
    });
  },
);

export const updateColorStopAtom = atom(
  null,
  (
    get,
    set,
    update: {
      scaleId: string;
      stopId: string;
      lightness?: number;
      hue?: number;
      chroma?: number;
      paletteColorId?: string | null;
      scope?: "base" | "mode";
    },
  ) => {
    const document = get(colorSystemDocumentAtom);
    const scale = document.scales.find((item) => item.id === update.scaleId);
    const baseStop = scale?.stops.find((stop) => stop.id === update.stopId);
    if (!baseStop) return;
    const patch = {
      ...(update.lightness !== undefined && {
        lightness: Math.min(1, Math.max(0, update.lightness)),
      }),
      ...(update.hue !== undefined && {
        hue: ((update.hue % 360) + 360) % 360,
      }),
      ...(update.chroma !== undefined && {
        chroma: Math.min(MAX_AUTHORED_CHROMA, Math.max(0, update.chroma)),
      }),
    };
    const modeSets = get(modeSetsAtom);
    const owner = modeSets.find(
      (item) => item.id === capabilityOwners(modeSets)["color.scales"],
    );
    const selected = owner && resolveActiveMode(owner, get(modeSelectionAtom));
    const link =
      typeof update.paletteColorId === "string"
        ? document.palette.find((color) => color.id === update.paletteColorId)
        : undefined;
    if (typeof update.paletteColorId === "string" && !link) return;
    if (
      update.scope !== "base" &&
      owner &&
      selected &&
      selected.id !== owner.defaultModeId
    ) {
      const existing =
        selected.foundations.color?.scaleStops?.[update.scaleId]?.[
          update.stopId
        ];
      const { paletteColorId: existingLink, ...existingLiteral } =
        existing ?? {};
      // Literal edits and unlinks start from the color the mode currently shows.
      const unlinked = link
        ? undefined
        : document.palette.find(
            (color) => color.id === (existingLink ?? baseStop.paletteColorId),
          );
      const next = link
        ? { paletteColorId: link.id }
        : {
            ...existingLiteral,
            ...(unlinked && {
              lightness: unlinked.lightness,
              hue: unlinked.hue,
              chroma: unlinked.chroma,
            }),
            ...patch,
          };
      set(
        modeSetsAtom,
        modeSets.map((modeSet) =>
          modeSet.id !== owner.id
            ? modeSet
            : {
                ...modeSet,
                modes: modeSet.modes.map((mode) =>
                  mode.id !== selected.id
                    ? mode
                    : {
                        ...mode,
                        foundations: {
                          ...mode.foundations,
                          color: {
                            ...mode.foundations.color,
                            scaleStops: {
                              ...mode.foundations.color?.scaleStops,
                              [update.scaleId]: {
                                ...mode.foundations.color?.scaleStops?.[
                                  update.scaleId
                                ],
                                [update.stopId]: next,
                              },
                            },
                          },
                        },
                      },
                ),
              },
        ),
      );
      return;
    }
    // A literal edit or an unlink replaces the base link.
    const { paletteColorId: baseLink, ...unlinkedStop } = baseStop;
    const baseUnlinked = link
      ? undefined
      : document.palette.find((color) => color.id === baseLink);
    const nextStop = link
      ? {
          ...baseStop,
          lightness: link.lightness,
          hue: link.hue,
          chroma: link.chroma,
          paletteColorId: link.id,
        }
      : {
          ...unlinkedStop,
          ...(baseUnlinked && {
            lightness: baseUnlinked.lightness,
            hue: baseUnlinked.hue,
            chroma: baseUnlinked.chroma,
          }),
          ...patch,
        };
    set(colorSystemDocumentAtom, {
      ...document,
      scales: document.scales.map((scale) =>
        scale.id !== update.scaleId
          ? scale
          : {
              ...scale,
              stops: scale.stops.map((stop) =>
                stop.id !== update.stopId ? stop : nextStop,
              ),
            },
      ),
    });
  },
);

export const resetModeColorStopAtom = atom(
  null,
  (get, set, input: { scaleId: string; stopId: string }) => {
    const sets = get(modeSetsAtom);
    const owner = sets.find(
      (item) => item.id === capabilityOwners(sets)["color.scales"],
    );
    const selected = owner && resolveActiveMode(owner, get(modeSelectionAtom));
    if (!owner || !selected || selected.id === owner.defaultModeId) return;
    set(
      modeSetsAtom,
      sets.map((modeSet) =>
        modeSet.id !== owner.id
          ? modeSet
          : {
              ...modeSet,
              modes: modeSet.modes.map((mode) => {
                if (mode.id !== selected.id) return mode;
                const color = { ...mode.foundations.color };
                const stops = { ...color.scaleStops?.[input.scaleId] };
                delete stops[input.stopId];
                const scaleStops = { ...color.scaleStops };
                if (Object.keys(stops).length)
                  scaleStops[input.scaleId] = stops;
                else delete scaleStops[input.scaleId];
                if (Object.keys(scaleStops).length)
                  color.scaleStops = scaleStops;
                else delete color.scaleStops;
                return { ...mode, foundations: { ...mode.foundations, color } };
              }),
            },
      ),
    );
  },
);

export const applyColorStopToModeAtom = atom(
  null,
  (
    get,
    set,
    input: {
      modeSetId: string;
      modeId?: string;
      name?: string;
      update: {
        scaleId: string;
        stopId: string;
        lightness?: number;
        hue?: number;
        chroma?: number;
        paletteColorId?: string | null;
      };
    },
  ) => {
    const sets = get(modeSetsAtom);
    const owner = sets.find(
      (item) =>
        item.id === input.modeSetId &&
        item.authoringCapabilities?.includes("color.scales"),
    );
    if (!owner) return;
    let targetId = input.modeId;
    if (!targetId) {
      const name = input.name?.trim();
      if (!name) return;
      const preview = get(previewOverridesAtom);
      const owners = parameterOwners(sets);
      const captured = Object.keys(preview).filter(
        (id) => owners[id] === owner.id,
      );
      let created = { ...createMode(), name };
      for (const id of captured)
        created = setParameterValue(created, id, preview[id]);
      targetId = created.id;
      set(
        modeSetsAtom,
        sets.map((modeSet) =>
          modeSet.id === owner.id
            ? ensureModeSetKeys({
                ...modeSet,
                modes: [...modeSet.modes, created],
              })
            : modeSet,
        ),
      );
      set(clearPreviewParametersAtom, captured);
    }
    const currentOwner = get(modeSetsAtom).find((item) => item.id === owner.id);
    if (
      !currentOwner?.modes.some(
        (mode) =>
          mode.id === targetId && mode.id !== currentOwner.defaultModeId,
      )
    )
      return;
    set(modeSelectionAtom, {
      ...get(modeSelectionAtom),
      [owner.key]: targetId,
    });
    set(updateColorStopAtom, { ...input.update, scope: "mode" });
  },
);

export const updateColorScaleNameAtom = atom(
  null,
  (get, set, update: { scaleId: string; name: string }) => {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, {
      ...document,
      scales: document.scales.map((scale) =>
        scale.id === update.scaleId ? { ...scale, name: update.name } : scale,
      ),
    });
  },
);

export const updateColorScalePublishingAtom = atom(
  null,
  (get, set, update: { scaleId: string; hideFromPublishing: boolean }) => {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, {
      ...document,
      scales: document.scales.map((scale) =>
        scale.id === update.scaleId
          ? { ...scale, hideFromPublishing: update.hideFromPublishing }
          : scale,
      ),
    });
  },
);

export const addSurfaceAtom = atom(null, (get, set) => {
  const document = get(colorSystemDocumentAtom);
  const number = document.surfaces.length;
  set(colorSystemDocumentAtom, {
    ...document,
    surfaces: [
      ...document.surfaces,
      {
        id: `surface-custom-${crypto.randomUUID()}`,
        name: `surface${number}`,
        source: "base",
        reference: "parent",
        contrast: 1.1,
        forceDark: false,
        expanded: false,
        previewRole: "auto",
        showInPreview: true,
      },
    ],
  });
});

export const updateSurfaceAtom = atom(
  null,
  (get, set, update: { id: string; patch: Partial<Surface> }) => {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, {
      ...document,
      surfaces: document.surfaces.map((surface) =>
        surface.id === update.id ? { ...surface, ...update.patch } : surface,
      ),
    });
  },
);

export const removeSurfaceAtom = atom(null, (get, set, id: string) => {
  const document = get(colorSystemDocumentAtom);
  if (
    document.surfaces.length <= 1 ||
    document.surfaces.find((surface) => surface.id === id)?.base
  )
    return;
  set(colorSystemDocumentAtom, {
    ...document,
    surfaces: document.surfaces.filter((surface) => surface.id !== id),
  });
});

export const restoreSurfaceAtom = atom(
  null,
  (get, set, input: { surface: Surface; index: number }) => {
    const document = get(colorSystemDocumentAtom);
    if (document.surfaces.some((surface) => surface.id === input.surface.id))
      return;
    const index = Math.min(Math.max(0, input.index), document.surfaces.length);
    set(colorSystemDocumentAtom, {
      ...document,
      surfaces: [
        ...document.surfaces.slice(0, index),
        input.surface,
        ...document.surfaces.slice(index),
      ],
    });
  },
);

export function sanitizeSurfaceName(value: string) {
  return sanitizeTokenName(value);
}

export function derivedSurfaceRole(
  surface: Surface,
): Exclude<SurfaceRole, "base"> {
  if (surface.reference === "base") return "once";
  if (surface.source === "base") return "nest";
  return "applied";
}

export function surfaceRole(surface: Surface): SurfaceRole {
  if (surface.base) return "base";
  return surface.previewRole === "auto"
    ? derivedSurfaceRole(surface)
    : surface.previewRole;
}

export const removeColorScaleAtom = atom(
  null,
  (get, set, scaleId: string): PaletteEditResult => {
    const document = get(colorSystemDocumentAtom);
    if (document.scales.length <= 1)
      return { ok: false, error: "Keep at least one color scale." };
    if (!document.scales.some((scale) => scale.id === scaleId))
      return { ok: false, error: "This color scale no longer exists." };
    const surfaces = document.surfaces.filter(
      (surface) => surface.sourceScaleId === scaleId,
    );
    if (surfaces.length)
      return {
        ok: false,
        error: `This scale is used by ${surfaces.map((surface) => surface.name).join(", ")}. Choose another tint source for these surfaces before deleting it.`,
      };
    const modePatches = get(modeSetsAtom);
    const blocked = blockedUiSourceRemoval(document, modePatches, scaleId);
    if (blocked) return { ok: false, error: blocked };
    const deletedScale = document.scales.find((scale) => scale.id === scaleId)!;
    const next = {
      ...document,
      scales: document.scales.filter((scale) => scale.id !== scaleId),
      backgroundScaleId:
        document.backgroundScaleId === scaleId
          ? (document.scales.find((scale) => scale.id !== scaleId)?.id ??
            document.backgroundScaleId)
          : document.backgroundScaleId,
    };
    try {
      assertAuthoringUpdate(get, "foundations/color", next);
    } catch (failure) {
      return {
        ok: false,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
    const tokenRecords = removeColorTokenRecords(
      get,
      set,
      new Set(
        scaleContrasts(document, deletedScale).map((step) =>
          tokenUuid(tokenStableKey(scaleId, step.id)),
        ),
      ),
    );
    set(colorSystemDocumentAtom, next);
    return {
      ok: true,
      removedScale: {
        scale: deletedScale,
        index: document.scales.findIndex((scale) => scale.id === scaleId),
        modePatches,
        tokenRecords,
      },
    };
  },
);

export const restoreColorScaleAtom = atom(
  null,
  (
    get,
    set,
    input: {
      scale: ColorScale;
      index: number;
      modePatches?: ModeSet[];
      tokenRecords?: RemovedColorTokenRecords;
    },
  ) => {
    const document = get(colorSystemDocumentAtom);
    if (document.scales.some((scale) => scale.id === input.scale.id)) {
      return;
    }
    const index = Math.min(Math.max(0, input.index), document.scales.length);
    assertCustomContrastNaming(
      { ...document, scales: [...document.scales, input.scale] },
      get(rulesAtom),
    );
    if (input.modePatches)
      assertCustomContrastPatchRestore(
        get(modeSetsAtom),
        input.modePatches.flatMap((axis) =>
          axis.modes
            .filter(
              (mode) =>
                mode.foundations.color?.scaleContrasts?.[input.scale.id],
            )
            .map((mode) => ({ modeId: mode.id })),
        ),
      );
    set(colorSystemDocumentAtom, {
      ...document,
      scales: [
        ...document.scales.slice(0, index),
        input.scale,
        ...document.scales.slice(index),
      ],
    });
    if (input.modePatches)
      set(
        modeSetsAtom,
        get(modeSetsAtom).map((axis) => ({
          ...axis,
          modes: axis.modes.map((mode) => {
            const original = input
              .modePatches!.flatMap((axis) => axis.modes)
              .find((candidate) => candidate.id === mode.id);
            const patches =
              original?.foundations.color?.scaleContrasts?.[input.scale.id];
            if (!patches) return mode;
            return {
              ...mode,
              foundations: {
                ...mode.foundations,
                color: {
                  ...mode.foundations.color,
                  scaleContrasts: {
                    ...mode.foundations.color?.scaleContrasts,
                    [input.scale.id]: patches,
                  },
                },
              },
            };
          }),
        })),
      );
    if (input.tokenRecords)
      restoreColorTokenRecords(get, set, input.tokenRecords);
  },
);

export const addColorScaleAtom = atom(null, (get, set) => {
  const document = get(colorSystemDocumentAtom);
  const names = new Set(document.scales.map((scale) => scale.name));
  let sequence = document.scales.length + 1;
  let name = `color${sequence}`;
  while (names.has(name)) {
    sequence += 1;
    name = `color${sequence}`;
  }

  const stopId = `stop-custom-${crypto.randomUUID()}`;
  const scale = {
    id: `scale-custom-${crypto.randomUUID()}`,
    name,
    // Match the transferred prototype: begin as a neutral midpoint stop.
    stops: [{ id: stopId, lightness: 0.5, hue: 0, chroma: 0 }],
  };
  set(colorSystemDocumentAtom, {
    ...document,
    scales: [scale, ...document.scales],
  });
  set(selectedColorScaleIdAtom, scale.id);
  set(selectedColorStopIdAtom, stopId);
  return scale.id;
});

export const addColorStopAtom = atom(
  null,
  (get, set, input: string | { scaleId: string; lightness?: number }) => {
    const document = get(colorSystemDocumentAtom);
    const scaleId = typeof input === "string" ? input : input.scaleId;
    set(colorSystemDocumentAtom, {
      ...document,
      scales: document.scales.map((scale) => {
        if (scale.id !== scaleId) {
          return scale;
        }
        const lastStop = scale.stops.at(-1)!;
        return {
          ...scale,
          stops: [
            ...scale.stops,
            {
              id: `stop-custom-${crypto.randomUUID()}`,
              lightness:
                input &&
                typeof input !== "string" &&
                input.lightness !== undefined
                  ? Math.min(1, Math.max(0, input.lightness))
                  : Math.max(0, lastStop.lightness - 0.1),
              hue: lastStop.hue,
              chroma: lastStop.chroma,
            },
          ],
        };
      }),
    });
  },
);

export const removeColorStopAtom = atom(
  null,
  (get, set, update: { scaleId: string; stopId: string }) => {
    const document = get(colorSystemDocumentAtom);
    set(colorSystemDocumentAtom, {
      ...document,
      scales: document.scales.map((scale) =>
        scale.id !== update.scaleId || scale.stops.length <= 1
          ? scale
          : {
              ...scale,
              stops: scale.stops.filter((stop) => stop.id !== update.stopId),
            },
      ),
    });
  },
);

export const authoredContrastsAtom = atom(
  (get) => get(colorSystemDocumentAtom).contrasts,
);

export const addPaletteColorAtom = atom(null, (get, set) => {
  const document = get(colorSystemDocumentAtom);
  const color = createPaletteColor(
    document,
    `palette-custom-${crypto.randomUUID()}`,
  );
  set(colorSystemDocumentAtom, {
    ...document,
    palette: [...document.palette, color],
  });
  return color.id;
});

export interface PaletteColorUpdate {
  id: string;
  name?: string;
  lightness?: number;
  hue?: number;
  chroma?: number;
}

export type PaletteEditResult =
  | {
      ok: true;
      removedScale?: {
        scale: ColorScale;
        index: number;
        modePatches: ModeSet[];
        tokenRecords: RemovedColorTokenRecords;
      };
    }
  | { ok: false; error: string };

/** Shared by the Palette tab and the token browser so both enforce the same rules. */
export const updatePaletteColorAtom = atom(
  null,
  (get, set, update: PaletteColorUpdate): PaletteEditResult => {
    const document = get(colorSystemDocumentAtom);
    const current = document.palette.find((color) => color.id === update.id);
    if (!current)
      return { ok: false, error: "This palette color no longer exists." };
    const name = update.name === undefined ? current.name : update.name.trim();
    if (update.name !== undefined) {
      const nameError = validatePaletteName(document, name, current.id);
      if (nameError)
        return { ok: false, error: PALETTE_NAME_ERRORS[nameError] };
    }
    const channels = {
      lightness:
        update.lightness === undefined
          ? current.lightness
          : Math.min(1, Math.max(0, update.lightness)),
      hue:
        update.hue === undefined
          ? current.hue
          : ((update.hue % 360) + 360) % 360,
      chroma:
        update.chroma === undefined
          ? current.chroma
          : Math.min(MAX_AUTHORED_CHROMA, Math.max(0, update.chroma)),
    };
    if (
      update.lightness !== undefined ||
      update.hue !== undefined ||
      update.chroma !== undefined
    ) {
      const duplicate = findPaletteValueDuplicate(
        document,
        channels,
        current.id,
      );
      if (duplicate)
        return {
          ok: false,
          error: `This color is already in the palette as ${duplicate.name}.`,
        };
    }
    try {
      set(colorSystemDocumentAtom, {
        ...document,
        palette: document.palette.map((color) =>
          color.id === current.id ? { ...color, name, ...channels } : color,
        ),
      });
    } catch (failure) {
      return {
        ok: false,
        error: failure instanceof Error ? failure.message : String(failure),
      };
    }
    return { ok: true };
  },
);

export interface RemovedPaletteColor {
  color: PaletteColor;
  index: number;
  consumers: PaletteConsumer[];
}

/** Stops that used the color keep its current value; the returned data lets the deletion toast undo it. */
export const removePaletteColorAtom = atom(
  null,
  (get, set, id: string): RemovedPaletteColor | null => {
    const document = get(colorSystemDocumentAtom);
    const index = document.palette.findIndex((color) => color.id === id);
    if (index < 0) return null;
    const modeSets = get(modeSetsAtom);
    const consumers = paletteConsumers(document, modeSets, id);
    const detached = detachPaletteColor(document, modeSets, id);
    set(colorSystemDocumentAtom, {
      ...detached.document,
      palette: detached.document.palette.filter((color) => color.id !== id),
    });
    if (detached.modeSets !== modeSets) set(modeSetsAtom, detached.modeSets);
    return { color: document.palette[index], index, consumers };
  },
);

export const restorePaletteColorAtom = atom(
  null,
  (get, set, input: RemovedPaletteColor) => {
    const document = get(colorSystemDocumentAtom);
    if (document.palette.some((color) => color.id === input.color.id)) return;
    const index = Math.min(Math.max(0, input.index), document.palette.length);
    const baseConsumers = new Set(
      input.consumers
        .filter((consumer) => !consumer.modeId)
        .map((consumer) => `${consumer.scaleId}:${consumer.stopId}`),
    );
    set(colorSystemDocumentAtom, {
      ...document,
      palette: [
        ...document.palette.slice(0, index),
        input.color,
        ...document.palette.slice(index),
      ],
      scales: document.scales.map((scale) => ({
        ...scale,
        stops: scale.stops.map((stop) =>
          baseConsumers.has(`${scale.id}:${stop.id}`)
            ? { ...stop, paletteColorId: input.color.id }
            : stop,
        ),
      })),
    });
    const modeConsumers = input.consumers.filter((consumer) => consumer.modeId);
    if (!modeConsumers.length) return;
    set(
      modeSetsAtom,
      get(modeSetsAtom).map((modeSet) => ({
        ...modeSet,
        modes: modeSet.modes.map((mode) => {
          const links = modeConsumers.filter(
            (consumer) => consumer.modeId === mode.id,
          );
          if (!links.length) return mode;
          const scaleStops = { ...mode.foundations.color?.scaleStops };
          for (const link of links) {
            scaleStops[link.scaleId] = {
              ...scaleStops[link.scaleId],
              [link.stopId]: {
                ...scaleStops[link.scaleId]?.[link.stopId],
                paletteColorId: input.color.id,
              },
            };
          }
          return {
            ...mode,
            foundations: {
              ...mode.foundations,
              color: { ...mode.foundations.color, scaleStops },
            },
          };
        }),
      })),
    );
  },
);

export const contrastTokensAtom = atom(
  (get) => get(resolvedColorSystemDocumentAtom).contrasts,
);

export const collapsedContrastIdsAtom = atom((get) =>
  collapsedContrastIds(get(authoredContrastsAtom), get(contrastTokensAtom)),
);

export const sortContrastTokensAtom = atom(null, (get, set) => {
  assertContrastAuthoring(get);
  const document = get(colorSystemDocumentAtom);
  set(colorSystemDocumentAtom, {
    ...document,
    contrasts: sortContrastSteps(document.contrasts),
  });
});

export const colorSystemScaleDataAtom = atom(
  (get) =>
    new Map(
      get(resolvedColorSystemDocumentAtom).scales.map((scale) => [
        scale.id,
        buildScaleData(
          scale,
          get(resolvedColorSystemDocumentAtom).settings.colorOutput,
        ),
      ]),
    ),
);
