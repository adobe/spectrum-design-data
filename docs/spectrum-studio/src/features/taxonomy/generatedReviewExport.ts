// Copyright 2026 Adobe. All rights reserved.
import Ajv from "ajv";
import { canonicalJson } from "../design-data/canonicalJson";
import { canonicalTokenModeKey } from "../tokens/browserModel";
import {
  assertTshirtField,
  assertTshirtGraph,
  TSHIRT_PROFILE,
  TSHIRT_COMPOSITION_PROFILE,
  TSHIRT_VARIANTS_PROFILE,
  ELEMENT_NAMING_FIELD,
  GENERATOR_PROFILE,
} from "../design-data/tshirtProfile";
import type { TshirtArtifactBundle } from "../design-data/tshirtTypes";
import {
  assertClassificationReviewExport,
  classificationContentHash,
  type ClassificationReviewExport,
} from "./reviewedExport";

interface GeneratedReviewOccurrence {
  pointer: string;
  value: unknown;
  status: "non-standard";
  fixRequired: true;
  owner: "joint";
  gapId: "LTAX-011";
  reason: string;
  fix: string;
}
export interface GeneratedClassificationCompatibility {
  schemaVersion: 1 | 2 | 3 | 4;
  profileId:
    | "leonardo-generated-tshirt-classification-compatibility-v1"
    | "leonardo-generated-tshirt-classification-compatibility-v2"
    | "leonardo-generated-tshirt-classification-compatibility-v3"
    | "leonardo-generated-tshirt-classification-compatibility-v4";
  exportKind: "compatibility";
  standardConforming: false;
  upstreamAdopted: false;
  bundle: TshirtArtifactBundle;
  bundleSha256: string;
  classification: ClassificationReviewExport;
  review: {
    scope: "Preserved draft names, semantic classifications, field declarations, vocabulary and mode labels";
    occurrences: GeneratedReviewOccurrence[];
  };
}

const text = { type: "string", pattern: "\\S" };
const objects = { type: "array", items: { type: "object" } };
const catalogEntry = (identity: "id" | "sourceId") => ({
  type: "object",
  additionalProperties: false,
  required: [identity, "label", "value"],
  properties: { [identity]: text, label: text, value: text },
});
export const generatedClassificationSchema = {
  $id: "urn:leonardo:generated-classification-compatibility:1",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "profileId",
    "exportKind",
    "standardConforming",
    "upstreamAdopted",
    "bundle",
    "bundleSha256",
    "classification",
    "review",
  ],
  properties: {
    schemaVersion: { enum: [1, 2, 3, 4] },
    profileId: {
      enum: [
        "leonardo-generated-tshirt-classification-compatibility-v1",
        "leonardo-generated-tshirt-classification-compatibility-v2",
        "leonardo-generated-tshirt-classification-compatibility-v3",
        "leonardo-generated-tshirt-classification-compatibility-v4",
      ],
    },
    exportKind: { const: "compatibility" },
    standardConforming: { const: false },
    upstreamAdopted: { const: false },
    bundleSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    classification: { type: "object" },
    bundle: {
      type: "object",
      additionalProperties: false,
      required: [
        "profile",
        "sourceKind",
        "tokens",
        "semantics",
        "primitiveLineage",
        "diagnostics",
        "fields",
        "vocabulary",
        "modeSets",
      ],
      properties: {
        profile: {
          enum: [
            TSHIRT_PROFILE,
            TSHIRT_COMPOSITION_PROFILE,
            TSHIRT_VARIANTS_PROFILE,
            GENERATOR_PROFILE,
          ],
        },
        sourceKind: { enum: ["shipped", "saved", "working"] },
        tokens: objects,
        semantics: objects,
        primitiveLineage: objects,
        diagnostics: objects,
        fields: objects,
        vocabulary: {
          type: "object",
          additionalProperties: false,
          required: ["structures", "foundationScales", "physicalPositions"],
          properties: {
            structures: { type: "array", items: catalogEntry("id") },
            elements: { type: "array", items: catalogEntry("id") },
            sizes: { type: "array", minItems: 1, items: catalogEntry("id") },
            foundationScales: {
              type: "array",
              items: catalogEntry("sourceId"),
            },
            physicalPositions: { type: "array", items: text },
          },
        },
        modeSets: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "key", "defaultModeId", "modes"],
            properties: {
              id: text,
              key: text,
              defaultModeId: text,
              modes: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "key"],
                  properties: { id: text, key: text },
                },
              },
            },
          },
        },
      },
    },
    review: {
      type: "object",
      additionalProperties: false,
      required: ["scope", "occurrences"],
      properties: {
        scope: {
          const:
            "Preserved draft names, semantic classifications, field declarations, vocabulary and mode labels",
        },
        occurrences: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "pointer",
              "value",
              "status",
              "fixRequired",
              "owner",
              "gapId",
              "reason",
              "fix",
            ],
            properties: {
              pointer: text,
              value: {},
              status: { const: "non-standard" },
              fixRequired: { const: true },
              owner: { const: "joint" },
              gapId: { const: "LTAX-011" },
              reason: text,
              fix: text,
            },
          },
        },
      },
    },
  },
};
const validate = new Ajv({
  allErrors: true,
  strict: true,
}).compile<GeneratedClassificationCompatibility>(generatedClassificationSchema);
const segment = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");

