// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../src/data/defaults";
import { generateElevation } from "../../src/features/elevation/generate";
import { resolveElevationDocument } from "../../src/features/elevation/resolution";
import { createRule } from "../../src/features/logic/model";
import { generateDimensionScale } from "../../src/features/scales/foundation";
import {
  assignStructure,
  createStructure,
  type StructureSlot,
} from "../../src/features/structures/model";
import { governStructureName } from "../../src/features/structures/generation";
import { SIZE_TERM_IDS } from "../../src/features/taxonomy/variantVocabulary";
import { primitiveReferencesFromOutputs } from "../../src/features/tokens/primitiveReferences";
import {
  buildTshirtArtifacts,
  type TshirtAuthoringSource,
} from "../../src/features/design-data/tshirtArtifacts";

export const TSHIRT_FIXTURE_ID = "c0000000-0000-4000-8000-000000000010";
export const TSHIRT_NAME_TERM_ID = "c0000000-0000-4000-8000-000000000020";
export const TSHIRT_APPLICATION_ID = "c0000000-0000-4000-8000-000000000030";
export const PADDING_SLOTS: StructureSlot[] = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];

export function tshirtFixtureReferences(source: TshirtAuthoringSource) {
  if (
    !source.spacing ||
    !source.size ||
    !source.radius ||
    !source.elevation ||
    !source.rules ||
    !source.scaleTypes ||
    !source.taxonomy
  )
    throw new Error("The variant fixture needs complete foundation sources.");
  const dimensions = (domain: "spacing" | "size" | "radius") =>
    source[domain]!.scales.map((scale) => ({
      scale,
      values: generateDimensionScale(
        domain,
        scale,
        source.rules!,
        source.scaleTypes!,
      ),
    }));
  return primitiveReferencesFromOutputs(
    {
      spacing: dimensions("spacing"),
      size: dimensions("size"),
      radius: dimensions("radius"),
      elevation: {
        document: source.elevation,
        levels: generateElevation(
          resolveElevationDocument(
            source.elevation,
            [],
            source.modeSets,
            {},
            source,
          ),
          source.scaleTypes,
        ),
      },
    },
    source.taxonomy,
  );
}

export function createTshirtFixture(
  options: {
    fiveSizes?: boolean;
    hidden?: boolean;
    asymmetric?: boolean;
    nearest?: boolean;
    unattached?: boolean;
    structureName?: string;
  } = {},
) {
  const defaults = structuredClone(designSystemDefaults.system);
  const source: TshirtAuthoringSource = {
    colorSystem: defaults.foundations.color,
    typography: defaults.foundations.typography,
    spacing: defaults.foundations.spacing,
    size: defaults.foundations.size,
    radius: defaults.foundations.radius,
    elevation: defaults.foundations.elevation,
    opacity: defaults.foundations.opacity,
    taxonomy: defaults.taxonomy,
    rules: defaults.rules,
    scaleTypes: defaults.scaleTypes,
    modeSets: defaults.modeSets,
    structures: defaults.structures,
    browserTokenEdits: {},
  };
  const rule = {
    ...createRule("tshirt-sizing"),
    id: "rule-fixture-tshirt",
    name: "Adjacent sizes",
  };
  source.rules!.push(rule);
  if (options.hidden) source.spacing!.scales[0].hideFromPublishing = true;
  const references = tshirtFixtureReferences(source);
  const spacing = references.filter(
    (reference) =>
      reference.family === "spacing" &&
      reference.sourceId === source.spacing!.scales[0].id,
  );
  const anchor = options.nearest
    ? spacing[0]
    : spacing.find((reference) => reference.step === 500)!;
  const alternate = spacing.find((reference) => reference.step === 600)!;
  const structure = assignStructure(
    createStructure(options.structureName ?? "Base", TSHIRT_FIXTURE_ID),
    Object.fromEntries(
      PADDING_SLOTS.map((slot) => [
        slot,
        {
          $ref:
            options.asymmetric && ["paddingLeft", "paddingRight"].includes(slot)
              ? alternate.id
              : anchor.id,
        },
      ]),
    ),
  );
  const named = governStructureName(
    structure,
    source.taxonomy!,
    structure.name,
    TSHIRT_NAME_TERM_ID,
  );
  const application = {
    id: TSHIRT_APPLICATION_ID,
    ruleId: rule.id,
    targets: { kind: "all" as const },
  };
  named.structure.generation = {
    ...named.structure.generation!,
    sizeTermIds: options.fiveSizes
      ? Object.values(SIZE_TERM_IDS)
      : [SIZE_TERM_IDS.s, SIZE_TERM_IDS.m, SIZE_TERM_IDS.l],
    applications: options.unattached ? [] : [application],
  };
  source.taxonomy = named.taxonomy;
  source.structures = { schemaVersion: 2, structures: [named.structure] };
  const bundle = buildTshirtArtifacts(source);
  return {
    source,
    structure: named.structure,
    rule,
    application,
    references,
    anchor,
    alternate,
    bundle,
    selection: Object.fromEntries(
      source.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
    ),
  };
}
