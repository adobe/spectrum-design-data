// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { assertStructureTaxonomy } from "../structures/model";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { assertComponentDocument } from "../components/validation";
import {
  assertComponentReferences,
  componentTokenCatalog,
} from "../components/references";
import { typographyTokenGroups } from "../typography/typographyTokens";
import { assertRegisteredSourceNames, registeredSourceName } from "./naming";
import { assertFoundationGovernance } from "./foundationGovernance";
import {
  projectClassification,
  resolveSourceClassification,
  updateTaxonomy,
  withTaxonomyProjection,
  type TaxonomyDocument,
} from "./model";
import type { TaxonomyEvidenceSource } from "./editing";
import type { DerivedState } from "../derived-work/LatestRequest";
import type { ComponentColorWitness } from "../components/colorWitness";

export interface ReferencedTaxonomySource {
  previous: TaxonomyDocument;
  snapshot: EditSessionSnapshot;
  sources: readonly TaxonomyEvidenceSource[];
  tokens: readonly TaxonomyEvidenceSource[];
}

export function validateReferencedTaxonomy(
  source: ReferencedTaxonomySource,
  document: TaxonomyDocument,
  colorWitness: ComponentColorWitness | null = null,
) {
  const { previous, snapshot, sources, tokens } = source;
  document = updateTaxonomy(previous, document);
  const {
    colorSystem: color,
    typography,
    spacing,
    size,
    radius,
    elevation,
    structures,
    components,
  } = snapshot;
  if (
    !spacing ||
    !size ||
    !radius ||
    !elevation ||
    !structures ||
    !components
  ) {
    throw new Error(
      "Registry validation needs complete foundation, Structure and Component data.",
    );
  }
  return withTaxonomyProjection(previous, () =>
    withTaxonomyProjection(document, () => {
      updateTaxonomy(previous, document);
      assertStructureTaxonomy(structures, document);
      const output = buildTshirtArtifacts({ ...snapshot, taxonomy: document });
      if (
        output.semantics.some((row) => document.classifications[row.conceptId])
      )
        throw new Error(
          "Generated variant classifications come from Structures and rules; direct semantic classification overrides are not supported.",
        );
      assertFoundationGovernance(
        { color, typography, spacing, size, radius, elevation },
        document,
        snapshot.rules,
      );
      registeredSourceName(document, elevation.name, "elevation");
      for (const entries of [color.palette, color.scales, color.surfaces])
        assertRegisteredSourceNames(entries, document, "colors");
      assertRegisteredSourceNames(spacing.scales, document, "spacing");
      assertRegisteredSourceNames(size.scales, document, "size");
      assertRegisteredSourceNames(radius.scales, document, "radius");
      const names = typography.metricNames;
      for (const group of typographyTokenGroups(typography))
        if (!names?.[group.id])
          throw new Error(
            `Typography metric ${group.id} has no registered name.`,
          );
      assertRegisteredSourceNames(
        typographyTokenGroups(typography).map((group) => ({
          id: group.id,
          nameRef: names![group.id],
          name: registeredSourceName(document, names![group.id]!, "typography"),
        })),
        document,
        "typography",
      );
      for (const entry of sources) {
        if (document.classifications[entry.id]) continue;
        const resolved = resolveSourceClassification(
          previous,
          entry.id,
          entry.evidence,
          entry.scope,
          entry.context,
        );
        for (const [categoryId, assignment] of Object.entries(
          resolved.classification,
        )) {
          const category = document.categories.find(
            (item) => item.id === categoryId,
          );
          const before = previous.categories.find(
            (item) => item.id === categoryId,
          )!;
          const ids = Array.isArray(assignment) ? assignment : [assignment];
          if (
            !category ||
            category.valueType !== before.valueType ||
            category.cardinality !== before.cardinality ||
            ids.some(
              (id) =>
                !document.terms.some(
                  (term) => term.id === id && term.categoryId === categoryId,
                ),
            )
          ) {
            throw new Error(
              `${entry.name} uses this category or term. Explicitly remap its classification before deletion or retyping.`,
            );
          }
        }
      }
      const projectedNames = new Map<string, string>();
      for (const entry of tokens) {
        const projection = resolveSourceClassification(
          document,
          entry.id,
          entry.evidence,
          entry.scope,
          entry.context,
        );
        if (projection.issues.length)
          throw new Error(projection.issues.join(" "));
        const owner = projectedNames.get(projection.name.toLowerCase());
        if (owner && owner !== entry.id)
          throw new Error(
            `Token name "${projection.name}" conflicts with another token. Keep their classifications distinct.`,
          );
        projectedNames.set(projection.name.toLowerCase(), entry.id);
      }
      for (const row of output.semantics) {
        const projection = projectClassification(
          document,
          row.classification,
          "structures",
        );
        if (projection.issues.length)
          throw new Error(projection.issues.join(" "));
        const owner = projectedNames.get(projection.name.toLowerCase());
        if (owner && owner !== row.conceptId)
          throw new Error(
            `Token name "${projection.name}" conflicts with another token.`,
          );
        projectedNames.set(projection.name.toLowerCase(), row.conceptId);
      }
      assertComponentDocument(components, document);
      if (
        components.components.some((component) => component.assignments.length)
      ) {
        assertComponentReferences(
          components,
          document,
          componentTokenCatalog(
            { ...snapshot, taxonomy: document },
            colorWitness,
          ),
        );
      }
    }),
  );
}

export interface TaxonomyValidationRequest {
  source: ReferencedTaxonomySource;
  document: TaxonomyDocument;
  termId: string;
  field: "value" | "description";
  text: string;
}
export type TaxonomyValidationResult =
  | { valid: true }
  | { valid: false; error: string };
export type TaxonomyValidationState = DerivedState<
  TaxonomyValidationRequest,
  TaxonomyValidationResult
>;
export function currentTaxonomyValidation(
  state: TaxonomyValidationState | undefined,
  source: ReferencedTaxonomySource,
) {
  return state?.input.source === source ? state : undefined;
}
export function taxonomyDraftError(
  state: TaxonomyValidationState | undefined,
  source: ReferencedTaxonomySource,
  termId: string,
  field: "value" | "description",
  text: string,
) {
  const current = currentTaxonomyValidation(state, source);
  if (
    current?.input.termId !== termId ||
    current.input.field !== field ||
    current.input.text !== text
  )
    return null;
  if (current.status === "unavailable") return current.error;
  return current.status === "ready" && !current.value.valid
    ? current.value.error
    : null;
}
export function computeTaxonomyValidation(
  request: TaxonomyValidationRequest,
): TaxonomyValidationResult {
  try {
    validateReferencedTaxonomy(request.source, request.document);
    return { valid: true };
  } catch (failure) {
    return {
      valid: false,
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
}
