// Copyright 2026 Adobe. All rights reserved.
import {
  type AuthoringCapability,
  type Mode,
  type ModeFoundations,
  type ModeSet,
} from "./model";
import type { ColorSystemDocument } from "../color-system/model";
import type { TypographyDocument } from "../typography/model";
import {
  isSizingMultiplier,
  SIZING_PARAMETER_IDS,
  type ComponentSizingDocument,
} from "../foundations/componentSizing";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN } from "../typography/model";
import { TEXT_ZOOM_STEP_RATIO } from "../typography/typographyGeneration";
import { MAX_CONTRAST_MULTIPLIER } from "../color-system/polarity";
import type { ElevationDocument } from "../elevation/model";
import { capabilityOwners } from "./ownership";
import { previewIdsForCapability } from "./foundationSettings";
export { capabilityOwners } from "./ownership";

export type FoundationId =
  | "color"
  | "opacity"
  | "typography"
  | "spacing"
  | "size"
  | "radius"
  | "elevation"
  | "motion";

export interface FoundationDefinition {
  id: FoundationId;
  label: string;
}

/**
 * A global parameter is a single foundation-wide value a mode may override.
 * Structural data (color scales and stops, how many type sizes are generated) is
 * deliberately absent: it stays global and is never mode-controllable. This list is
 * the explicit allowlist, so anything missing from it cannot be overridden per mode.
 */
export interface FoundationParameterDefinition {
  id: string;
  foundation: FoundationId;
  label: string;
  description?: string;
  control:
    | "backgroundScale"
    | "backgroundLightness"
    | "contrastMultiplier"
    | "textZoom"
    | "sizingPercentage"
    | "shadowDepth"
    | "shadowColor";
}

/** Base documents parameters fall back to; callers pass only the foundations they resolve. */
export interface FoundationDocuments {
  color?: ColorSystemDocument;
  typography?: TypographyDocument;
  elevation?: ElevationDocument;
  componentSizing?: ComponentSizingDocument;
}

export const FOUNDATIONS: readonly FoundationDefinition[] = [
  { id: "color", label: "Color" },
  { id: "opacity", label: "Opacity" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "size", label: "Size" },
  { id: "radius", label: "Corner radius" },
  { id: "elevation", label: "Elevation" },
  { id: "motion", label: "Motion" },
];

export const FOUNDATION_PARAMETERS: readonly FoundationParameterDefinition[] = [
  {
    id: "color.backgroundScaleId",
    foundation: "color",
    label: "Background scale",
    control: "backgroundScale",
  },
  {
    id: "color.backgroundLightness",
    foundation: "color",
    label: "Background lightness",
    control: "backgroundLightness",
  },
  {
    id: "color.contrastMultiplier",
    foundation: "color",
    label: "Overall contrast",
    control: "contrastMultiplier",
  },
  {
    id: "typography.textZoom",
    foundation: "typography",
    label: "Adaptive text scaling",
    description:
      "Adjust text for reading preferences without changing the baseline. Smaller text and headings can adjust at different rates.",
    control: "textZoom",
  },
  {
    id: "typography.textSize",
    foundation: "typography",
    label: "Base text size",
    description:
      "Set the starting text size as a percentage of the type scale before reading adjustments.",
    control: "sizingPercentage",
  },
  {
    id: "size.componentSize",
    foundation: "size",
    label: "Component size",
    control: "sizingPercentage",
  },
  {
    id: "elevation.depth",
    foundation: "elevation",
    label: "Depth",
    control: "shadowDepth",
  },
  {
    id: "elevation.color",
    foundation: "elevation",
    label: "Shadow color",
    control: "shadowColor",
  },
];

export const TEXT_ZOOM_RANGE = {
  minValue: TEXT_ZOOM_MIN,
  maxValue: TEXT_ZOOM_MAX,
  step: 1,
} as const;

/** Span of a numeric mode parameter; `neutral` is its unadjusted value, the anchor of a scale's adaptive binding. */
export interface ModeParameterRange {
  min: number;
  max: number;
  step: number;
  neutral: number;
}

/** Numeric parameters a scale parameter can follow. Adding a parameter here makes it bindable everywhere. */
export const BINDABLE_PARAMETER_RANGES: Readonly<
  Record<string, ModeParameterRange>
> = {
  "typography.textZoom": {
    min: TEXT_ZOOM_MIN,
    max: TEXT_ZOOM_MAX,
    step: 1,
    neutral: 0,
  },
  "color.contrastMultiplier": {
    min: 0,
    max: MAX_CONTRAST_MULTIPLIER,
    step: 0.05,
    neutral: 1,
  },
  "color.backgroundLightness": { min: 0, max: 1, step: 0.05, neutral: 1 },
};

