// Copyright 2026 Adobe. All rights reserved.
import { migrateColorSystemDocument } from "../color-system/model";
import { isRecord } from "../color-system/data-vis/model";
import { upgradeCustomContrastSnapshot } from "./customContrastUpgrade";
import { isSnapshot, type EditSessionSnapshot } from "./state";

export function upgradeDataVisSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
): EditSessionSnapshot {
  if (!isRecord(input) || !isRecord(input.colorSystem))
    throw new Error(
      "Older authoring data has an unavailable Color foundation.",
    );
  const color = input.colorSystem;
  const colorSystem =
    color.schemaVersion === 1 ||
    color.schemaVersion === 2 ||
    color.schemaVersion === 3
      ? migrateColorSystemDocument(color, color.schemaVersion)
      : color;
  if (!colorSystem)
    throw new Error(
      "Older Color data could not be upgraded without replacing its inputs.",
    );
  const upgraded = { ...input, colorSystem };
  const snapshot =
    version === 7 || version === 8
      ? upgraded
      : upgradeCustomContrastSnapshot(upgraded, version);
  if (!isSnapshot(snapshot) || !snapshot)
    throw new Error("Older authoring data could not be restored.");
  return snapshot;
}
