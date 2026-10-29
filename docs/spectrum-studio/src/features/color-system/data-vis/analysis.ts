// Copyright 2026 Adobe. All rights reserved.
import type { RgbGamut } from "../colorMath";
import type { VisionProfile } from "./model";
import { MeasurementCache, type PairMeasurement } from "./measurements";

export interface DataVisObservation {
  id: string;
  label: string;
  position: number;
  value: string;
}
export type DataVisMetric = "lightness" | "chroma" | "hue" | "contrast";

export function dataVisMetricPoints(
  observations: readonly DataVisObservation[],
  background: string,
  gamut: RgbGamut,
  metric: DataVisMetric,
  cache = new MeasurementCache(),
): { x: number; y: number | null; label: string }[] {
  return observations.map((observation) => {
    const color = cache.color(observation.value, background, "normal", gamut);
    const [lightness, chroma, hue] = color.to("oklch").coords;
    const value =
      metric === "contrast"
        ? cache.backgroundContrast(observation.value, background, gamut)
        : metric === "lightness"
          ? lightness
          : metric === "chroma"
            ? chroma
            : chroma < 1e-5 || !Number.isFinite(hue)
              ? null
              : hue;
    return {
      x: observation.position,
      y: value,
      label: `${observation.label}: ${value === null ? "no chromatic hue" : value.toFixed(4)}`,
    };
  });
}

export interface DataVisComparison {
  id: string;
  firstLabel: string;
  secondLabel: string;
  measurement: PairMeasurement;
  wcagNonText: "pass" | "fail" | "not-applicable";
}
export type DataVisReference =
  | { kind: "background" }
  | { kind: "color"; id: string }
  | { kind: "adjacent" }
  | { kind: "all" };

export function dataVisComparisonPage(
  observations: readonly DataVisObservation[],
  background: string,
  gamut: RgbGamut,
  profile: VisionProfile,
  reference: DataVisReference,
  page = 0,
  pageSize = 50,
  cache = new MeasurementCache(),
) {
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 500
  ) {
    throw new Error(
      "Choose a valid comparison page and a page size from one to 500.",
    );
  }
  const selected =
    reference.kind === "color"
      ? observations.find((observation) => observation.id === reference.id)
      : undefined;
  if (reference.kind === "color" && !selected)
    throw new Error(
      "The comparison color is unavailable. Choose a current color.",
    );
  const total =
    reference.kind === "all"
      ? (observations.length * (observations.length - 1)) / 2
      : reference.kind === "background"
        ? observations.length
        : Math.max(0, observations.length - 1);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(total / pageSize) - 1),
  );
  const start = currentPage * pageSize,
    end = Math.min(total, start + pageSize),
    rows: DataVisComparison[] = [];
  const compare = (
    first: DataVisObservation,
    second: Pick<DataVisObservation, "id" | "label" | "value">,
  ) => {
    const measurement = cache.pair(
      first.value,
      second.value,
      background,
      profile,
      gamut,
    );
    rows.push({
      id: JSON.stringify([first.id, second.id, profile]),
      firstLabel: first.label,
      secondLabel: second.label,
      measurement,
      wcagNonText:
        profile !== "normal"
          ? "not-applicable"
          : measurement.contrast >= 3
            ? "pass"
            : "fail",
    });
  };
  if (reference.kind === "all") {
    let offset = 0;
    for (let first = 0; first < observations.length && offset < end; first++) {
      const length = observations.length - first - 1;
      if (offset + length > start)
        for (
          let index = Math.max(0, start - offset);
          index < Math.min(length, end - offset);
          index++
        ) {
          compare(observations[first], observations[first + index + 1]);
        }
      offset += length;
    }
  } else if (reference.kind === "adjacent") {
    for (let index = start; index < end; index++)
      compare(observations[index], observations[index + 1]);
  } else {
    const second = selected ?? {
      id: "background",
      label: "UI background",
      value: background,
    };
    const colors = selected
      ? observations.filter((observation) => observation.id !== selected.id)
      : observations;
    for (let index = start; index < end; index++)
      compare(colors[index], second);
  }
  return {
    rows,
    total,
    page: currentPage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
export function dataVisComparisons(
  observations: readonly DataVisObservation[],
  background: string,
  gamut: RgbGamut,
  profile: VisionProfile,
  referenceId = "background",
  cache = new MeasurementCache(),
): DataVisComparison[] {
  const reference =
    referenceId === "background"
      ? { id: "background", label: "UI background", value: background }
      : observations.find((observation) => observation.id === referenceId);
  if (!reference)
    throw new Error(
      "The comparison color is unavailable. Choose a current color.",
    );
  return observations
    .filter((observation) => observation.id !== reference.id)
    .map((observation) => {
      const measurement = cache.pair(
        observation.value,
        reference.value,
        background,
        profile,
        gamut,
      );
      return {
        id: JSON.stringify([observation.id, reference.id, profile]),
        firstLabel: observation.label,
        secondLabel: reference.label,
        measurement,
        wcagNonText:
          profile !== "normal"
            ? "not-applicable"
            : measurement.contrast >= 3
              ? "pass"
              : "fail",
      };
    });
}
