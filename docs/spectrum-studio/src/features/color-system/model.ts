// Copyright 2026 Adobe. All rights reserved.
export type ContrastSide = "auto" | "light" | "dark";
export type ContrastReference = "light" | "dark";
import type { OutputColorSpace } from "./colorMath";
import { designSystemDefaults } from "../../data/defaults";
import {
  isFoundationPublishingMetadata,
  type FoundationPublishingMetadata,
} from "../foundations/types";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import { isDataVisScaleList, type DataVisScale } from "./data-vis/model";
import {
  isColorOutputSettings,
  migrateLegacyColorOutput,
  type ColorOutputSettings,
} from "./outputSettings";

export type OutputGamut = OutputColorSpace;
export type SurfaceReference = "base" | "parent";
export type SurfacePreviewRole =
  | "auto"
  | "nest"
  | "applied"
  | "once"
  | "hidden";
export type SurfaceRole = Exclude<SurfacePreviewRole, "auto"> | "base";

export interface ColorStopInput {
  lightness: number;
  hue: number;
  chroma: number;
}

export interface ColorScaleInput {
  name: string;
  stops: ColorStopInput[];
}

export interface SurfaceInput {
  name: string;
  nameRef?: TaxonomyNameReference;
  base?: boolean;
  source?: string;
  sourceScaleId?: string;
  reference?: SurfaceReference;
  contrast?: number;
  forceDark?: boolean;
  expanded?: boolean;
}

export interface ColorSystemDefaults {
  background: string;
  scales: ColorScaleInput[];
  contrasts: number[];
  surfaces: SurfaceInput[];
  extOffset: number;
  extSteep: number;
}

export interface ColorStop extends ColorStopInput {
  id: string;
  /** Links the stop to a palette color; the palette value replaces the stop's own channels when resolved. */
  paletteColorId?: string;
}

/** A static, named color. Channels follow the stop convention so a link can copy them directly. */
export interface PaletteColor extends ColorStopInput {
  id: string;
  name: string;
  nameRef?: TaxonomyNameReference;
}

export interface ColorScale extends FoundationPublishingMetadata {
  id: string;
  name: string;
  nameRef?: TaxonomyNameReference;
  stops: ColorStop[];
  customContrasts?: {
    steps: ContrastToken[];
    baseContrastId: string;
    namingRuleId: string;
  };
}

export interface ContrastToken {
  id: string;
  value: number;
  /** Explicit value at the opposite background extreme; replaces the compensated value. */
  oppositeValue?: number;
}

export interface Surface extends SurfaceInput {
  id: string;
  previewRole: SurfacePreviewRole;
  showInPreview: boolean;
}

export interface ColorSystemDocument {
  schemaVersion: 5;
  background: string;
  backgroundScaleId: string;
  backgroundLightness: number;
  palette: PaletteColor[];
  scales: ColorScale[];
  dataVisScales: DataVisScale[];
  contrasts: ContrastToken[];
  surfaces: Surface[];
  settings: {
    side: ContrastSide;
    extOffset: number;
    extSteep: number;
    guardThreshold: number;
    colorOutput: ColorOutputSettings;
    contrastReference?: ContrastReference;
    /** 0–1 strength of the contrast polarity correction. */
    polarityCompensation?: number;
    /** Scales each contrast's distance from 1:1, applied after polarity compensation. */
    contrastMultiplier?: number;
  };
}

let nextId = 0;

function createId(prefix: string) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

export function hydrateColorSystem(
  defaults: ColorSystemDefaults,
  makeId = createId,
): ColorSystemDocument {
  const scales = defaults.scales.map((scale) => ({
    id: makeId("scale"),
    name: scale.name,
    stops: scale.stops.map((stop) => ({ ...stop, id: makeId("stop") })),
  }));
  return {
    schemaVersion: designSystemDefaults.system.foundations.color.schemaVersion,
    background: defaults.background,
    backgroundScaleId: scales[0].id,
    backgroundLightness:
      designSystemDefaults.system.foundations.color.backgroundLightness,
    palette: designSystemDefaults.system.foundations.color.palette.map(
      (color) => ({ ...color, id: makeId("palette") }),
    ),
    scales,
    dataVisScales: [],
    contrasts: defaults.contrasts.map((value) => ({
      id: makeId("contrast"),
      value,
    })),
    surfaces: defaults.surfaces.map((surface) => ({
      ...surface,
      id: makeId("surface"),
      previewRole:
        designSystemDefaults.system.foundations.color.surfaces[0].previewRole,
      showInPreview:
        designSystemDefaults.system.foundations.color.surfaces[0].showInPreview,
    })),
    settings: {
      ...designSystemDefaults.system.foundations.color.settings,
      extOffset: defaults.extOffset,
      extSteep: defaults.extSteep,
    },
  };
}

