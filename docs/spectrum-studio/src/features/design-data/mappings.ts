// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisInput,
  AnalysisRecord,
  ReviewedMapping,
} from "./comparison";

export const REVIEWED_MAPPING_VERSION = "foundation-color-ramp-v1";

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const families = new Set([
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "magenta",
  "fuchsia",
  "pink",
  "gray",
]);

/** Validate the complete external mapping contract before it reaches comparison. */
export function parseReviewedMappings(value: unknown): ReviewedMapping[] {
  const text = (item: unknown): item is string =>
    typeof item === "string" && item.trim().length > 0;
  if (!Array.isArray(value))
    throw new Error("Mappings must be an array of reviewed pairs.");
  return value.map((entry: unknown, index) => {
    const location = `Mapping ${index}`;
    if (
      !object(entry) ||
      !text(entry.app) ||
      !text(entry.reference) ||
      !text(entry.rationale)
    ) {
      throw new Error(
        `${location}: app/reference IDs and a reviewed rationale must be nonempty strings.`,
      );
    }
    let nameFields: ReviewedMapping["nameFields"];
    if (entry.nameFields !== undefined) {
      if (!object(entry.nameFields))
        throw new Error(
          `${location}: nameFields must be an object of reviewed field mappings.`,
        );
      nameFields = Object.fromEntries(
        Object.entries(entry.nameFields).map(([key, field]) => {
          if (
            !text(key) ||
            !object(field) ||
            !text(field.reference) ||
            (field.normalization !== undefined &&
              field.normalization !== "integer")
          ) {
            throw new Error(
              `${location}: nameFields.${key} requires a nonempty reference field and optional integer normalization.`,
            );
          }
          return [
            key,
            {
              reference: field.reference,
              ...(field.normalization === "integer"
                ? { normalization: "integer" as const }
                : {}),
            },
          ];
        }),
      );
    }
    let contextDefaults: string[] | undefined;
    if (entry.contextDefaults !== undefined) {
      if (
        !Array.isArray(entry.contextDefaults) ||
        !entry.contextDefaults.every(text)
      ) {
        throw new Error(
          `${location}: contextDefaults must be an array of nonempty mode-field strings.`,
        );
      }
      contextDefaults = entry.contextDefaults;
    }
    return {
      app: entry.app,
      reference: entry.reference,
      rationale: entry.rationale,
      ...(nameFields ? { nameFields } : {}),
      ...(contextDefaults ? { contextDefaults } : {}),
    };
  });
}

export function declaredDefaultMode(
  input: AnalysisInput,
  key: string,
): string | undefined {
  const declarations = input.records.filter(
    (record) =>
      record.category === "mode-sets" &&
      object(record.value) &&
      (record.value.key === key || record.value.name === key),
  );
  if (declarations.length !== 1) return;
  const declaration = declarations[0].value;
  if (!object(declaration)) return;
  if (typeof declaration.default === "string") return declaration.default;
  if (!Array.isArray(declaration.modes)) return;
  const mode: unknown = declaration.modes.find(
    (item: unknown) => object(item) && item.id === declaration.defaultModeId,
  );
  return object(mode) && typeof mode.key === "string" ? mode.key : undefined;
}

function modeValue(
  record: AnalysisRecord,
  input: AnalysisInput,
  key: string,
): string | undefined {
  const value =
    record.context?.[key] ??
    record.structuredName?.[key] ??
    declaredDefaultMode(input, key);
  return typeof value === "string" ? value : undefined;
}

export function reviewedColorMappings(
  app: AnalysisInput,
  reference: AnalysisInput,
): ReviewedMapping[] {
  const candidates = reference.records.filter(
    (row) =>
      row.category === "tokens" &&
      row.source === "tokens/color-palette.tokens.json" &&
      row.structuredName?.property === "color" &&
      Object.keys(row.structuredName).every((key) =>
        [
          "property",
          "colorFamily",
          "scaleIndex",
          "colorScheme",
          "contrast",
        ].includes(key),
      ),
  );
  const mappings: ReviewedMapping[] = [];
  for (const left of app.records) {
    const name = left.structuredName;
    if (
      left.category !== "tokens" ||
      left.classification !== "generated" ||
      name?.property !== "color" ||
      typeof name.colorName !== "string" ||
      !families.has(name.colorName) ||
      typeof name.contrastValue !== "string" ||
      !/^\d+$/.test(name.contrastValue) ||
      Object.keys(name).some(
        (key) =>
          ![
            "property",
            "colorName",
            "contrastValue",
            "colorScheme",
            "contrast",
          ].includes(key),
      ) ||
      Object.keys(left.context ?? {}).some(
        (key) => !["colorScheme", "contrast"].includes(key),
      )
    )
      continue;
    const colorScheme = modeValue(left, app, "colorScheme");
    const contrast = modeValue(left, app, "contrast");
    if (!colorScheme || !contrast) continue;
    for (const right of candidates) {
      if (
        right.structuredName?.colorFamily !== name.colorName ||
        right.structuredName.scaleIndex !== Number(name.contrastValue) ||
        modeValue(right, reference, "colorScheme") !== colorScheme ||
        modeValue(right, reference, "contrast") !== contrast
      )
        continue;
      mappings.push({
        app: left.id,
        reference: right.id,
        contextDefaults: ["colorScheme", "contrast"],
        nameFields: {
          colorName: { reference: "colorFamily" },
          contrastValue: { reference: "scaleIndex", normalization: "integer" },
        },
        rationale: `${REVIEWED_MAPPING_VERSION}: foundational color-ramp ordinal, not equal contrast or equal RGB. App contrastTokenLabel/cascade export colorName→colorFamily and contrastValue→scaleIndex; reference fields/colorFamily.json and fields/scaleIndex.json. Exact family ${name.colorName}, ordinal ${name.contrastValue}, colorScheme ${colorScheme}, contrast ${contrast}; omitted modes use each input's declared default. Independent UUIDs retained; no aliases or extra axes inferred.`,
      });
    }
  }
  return mappings;
}
