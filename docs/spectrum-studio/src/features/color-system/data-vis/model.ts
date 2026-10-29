// Copyright 2026 Adobe. All rights reserved.
import type { ColorStopInput } from "../model";
import {
  isFoundationPublishingMetadata,
  type FoundationPublishingMetadata,
} from "../../foundations/types";
import type { TaxonomyNameReference } from "../../taxonomy/naming";
import { concreteColor } from "./colors";

export type DataVisKind = "sequential" | "diverging" | "categorical";
export type PaletteStyle = "balanced" | "bold";
export type CvdProfile =
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";
export type VisionProfile = "normal" | CvdProfile;

export interface UiSwatchSource {
  kind: "ui-swatch";
  scaleId: string;
  contrastId: string;
}

export interface PrimitiveColorSource {
  kind: "primitive-token";
  tokenId: string;
}

export interface FrozenColor {
  id: string;
  value: string;
  position?: number;
  tokenId?: string;
  overrideValue?: string;
}

export type OwnedPointSource =
  | { kind: "key-color"; color: ColorStopInput }
  | { kind: "ui-scale"; scaleId: string };

export interface PointContrast {
  value: number;
  oppositeValue?: number;
}

export type DataVisPoint = {
  id: string;
  position: number;
} & (
  | { source: OwnedPointSource; contrast: PointContrast }
  | { source: UiSwatchSource | PrimitiveColorSource; contrast?: never }
);

export interface DataVisScaleBase extends FoundationPublishingMetadata {
  id: string;
  name: string;
  nameRef?: TaxonomyNameReference;
  /** The adaptive recipe and its mode edits remain dormant while these colors are active. */
  staticColors?: FrozenColor[];
}

export interface ContinuousDataVisScale extends DataVisScaleBase {
  kind: "sequential" | "diverging";
  points: DataVisPoint[];
}

export interface CategoricalMember {
  id: string;
  source: UiSwatchSource;
}

export type PaletteSize = { kind: "auto" } | { kind: "count"; count: number };

export interface CategoricalPreferences {
  size: PaletteSize;
  minimumBackgroundContrast: number;
  minimumDeltaE: number;
  cvdProfiles: CvdProfile[];
  style: PaletteStyle;
}

export interface CategoricalDataVisScale extends DataVisScaleBase {
  kind: "categorical";
  members: CategoricalMember[];
  preferences: CategoricalPreferences;
}

export type DataVisScale = ContinuousDataVisScale | CategoricalDataVisScale;

export interface DataVisSourcePatch {
  color?: Partial<ColorStopInput>;
  scaleId?: string;
  contrastId?: string;
  tokenId?: string;
}

export type DataVisSourceOverrides = {
  [scaleId: string]: { [pointId: string]: DataVisSourcePatch };
};
export type DataVisContrastOverrides = {
  [scaleId: string]: { [pointId: string]: number };
};

export const DEFAULT_CATEGORICAL_PREFERENCES: CategoricalPreferences = {
  size: { kind: "auto" },
  minimumBackgroundContrast: 3,
  minimumDeltaE: 11,
  cvdProfiles: ["protanopia", "deuteranopia", "tritanopia"],
  style: "balanced",
};

export const VISION_PROFILE_LABELS: Record<VisionProfile, string> = {
  normal: "Normal vision",
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
  achromatopsia: "Grayscale approximation",
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const between = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= minimum &&
  value <= maximum;

export function isCvdProfile(value: unknown): value is CvdProfile {
  return (
    value === "protanopia" ||
    value === "deuteranopia" ||
    value === "tritanopia" ||
    value === "achromatopsia"
  );
}

export function isKeyColor(value: unknown): value is ColorStopInput {
  return (
    isRecord(value) &&
    between(value.lightness, 0, 1) &&
    between(value.hue, 0, 360) &&
    between(value.chroma, 0, MAX_AUTHORED_CHROMA)
  );
}

export function isUiSwatchSource(value: unknown): value is UiSwatchSource {
  return (
    isRecord(value) &&
    value.kind === "ui-swatch" &&
    identifier(value.scaleId) &&
    identifier(value.contrastId)
  );
}

export function isPrimitiveColorSource(
  value: unknown,
): value is PrimitiveColorSource {
  return (
    isRecord(value) &&
    value.kind === "primitive-token" &&
    identifier(value.tokenId)
  );
}

function isConcreteColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    concreteColor(value);
    return true;
  } catch {
    return false;
  }
}

