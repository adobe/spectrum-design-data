// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { assertTaxonomy, taxonomyValueKey } from "../taxonomy/model";
import { resolveDimensionSourceNames } from "../taxonomy/naming";
import { scaleStepName } from "../scales/stepNames";

export function upgradeRadiusSnapshot(input: unknown): EditSessionSnapshot {
  if (
    !isSnapshot(input) ||
    input === null ||
    !input.taxonomy ||
    !input.rules ||
    !input.scaleTypes
  ) {
    throw new Error("Older authoring data is invalid or incomplete.");
  }
  if (input.radius) return input;
  const snapshot = structuredClone(input);
  const defaults = designSystemDefaults.system;
  const radius = structuredClone(defaults.foundations.radius);
  const taxonomy = snapshot.taxonomy!;
  const requiredKeys = ["property", "foundationScale", "scaleIndex"];
  for (const key of requiredKeys) {
    const category = defaults.taxonomy.categories.find(
      (category) => category.key === key,
    )!;
    const existing = taxonomy.categories.find(
      (item) => item.id === category.id,
    );
    if (existing) {
      if (
        existing.key !== key ||
        existing.valueType !== category.valueType ||
        existing.cardinality !== category.cardinality
      ) {
        throw new Error(`Cannot upgrade Radius: conflicting ${key} category.`);
      }
      if (!existing.scopes.includes("radius")) existing.scopes.push("radius");
    } else {
      taxonomy.categories.push(structuredClone(category));
      taxonomy.order.push(category.id);
    }
  }
  const scale = radius.scales[0];
  const steps = Array.from(
    { length: scale.below + scale.above + 1 },
    (_, index) => scaleStepName(index - scale.below, scale.below),
  );
  const terms = defaults.taxonomy.terms.filter(
    (term) =>
      term.id === scale.nameRef!.termId ||
      (term.categoryId ===
        defaults.taxonomy.categories.find(
          (category) => category.key === "property",
        )!.id &&
        term.value === "radius") ||
      (term.categoryId ===
        defaults.taxonomy.categories.find(
          (category) => category.key === "scaleIndex",
        )!.id &&
        steps.includes(Number(term.value))),
  );
  for (const term of terms) {
    const existing = taxonomy.terms.find((item) => item.id === term.id);
    if (existing) {
      if (existing.categoryId !== term.categoryId)
        throw new Error("Cannot upgrade Radius: conflicting term ownership.");
      continue;
    }
    if (
      taxonomy.terms.some(
        (item) => taxonomyValueKey(item.value) === taxonomyValueKey(term.value),
      )
    ) {
      throw new Error(
        `Cannot upgrade Radius: "${term.value}" already has a different identity.`,
      );
    }
    taxonomy.terms.push(structuredClone(term));
  }
  assertTaxonomy(taxonomy);
  snapshot.radius = resolveDimensionSourceNames(radius, taxonomy, "radius");
  for (const id of new Set(radius.scales.map((scale) => scale.scaleTypeId))) {
    if (!snapshot.scaleTypes!.some((formula) => formula.id === id)) {
      snapshot.scaleTypes!.push(
        structuredClone(
          defaults.scaleTypes.find((formula) => formula.id === id)!,
        ),
      );
    }
  }
  for (const id of new Set(
    radius.scales.map((scale) => scale.roundingRuleId),
  )) {
    if (!snapshot.rules!.some((rule) => rule.id === id)) {
      snapshot.rules!.push(
        structuredClone(defaults.rules.find((rule) => rule.id === id)!),
      );
    }
  }
  return snapshot;
}
