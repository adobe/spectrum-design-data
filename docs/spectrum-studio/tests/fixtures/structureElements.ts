// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../src/data/defaults";
import { generateTypography } from "../../src/features/typography/typographyGeneration";
import { generateDimensionScale } from "../../src/features/scales/foundation";
import { generateElevation } from "../../src/features/elevation/generate";
import { primitiveReferencesFromOutputs } from "../../src/features/tokens/primitiveReferences";
import {
  createElement,
  elementBindingId,
  type ElementKind,
  type StructureElement,
} from "../../src/features/structures/elements";
import { createStructure } from "../../src/features/structures/model";
import { SIZE_TERM_IDS } from "../../src/features/taxonomy/variantVocabulary";

export function createElementFixture() {
  const system = structuredClone(designSystemDefaults.system);
  const dimensions = (family: "spacing" | "size" | "radius") =>
    system.foundations[family].scales.map((scale) => ({
      scale,
      values: generateDimensionScale(
        family,
        scale,
        system.rules,
        system.scaleTypes,
      ),
    }));
  const typography = system.foundations.typography;
  const references = primitiveReferencesFromOutputs(
    {
      size: dimensions("size"),
      spacing: dimensions("spacing"),
      radius: dimensions("radius"),
      elevation: {
        document: system.foundations.elevation,
        levels: generateElevation(
          system.foundations.elevation,
          system.scaleTypes,
        ),
      },
      typography: {
        document: typography,
        values: generateTypography(
          typography,
          undefined,
          system.rules,
          system.scaleTypes,
          system.interpolations,
        ),
        naming: {
          registry: system.taxonomy,
          names: typography.metricNames,
          outputUnit: "px",
        },
      },
    },
    system.taxonomy,
  );
  const structure = createStructure(
    "Element template",
    "d0000000-0000-4000-8000-000000000001",
  );
  const rule = system.rules.find((rule) => rule.type === "tshirt-sizing")!;
  structure.generation = {
    sizeTermIds: Object.values(SIZE_TERM_IDS),
    applications: [],
  };
  const create = (
    kind: ElementKind,
    number: number,
    bound = false,
  ): StructureElement => {
    const element = createElement(
      kind,
      `d0000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
    );
    if (!bound) return element;
    const font = references.find(
      (reference) =>
        reference.metricId === "font-size" && reference.index === 0,
    )!;
    const line = references.find(
      (reference) =>
        reference.metricId?.endsWith("-unitlessLineHeight") &&
        reference.index === 0,
    )!;
    const icon = references.find(
      (reference) =>
        reference.metricId === "workflow-icon-size" && reference.index === 0,
    )!;
    const size = references.find(
      (reference) => reference.family === "size" && reference.index === 0,
    )!;
    const slots =
      kind === "text"
        ? [
            { slot: "fontSize" as const, reference: font },
            { slot: "lineHeight" as const, reference: line },
          ]
        : kind === "workflowIcon" || kind === "uiIcon"
          ? [{ slot: "size" as const, reference: icon }]
          : kind === "visual"
            ? [
                { slot: "width" as const, reference: size },
                { slot: "height" as const, reference: size },
              ]
            : [
                {
                  slot: "length" as const,
                  reference: references.find(
                    (reference) =>
                      reference.family === "size" && reference.index === 2,
                  )!,
                },
                { slot: "thickness" as const, reference: size },
              ];
    element.bindings = slots.map(({ slot, reference }) => {
      if (reference.family !== "size" && reference.family !== "typography")
        throw new Error("Invalid template fixture family.");
      return {
        id: elementBindingId(element.id, slot),
        slot,
        $ref: reference.id,
        family: reference.family,
      };
    });
    return element;
  };
  return {
    structure,
    references,
    taxonomy: system.taxonomy,
    rule,
    rules: system.rules,
    create,
    structures: system.structures.structures,
  };
}
