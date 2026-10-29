// Copyright 2026 Adobe. All rights reserved.
import type { ColorStop, ColorSystemDocument, PaletteColor } from "./model";
import type {
  ColorStopOverride,
  ColorStopOverrides,
  ModeSet,
} from "../modes/model";

const CHANNELS = ["lightness", "hue", "chroma"] as const;

function hasLiteralChannel(patch: ColorStopOverride) {
  return CHANNELS.some((channel) => patch[channel] !== undefined);
}

function withoutLink<T extends { paletteColorId?: string }>(value: T): T {
  const copy = { ...value };
  delete copy.paletteColorId;
  return copy;
}

/** A mode's palette link wins; a mode's literal channels replace the base link; otherwise the base link stands. */
export function applyStopPatch(
  stop: ColorStop,
  patch: ColorStopOverride | undefined,
  palette: readonly PaletteColor[] = [],
): ColorStop {
  if (!patch) return stop;
  const replacesLink =
    patch.paletteColorId === undefined && hasLiteralChannel(patch);
  // A partial literal patch builds on the color the stop currently shows, not its stale stored copy.
  const shown =
    replacesLink && stop.paletteColorId !== undefined
      ? palette.find((color) => color.id === stop.paletteColorId)
      : undefined;
  const merged: ColorStop = {
    ...stop,
    ...(shown && {
      lightness: shown.lightness,
      hue: shown.hue,
      chroma: shown.chroma,
    }),
    ...patch,
  };
  if (replacesLink) delete merged.paletteColorId;
  return merged;
}

/** Copies linked palette values onto stops. A link to a missing color is dropped and the stop keeps its own channels. */
export function resolvePaletteLinks(
  document: ColorSystemDocument,
): ColorSystemDocument {
  if (
    !document.scales.some((scale) =>
      scale.stops.some((stop) => stop.paletteColorId !== undefined),
    )
  )
    return document;
  const palette = new Map(document.palette.map((color) => [color.id, color]));
  return {
    ...document,
    scales: document.scales.map((scale) => ({
      ...scale,
      stops: scale.stops.map((stop) => {
        if (stop.paletteColorId === undefined) return stop;
        const color = palette.get(stop.paletteColorId);
        if (!color) return withoutLink(stop);
        return {
          ...stop,
          lightness: color.lightness,
          hue: color.hue,
          chroma: color.chroma,
        };
      }),
    })),
  };
}

export interface PaletteConsumer {
  scaleId: string;
  stopId: string;
  /** Set when the link lives in a mode's override instead of the base stop. */
  modeSetId?: string;
  modeId?: string;
}

function forEachModePatch(
  modeSets: readonly ModeSet[],
  visit: (
    patch: ColorStopOverride,
    location: {
      modeSetId: string;
      modeId: string;
      scaleId: string;
      stopId: string;
    },
  ) => void,
) {
  for (const modeSet of modeSets) {
    for (const mode of modeSet.modes) {
      for (const [scaleId, stops] of Object.entries(
        mode.foundations.color?.scaleStops ?? {},
      )) {
        for (const [stopId, patch] of Object.entries(stops))
          visit(patch, {
            modeSetId: modeSet.id,
            modeId: mode.id,
            scaleId,
            stopId,
          });
      }
    }
  }
}

export function paletteConsumers(
  document: ColorSystemDocument,
  modeSets: readonly ModeSet[],
  paletteColorId: string,
): PaletteConsumer[] {
  const consumers: PaletteConsumer[] = document.scales.flatMap((scale) =>
    scale.stops
      .filter((stop) => stop.paletteColorId === paletteColorId)
      .map((stop) => ({ scaleId: scale.id, stopId: stop.id })),
  );
  forEachModePatch(modeSets, (patch, location) => {
    if (patch.paletteColorId === paletteColorId) consumers.push(location);
  });
  return consumers;
}

/** Rewrites every mode patch; returns the same array when nothing changed. */
function mapModePatches(
  modeSets: ModeSet[],
  map: (patch: ColorStopOverride) => ColorStopOverride | null,
): ModeSet[] {
  let changedAny = false;
  const next = modeSets.map((modeSet) => ({
    ...modeSet,
    modes: modeSet.modes.map((mode) => {
      const scaleStops = mode.foundations.color?.scaleStops;
      if (!scaleStops) return mode;
      let changed = false;
      const rewritten: ColorStopOverrides = {};
      for (const [scaleId, stops] of Object.entries(scaleStops)) {
        const keptStops: Record<string, ColorStopOverride> = {};
        for (const [stopId, patch] of Object.entries(stops)) {
          const result = map(patch);
          if (result !== patch) changed = true;
          if (result && Object.keys(result).length) keptStops[stopId] = result;
        }
        if (Object.keys(keptStops).length) rewritten[scaleId] = keptStops;
      }
      if (!changed) return mode;
      changedAny = true;
      const color = { ...mode.foundations.color };
      delete color.scaleStops;
      if (Object.keys(rewritten).length) color.scaleStops = rewritten;
      const foundations = { ...mode.foundations };
      if (Object.keys(color).length) foundations.color = color;
      else delete foundations.color;
      return { ...mode, foundations };
    }),
  }));
  return changedAny ? next : modeSets;
}

function literalPatch(
  color: PaletteColor,
  patch: ColorStopOverride,
): ColorStopOverride {
  return {
    ...withoutLink(patch),
    lightness: color.lightness,
    hue: color.hue,
    chroma: color.chroma,
  };
}

/** Replaces every link to the color with its current value, so scales keep their appearance. */
export function detachPaletteColor(
  document: ColorSystemDocument,
  modeSets: ModeSet[],
  paletteColorId: string,
) {
  const color = document.palette.find((item) => item.id === paletteColorId);
  if (!color) return { document, modeSets };
  const scales = document.scales.map((scale) =>
    scale.stops.some((stop) => stop.paletteColorId === paletteColorId)
      ? {
          ...scale,
          stops: scale.stops.map((stop) =>
            stop.paletteColorId === paletteColorId
              ? {
                  ...withoutLink(stop),
                  lightness: color.lightness,
                  hue: color.hue,
                  chroma: color.chroma,
                }
              : stop,
          ),
        }
      : scale,
  );
  return {
    document: { ...document, scales },
    modeSets: mapModePatches(modeSets, (patch) =>
      patch.paletteColorId === paletteColorId
        ? literalPatch(color, patch)
        : patch,
    ),
  };
}

/** Drops links to palette colors that no longer exist. Base stops keep their own channels; mode patches fall back to the base stop. */
export function normalizePaletteReferences(
  document: ColorSystemDocument,
  modeSets: ModeSet[],
) {
  const ids = new Set(document.palette.map((color) => color.id));
  const dangling = (id: string | undefined) => id !== undefined && !ids.has(id);
  const scales = document.scales.some((scale) =>
    scale.stops.some((stop) => dangling(stop.paletteColorId)),
  )
    ? document.scales.map((scale) => ({
        ...scale,
        stops: scale.stops.map((stop) =>
          dangling(stop.paletteColorId) ? withoutLink(stop) : stop,
        ),
      }))
    : document.scales;
  const nextModeSets = mapModePatches(modeSets, (patch) =>
    dangling(patch.paletteColorId) ? withoutLink(patch) : patch,
  );
  return {
    document: scales === document.scales ? document : { ...document, scales },
    modeSets: nextModeSets,
    changed: scales !== document.scales || nextModeSets !== modeSets,
  };
}
