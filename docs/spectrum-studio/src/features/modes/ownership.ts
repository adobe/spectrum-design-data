// Copyright 2026 Adobe. All rights reserved.
import type { AuthoringCapability, ModeSet } from "./model";

export function capabilityOwners(
  modeSets: readonly ModeSet[],
): Partial<Record<AuthoringCapability, string>> {
  const owners: Partial<Record<AuthoringCapability, string>> = {};
  for (const modeSet of modeSets)
    for (const capability of modeSet.authoringCapabilities ?? []) {
      owners[capability] ??= modeSet.id;
    }
  return owners;
}
