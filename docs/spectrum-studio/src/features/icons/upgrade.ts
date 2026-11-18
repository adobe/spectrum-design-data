// Copyright 2026 Adobe. All rights reserved.
import { TYPOGRAPHY_SCALE_TYPE_ID } from "../scales/scaleType";
import {
  ICONS_SCHEMA_VERSION,
  WORKFLOW_ICON_SCALE_ID,
  type IconsDocument,
} from "./model";

/** Typography's schema 11 icon settings, before Icons became its own foundation. */
export type LegacyTypographyIconography =
  | { alignment: "text"; baseSize: number }
  | { alignment: "line-height"; baseSize: number; lineHeightId: string };

export interface LegacyTypographyIconSource {
  iconography: LegacyTypographyIconography;
  smallSizes: number;
  largeSizes: number;
  minTextSize: number;
  maxTextSize: number;
  textRoundingRuleId: string;
}

/** Moves Typography's Iconography settings into an Icons document whose Workflow scale reproduces every icon size. */
export function iconsFromTypographyIconography(
  typography: LegacyTypographyIconSource,
): IconsDocument {
  const { iconography } = typography;
  return {
    schemaVersion: ICONS_SCHEMA_VERSION,
    roundingRuleId: typography.textRoundingRuleId,
    minIconSize: typography.minTextSize,
    maxIconSize: typography.maxTextSize,
    scales: [
      {
        id: WORKFLOW_ICON_SCALE_ID,
        name: "Workflow",
        scaleTypeId: TYPOGRAPHY_SCALE_TYPE_ID,
        base: iconography.baseSize,
        below: typography.smallSizes,
        above: typography.largeSizes,
        parameters: {},
        roundingRuleId: typography.textRoundingRuleId,
        ...(iconography.alignment === "line-height"
          ? { source: "line-height", lineHeightId: iconography.lineHeightId }
          : { source: "follow-typography" }),
      },
    ],
  };
}

/** Typography schema 11 → 12 plus a new Icons document; anything else is returned unchanged. */
export function splitTypographyIconography<T>(typography: T): {
  typography: T;
  icons?: IconsDocument;
} {
  if (
    !typography ||
    typeof typography !== "object" ||
    (typography as { schemaVersion?: unknown }).schemaVersion !== 11 ||
    !("iconography" in typography)
  )
    return { typography };
  const source = typography as unknown as LegacyTypographyIconSource;
  const { iconography, ...rest } = typography as unknown as Record<
    string,
    unknown
  >;
  void iconography;
  return {
    typography: { ...rest, schemaVersion: 12 } as T,
    icons: iconsFromTypographyIconography(source),
  };
}

/** Authoring snapshots keep foundations at the top level: `{ typography, icons, … }`. */
export function upgradeIconsSnapshot(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("typography" in value))
    return value;
  const split = splitTypographyIconography(value.typography);
  if (split.typography === value.typography) return value;
  return {
    ...value,
    typography: split.typography,
    icons: ("icons" in value && value.icons) || split.icons,
  };
}

/** Dataset systems keep foundations under `foundations`. */
export function upgradeIconsFoundation(system: unknown): unknown {
  if (!system || typeof system !== "object" || !("foundations" in system))
    return system;
  const foundations = upgradeIconsSnapshot(system.foundations);
  return foundations === system.foundations
    ? system
    : { ...system, foundations };
}
