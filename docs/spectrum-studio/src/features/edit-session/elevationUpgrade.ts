// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { upgradeRadiusSnapshot } from "./radiusUpgrade";
import { assertTaxonomy, taxonomyValueKey } from "../taxonomy/model";
import { ELEVATION_FORMULAS } from "../elevation/formulas";

export function upgradeElevationSnapshot(
  input: unknown,
  version: 1 | 2 | 3,
): EditSessionSnapshot {
  const original = version === 1 ? upgradeRadiusSnapshot(input) : input;
  if (!isSnapshot(original) || !original?.taxonomy || !original.scaleTypes)
    throw new Error("Older authoring data is invalid or incomplete.");
  if (original.elevation) return original;
  const snapshot = structuredClone(original);
  const defaults = designSystemDefaults.system;
  const taxonomy = snapshot.taxonomy!;
  const elevation = structuredClone(defaults.foundations.elevation);
  const nameTerms = new Set([
    elevation.name.termId,
    ...Object.values(elevation.name.classification ?? {}).flat(),
  ]);
  const nameCategories = new Set([
    elevation.name.categoryId,
    ...Object.keys(elevation.name.classification ?? {}),
  ]);
  const categories = defaults.taxonomy.categories.filter(
    (category) =>
      nameCategories.has(category.id) ||
      ["property", "foundationScale", "scaleIndex"].includes(category.key),
  );
  for (const category of categories) {
    const existing = taxonomy.categories.find(
      (item) => item.id === category.id,
    );
    if (existing) {
      if (
        existing.key !== category.key ||
        existing.valueType !== category.valueType ||
        existing.cardinality !== category.cardinality
      )
        throw new Error(
          `Cannot upgrade Elevation: conflicting ${category.key} category.`,
        );
      if (!existing.scopes.includes("elevation"))
        existing.scopes.push("elevation");
    } else {
      taxonomy.categories.push(structuredClone(category));
      taxonomy.order.push(category.id);
    }
  }
  const property = categories.find((category) => category.key === "property")!;
  const steps = categories.find((category) => category.key === "scaleIndex")!;
  for (const term of defaults.taxonomy.terms.filter(
    (term) =>
      nameTerms.has(term.id) ||
      (term.categoryId === property.id && term.value === "elevation") ||
      (term.categoryId === steps.id &&
        [100, 200, 300].includes(Number(term.value))),
  )) {
    const existing = taxonomy.terms.find((item) => item.id === term.id);
    if (existing) {
      if (existing.categoryId !== term.categoryId)
        throw new Error(
          "Cannot upgrade Elevation: conflicting term ownership.",
        );
    } else {
      if (
        taxonomy.terms.some(
          (item) =>
            taxonomyValueKey(item.value) === taxonomyValueKey(term.value),
        )
      )
        throw new Error(
          `Cannot upgrade Elevation: "${term.value}" already has a different identity.`,
        );
      taxonomy.terms.push(structuredClone(term));
    }
  }
  assertTaxonomy(taxonomy);
  for (const formula of ELEVATION_FORMULAS) {
    const existing = snapshot.scaleTypes!.find(
      (item) => item.id === formula.id,
    );
    if (existing && JSON.stringify(existing) !== JSON.stringify(formula))
      throw new Error(
        "Cannot upgrade Elevation: conflicting shadow formula identity.",
      );
    if (!existing) snapshot.scaleTypes!.push(structuredClone(formula));
  }
  snapshot.elevation = elevation;
  const scheme = snapshot.modeSets.find((set) => set.key === "colorScheme");
  if (scheme) {
    for (const capability of [
      "elevation.depth",
      "elevation.color",
      "elevation.layerOpacities",
    ] as const) {
      if (
        !snapshot.modeSets.some(
          (set) =>
            set.id !== scheme.id &&
            set.authoringCapabilities?.includes(capability),
        )
      ) {
        scheme.authoringCapabilities = [
          ...new Set([...(scheme.authoringCapabilities ?? []), capability]),
        ];
      }
    }
    const dark = scheme.modes.find((mode) => mode.id === "mode-dark");
    if (
      dark &&
      scheme.authoringCapabilities?.includes("elevation.layerOpacities")
    ) {
      dark.foundations.elevation = {
        ...dark.foundations.elevation,
        layerOpacities: {
          ...dark.foundations.elevation?.layerOpacities,
          [elevation.layers[0].id]: 50,
        },
      };
    }
  }
  return snapshot;
}
