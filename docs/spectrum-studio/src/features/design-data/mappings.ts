// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisInput,
  AnalysisRecord,
  ReviewedMapping,
} from "./comparison";
import { modeDeclarations } from "./modeCoverage";
import { fontSizeStep } from "./foundationValues";
import { crosswalkNameFields } from "./taxonomyCrosswalk";
import { comparisonName } from "./tokenPairing";

export const REVIEWED_MAPPING_VERSION =
  "foundation-color-ramp-v2-typography-size-v1";

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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
    let modeKeys: Record<string, string> | undefined;
    if (entry.modeKeys !== undefined) {
      if (
        !object(entry.modeKeys) ||
        !Object.entries(entry.modeKeys).every(
          ([key, value]) => text(key) && text(value),
        )
      )
        throw new Error(
          `${location}: modeKeys must contain nonempty app/reference mode keys.`,
        );
      modeKeys = Object.fromEntries(
        Object.entries(entry.modeKeys).map(([key, value]) => [
          key,
          String(value),
        ]),
      );
    }
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
      ...(modeKeys ? { modeKeys } : {}),
    };
  });
}

export function declaredDefaultMode(
  input: AnalysisInput,
  key: string,
): string | undefined {
  const declarations = modeDeclarations(input).filter(
    (declaration) => declaration.key === key,
  );
  if (declarations.length !== 1) return;
  return declarations[0].issues.length ? undefined : declarations[0].default;
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

const RAMP_MODES = ["colorScheme", "contrast"];
const RAMP_FIELDS = ["property", "colorFamily", "scaleIndex"];

/**
 * Pairs Studio color-ramp steps with design-data palette rows. App names go
 * through the shared taxonomy crosswalk; the family must be the palette row's
 * Registry color family (labels resolve to Registry IDs), not a local list.
 */
export function reviewedColorMappings(
  app: AnalysisInput,
  reference: AnalysisInput,
): ReviewedMapping[] {
  const vocabulary = reference.records.filter(
    (row) => row.category === "registry" && object(row.value),
  );
  const ramp = (name: Record<string, unknown>) =>
    name.property === "color" &&
    typeof name.colorFamily === "string" &&
    Number.isSafeInteger(name.scaleIndex) &&
    Object.keys(name).every((key) => RAMP_FIELDS.includes(key));
  const candidates = reference.records.flatMap((row) => {
    const name = comparisonName(row, "reference", vocabulary, RAMP_MODES);
    return row.category === "tokens" &&
      row.source === "tokens/color-palette.tokens.json" &&
      ramp(name)
      ? [{ row, name }]
      : [];
  });
  const mappings: ReviewedMapping[] = [];
  for (const left of app.records) {
    if (
      left.category !== "tokens" ||
      left.classification !== "generated" ||
      left.structuredName?.property !== "color" ||
      Object.keys(left.context ?? {}).some((key) => !RAMP_MODES.includes(key))
    )
      continue;
    const tokenType = left.tokenType ?? "colors";
    const name = comparisonName(
      { ...left, tokenType },
      "app",
      vocabulary,
      RAMP_MODES,
    );
    if (!ramp(name)) continue;
    const colorScheme = modeValue(left, app, "colorScheme");
    const contrast = modeValue(left, app, "contrast");
    if (!colorScheme || !contrast) continue;
    const nameFields = crosswalkNameFields(left.structuredName, { tokenType });
    // A Registry label (e.g. "Gray") resolved to its ID is still a declared
    // field translation, so an accepted RFC can excuse the visible difference.
    if (
      typeof left.structuredName.colorFamily === "string" &&
      left.structuredName.colorFamily !== name.colorFamily &&
      !nameFields.colorFamily
    )
      nameFields.colorFamily = { reference: "colorFamily" };
    for (const { row: right, name: rightName } of candidates) {
      if (
        rightName.colorFamily !== name.colorFamily ||
        rightName.scaleIndex !== name.scaleIndex ||
        modeValue(right, reference, "colorScheme") !== colorScheme ||
        modeValue(right, reference, "contrast") !== contrast
      )
        continue;
      mappings.push({
        app: left.id,
        reference: right.id,
        contextDefaults: RAMP_MODES,
        ...(Object.keys(nameFields).length > 0 && { nameFields }),
        rationale: `${REVIEWED_MAPPING_VERSION}: foundational color-ramp ordinal, not equal contrast or equal RGB. App names use the shared taxonomy crosswalk (docs/rfcs/taxonomy-crosswalk.md); the reference palette row supplies the Registry color family. Exact family ${String(name.colorFamily)}, scaleIndex ${String(name.scaleIndex)}, colorScheme ${colorScheme}, contrast ${contrast}; omitted modes use each input's declared default. Independent UUIDs retained; no aliases or extra axes inferred.`,
      });
    }
  }
  return mappings;
}

export function reviewedTypographyMappings(
  app: AnalysisInput,
  reference: AnalysisInput,
): ReviewedMapping[] {
  const axes = modeDeclarations(app).map((set) => set.key);
  const referenceAxes = new Set(
    modeDeclarations(reference).map((set) => set.key),
  );
  const candidates = reference.records.filter(
    (row) =>
      row.category === "tokens" &&
      !row.lifecycle?.deprecatedIn &&
      fontSizeStep(row) !== undefined,
  );
  return app.records.flatMap((left): ReviewedMapping[] => {
    const step = fontSizeStep(left);
    if (
      left.category !== "tokens" ||
      left.tokenType !== "typography" ||
      left.lifecycle?.deprecatedIn ||
      left.tokenStatus === "deprecated" ||
      step === undefined ||
      left.structuredName?.element !== "text" ||
      left.structuredName.property !== "size" ||
      Object.keys(left.structuredName).some(
        (key) => !["element", "property", "scaleIndex", ...axes].includes(key),
      ) ||
      Object.keys(left.context ?? {}).some(
        (axis) =>
          !referenceAxes.has(axis) &&
          left.context?.[axis] !== declaredDefaultMode(app, axis),
      )
    )
      return [];
    return candidates
      .filter(
        (right) =>
          fontSizeStep(right) === step &&
          Object.keys(right.structuredName ?? {}).every((key) =>
            ["property", "scaleIndex", "legacyKey", ...referenceAxes].includes(
              key,
            ),
          ) &&
          [
            ...new Set([
              ...Object.keys(left.context ?? {}),
              ...Object.keys(right.context ?? {}),
            ]),
          ]
            .filter((axis) => referenceAxes.has(axis))
            .every(
              (axis) =>
                modeValue(left, app, axis) !== undefined &&
                modeValue(left, app, axis) ===
                  modeValue(right, reference, axis),
            ),
      )
      .map((right) => ({
        kind: "typography-size",
        app: left.id,
        reference: right.id,
        rationale:
          "Reviewed typography-size-v1: Registry text/size metric maps to the canonical font-size metric at the same scaleIndex and shared mode. App-only axes use declared defaults; original names and UUIDs are retained. Values are compared, never used to establish identity.",
      }));
  });
}
