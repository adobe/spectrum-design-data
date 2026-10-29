// Copyright 2026 Adobe. All rights reserved.
export type AdaptiveClaims = { [parameterId: string]: string };

import type { ColorStopInput } from "../color-system/model";
import { designSystemDefaults } from "../../data/defaults";
import { isModeIconId, type ModeIconId } from "./iconIds";
import {
  isElevationOverride,
  type ElevationOverride,
} from "../elevation/model";
import {
  isDataVisContrastOverrides,
  isDataVisSourceOverrides,
  type DataVisContrastOverrides,
  type DataVisSourceOverrides,
} from "../color-system/data-vis/model";

export const MODE_SETS_SCHEMA_VERSION = 9;

/** Mode sets with this key drive design-system preview appearance, not app chrome. */
export const COLOR_SCHEME_MODE_SET_KEY = "colorScheme";
export const CONTRAST_MODE_SET_KEY = "contrast";
export const TEXT_SCALING_MODE_SET_ID = "mode-set-text-scaling";
export const AUTHORING_CAPABILITIES = [
  "color.backgroundLightness",
  "color.backgroundScaleId",
  "color.contrastMultiplier",
  "color.scales",
  "typography.textZoom",
  "elevation.depth",
  "elevation.color",
  "elevation.layerOpacities",
] as const;
export type AuthoringCapability = (typeof AUTHORING_CAPABILITIES)[number];
/** A mode's patch for one stop: literal channels, or a palette link that takes precedence over them. */
export type ColorStopOverride = Partial<
  Pick<ColorStopInput, "hue" | "chroma" | "lightness">
> & { paletteColorId?: string };
export type ColorStopOverrides = {
  [scaleId: string]: { [stopId: string]: ColorStopOverride };
};
export type ColorContrastOverrides = {
  [scaleId: string]: { [contrastId: string]: number };
};

export interface ColorFoundationOverride {
  backgroundScaleId?: string;
  backgroundLightness?: number;
  contrastMultiplier?: number;
  scaleStops?: ColorStopOverrides;
  scaleContrasts?: ColorContrastOverrides;
  dataVisSources?: DataVisSourceOverrides;
  dataVisContrasts?: DataVisContrastOverrides;
}

export interface TypographyFoundationOverride {
  textZoom?: number;
}

export interface ModeFoundations {
  color?: ColorFoundationOverride;
  typography?: TypographyFoundationOverride;
  elevation?: ElevationOverride;
}

export interface Mode {
  id: string;
  key: string;
  name: string;
  description: string;
  iconId: ModeIconId;
  platformIds: string[];
  foundations: ModeFoundations;
}

export interface ModeSet {
  id: string;
  key: string;
  name: string;
  description: string;
  /** When set to anything but "none", it replaces the per-mode icons. */
  iconId?: ModeIconId;
  defaultModeId: string;
  authoringCapabilities?: AuthoringCapability[];
  modes: Mode[];
}

export const MODE_SET_DEFAULTS: readonly ModeSet[] = structuredClone(
  designSystemDefaults.system.modeSets,
);

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "untitled";
}

function uniqueKey(candidate: string, taken: Set<string>) {
  let key = candidate;
  let suffix = 2;
  while (taken.has(key)) {
    key = `${candidate}-${suffix}`;
    suffix += 1;
  }
  taken.add(key);
  return key;
}

/** Fills in spec-style slug keys and a valid default mode without disturbing existing keys. */
export function ensureModeSetKeys(modeSet: ModeSet): ModeSet {
  const taken = new Set<string>();
  const modes = modeSet.modes.map((mode) => ({
    ...mode,
    key: uniqueKey(
      mode.key && mode.key.length > 0 ? mode.key : slugify(mode.name),
      taken,
    ),
  }));
  const defaultModeId = modes.some((mode) => mode.id === modeSet.defaultModeId)
    ? modeSet.defaultModeId
    : (modes[0]?.id ?? "");
  return {
    ...modeSet,
    key:
      modeSet.key && modeSet.key.length > 0
        ? modeSet.key
        : slugify(modeSet.name),
    defaultModeId,
    modes: modes.map((mode) =>
      mode.id === defaultModeId ? { ...mode, foundations: {} } : mode,
    ),
  };
}

export function createMode(): Mode {
  return {
    id: `mode-custom-${crypto.randomUUID()}`,
    key: "",
    name: "New mode",
    description: "",
    iconId: "none",
    platformIds: [],
    foundations: {},
  };
}

export function createModeSet(): ModeSet {
  const mode = createMode();
  return {
    id: `mode-set-custom-${crypto.randomUUID()}`,
    key: "",
    name: "New mode set",
    description: "",
    iconId: "none",
    defaultModeId: mode.id,
    modes: [mode],
  };
}

