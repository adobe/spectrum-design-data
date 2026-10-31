// Copyright 2026 Adobe. All rights reserved.
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import {
  primitiveReferencesFromOutputs,
  type PrimitiveReference,
} from "../tokens/primitiveReferences";
import { generateDimensionScale } from "../scales/foundation";
import { generateTypography } from "../typography/typographyGeneration";
import {
  structureNameClassification,
  structureSizes,
} from "../structures/generation";
import { ELEMENT_CATEGORY_ID } from "../structures/elements";
import { appliedElementBindings } from "../structures/elementResolution";
import { tshirtMappings } from "../logic/tshirt";
import { mergeClassifications } from "../option-groups/model";
import { projectClassification } from "../taxonomy/model";
import { VARIANT_CATEGORY_IDS } from "../taxonomy/variantVocabulary";
import { generatorTermId } from "../logic/generator";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import { semanticIdentityKey } from "../structures/semanticIdentity";
import type { TshirtAuthoringSource } from "./tshirtArtifacts";
import type { TshirtArtifactBundle, TshirtSemanticRow } from "./tshirtTypes";
import { structureEditor } from "../structures/variants";
import { structureSlotDefinition } from "../structures/model";
import { isConstraintSlot } from "../structures/resolution";

export function appendVariantLeafRows(
  source: TshirtAuthoringSource,
  bundle: TshirtArtifactBundle,
) {
  const owners = source.structures?.structures.filter((structure) =>
    Object.values(structure.editor?.overrides ?? {}).some(
      (override) => override.elements,
    ),
  );
  if (!owners?.length) return;
  const complete = completeAliasSource({
    ...source,
    interpolations: source.interpolations ?? [],
    tokenOverrides: source.tokenOverrides ?? {},
    browserTokenEdits: source.browserTokenEdits ?? {},
  });
  const aliases = canonicalAliasRows(complete, undefined, "strict", {
    excludeColors: true,
    includeUnpublished: true,
  });
  const dimensions = (family: "size" | "spacing" | "radius") =>
    complete[family].scales.map((scale) => ({
      scale,
      values: generateDimensionScale(
        family,
        scale,
        complete.rules,
        complete.scaleTypes,
      ),
    }));
  const references = primitiveReferencesFromOutputs(
    {
      spacing: [],
      size: dimensions("size"),
      radius: [],
      elevation: { document: complete.elevation, levels: [] },
      typography: {
        document: complete.typography,
        values: generateTypography(
          complete.typography,
          undefined,
          complete.rules,
          complete.scaleTypes,
          complete.interpolations,
        ),
        naming: {
          registry: complete.taxonomy,
          names: complete.typography.metricNames,
          outputUnit: complete.typography.outputUnit,
        },
      },
    },
    complete.taxonomy,
  );
  const propertyCategory = complete.taxonomy.categories.find(
    (category) => category.key === "property",
  )!;
  for (const structure of owners) {
    const editor = structureEditor(structure);
    for (const property of editor.properties) {
      if (property.kind !== "variant") continue;
      for (const option of property.options) {
        if (option.id === property.defaultOptionId) continue;
        const override = editor.overrides[option.id];
        for (const element of Object.values(override?.elements ?? {})) {
          const base = structure.elements?.find(
            (child) => child.id === element.id,
          );
          if (!base || base.kind === "structureReference") continue;
          const effective = { ...structure, elements: [element] };
          // Keep the full shared layer list while finding rule applications.
          const applications = appliedElementBindings(
            {
              ...structure,
              elements: structure.elements?.map((child) =>
                child.id === element.id ? element : child,
              ),
            },
            complete.rules,
            references,
          );
          for (const binding of element.bindings) {
            if (
              base.bindings.find((item) => item.slot === binding.slot)?.$ref ===
              binding.$ref
            )
              continue;
            const anchor = references.find((item) => item.id === binding.$ref);
            if (!anchor)
              throw new Error(
                "The variant element's bound primitive is unavailable.",
              );
            const related = aliases.filter(
              (row) =>
                row.token.type === anchor.family &&
                row.token.groupId === (anchor.metricId ?? anchor.sourceId),
            );
            const contexts = new Set(related.map((row) => row.context));
            if (!contexts.size)
              throw new Error(
                "The variant element's mode values are unavailable.",
              );
            const application = applications.find(
              (item) => item.binding.id === binding.id,
            );
            for (const contextKey of contexts) {
              const selection = Object.fromEntries(
                JSON.parse(contextKey) as [string, string][],
              );
              const contextual = references.map(
                (reference): PrimitiveReference => {
                  if (
                    reference.sourceId !== anchor.sourceId ||
                    reference.family !== anchor.family
                  )
                    return reference;
                  const row = related
                    .filter(
                      (item) =>
                        item.id === reference.id &&
                        (JSON.parse(item.context) as [string, string][]).every(
                          ([axis, mode]) => selection[axis] === mode,
                        ),
                    )
                    .sort(
                      (left, right) =>
                        right.context.length - left.context.length,
                    )[0];
                  if (!row)
                    throw new Error(
                      "The variant element has an unresolved mode dependency.",
                    );
                  return {
                    ...reference,
                    value: row.token.value,
                    valueOverridden: row.token.valueOverridden,
                  };
                },
              );
              const contextualAnchor = contextual.find(
                (item) => item.id === anchor.id,
              )!;
              for (const size of structureSizes(effective)) {
                const mapping = application
                  ? tshirtMappings(
                      application.rule,
                      contextualAnchor,
                      contextual,
                      [size],
                    )[0]
                  : {
                      size,
                      termId: generatorTermId(size),
                      offset: 0,
                      requested: anchor.index,
                      actual: anchor.index,
                      target: contextualAnchor,
                    };
                const target = mapping.target;
                const constraint = isConstraintSlot(binding.slot)
                  ? structureSlotDefinition(binding.slot).classification
                  : undefined;
                const value =
                  binding.slot === "fontSize"
                    ? "size"
                    : binding.slot === "lineHeight"
                      ? target.unit === "multiplier"
                        ? "unitless line height"
                        : "line height"
                      : binding.slot;
                const term = complete.taxonomy.terms.find(
                  (item) =>
                    item.categoryId === propertyCategory.id &&
                    item.value === value,
                );
                if (!term && !constraint)
                  throw new Error(
                    `Choose a registered property term for ${value}.`,
                  );
                const merged = mergeClassifications(
                  structureNameClassification(structure),
                  {
                    [ELEMENT_CATEGORY_ID]: element.termId,
                    ...(constraint ?? { [propertyCategory.id]: term!.id }),
                    [VARIANT_CATEGORY_IDS.size]: generatorTermId(size),
                  },
                  property.classification,
                  option.classification,
                );
                if (merged.issues.length)
                  throw new Error(merged.issues.join(" "));
                const projection = projectClassification(
                  complete.taxonomy,
                  merged.classification,
                  "structures",
                );
                if (projection.issues.length)
                  throw new Error(projection.issues.join(" "));
                const identity =
                  editor.semanticIdentities?.[option.id]?.[
                    semanticIdentityKey(
                      `element/${element.id}/${binding.slot}`,
                      size,
                    )
                  ];
                const uuid = identity?.rows[canonicalTokenModeKey(selection)];
                if (!identity || !uuid)
                  throw new Error(
                    "The variant element's stored token identity is unavailable.",
                  );
                const context = Object.fromEntries(
                  Object.entries(selection).map(([id, mode]) => {
                    const axis = complete.modeSets.find(
                      (item) => item.id === id,
                    )!;
                    return [
                      axis.key,
                      axis.modes.find((item) => item.id === mode)!.key,
                    ];
                  }),
                );
                const token = {
                  uuid,
                  name: {
                    ...Object.fromEntries(
                      projection.segments.map((segment) => [
                        segment.key,
                        segment.values
                          .map((item) =>
                            kebabCaseNameFormatter.formatValue(item),
                          )
                          .join("-"),
                      ]),
                    ),
                    size,
                    ...context,
                  },
                  value: `${target.value}${target.unit === "multiplier" ? "" : "px"}`,
                };
                const { target: _target, ...details } = mapping;
                void _target;
                const row: TshirtSemanticRow = {
                  token,
                  conceptId: identity.conceptId,
                  classification: merged.classification,
                  structureId: structure.conceptId,
                  structureName: structure.name,
                  propertyId: property.id,
                  optionId: option.id,
                  canonicalName: projection.name,
                  bindingIds: [binding.id],
                  applicationIds: application
                    ? [application.application.id]
                    : [],
                  ruleIds: application ? [application.rule.id] : [],
                  size,
                  target,
                  context,
                  selection,
                  kind: Object.keys(selection).length ? "binding" : "baseline",
                  mapping: details,
                };
                bundle.tokens.push(token);
                bundle.semantics.push(row);
              }
            }
          }
        }
      }
    }
  }
}
