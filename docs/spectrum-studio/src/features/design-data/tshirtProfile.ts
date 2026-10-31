// Copyright 2026 Adobe. All rights reserved.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import tokenSchema from "../../data/design-data-shadow-profile/token.schema.json" with { type: "json" };
import colorSchema from "../../data/design-data-shadow-profile/value-types/color.schema.json" with { type: "json" };
import documentSchema from "../../data/design-data-shadow-profile/document-block.schema.json" with { type: "json" };
import shadowSchema from "../../data/design-data-shadow-profile/value-types/drop-shadow.schema.json" with { type: "json" };
import fieldSchema from "../../data/design-data-tshirt-profile/field.schema.json" with { type: "json" };
import structureField from "../../data/design-data-tshirt-profile/fields/structure.json" with { type: "json" };
import propertyField from "../../data/design-data-tshirt-profile/fields/property.json" with { type: "json" };
import orientationField from "../../data/design-data-tshirt-profile/fields/orientation.json" with { type: "json" };
import positionField from "../../data/design-data-tshirt-profile/fields/position.json" with { type: "json" };
import sizeField from "../../data/design-data-tshirt-profile/fields/size.json" with { type: "json" };
import indexField from "../../data/design-data-tshirt-profile/fields/scaleIndex.json" with { type: "json" };
import sizes from "../../data/design-data-tshirt-profile/registry/sizes.json" with { type: "json" };
import properties from "../../data/design-data-tshirt-profile/registry/property-terms.json" with { type: "json" };
import positions from "../../data/design-data-tshirt-profile/registry/positions.json" with { type: "json" };
import provenance from "../../data/design-data-tshirt-profile/provenance.json" with { type: "json" };
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import {
  SHADOW_VALUE_TYPE,
  projectShadowValue,
  type DraftShadowLayer,
} from "./shadowValue";
import { canonicalJson } from "./canonicalJson";
import type { GeneratedShadow } from "../elevation/model";

export type TshirtTokenValue = string | DraftShadowLayer[];
interface TokenIdentity {
  uuid: string;
  name: Record<string, string>;
  $valueType?: string;
}
export type TshirtTokenRecord = TokenIdentity &
  ({ value: TshirtTokenValue; $ref?: never } | { $ref: string; value?: never });
export const FOUNDATION_SCALE_FIELD = {
  specVersion: "1.0.0-draft",
  name: "foundationScale",
  kind: "semantic",
  valueType: "string",
  description:
    "Registry-governed foundation scale name; distinct from the scale mode set.",
  registry: "extensions/registry/foundation-scales.json",
  validation: "advisory",
  serialization: { position: 1 },
  scope: null,
  required: false,
};
export const PHYSICAL_POSITIONS = [
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
];
export const TSHIRT_PROFILE = {
  ...provenance,
  gapId: "LTAX-009",
  limitations: [
    "Schema-valid row UUID subset, not complete written-spec, SDK, cascade or dataset conformance.",
    "Concept IDs and derivations remain separate lineage because the closed token schema rejects conceptId.",
    "String scaleIndex satisfies the token schema but differs from its integer field declaration.",
    "Formatting explicitly includes scaleIndex; the upstream legacy formatter currently excludes it.",
    "Foundation scale names and physical positions are declared extensions, not upstream-accepted vocabulary.",
    "Finite px dimensions use local exact-value checks; no upstream dimension value schema exists at this pin.",
    "Literal outset shadow stacks only; no inset or empty-valued stacks.",
  ],
} as const;
export const TSHIRT_FIELDS = [
  FOUNDATION_SCALE_FIELD,
  structureField,
  propertyField,
  orientationField,
  positionField,
  sizeField,
  indexField,
];
export const ELEMENT_NAMING_FIELD = {
  ...structureField,
  name: "element",
  registry: "extensions/registry/elements.json",
  description:
    "An existing Registry Element term selected explicitly for Structure-owned semantic tokens.",
};
export const TSHIRT_COMPOSITION_PROFILE = {
  ...TSHIRT_PROFILE,
  extensionId: "leonardo-structure-naming-v2",
  gapId: "LTAX-013",
  limitations: [
    ...TSHIRT_PROFILE.limitations,
    "Element naming is an explicit local extension; reusable instance trees are not exported anatomy.",
  ],
} as const;
export const TSHIRT_NAMING_FIELDS = [...TSHIRT_FIELDS, ELEMENT_NAMING_FIELD];
export const TSHIRT_VARIANTS_PROFILE = {
  ...TSHIRT_COMPOSITION_PROFILE,
  extensionId: "leonardo-structure-variants-v3",
  gapId: "LTAX-017",
  limitations: [
    ...TSHIRT_COMPOSITION_PROFILE.limitations,
    "Registry-classified sparse variant semantics and literal leaf values are local extensions, not an upstream variants contract.",
  ],
} as const;
export const GENERATOR_PROFILE = {
  ...TSHIRT_VARIANTS_PROFILE,
  extensionId: "leonardo-size-generator-v4",
  gapId: "LTAX-019",
  limitations: [
    ...TSHIRT_VARIANTS_PROFILE.limitations,
    "Authored Size options and type applicability are app-owned Generator derivations, not an upstream rule contract.",
  ],
} as const;
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
});
addFormats(ajv);
ajv.addKeyword({
  keyword: "x-valueType",
  schemaType: ["string", "array"],
  valid: true,
});
for (const schema of [colorSchema, documentSchema, shadowSchema, tokenSchema])
  ajv.addSchema(schema);