export function cloneModeSet(modeSet: ModeSet): ModeSet {
  return {
    ...modeSet,
    authoringCapabilities: [...(modeSet.authoringCapabilities ?? [])],
    iconId: isModeIconId(modeSet.iconId) ? modeSet.iconId : "none",
    modes: modeSet.modes.map((mode) => ({
      ...mode,
      platformIds: [...mode.platformIds],
      foundations: structuredClone(mode.foundations ?? {}),
    })),
  };
}

export function modeSetDefaultMode(modeSet: ModeSet): Mode | undefined {
  return (
    modeSet.modes.find((mode) => mode.id === modeSet.defaultModeId) ??
    modeSet.modes[0]
  );
}

function isColorOverride(value: unknown): value is ColorFoundationOverride {
  if (!value || typeof value !== "object") return false;
  const override = value as ColorFoundationOverride;
  if (
    override.backgroundScaleId !== undefined &&
    typeof override.backgroundScaleId !== "string"
  )
    return false;
  if (
    override.backgroundLightness !== undefined &&
    typeof override.backgroundLightness !== "number"
  )
    return false;
  if (
    override.contrastMultiplier !== undefined &&
    typeof override.contrastMultiplier !== "number"
  )
    return false;
  if (
    override.dataVisSources !== undefined &&
    !isDataVisSourceOverrides(override.dataVisSources)
  )
    return false;
  if (
    override.dataVisContrasts !== undefined &&
    !isDataVisContrastOverrides(override.dataVisContrasts)
  )
    return false;
  if (
    override.scaleContrasts !== undefined &&
    (!override.scaleContrasts ||
      typeof override.scaleContrasts !== "object" ||
      Array.isArray(override.scaleContrasts) ||
      !Object.values(override.scaleContrasts).every(
        (steps) =>
          steps &&
          typeof steps === "object" &&
          !Array.isArray(steps) &&
          Object.values(steps).every(
            (ratio) =>
              typeof ratio === "number" &&
              Number.isFinite(ratio) &&
              ratio >= 1 &&
              ratio <= 21,
          ),
      ))
  )
    return false;
  if (
    override.scaleStops !== undefined &&
    (typeof override.scaleStops !== "object" ||
      override.scaleStops === null ||
      !Object.values(override.scaleStops).every(
        (stops) =>
          typeof stops === "object" &&
          stops !== null &&
          Object.values(stops).every(
            (patch) =>
              typeof patch === "object" &&
              patch !== null &&
              [patch.hue, patch.chroma, patch.lightness].every(
                (channel) =>
                  channel === undefined || typeof channel === "number",
              ) &&
              (patch.paletteColorId === undefined ||
                typeof patch.paletteColorId === "string"),
          ),
      ))
  )
    return false;
  return true;
}

function isTypographyOverride(
  value: unknown,
): value is TypographyFoundationOverride {
  if (!value || typeof value !== "object") return false;
  const override = value as TypographyFoundationOverride;
  return (
    override.textZoom === undefined || typeof override.textZoom === "number"
  );
}

function isMode(value: unknown): value is Mode {
  if (!value || typeof value !== "object") return false;
  const mode = value as Partial<Mode>;
  if (!mode.foundations || typeof mode.foundations !== "object") return false;
  if (
    mode.foundations.color !== undefined &&
    !isColorOverride(mode.foundations.color)
  )
    return false;
  if (
    mode.foundations.typography !== undefined &&
    !isTypographyOverride(mode.foundations.typography)
  )
    return false;
  if (
    mode.foundations.elevation !== undefined &&
    !isElevationOverride(mode.foundations.elevation)
  )
    return false;
  return (
    typeof mode.id === "string" &&
    typeof mode.key === "string" &&
    typeof mode.name === "string" &&
    typeof mode.description === "string" &&
    isModeIconId(mode.iconId) &&
    Array.isArray(mode.platformIds) &&
    mode.platformIds.every((id) => typeof id === "string")
  );
}

function isModeSet(value: unknown): value is ModeSet {
  if (!value || typeof value !== "object") return false;
  const modeSet = value as Partial<ModeSet>;
  if (modeSet.iconId !== undefined && !isModeIconId(modeSet.iconId))
    return false;
  if (
    modeSet.authoringCapabilities !== undefined &&
    (!Array.isArray(modeSet.authoringCapabilities) ||
      !modeSet.authoringCapabilities.every((capability) =>
        (AUTHORING_CAPABILITIES as readonly string[]).includes(capability),
      ))
  )
    return false;
  return (
    typeof modeSet.id === "string" &&
    typeof modeSet.key === "string" &&
    typeof modeSet.name === "string" &&
    typeof modeSet.description === "string" &&
    typeof modeSet.defaultModeId === "string" &&
    Array.isArray(modeSet.modes) &&
    modeSet.modes.every(isMode)
  );
}

