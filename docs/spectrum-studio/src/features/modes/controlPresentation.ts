// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "./model";
import type { ModeIconId } from "./iconIds";

export function modeSetUsesOptionIcons(modeSet: ModeSet): boolean {
  return (
    (!modeSet.iconId || modeSet.iconId === "none") &&
    modeSet.modes.every((mode) => mode.iconId !== "none") &&
    new Set(modeSet.modes.map((mode) => mode.iconId)).size ===
      modeSet.modes.length
  );
}

export function modeSetGroupIconId(modeSet: ModeSet): ModeIconId {
  if (modeSet.iconId && modeSet.iconId !== "none") return modeSet.iconId;
  if (modeSetUsesOptionIcons(modeSet))
    return (
      modeSet.modes.find((mode) => mode.id === modeSet.defaultModeId)?.iconId ??
      "none"
    );
  return "none";
}
