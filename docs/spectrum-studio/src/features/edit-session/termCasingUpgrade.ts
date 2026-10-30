// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "./state";
import { normalizeTaxonomyTerms } from "../taxonomy/model";
import {
  resolveColorSourceNames,
  resolveDimensionSourceNames,
} from "../taxonomy/naming";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import {
  canonicalAliasSourceTargets,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { EMPTY_ALIASES, planAliasesForSave } from "../tokens/aliases";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";

export function upgradeTermCasingSnapshot(
  snapshot: EditSessionSnapshot,
): EditSessionSnapshot {
  if (!snapshot.taxonomy) return snapshot;
  const taxonomy = normalizeTaxonomyTerms(snapshot.taxonomy);
  if (taxonomy === snapshot.taxonomy) return snapshot;
  const next = {
    ...snapshot,
    taxonomy,
    colorSystem: resolveColorSourceNames(snapshot.colorSystem, taxonomy),
    ...(snapshot.spacing && {
      spacing: resolveDimensionSourceNames(
        snapshot.spacing,
        taxonomy,
        "spacing",
      ),
    }),
    ...(snapshot.size && {
      size: resolveDimensionSourceNames(snapshot.size, taxonomy, "size"),
    }),
    ...(snapshot.radius && {
      radius: resolveDimensionSourceNames(snapshot.radius, taxonomy, "radius"),
    }),
  };
  const serializedNameChanged = snapshot.taxonomy.terms.some(
    (term, index) =>
      kebabCaseNameFormatter.formatValue(term.value) !==
      kebabCaseNameFormatter.formatValue(taxonomy.terms[index].value),
  );
  if (serializedNameChanged) {
    const targets = (value: EditSessionSnapshot) =>
      canonicalAliasSourceTargets(
        completeAliasSource(value),
        value.structures?.structures.length
          ? buildTshirtArtifacts(value)
          : undefined,
      );
    next.aliases = planAliasesForSave(
      snapshot.aliases ?? EMPTY_ALIASES,
      targets(snapshot),
      targets(next),
    ).document;
  }
  return next;
}
