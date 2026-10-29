// Copyright 2026 Adobe. All rights reserved.
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { upgradeTaxonomySnapshot } from "./taxonomyUpgrade";
import { STANDARD_SCALE_NAMING_RULE } from "../logic/scaleNaming";
import { migrateColorSystemDocument } from "../color-system/model";
import { isRecord } from "../color-system/data-vis/model";

export function upgradeCustomContrastSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7,
): EditSessionSnapshot {
  let upgraded = input;
  if (
    isRecord(input) &&
    isRecord(input.colorSystem) &&
    (input.colorSystem.schemaVersion === 1 ||
      input.colorSystem.schemaVersion === 2)
  ) {
    upgraded = {
      ...input,
      colorSystem: migrateColorSystemDocument(
        input.colorSystem,
        input.colorSystem.schemaVersion,
      ),
    };
  }
  const snapshot =
    version < 6
      ? upgradeTaxonomySnapshot(upgraded, version as 1 | 2 | 3 | 4 | 5)
      : upgraded;
  if (!isSnapshot(snapshot) || !snapshot?.rules)
    throw new Error("Older authoring data has an unavailable rule library.");
  return {
    ...snapshot,
    rules: snapshot.rules.some(
      (rule) => rule.id === STANDARD_SCALE_NAMING_RULE.id,
    )
      ? snapshot.rules
      : [...snapshot.rules, structuredClone(STANDARD_SCALE_NAMING_RULE)],
  };
}
