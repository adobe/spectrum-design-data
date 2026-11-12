// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "./model";

function withoutLink<T extends { paletteColorId?: string }>(value: T): T {
  const copy = { ...value };
  delete copy.paletteColorId;
  return copy;
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
  const scales = document.scales.map((scale) => {
    const stops = scale.stops.map((stop) => {
      if (stop.paletteColorId === undefined) return stop;
      const color = palette.get(stop.paletteColorId);
      if (!color) return withoutLink(stop);
      if (
        stop.lightness === color.lightness &&
        stop.hue === color.hue &&
        stop.chroma === color.chroma
      )
        return stop;
      return {
        ...stop,
        lightness: color.lightness,
        hue: color.hue,
        chroma: color.chroma,
      };
    });
    return stops.every((stop, index) => stop === scale.stops[index])
      ? scale
      : { ...scale, stops };
  });
  return scales.every((scale, index) => scale === document.scales[index])
    ? document
    : { ...document, scales };
}

export interface PaletteConsumer {
  scaleId: string;
  stopId: string;
}

export function paletteConsumers(
  document: ColorSystemDocument,
  paletteColorId: string,
): PaletteConsumer[] {
  return document.scales.flatMap((scale) =>
    scale.stops
      .filter((stop) => stop.paletteColorId === paletteColorId)
      .map((stop) => ({ scaleId: scale.id, stopId: stop.id })),
  );
}

/** Replaces every link to the color with its current value, so scales keep their appearance. */
export function detachPaletteColor(
  document: ColorSystemDocument,
  paletteColorId: string,
) {
  const color = document.palette.find((item) => item.id === paletteColorId);
  if (!color) return { document };
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
  };
}

/** Drops links to palette colors that no longer exist; stops keep their own channels. */
export function normalizePaletteReferences(document: ColorSystemDocument) {
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
  return {
    document: scales === document.scales ? document : { ...document, scales },
    changed: scales !== document.scales,
  };
}