const validateToken = ajv.compile<TshirtTokenRecord>(tokenSchema);
const validateField = ajv.compile(fieldSchema);
const validateShadow = ajv.compile(shadowSchema);
for (const field of TSHIRT_NAMING_FIELDS)
  if (!validateField(field))
    throw new Error(
      `Invalid T-shirt field declaration: ${ajv.errorsText(validateField.errors)}`,
    );

export function formatTshirtName(name: Record<string, string>): string {
  const parts = TSHIRT_NAMING_FIELDS.slice()
    .sort(
      (left, right) =>
        left.serialization.position - right.serialization.position,
    )
    .flatMap((field) => {
      const value = name[field.name];
      if (value === undefined) return [];
      const sized =
        field.name === "size"
          ? sizes.values.find((size) => size.id === value)?.tokenName
          : undefined;
      return [kebabCaseNameFormatter.formatValue(sized ?? value)];
    });
  for (const key of Object.keys(name)
    .filter((key) => !TSHIRT_NAMING_FIELDS.some((field) => field.name === key))
    .sort()) {
    parts.push(kebabCaseNameFormatter.formatValue(name[key]));
  }
  return parts.join("-");
}
export function assertTshirtField(value: unknown) {
  if (!validateField(value))
    throw new Error(
      `Invalid declared T-shirt field: ${ajv.errorsText(validateField.errors)}`,
    );
}

export function exactDimensionValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error("A generated dimension must be finite and non-negative.");
  return `${value}px`;
}

export function exactShadowValue(
  shadows: readonly GeneratedShadow[],
): DraftShadowLayer[] {
  const value = projectShadowValue(shadows);
  if (!validateShadow(value))
    throw new Error(
      `Invalid pinned shadow value: ${ajv.errorsText(validateShadow.errors)}`,
    );
  return value;
}

