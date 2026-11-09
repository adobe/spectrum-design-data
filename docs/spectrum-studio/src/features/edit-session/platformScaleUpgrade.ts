// Copyright 2026 Adobe. All rights reserved.
import { isModeSetList, MODE_SET_DEFAULTS } from "../modes/model";
import { isStructuresDocument } from "../structures/model";
import { synchronizeVariantIdentities } from "../structures/semanticIdentity";

const platformScale = MODE_SET_DEFAULTS.find(
  (modeSet) => modeSet.id === "mode-set-platform-scale",
)!;

export function upgradePlatformScaleSnapshot(
  value: unknown,
  identities = new Map<string, string>(),
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const snapshot = value as Record<string, unknown>;
  if (!isModeSetList(snapshot.modeSets)) return value;
  if (
    snapshot.modeSets.some(
      (modeSet: unknown) =>
        modeSet !== null &&
        typeof modeSet === "object" &&
        (("id" in modeSet && modeSet.id === platformScale.id) ||
          ("key" in modeSet &&
            (modeSet.key === platformScale.key ||
              modeSet.key === "platformScale"))),
    )
  )
    return value;
  const modeSets = [...snapshot.modeSets, structuredClone(platformScale)];
  return {
    ...snapshot,
    modeSets,
    ...(isStructuresDocument(snapshot.structures) && {
      structures: synchronizeVariantIdentities(
        snapshot.structures,
        modeSets,
        (conceptId, context) => {
          const key = `platform-scale:${conceptId}:${context}`;
          const id = identities.get(key) ?? crypto.randomUUID();
          identities.set(key, id);
          return id;
        },
      ),
    }),
  };
}
