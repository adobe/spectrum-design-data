// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { editTaxonomyAtom, taxonomyDocumentAtom } from "./state";
import { browserTokenSourcesAtom } from "../tokens/browserState";
import {
  resolveSourceClassification,
  withTaxonomyProjection,
  type Classification,
  type TaxonomyDocument,
  type TaxonomyScope,
  type TaxonomySourceContext,
  type TaxonomyValue,
} from "./model";
import type { NominalFontSizeMeasurement } from "../tokens/browserModel";
import { taxonomyFoundationSourcesAtom } from "./sourceState";
import { governedFoundationContext } from "./foundationGovernance";
import { structuresDocumentAtom } from "../structures/documentState";
import {
  structureGeneration,
  structureSlot,
  structureSlotDefinition,
  structureTaxonomyAssignments,
} from "../structures/model";
import { VARIANT_CATEGORY_IDS } from "./variantVocabulary";
import { isTshirtRule } from "../logic/model";
import { rulesAtom } from "../logic/library";
import { workingTshirtArtifactsAtom } from "../design-data/tshirtState";
import { captureSnapshot } from "../edit-session/state";
import { ELEMENT_CATEGORY_ID } from "../structures/elements";
import { STRUCTURE_CATEGORY_IDS } from "../structures/vocabulary";
import { leafElements } from "../structures/children";
import { structureNameClassification } from "../structures/generation";
import { componentsDocumentAtom } from "../components/documentState";
import {
  validateReferencedTaxonomy,
  type ReferencedTaxonomySource,
} from "./referenceValidation";
import { componentColorWitnessAtom } from "../components/colorWitness";

export const taxonomyComponentReferencesAtom = atom((get) =>
  get(componentsDocumentAtom).components.flatMap((component) =>
    component.assignments.map((row) => ({
      id: row.id,
      name: `${component.declaration.displayName} property assignment`,
      classification: { [row.property.categoryId]: row.property.termId },
    })),
  ),
);

export interface TaxonomyEvidenceSource {
  id: string;
  name: string;
  scope: TaxonomyScope;
  evidence: Record<string, TaxonomyValue>;
  context?: TaxonomySourceContext;
  measurement?: NominalFontSizeMeasurement;
}
export function taxonomyEvidenceProjections(
  document: TaxonomyDocument,
  sources: readonly TaxonomyEvidenceSource[],
) {
  return withTaxonomyProjection(document, () =>
    sources.map((source) =>
      resolveSourceClassification(
        document,
        source.id,
        source.evidence,
        source.scope,
        source.context,
      ),
    ),
  );
}
export const taxonomyTemplateReferencesAtom = atom<
  {
    id: string;
    name: string;
    recordKind: "template-reference";
    classification: Classification;
  }[]
>((get) =>
  get(structuresDocumentAtom).structures.flatMap((structure) =>
    leafElements(structure).map((element) => ({
      id: element.id,
      name: `${structure.name} template element`,
      recordKind: "template-reference" as const,
      classification: {
        [ELEMENT_CATEGORY_ID]: element.termId,
        ...(element.orientation && {
          [STRUCTURE_CATEGORY_IDS.axis]: element.orientation,
        }),
      },
    })),
  ),
);

export const taxonomyEvidenceSourcesAtom = atom<TaxonomyEvidenceSource[]>(
  (get) => [
    ...get(browserTokenSourcesAtom).map((source) => ({
      id: source.id,
      name: source.name,
      scope: source.type as TaxonomyScope,
      evidence: source.taxonomyEvidence ?? {},
      context: source.taxonomySource,
      measurement: source.measurement,
    })),
    ...get(taxonomyFoundationSourcesAtom).map((source) => ({
      id: source.id,
      name: source.name,
      scope: source.scope,
      evidence: {},
      context: governedFoundationContext(
        get(taxonomyDocumentAtom),
        source.scope,
        source.nameRef!,
        source.id,
      ),
      ...("measurement" in source &&
        source.measurement && { measurement: source.measurement }),
    })),
    ...get(structuresDocumentAtom).structures.flatMap((structure) =>
      structure.properties.map((binding) => ({
        id: binding.id,
        name: `${structure.name} - ${structureSlotDefinition(structureSlot(binding)!).label}`,
        scope: "structures" as const,
        evidence: {},
        context: {
          id: binding.id,
          governed: structureTaxonomyAssignments(binding),
        },
      })),
    ),
    ...get(structuresDocumentAtom).structures.flatMap((structure) => {
      const generation = structureGeneration(structure);
      return generation.sizeTermIds.map((termId) => ({
        id: `structure-generation:${structure.conceptId}:${termId}`,
        name: `${structure.name} size`,
        scope: "structures" as const,
        evidence: {},
        context: {
          id: structure.conceptId,
          governed: {
            [VARIANT_CATEGORY_IDS.size]: termId,
            ...structureNameClassification(structure),
          },
        },
      }));
    }),
    ...get(rulesAtom)
      .filter(isTshirtRule)
      .flatMap((rule) =>
        rule.mappings.map(({ termId }) => ({
          id: `rule-size:${rule.id}:${termId}`,
          name: `${rule.name} size mapping`,
          scope: "structures" as const,
          evidence: {},
          context: {
            id: rule.id,
            governed: { [VARIANT_CATEGORY_IDS.size]: termId },
          },
        })),
      ),
    ...(() => {
      const output = get(workingTshirtArtifactsAtom);
      return output.status === "ready"
        ? [
            ...new Map(
              output.bundle.semantics.map((row) => [
                row.conceptId,
                {
                  id: row.conceptId,
                  name: row.structureName,
                  scope: "structures" as const,
                  evidence: {},
                  context: { id: row.conceptId, governed: row.classification },
                },
              ]),
            ).values(),
          ]
        : [];
    })(),
  ],
);

export const referencedTaxonomySourceAtom = atom(
  (get): ReferencedTaxonomySource => ({
    previous: get(taxonomyDocumentAtom),
    snapshot: captureSnapshot(get),
    sources: get(taxonomyEvidenceSourcesAtom),
    tokens: get(browserTokenSourcesAtom).map((source) => ({
      id: source.id,
      name: source.name,
      scope: source.type as TaxonomyScope,
      evidence: source.taxonomyEvidence ?? {},
      context: source.taxonomySource,
    })),
  }),
);
export const validateReferencedTaxonomyAtom = atom((get) => {
  const source = get(referencedTaxonomySourceAtom);
  return (input: TaxonomyDocument) => validateReferencedTaxonomy(source, input);
});

export const editReferencedTaxonomyAtom = atom(
  null,
  (get, set, input: TaxonomyDocument) => {
    validateReferencedTaxonomy(
      get(referencedTaxonomySourceAtom),
      input,
      get(componentColorWitnessAtom),
    );
    set(editTaxonomyAtom, input);
  },
);
