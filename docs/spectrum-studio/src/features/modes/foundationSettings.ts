// Copyright 2026 Adobe. All rights reserved.
import type { AuthoringCapability, ModeSet } from "./model";

export const FOUNDATION_SETTING_IDS = [
  "color.backgroundLightness",
  "color.backgroundScaleId",
  "color.contrastMultiplier",
  "color.scaleAdjustment",
  "typography.textZoom",
  "typography.textSize",
  "size.componentSize",
  "elevation.depth",
  "elevation.color",
] as const;
export type FoundationSettingId = (typeof FOUNDATION_SETTING_IDS)[number];
export interface FoundationParameterSetting {
  modal: boolean;
  adaptive: boolean;
}
export type FoundationParameterSettings = Record<
  FoundationSettingId,
  FoundationParameterSetting
>;
export const ADAPTIVE_SETTING_IDS: readonly FoundationSettingId[] = [
  "color.backgroundLightness",
  "color.backgroundScaleId",
  "color.contrastMultiplier",
  "color.scaleAdjustment",
  "typography.textZoom",
];
/** Must match `foundationParameterSettings` in design-system.defaults.json. */
export const DEFAULT_ADAPTIVE_SETTING_IDS: readonly FoundationSettingId[] = [
  "color.backgroundLightness",
  "color.contrastMultiplier",
  "typography.textZoom",
];
export const ADAPTIVE_COLOR_CHANNEL_IDS = [
  "color.hueShift",
  "color.saturation",
] as const;

export function foundationParameterDefaults(
  claims?: Readonly<Record<string, string>>,
): FoundationParameterSettings {
  return Object.fromEntries(
    FOUNDATION_SETTING_IDS.map((id) => [
      id,
      {
        modal: true,
        adaptive:
          ADAPTIVE_SETTING_IDS.includes(id) &&
          (claims
            ? Object.hasOwn(claims, id)
            : DEFAULT_ADAPTIVE_SETTING_IDS.includes(id)),
      },
    ]),
  ) as FoundationParameterSettings;
}

export function isFoundationParameterSettings(
  value: unknown,
): value is FoundationParameterSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    Object.keys(value).length === FOUNDATION_SETTING_IDS.length &&
    FOUNDATION_SETTING_IDS.every((id) => {
      const setting = Reflect.get(value, id);
      return (
        setting !== null &&
        typeof setting === "object" &&
        typeof setting.modal === "boolean" &&
        typeof setting.adaptive === "boolean" &&
        (!setting.adaptive || ADAPTIVE_SETTING_IDS.includes(id))
      );
    })
  );
}

export function previewIdsForCapability(id: string): readonly string[] {
  return id === "color.scaleAdjustment" ? ADAPTIVE_COLOR_CHANNEL_IDS : [id];
}

export function unavailableModalCapability(
  modeSets: readonly ModeSet[],
  settings: FoundationParameterSettings,
): FoundationSettingId | undefined {
  return FOUNDATION_SETTING_IDS.find(
    (id) =>
      !settings[id].modal &&
      modeSets.some((modeSet) => modeSet.authoringCapabilities?.includes(id)),
  );
}

export function removeModeCapability(
  modeSet: ModeSet,
  capability: AuthoringCapability,
): ModeSet {
  const [foundation, field] = capability.split(".");
  if (
    foundation !== "color" &&
    foundation !== "typography" &&
    foundation !== "size" &&
    foundation !== "elevation"
  )
    return modeSet;
  return {
    ...modeSet,
    authoringCapabilities: modeSet.authoringCapabilities?.filter(
      (id) => id !== capability,
    ),
    modes: modeSet.modes.map((mode) => {
      const overrides = { ...mode.foundations[foundation] };
      Reflect.deleteProperty(overrides, field);
      if (capability === "color.contrastMultiplier") {
        Reflect.deleteProperty(overrides, "scaleContrasts");
        Reflect.deleteProperty(overrides, "dataVisContrasts");
      }
      const foundations = { ...mode.foundations };
      if (Object.keys(overrides).length) foundations[foundation] = overrides;
      else delete foundations[foundation];
      return { ...mode, foundations };
    }),
  };
}

export function restoreModeCapability(
  target: ModeSet,
  remembered: ModeSet,
  capability: AuthoringCapability,
): ModeSet {
  const [foundation, field] = capability.split(".");
  if (
    foundation !== "color" &&
    foundation !== "typography" &&
    foundation !== "size" &&
    foundation !== "elevation"
  )
    return target;
  const fields =
    capability === "color.contrastMultiplier"
      ? [field, "scaleContrasts", "dataVisContrasts"]
      : [field];
  const capabilities = [...(target.authoringCapabilities ?? [])];
  if (!capabilities.includes(capability)) {
    const previousIndex =
      remembered.authoringCapabilities?.indexOf(capability) ?? -1;
    capabilities.splice(
      previousIndex < 0 ? capabilities.length : previousIndex,
      0,
      capability,
    );
  }
  return {
    ...target,
    authoringCapabilities: capabilities,
    modes: target.modes.map((mode) => {
      if (mode.id === target.defaultModeId) return mode;
      const source = remembered.modes.find(
        (candidate) => candidate.id === mode.id,
      )?.foundations[foundation];
      const values = fields.flatMap((key) =>
        source && Reflect.has(source, key)
          ? [[key, Reflect.get(source, key)]]
          : [],
      );
      return values.length || (source && Object.keys(source).length === 0)
        ? {
            ...mode,
            foundations: {
              ...mode.foundations,
              [foundation]: {
                ...mode.foundations[foundation],
                ...Object.fromEntries(values),
              },
            },
          }
        : mode;
    }),
  };
}