export function assertTshirtToken(
  value: unknown,
  declaredSizes: readonly string[] = [],
): asserts value is TshirtTokenRecord {
  if (!validateToken(value))
    throw new Error(
      `Invalid T-shirt token record: ${ajv.errorsText(validateToken.errors)}`,
    );
  if (
    !value.uuid ||
    typeof value.name !== "object" ||
    Array.isArray(value.name)
  )
    throw new Error("T-shirt output needs a UUID and structured name.");
  if (value.name.element && value.name.structure)
    throw new Error("A semantic token must use one explicit naming facet.");
  if (
    !properties.values.some((property) => property.id === value.name.property)
  )
    throw new Error(`Unmapped property "${value.name.property}".`);
  if (
    value.name.size &&
    !sizes.values.some((size) => size.id === value.name.size) &&
    !declaredSizes.includes(value.name.size)
  )
    throw new Error("Unmapped T-shirt size.");
  if (
    value.name.position &&
    !positions.values.some((position) => position.id === value.name.position) &&
    !PHYSICAL_POSITIONS.includes(value.name.position)
  )
    throw new Error("Undeclared physical position.");
  if (
    value.name.orientation &&
    !["horizontal", "vertical"].includes(value.name.orientation)
  )
    throw new Error("Undeclared orientation.");
  if (
    value.name.scaleIndex !== undefined &&
    !/^-?\d+$/.test(value.name.scaleIndex)
  )
    throw new Error("The subset uses a decimal string scaleIndex.");
  if (
    value.name.property === "shadow"
      ? value.$valueType !== SHADOW_VALUE_TYPE
      : value.$valueType !== undefined
  )
    throw new Error("The generated token declares an unsupported value type.");
  if ("$ref" in value) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        value.$ref!,
      )
    )
      throw new Error("Aliases must reference emitted row UUIDs.");
  } else if (value.name.property === "shadow") {
    if (value.$valueType !== SHADOW_VALUE_TYPE || !validateShadow(value.value))
      throw new Error("Complete shadows need a valid pinned shadow array.");
  } else if (
    typeof value.value !== "string" ||
    !value.value.endsWith("px") ||
    exactDimensionValue(Number(value.value.slice(0, -2))) !== value.value
  ) {
    throw new Error(
      "Dimension literals must preserve their exact finite px value.",
    );
  }
}

export function assertTshirtGraph(
  tokens: readonly TshirtTokenRecord[],
  canonicalName: (token: TshirtTokenRecord) => string | undefined = () =>
    undefined,
  declaredSizes: readonly string[] = [],
) {
  const byId = new Map<string, TshirtTokenRecord>(),
    names = new Set<string>(),
    formatted = new Set<string>();
  for (const token of tokens) {
    if (canonicalName(token)) {
      if (!validateToken(token))
        throw new Error(
          `Invalid variant token: ${ajv.errorsText(validateToken.errors)}`,
        );
      if (
        "value" in token &&
        token.name.property !== "shadow" &&
        (typeof token.value !== "string" ||
          !/^(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:px)?$/i.test(token.value) ||
          !Number.isFinite(Number(token.value.replace(/px$/, ""))))
      )
        throw new Error(
          "Variant values must be finite non-negative lengths or unitless ratios.",
        );
    } else assertTshirtToken(token, declaredSizes);
    const name = canonicalJson(token.name);
    const displayName = canonicalName(token) ?? formatTshirtName(token.name);
    if (byId.has(token.uuid) || names.has(name) || formatted.has(displayName))
      throw new Error(
        "Duplicate emitted token UUID, structured name or formatted name.",
      );
    byId.set(token.uuid, token);
    names.add(name);
    formatted.add(displayName);
  }
  for (const token of tokens) {
    const visited = new Set<string>();
    let current = token;
    while ("$ref" in current) {
      if (visited.has(current.uuid))
        throw new Error("Generated aliases contain a cycle.");
      visited.add(current.uuid);
      const target = byId.get(current.$ref!);
      if (!target)
        throw new Error(
          `Alias target ${current.$ref} is not in the emitted bundle.`,
        );
      if (
        (token.name.property === "shadow") !==
        (target.name.property === "shadow")
      )
        throw new Error("An alias target has an incompatible value type.");
      const family =
        token.name.property === "padding" || token.name.property === "gap"
          ? "spacing"
          : token.name.property === "corner-radius"
            ? "corner-radius"
            : [
                  "width",
                  "height",
                  "min-width",
                  "min-height",
                  "max-width",
                  "max-height",
                ].includes(token.name.property)
              ? "size"
              : token.name.property;
      if (
        !target.name.structure &&
        !target.name.element &&
        target.name.property !== family
      )
        throw new Error(
          "An alias target belongs to an incompatible primitive family.",
        );
      for (const [key, value] of Object.entries(target.name)) {
        if (
          !TSHIRT_NAMING_FIELDS.some((field) => field.name === key) &&
          token.name[key] !== value
        )
          throw new Error(`Alias target has an incompatible ${key} context.`);
      }
      current = target;
    }
  }
}