function draftOccurrences(
  bundle: TshirtArtifactBundle,
): GeneratedReviewOccurrence[] {
  const occurrences: GeneratedReviewOccurrence[] = [];
  const add = (pointer: string, value: unknown) =>
    occurrences.push({
      pointer,
      value: structuredClone(value),
      status: "non-standard",
      fixRequired: true,
      owner: "joint",
      gapId: "LTAX-011",
      reason:
        "This preserved draft representation has no reviewed per-instance binding to the proposed classification standard.",
      fix: "Review its meaning, owner and source representation; retain the original data until an explicit migration is accepted.",
    });
  for (const [index, token] of bundle.tokens.entries())
    for (const [key, value] of Object.entries(token.name))
      add(`/bundle/tokens/${index}/name/${segment(key)}`, value);
  for (const [index, row] of bundle.semantics.entries()) {
    for (const [key, value] of Object.entries(row.token.name))
      add(`/bundle/semantics/${index}/token/name/${segment(key)}`, value);
    for (const [key, value] of Object.entries(row.classification))
      add(`/bundle/semantics/${index}/classification/${segment(key)}`, value);
  }
  for (const [index, field] of bundle.fields.entries())
    add(`/bundle/fields/${index}`, field);
  for (const [key, values] of Object.entries(bundle.vocabulary))
    for (const [index, value] of values.entries())
      add(`/bundle/vocabulary/${segment(key)}/${index}`, value);
  for (const [index, axis] of bundle.modeSets.entries()) {
    add(`/bundle/modeSets/${index}/key`, axis.key);
    for (const [modeIndex, mode] of axis.modes.entries())
      add(`/bundle/modeSets/${index}/modes/${modeIndex}/key`, mode.key);
  }
  return occurrences;
}

export async function buildGeneratedClassificationCompatibility(
  bundle: TshirtArtifactBundle,
  classification: ClassificationReviewExport,
): Promise<GeneratedClassificationCompatibility> {
  const preserved = structuredClone(bundle);
  const version =
    "extensionId" in bundle.profile
      ? bundle.profile.extensionId === GENERATOR_PROFILE.extensionId
        ? 4
        : bundle.profile.extensionId === TSHIRT_VARIANTS_PROFILE.extensionId
          ? 3
          : 2
      : 1;
  const packet: GeneratedClassificationCompatibility = {
    schemaVersion: version,
    profileId: `leonardo-generated-tshirt-classification-compatibility-v${version}`,
    exportKind: "compatibility",
    standardConforming: false,
    upstreamAdopted: false,
    bundle: preserved,
    bundleSha256: await classificationContentHash(preserved),
    classification: structuredClone(classification),
    review: {
      scope:
        "Preserved draft names, semantic classifications, field declarations, vocabulary and mode labels",
      occurrences: draftOccurrences(preserved),
    },
  };
  await assertGeneratedClassificationCompatibility(packet);
  return packet;
}