export function bindableParameters() {
  return FOUNDATION_PARAMETERS.filter(
    (parameter) => parameter.id in BINDABLE_PARAMETER_RANGES,
  );
}

export const AUTHORING_CAPABILITY_OPTIONS: readonly {
  id: AuthoringCapability;
  foundation: FoundationId;
  label: string;
}[] = [
  {
    id: "color.backgroundLightness",
    foundation: "color",
    label: "Background lightness",
  },
  {
    id: "color.backgroundScaleId",
    foundation: "color",
    label: "Base color scale",
  },
  {
    id: "color.contrastMultiplier",
    foundation: "color",
    label: "Overall contrast",
  },
  {
    id: "color.scaleAdjustment",
    foundation: "color",
    label: "Hue & saturation",
  },
  {
    id: "typography.textZoom",
    foundation: "typography",
    label: "Adaptive text scaling",
  },
  {
    id: "typography.textSize",
    foundation: "typography",
    label: "Base text size",
  },
  { id: "size.componentSize", foundation: "size", label: "Component size" },
  { id: "elevation.depth", foundation: "elevation", label: "Depth" },
  { id: "elevation.color", foundation: "elevation", label: "Shadow color" },
];

export function capabilityFoundations(
  capabilities: readonly AuthoringCapability[],
): FoundationId[] {
  return [
    ...new Set(
      AUTHORING_CAPABILITY_OPTIONS.filter((option) =>
        capabilities.includes(option.id),
      ).map((option) => option.foundation),
    ),
  ];
}

export function foundationParameters(foundation: FoundationId) {
  return FOUNDATION_PARAMETERS.filter(
    (parameter) => parameter.foundation === foundation,
  );
}

export function parametersForFoundations(foundations: Iterable<FoundationId>) {
  const selected = new Set(foundations);
  return FOUNDATION_PARAMETERS.filter((parameter) =>
    selected.has(parameter.foundation),
  );
}

export function isModeControllableParameter(parameterId: string) {
  return FOUNDATION_PARAMETERS.some(
    (parameter) => parameter.id === parameterId,
  );
}

const PARAMETER_FIELDS: Record<
  string,
  { foundation: keyof ModeFoundations; key: string; isNumeric: boolean }
> = {
  "color.backgroundScaleId": {
    foundation: "color",
    key: "backgroundScaleId",
    isNumeric: false,
  },
  "color.backgroundLightness": {
    foundation: "color",
    key: "backgroundLightness",
    isNumeric: true,
  },
  "color.contrastMultiplier": {
    foundation: "color",
    key: "contrastMultiplier",
    isNumeric: true,
  },
  "typography.textZoom": {
    foundation: "typography",
    key: "textZoom",
    isNumeric: true,
  },
  "typography.textSize": {
    foundation: "typography",
    key: "textSize",
    isNumeric: true,
  },
  "size.componentSize": {
    foundation: "size",
    key: "componentSize",
    isNumeric: true,
  },
  "elevation.depth": { foundation: "elevation", key: "depth", isNumeric: true },
  "elevation.color": {
    foundation: "elevation",
    key: "color",
    isNumeric: false,
  },
};

export function parameterValue(
  mode: Mode,
  parameterId: string,
): string | number | undefined {
  const field = PARAMETER_FIELDS[parameterId];
  if (!field) return undefined;
  return (
    mode.foundations[field.foundation] as
      | Record<string, string | number | undefined>
      | undefined
  )?.[field.key];
}

export function modeOverridesParameter(mode: Mode, parameterId: string) {
  return parameterValue(mode, parameterId) !== undefined;
}

export function modeOverridesCapability(
  mode: Mode,
  capability: AuthoringCapability,
) {
  if (
    capability === "color.contrastMultiplier" &&
    Object.values(mode.foundations.color?.dataVisContrasts ?? {}).some(
      (points) => Object.keys(points).length,
    )
  )
    return true;
  if (
    capability === "color.contrastMultiplier" &&
    Object.values(mode.foundations.color?.scaleContrasts ?? {}).some(
      (steps) => Object.keys(steps).length,
    )
  )
    return true;
  return modeOverridesParameter(mode, capability);
}

/** The value a mode inherits when it declares no override of its own. */
export function baseParameterValue(
  documents: FoundationDocuments,
  parameterId: string,
) {
  if (parameterId === "color.backgroundScaleId")
    return documents.color?.backgroundScaleId;
  if (parameterId === "color.backgroundLightness")
    return documents.color?.backgroundLightness;
  if (parameterId === "color.contrastMultiplier")
    return (
      documents.color && (documents.color.settings.contrastMultiplier ?? 1)
    );
  if (parameterId === "typography.textZoom")
    return documents.typography?.textZoom;
  if (parameterId === "typography.textSize")
    return documents.typography?.textSize;
  if (parameterId === "size.componentSize")
    return documents.componentSizing?.componentSize;
  if (parameterId === "elevation.depth") return documents.elevation?.depth;
  if (parameterId === "elevation.color") return documents.elevation?.color;
  return undefined;
}

