// Copyright 2026 Adobe. All rights reserved.
import {
  isColorSystemDocument,
  migrateColorSystemDocument,
} from "../color-system/model";
import { isRecord } from "../color-system/data-vis/model";
import { upgradeComponentsSnapshot } from "./componentsUpgrade";
import { isSnapshot, type EditSessionSnapshot } from "./state";

export function upgradeColorOutputSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
): EditSessionSnapshot {
  if (!isRecord(input) || !isRecord(input.colorSystem))
    throw new Error(
      "Older authoring data has an unavailable Color foundation.",
    );
  const color = input.colorSystem;
  const colorSystem = isColorSystemDocument(color)
    ? color
    : typeof color.schemaVersion === "number"
      ? migrateColorSystemDocument(color, color.schemaVersion)
      : null;
  if (!colorSystem)
    throw new Error(
      "Stored color authoring and output settings could not be upgraded.",
    );
  const upgraded = { ...input, colorSystem };
  const snapshot =
    version === 12 ? upgraded : upgradeComponentsSnapshot(upgraded, version);
  if (!isSnapshot(snapshot) || !snapshot)
    throw new Error("Older color authoring data could not be restored.");
  return snapshot;
}
