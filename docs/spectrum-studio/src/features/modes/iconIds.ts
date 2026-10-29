// Copyright 2026 Adobe. All rights reserved.
export const MODE_ICON_IDS = [
  "none",
  "light",
  "dark",
  "contrast",
  "brightness",
  "devices",
  "tablet",
  "phone",
  "star",
  "color",
  "textSize",
] as const;

export type ModeIconId = (typeof MODE_ICON_IDS)[number];

export function isModeIconId(value: unknown): value is ModeIconId {
  return (
    typeof value === "string" &&
    (MODE_ICON_IDS as readonly string[]).includes(value)
  );
}
