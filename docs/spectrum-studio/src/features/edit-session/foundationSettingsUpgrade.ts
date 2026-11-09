// Copyright 2026 Adobe. All rights reserved.
import { foundationParameterDefaults } from "../modes/foundationSettings";
import { isAdaptiveClaims } from "../modes/model";

export function upgradeFoundationSettingsSnapshot(snapshot: unknown): unknown {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot) ||
    !("adaptiveClaims" in snapshot) ||
    !isAdaptiveClaims(snapshot.adaptiveClaims)
  )
    throw new Error(
      "Stored foundation parameter settings are invalid or incomplete.",
    );
  return {
    ...snapshot,
    foundationParameterSettings:
      ("foundationParameterSettings" in snapshot
        ? snapshot.foundationParameterSettings
        : undefined) ?? foundationParameterDefaults(snapshot.adaptiveClaims),
    adaptiveClaims: {},
  };
}
