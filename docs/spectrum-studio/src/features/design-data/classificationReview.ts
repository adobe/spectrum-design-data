// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { prepareAuthoringSnapshot } from "../edit-session/snapshotPreparation";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { EMPTY_ALIASES } from "../tokens/aliases";
import { withTaxonomyProjection } from "../taxonomy/model";
import { classificationReviewUsages } from "../taxonomy/reviewedExport";
import { assessClassificationStandard } from "../taxonomy/standardization";
import { buildTshirtArtifacts } from "./tshirtArtifacts";

export function buildClassificationMigrationReview(input: EditSessionSnapshot) {
  const snapshot = prepareAuthoringSnapshot(input);
  const source = completeAliasSource(snapshot);
  const bundle = buildTshirtArtifacts(snapshot);
  const rows = canonicalAliasRows(source, bundle, "preserve-for-review");
  const aliases = snapshot.aliases ?? EMPTY_ALIASES;
  const assessment = withTaxonomyProjection(source.taxonomy, () =>
    assessClassificationStandard(
      source.taxonomy,
      classificationReviewUsages(source.taxonomy, rows, aliases),
    ),
  );
  const proposals = new Map<
    string,
    { categoryId: string; value: string | number }
  >();
  for (const { token } of rows) {
    if (
      source.taxonomy.classifications[token.id] ||
      token.taxonomySource?.governed
    )
      continue;
    for (const [key, value] of Object.entries(token.taxonomyEvidence ?? {})) {
      const category = source.taxonomy.categories.find(
        (entry) => entry.key === key,
      );
      if (
        category &&
        !source.taxonomy.terms.some(
          (term) => term.categoryId === category.id && term.value === value,
        )
      ) {
        proposals.set(JSON.stringify([category.id, value]), {
          categoryId: category.id,
          value,
        });
      }
    }
  }
  return {
    document: source.taxonomy,
    aliases,
    bundle,
    rows,
    assessment,
    proposals,
  };
}