export function isFrozenColor(value: unknown): value is FrozenColor {
  return (
    isRecord(value) &&
    identifier(value.id) &&
    isConcreteColor(value.value) &&
    (value.position === undefined || between(value.position, 0, 1)) &&
    (value.tokenId === undefined || identifier(value.tokenId)) &&
    (value.overrideValue === undefined || isConcreteColor(value.overrideValue))
  );
}

export function frozenColorValue(color: FrozenColor) {
  return color.overrideValue ?? color.value;
}

export function isPointContrast(value: unknown): value is PointContrast {
  return (
    isRecord(value) &&
    between(value.value, 1, 21) &&
    (value.oppositeValue === undefined || between(value.oppositeValue, 1, 21))
  );
}

export function isDataVisPoint(value: unknown): value is DataVisPoint {
  if (
    !isRecord(value) ||
    !identifier(value.id) ||
    !between(value.position, 0, 1) ||
    !isRecord(value.source)
  )
    return false;
  if (isUiSwatchSource(value.source) || isPrimitiveColorSource(value.source))
    return value.contrast === undefined;
  const source = value.source;
  return (
    isPointContrast(value.contrast) &&
    ((source.kind === "key-color" && isKeyColor(source.color)) ||
      (source.kind === "ui-scale" && identifier(source.scaleId)))
  );
}

export function isCategoricalPreferences(
  value: unknown,
): value is CategoricalPreferences {
  if (!isRecord(value) || !isRecord(value.size)) return false;
  return (
    (value.size.kind === "auto" ||
      (value.size.kind === "count" &&
        typeof value.size.count === "number" &&
        Number.isSafeInteger(value.size.count) &&
        value.size.count >= 1)) &&
    between(value.minimumBackgroundContrast, 1, 21) &&
    typeof value.minimumDeltaE === "number" &&
    Number.isFinite(value.minimumDeltaE) &&
    value.minimumDeltaE >= 0 &&
    Array.isArray(value.cvdProfiles) &&
    value.cvdProfiles.every(isCvdProfile) &&
    new Set(value.cvdProfiles).size === value.cvdProfiles.length &&
    (value.style === "balanced" || value.style === "bold")
  );
}

export function isDataVisScale(value: unknown): value is DataVisScale {
  if (
    !isRecord(value) ||
    !identifier(value.id) ||
    !identifier(value.name) ||
    !isFoundationPublishingMetadata(value)
  )
    return false;
  if (
    value.staticColors !== undefined &&
    (!Array.isArray(value.staticColors) ||
      !value.staticColors.length ||
      !value.staticColors.every(isFrozenColor) ||
      new Set(value.staticColors.map((color) => color.id)).size !==
        value.staticColors.length)
  )
    return false;
  if (value.kind === "categorical") {
    const members = value.members;
    if (!Array.isArray(members)) return false;
    return (
      isCategoricalPreferences(value.preferences) &&
      members.length > 0 &&
      members.every(
        (member) =>
          isRecord(member) &&
          identifier(member.id) &&
          isUiSwatchSource(member.source),
      ) &&
      new Set(members.map((member) => member.id)).size === members.length &&
      (value.staticColors === undefined ||
        (value.staticColors.length === members.length &&
          value.staticColors.every(
            (color) =>
              color.position === undefined &&
              members.some((member) => member.id === color.id),
          )))
    );
  }
  if (value.kind !== "sequential" && value.kind !== "diverging") return false;
  if (
    !Array.isArray(value.points) ||
    value.points.length < 2 ||
    !value.points.every(isDataVisPoint)
  )
    return false;
  const points: DataVisPoint[] = value.points;
  if (value.staticColors !== undefined) {
    const colors = value.staticColors;
    if (
      colors.length < 2 ||
      colors[0].position !== 0 ||
      colors.at(-1)?.position !== 1 ||
      !colors.every(
        (color, index) =>
          color.position !== undefined &&
          (index === 0 || color.position > colors[index - 1].position!),
      ) ||
      (value.kind === "diverging" &&
        !colors.some((color) => color.position === 0.5))
    )
      return false;
  }
  return (
    points[0].position === 0 &&
    points.at(-1)?.position === 1 &&
    new Set(points.map((point) => point.id)).size === points.length &&
    points.every(
      (point, index) =>
        index === 0 || point.position > points[index - 1].position,
    ) &&
    (value.kind !== "diverging" ||
      points.some((point) => point.position === 0.5))
  );
}

export function isDataVisScaleList(value: unknown): value is DataVisScale[] {
  return (
    Array.isArray(value) &&
    value.every(isDataVisScale) &&
    new Set(value.map((scale) => scale.id)).size === value.length
  );
}