export async function assertGeneratedClassificationCompatibility(
  value: unknown,
): Promise<void> {
  if (!validate(value))
    throw new Error(
      `Invalid generated classification compatibility packet.\n${(validate.errors ?? []).map((error) => `${error.instancePath}: ${error.message}`).join("\n")}`,
    );
  await assertClassificationReviewExport(value.classification);
  if (value.classification.exportKind !== "compatibility")
    throw new Error(
      "Generated compatibility output needs its non-conforming classification packet.",
    );
  const extended = "extensionId" in value.bundle.profile;
  const variants =
    "extensionId" in value.bundle.profile &&
    (value.bundle.profile.extensionId === TSHIRT_VARIANTS_PROFILE.extensionId ||
      value.bundle.profile.extensionId === GENERATOR_PROFILE.extensionId);
  const generator =
    "extensionId" in value.bundle.profile &&
    value.bundle.profile.extensionId === GENERATOR_PROFILE.extensionId;
  const names = new Map(
    value.bundle.semantics
      .filter((row) => row.optionId && row.canonicalName)
      .map((row) => [
        row.token.uuid,
        JSON.stringify([
          row.canonicalName,
          canonicalTokenModeKey(row.selection),
        ]),
      ]),
  );
  assertTshirtGraph(
    value.bundle.tokens,
    variants ? (token) => names.get(token.uuid) : undefined,
    value.bundle.vocabulary.sizes?.map((term) => term.value),
  );
  const version = generator ? 4 : variants ? 3 : extended ? 2 : 1;
  if (
    value.schemaVersion !== version ||
    value.profileId !==
      `leonardo-generated-tshirt-classification-compatibility-v${version}` ||
    extended !== (value.bundle.vocabulary.elements !== undefined) ||
    generator !== (value.bundle.vocabulary.sizes !== undefined)
  )
    throw new Error(
      "The compatibility envelope does not match its declared naming profile.",
    );
  for (const token of value.bundle.tokens) {
    if (
      generator &&
      token.name.size &&
      !value.bundle.vocabulary.sizes!.some(
        (term) => term.value === token.name.size,
      )
    )
      throw new Error("Generated output has an undeclared Size option.");
    if (
      token.name.element &&
      (!extended ||
        !value.bundle.vocabulary.elements?.some(
          (term) => term.value === token.name.element,
        ))
    )
      throw new Error("Generated Element naming is undeclared.");
  }
  for (const field of value.bundle.fields) assertTshirtField(field);
  if (
    extended &&
    !value.bundle.fields.some(
      (field) => canonicalJson(field) === canonicalJson(ELEMENT_NAMING_FIELD),
    )
  )
    throw new Error(
      "Invalid generated output: Element naming needs its declared field.",
    );
  const axes = new Set<string>(),
    keys = new Set<string>();
  for (const axis of value.bundle.modeSets) {
    if (
      axes.has(axis.id) ||
      keys.has(axis.key) ||
      new Set(axis.modes.map((mode) => mode.id)).size !== axis.modes.length ||
      new Set(axis.modes.map((mode) => mode.key)).size !== axis.modes.length ||
      !axis.modes.some((mode) => mode.id === axis.defaultModeId)
    ) {
      throw new Error(
        "Generated compatibility modes need unique identities and an available default.",
      );
    }
    axes.add(axis.id);
    keys.add(axis.key);
  }
  if (value.bundleSha256 !== (await classificationContentHash(value.bundle)))
    throw new Error("Generated compatibility source fingerprint is stale.");
  const actual = value.classification.source.records
    .flatMap((row) => (row.token.semantic ? [row.token.semantic] : []))
    .sort((left, right) => left.token.uuid.localeCompare(right.token.uuid));
  const expected = value.bundle.semantics
    .slice()
    .sort((left, right) => left.token.uuid.localeCompare(right.token.uuid));
  if (canonicalJson(actual) !== canonicalJson(expected))
    throw new Error(
      "Generated bundle and classification source revisions do not match.",
    );
  if (
    canonicalJson(value.review.occurrences) !==
    canonicalJson(draftOccurrences(value.bundle))
  )
    throw new Error(
      "Generated classification flags omitted or changed a preserved occurrence.",
    );
}