export const COLOR_SYSTEM_SCHEMA_VERSION = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Upgrades persisted documents; returns null for versions it cannot read. */
export function migrateColorSystemDocument(
  data: unknown,
  fromVersion: number,
): ColorSystemDocument | null {
  if (![1, 2, 3, 4].includes(fromVersion) || !isRecord(data)) return null;
  if (isColorSystemDocument(data)) return data;
  if (
    !isRecord(data.settings) ||
    !["srgb", "display-p3", "oklch"].includes(String(data.settings.outputGamut))
  )
    return null;
  const { outputGamut, ...settings } = data.settings;
  const migrated = {
    ...data,
    schemaVersion: COLOR_SYSTEM_SCHEMA_VERSION,
    settings: {
      ...settings,
      colorOutput: migrateLegacyColorOutput(outputGamut),
    },
    ...(fromVersion === 1 && { palette: [] }),
    ...(fromVersion < 3 && { dataVisScales: [] }),
  };
  return isColorSystemDocument(migrated) ? migrated : null;
}

function isPaletteColorList(value: unknown): value is PaletteColor[] {
  return (
    Array.isArray(value) &&
    value.every(
      (color) =>
        isRecord(color) &&
        typeof color.id === "string" &&
        typeof color.name === "string" &&
        typeof color.lightness === "number" &&
        typeof color.hue === "number" &&
        typeof color.chroma === "number",
    )
  );
}

export function isColorSystemDocument(
  value: unknown,
): value is ColorSystemDocument {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== COLOR_SYSTEM_SCHEMA_VERSION) return false;
  if (typeof value.background !== "string") return false;
  if (typeof value.backgroundScaleId !== "string") return false;
  if (typeof value.backgroundLightness !== "number") return false;
  if (!isPaletteColorList(value.palette)) return false;
  if (!isDataVisScaleList(value.dataVisScales)) return false;
  if (!Array.isArray(value.surfaces) || value.surfaces.length === 0)
    return false;
  if (!Array.isArray(value.contrasts) || value.contrasts.length === 0)
    return false;
  if (
    !value.contrasts.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.value === "number" &&
        (item.oppositeValue === undefined ||
          typeof item.oppositeValue === "number"),
    )
  ) {
    return false;
  }
  if (!Array.isArray(value.scales) || value.scales.length === 0) return false;
  const scalesValid = value.scales.every(
    (scale) =>
      isRecord(scale) &&
      isFoundationPublishingMetadata(scale) &&
      typeof scale.id === "string" &&
      typeof scale.name === "string" &&
      (scale.customContrasts === undefined ||
        isCustomContrasts(scale.customContrasts)) &&
      Array.isArray(scale.stops) &&
      scale.stops.length > 0 &&
      scale.stops.every(
        (stop) =>
          isRecord(stop) &&
          typeof stop.id === "string" &&
          (stop.paletteColorId === undefined ||
            typeof stop.paletteColorId === "string") &&
          typeof stop.lightness === "number" &&
          typeof stop.hue === "number" &&
          typeof stop.chroma === "number",
      ),
  );
  if (!scalesValid) return false;
  if (
    !isRecord(value.settings) ||
    "outputGamut" in value.settings ||
    !isColorOutputSettings(value.settings.colorOutput)
  )
    return false;
  const { contrastReference, polarityCompensation, contrastMultiplier } =
    value.settings;
  if (
    contrastReference !== undefined &&
    contrastReference !== "light" &&
    contrastReference !== "dark"
  )
    return false;
  if (
    contrastMultiplier !== undefined &&
    typeof contrastMultiplier !== "number"
  )
    return false;
  return (
    polarityCompensation === undefined ||
    typeof polarityCompensation === "number"
  );
}

export function isCustomContrasts(
  value: unknown,
): value is NonNullable<ColorScale["customContrasts"]> {
  if (
    !isRecord(value) ||
    typeof value.baseContrastId !== "string" ||
    typeof value.namingRuleId !== "string" ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0
  )
    return false;
  const ids = new Set<string>();
  return (
    value.steps.every((step) => {
      if (
        !isRecord(step) ||
        typeof step.id !== "string" ||
        !step.id ||
        ids.has(step.id) ||
        typeof step.value !== "number" ||
        !Number.isFinite(step.value) ||
        step.value < 1 ||
        step.value > 21 ||
        (step.oppositeValue !== undefined &&
          (typeof step.oppositeValue !== "number" ||
            !Number.isFinite(step.oppositeValue) ||
            step.oppositeValue < 1 ||
            step.oppositeValue > 21))
      )
        return false;
      ids.add(step.id);
      return true;
    }) && ids.has(value.baseContrastId)
  );
}