export function effectiveParameterValue(
  mode: Mode | undefined,
  parameterId: string,
  documents: FoundationDocuments,
) {
  return (
    (mode && parameterValue(mode, parameterId)) ??
    baseParameterValue(documents, parameterId)
  );
}

export function textZoomPercent(textZoom: number) {
  return Math.round(Math.pow(TEXT_ZOOM_STEP_RATIO, textZoom) * 100);
}

export function formatParameterValue(
  parameter: FoundationParameterDefinition,
  value: string | number | undefined,
  documents: FoundationDocuments,
) {
  if (value === undefined) return "";
  if (parameter.control === "sizingPercentage")
    return new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(Number(value));
  if (parameter.control === "shadowDepth") return `${value}%`;
  if (parameter.control === "shadowColor") return String(value);
  if (
    parameter.control === "backgroundLightness" ||
    parameter.control === "contrastMultiplier"
  ) {
    return `${Math.round(Number(value) * 100)}%`;
  }
  if (parameter.control === "textZoom")
    return `${textZoomPercent(Number(value))}%`;
  return (
    documents.color?.scales.find((scale) => scale.id === String(value))?.name ??
    String(value)
  );
}

export function setParameterValue(
  mode: Mode,
  parameterId: string,
  value: string | number | undefined,
): Mode {
  if (parameterId === "color.dataVisContrasts") {
    if (value !== undefined)
      throw new Error(
        "Use the data vis editor to set control-point overrides.",
      );
    const color = { ...mode.foundations.color };
    delete color.dataVisContrasts;
    const foundations = { ...mode.foundations };
    if (Object.keys(color).length) foundations.color = color;
    else delete foundations.color;
    return { ...mode, foundations };
  }
  if (parameterId.startsWith("elevation.layerOpacities/")) {
    if (value !== undefined)
      throw new Error("Use the shadow opacity editor to set layer values.");
    const layerOpacities = { ...mode.foundations.elevation?.layerOpacities };
    delete layerOpacities[
      parameterId.slice("elevation.layerOpacities/".length)
    ];
    return {
      ...mode,
      foundations: {
        ...mode.foundations,
        elevation: { ...mode.foundations.elevation, layerOpacities },
      },
    };
  }
  const field = PARAMETER_FIELDS[parameterId];
  if (!field) return mode;
  if (
    value !== undefined &&
    SIZING_PARAMETER_IDS.some((id) => id === parameterId) &&
    !isSizingMultiplier(value)
  )
    throw new Error("Enter a percentage greater than zero.");
  const overrides: Record<string, unknown> = {
    ...mode.foundations[field.foundation],
  };
  if (value === undefined) {
    delete overrides[field.key];
  } else {
    overrides[field.key] = field.isNumeric ? Number(value) : String(value);
  }
  const foundations: ModeFoundations = { ...mode.foundations };
  if (Object.keys(overrides).length > 0) {
    (foundations as Record<string, unknown>)[field.foundation] = overrides;
  } else {
    delete foundations[field.foundation];
  }
  return { ...mode, foundations };
}

/**
 * A parameter may be claimed by only one mode set, which keeps resolution
 * order-independent and avoids conflicting overrides.
 */
export function parameterOwners(modeSets: ModeSet[]): Record<string, string> {
  const owners: Record<string, string> = {};
  const capabilities = capabilityOwners(modeSets);
  for (const parameter of FOUNDATION_PARAMETERS) {
    const owner = capabilities[parameter.id as AuthoringCapability];
    if (owner) owners[parameter.id] = owner;
  }
  return owners;
}

export function parameterOwnerFor(
  owners: Record<string, string>,
  parameterId: string,
  modeSetId: string,
) {
  const owner = owners[parameterId];
  return owner && owner !== modeSetId ? owner : undefined;
}

// Slider values arrive as channel/100, so exact equality would flag float drift as a custom state.
const NUMERIC_EPSILON = 1e-6;

export function parameterValuesMatch(
  a: string | number | undefined,
  b: string | number | undefined,
) {
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) < NUMERIC_EPSILON;
  return a === b;
}

/** Preview controls follow mode capabilities independently of adaptive ownership. */
export function responsibleParameterIds(
  modeSets: ModeSet[],
  modeSetId: string,
): string[] {
  return (
    modeSets.find((modeSet) => modeSet.id === modeSetId)
      ?.authoringCapabilities ?? []
  ).flatMap(previewIdsForCapability);
}