export function isModeSetList(data: unknown): data is ModeSet[] {
  return Array.isArray(data) && data.every(isModeSet);
}

/** Adds the default Contrast mode set once, at the v3 upgrade, unless one already exists. */
function withContrastModeSet(modeSets: ModeSet[]): ModeSet[] {
  if (modeSets.some((modeSet) => modeSet.key === CONTRAST_MODE_SET_KEY))
    return modeSets;
  const defaults = MODE_SET_DEFAULTS.find(
    (modeSet) => modeSet.key === CONTRAST_MODE_SET_KEY,
  )!;
  return [...modeSets, cloneModeSet(defaults)];
}

/** Adds the default text scaling set at the v6 upgrade unless another set already owns text zoom. */
function withTextScalingModeSet(modeSets: ModeSet[]): ModeSet[] {
  if (
    modeSets.some(
      (modeSet) =>
        modeSet.id === TEXT_SCALING_MODE_SET_ID ||
        modeSet.authoringCapabilities?.includes("typography.textZoom"),
    )
  )
    return modeSets;
  const defaults = MODE_SET_DEFAULTS.find(
    (modeSet) => modeSet.id === TEXT_SCALING_MODE_SET_ID,
  )!;
  return [...modeSets, cloneModeSet(defaults)];
}

export function migrateModeSets(
  data: unknown,
  fromVersion: number,
): ModeSet[] | null {
  if (fromVersion === 8 || fromVersion === 7 || fromVersion === 6)
    return isModeSetList(data) ? data : null;
  if (fromVersion === 5)
    return isModeSetList(data) ? withTextScalingModeSet(data) : null;
  const upgraded = migrateToV5(data, fromVersion);
  return upgraded && withTextScalingModeSet(upgraded);
}

function migrateToV5(data: unknown, fromVersion: number): ModeSet[] | null {
  const upgraded =
    fromVersion === 4 || fromVersion === 3
      ? isModeSetList(data)
        ? data
        : null
      : fromVersion === 2
        ? isModeSetList(data)
          ? withContrastModeSet(data)
          : null
        : migrateV1ModeSets(data, fromVersion);
  if (!upgraded) return null;
  return withContrastModeSet(upgraded).map((modeSet) => ({
    ...modeSet,
    authoringCapabilities:
      fromVersion === 4
        ? modeSet.authoringCapabilities
        : modeSet.key === COLOR_SCHEME_MODE_SET_KEY
          ? ["color.backgroundLightness"]
          : modeSet.key === CONTRAST_MODE_SET_KEY
            ? ["color.contrastMultiplier"]
            : [],
    modes: modeSet.modes.map((mode) => {
      if (mode.id === modeSet.defaultModeId)
        return { ...mode, foundations: {} };
      if (
        modeSet.id === "mode-set-color-scheme" &&
        modeSet.defaultModeId === "mode-light" &&
        mode.id === "mode-dark" &&
        mode.foundations.color?.backgroundLightness === undefined
      ) {
        return {
          ...mode,
          foundations: {
            ...mode.foundations,
            color: { ...mode.foundations.color, backgroundLightness: 0 },
          },
        };
      }
      return mode;
    }),
  }));
}

/** Adds keys, a default mode, and empty overrides to v1 payloads. */
function migrateV1ModeSets(
  data: unknown,
  fromVersion: number,
): ModeSet[] | null {
  if (fromVersion !== 1 || !Array.isArray(data)) return null;
  const upgraded = data.map((entry) => {
    const modeSet = entry as Partial<ModeSet> & { modes?: Partial<Mode>[] };
    if (typeof modeSet.id !== "string" || !Array.isArray(modeSet.modes))
      return null;
    const modes: Mode[] = modeSet.modes.map((mode) => ({
      id: String(mode.id),
      key:
        typeof mode.key === "string"
          ? mode.key
          : slugify(String(mode.name ?? "")),
      name: String(mode.name ?? ""),
      description: String(mode.description ?? ""),
      iconId: isModeIconId(mode.iconId) ? mode.iconId : "none",
      platformIds: Array.isArray(mode.platformIds)
        ? mode.platformIds.map(String)
        : [],
      foundations: {},
    }));
    return ensureModeSetKeys({
      id: modeSet.id,
      key:
        modeSet.id === "mode-set-color-scheme" ? COLOR_SCHEME_MODE_SET_KEY : "",
      name: String(modeSet.name ?? ""),
      description: String(modeSet.description ?? ""),
      iconId: "none",
      defaultModeId: modes[0]?.id ?? "",
      modes,
    });
  });
  return upgraded.every((modeSet): modeSet is ModeSet => modeSet !== null)
    ? upgraded
    : null;
}
