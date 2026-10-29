// Copyright 2026 Adobe. All rights reserved.
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { upgradeTshirtSnapshot } from "./tshirtUpgrade";
import { upgradeOrderedVocabulary } from "../taxonomy/orderedVocabulary";
import {
  upgradeDimensionName,
  upgradeElevationName,
  upgradeMetricName,
} from "../taxonomy/foundationNames";
import {
  resolveColorSourceNames,
  resolveDimensionSourceNames,
} from "../taxonomy/naming";
import { EMPTY_ALIASES } from "../tokens/aliases";

export function upgradeTaxonomySnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5,
): EditSessionSnapshot {
  const before =
    version < 5
      ? upgradeTshirtSnapshot(input, version as 1 | 2 | 3 | 4)
      : input;
  if (
    !isSnapshot(before) ||
    !before?.taxonomy ||
    !before.spacing ||
    !before.size ||
    !before.radius ||
    !before.elevation
  ) {
    throw new Error(
      "Older authoring data is incomplete. Your stored data has not been changed.",
    );
  }
  const snapshot = structuredClone(before);
  snapshot.taxonomy = upgradeOrderedVocabulary(before.taxonomy);
  for (const scope of ["spacing", "size", "radius"] as const) {
    const document = before[scope]!;
    const migrated = resolveDimensionSourceNames(
      {
        ...document,
        scales: document.scales.map((scale) => {
          if (!scale.nameRef)
            throw new Error(
              "A saved foundation has an unavailable source name.",
            );
          return {
            ...scale,
            nameRef: upgradeDimensionName(
              scope,
              scale.id,
              scale.nameRef,
              snapshot.taxonomy!,
            ),
          };
        }),
      },
      snapshot.taxonomy,
      scope,
    );
    if (scope === "spacing")
      snapshot.spacing = {
        ...migrated,
        schemaVersion: before.spacing.schemaVersion,
      };
    else if (scope === "size")
      snapshot.size = { ...migrated, schemaVersion: before.size.schemaVersion };
    else
      snapshot.radius = {
        ...migrated,
        schemaVersion: before.radius.schemaVersion,
      };
  }
  snapshot.typography.metricNames = {
    ...snapshot.typography.metricNames,
    ...Object.fromEntries(
      Object.entries(snapshot.typography.metricNames).map(([id, name]) => [
        id,
        upgradeMetricName(id, name, snapshot.taxonomy!),
      ]),
    ),
  };
  snapshot.elevation = {
    ...before.elevation,
    name: upgradeElevationName(before.elevation.name, snapshot.taxonomy),
  };
  snapshot.colorSystem = resolveColorSourceNames(
    before.colorSystem,
    snapshot.taxonomy,
  );
  snapshot.aliases = structuredClone(EMPTY_ALIASES);
  return snapshot;
}