export function isDataVisSourcePatch(
  value: unknown,
): value is DataVisSourcePatch {
  if (
    !isRecord(value) ||
    !Object.keys(value).every((key) =>
      ["color", "scaleId", "contrastId", "tokenId"].includes(key),
    )
  )
    return false;
  if (value.scaleId !== undefined && !identifier(value.scaleId)) return false;
  if (value.contrastId !== undefined && !identifier(value.contrastId))
    return false;
  if (value.tokenId !== undefined && !identifier(value.tokenId)) return false;
  if (value.color !== undefined) {
    const color = value.color;
    if (
      !isRecord(color) ||
      !Object.keys(color).every((key) =>
        ["lightness", "hue", "chroma"].includes(key),
      )
    )
      return false;
    if (color.lightness !== undefined && !between(color.lightness, 0, 1))
      return false;
    if (color.hue !== undefined && !between(color.hue, 0, 360)) return false;
    if (
      color.chroma !== undefined &&
      !between(color.chroma, 0, MAX_AUTHORED_CHROMA)
    )
      return false;
  }
  return true;
}

export function isDataVisSourceOverrides(
  value: unknown,
): value is DataVisSourceOverrides {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (points) =>
        isRecord(points) && Object.values(points).every(isDataVisSourcePatch),
    )
  );
}

export function isDataVisContrastOverrides(
  value: unknown,
): value is DataVisContrastOverrides {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (points) =>
        isRecord(points) &&
        Object.values(points).every((ratio) => between(ratio, 1, 21)),
    )
  );
}

export function applyDataVisPointPatch(
  point: DataVisPoint,
  sourcePatch?: DataVisSourcePatch,
  ratio?: number,
): DataVisPoint {
  let source = point.source;
  if (sourcePatch) {
    if (source.kind === "key-color") {
      if (
        sourcePatch.scaleId !== undefined ||
        sourcePatch.contrastId !== undefined ||
        sourcePatch.tokenId !== undefined
      )
        throw new Error(`Point ${point.id} requires a key-color patch.`);
      source = { ...source, color: { ...source.color, ...sourcePatch.color } };
    } else if (source.kind === "primitive-token") {
      if (
        sourcePatch.color !== undefined ||
        sourcePatch.scaleId !== undefined ||
        sourcePatch.contrastId !== undefined
      ) {
        throw new Error(`Point ${point.id} requires a primitive-token patch.`);
      }
      source = {
        ...source,
        ...(sourcePatch.tokenId !== undefined && {
          tokenId: sourcePatch.tokenId,
        }),
      };
    } else if (
      source.kind === "ui-swatch" &&
      sourcePatch.tokenId !== undefined
    ) {
      if (
        sourcePatch.color !== undefined ||
        sourcePatch.scaleId !== undefined ||
        sourcePatch.contrastId !== undefined
      ) {
        throw new Error(`Point ${point.id} requires one exact token source.`);
      }
      source = { kind: "primitive-token", tokenId: sourcePatch.tokenId };
    } else {
      if (
        sourcePatch.color !== undefined ||
        sourcePatch.tokenId !== undefined ||
        (source.kind === "ui-scale" && sourcePatch.contrastId !== undefined)
      ) {
        throw new Error(
          `Point ${point.id} requires a matching UI source patch.`,
        );
      }
      source = {
        ...source,
        ...(sourcePatch.scaleId !== undefined && {
          scaleId: sourcePatch.scaleId,
        }),
        ...(source.kind === "ui-swatch" &&
          sourcePatch.contrastId !== undefined && {
            contrastId: sourcePatch.contrastId,
          }),
      };
    }
  }
  if (source.kind === "ui-swatch" || source.kind === "primitive-token") {
    if (ratio !== undefined)
      throw new Error(
        `Linked point ${point.id} cannot own a contrast override.`,
      );
    return { id: point.id, position: point.position, source };
  }
  if (!point.contrast)
    throw new Error(`Point ${point.id} has no owned contrast.`);
  return {
    ...point,
    source,
    contrast: {
      ...point.contrast,
      ...(ratio !== undefined && { value: ratio }),
    },
  };
}

export function patchDataVisScales(
  scales: DataVisScale[],
  sources?: DataVisSourceOverrides,
  contrasts?: DataVisContrastOverrides,
): DataVisScale[] {
  if (!sources && !contrasts) return scales;
  return scales.map((scale) =>
    scale.kind === "categorical"
      ? scale
      : {
          ...scale,
          points: scale.points.map((point) =>
            applyDataVisPointPatch(
              point,
              sources?.[scale.id]?.[point.id],
              contrasts?.[scale.id]?.[point.id],
            ),
          ),
        },
  );
}
import { MAX_AUTHORED_CHROMA } from "../paletteValue";
