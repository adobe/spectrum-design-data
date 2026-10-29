// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisFinding,
  AnalysisInput,
  AnalysisRecord,
} from "./comparison";

export type CoverageUnit = "concepts" | "rows";
export type InventoryStatus = "complete" | "partial" | "unavailable";
export interface CoverageCounts {
  app: number;
  reference: number;
  represented: number;
  missing: number;
  unknown: number;
  appOnly: number;
  percent: number | null;
  missingPercent: number | null;
  unknownPercent: number | null;
}
export interface CoverageGroup {
  id: string;
  label: string;
  explanation: string;
  counts: Record<CoverageUnit, CoverageCounts>;
  appRecordIds: string[];
  referenceRecordIds: string[];
}
export interface CoverageSummary {
  schemaVersion: 1;
  inventories: { app: InventoryStatus; reference: InventoryStatus };
  identityFallbackRows: { app: number; reference: number };
  allTokens: CoverageGroup;
  categories: CoverageGroup[];
  tokenTypes: CoverageGroup[];
  values: {
    equal: number;
    different: number;
    notCompared: number;
    agreementPercent: number | null;
  };
  schemas: {
    app: string[];
    reference: string[];
    compatibilityPercent: null;
    explanation: string;
  };
  limitations: string[];
}
const typeLabels: Record<string, string> = {
  "primitive-color": "Primitive color",
  "semantic-color": "Semantic color",
  "font-size": "Font size",
  "line-height": "Line height",
  "font-family": "Font family",
  "font-weight": "Font weight",
  typography: "Other typography",
  spacing: "Primitive spacing",
  "layout-spacing": "Padding, gap and layout spacing",
  size: "Size and dimensions",
  radius: "Corner radius",
  elevation: "Elevation and shadow",
  motion: "Motion",
  number: "Numbers and ratios",
  other: "Other / unclassified tokens",
};
const colorProperties = new Set([
  "color",
  "background-color",
  "border-color",
  "fill-color",
  "icon-color",
  "content-color",
  "visual-color",
  "shadow-color",
  "overlay-color",
  "outline-color",
  "key-color",
]);
/** Grouping is not matching: declared properties/native pointers never create counterpart identities. */
export function coverageTokenType(record: AnalysisRecord): string {
  const property = record.structuredName?.property;
  const name = record.conceptId ?? record.name;
  if (typeof property === "string" && colorProperties.has(property))
    return property !== "color" ||
      ["colorRole", "component", "anatomy"].some(
        (key) => record.structuredName?.[key] !== undefined,
      )
      ? "semantic-color"
      : "primitive-color";
  if (
    [
      "contrast-ratio",
      "contrast-multiplier",
      "polarity-compensation",
      "contrast-reference",
      "opacity",
      "angle",
    ].includes(String(property))
  )
    return "number";
  if (
    property === "font-size" ||
    (typeof property === "string" && /^font-size-\d+$/.test(property)) ||
    (record.pointer === "/system/foundations/typography" &&
      name.startsWith("font-size-"))
  )
    return "font-size";
  if (
    property === "line-height" ||
    (typeof property === "string" && /^line-height-\d+$/.test(property)) ||
    (record.pointer === "/system/foundations/typography" &&
      name.includes("line-height"))
  )
    return "line-height";
  if (property === "font-family" || property === "font-weight") return property;
  if (
    ["typography", "font-style", "text-align", "letter-spacing"].includes(
      String(property),
    ) ||
    record.pointer === "/system/foundations/typography"
  )
    return "typography";
  if (
    property === "spacing" ||
    record.pointer === "/system/foundations/spacing"
  )
    return "spacing";
  if (
    [
      "space-between",
      "gap",
      "padding",
      "padding-horizontal",
      "padding-vertical",
      "indent",
    ].includes(String(property))
  )
    return "layout-spacing";
  if (
    [
      "size",
      "width",
      "height",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
      "minimum-width",
      "minimum-height",
      "maximum-width",
      "maximum-height",
      "thickness",
      "border-width",
    ].includes(String(property)) ||
    record.pointer === "/system/foundations/size"
  )
    return "size";
  if (
    property === "radius" ||
    property === "corner-radius" ||
    property === "border-radius" ||
    record.pointer === "/system/foundations/radius"
  )
    return "radius";
  if (
    property === "shadow" ||
    property === "drop-shadow" ||
    property === "android-elevation" ||
    property === "elevation" ||
    record.pointer === "/system/foundations/elevation"
  )
    return "elevation";
  if (
    [
      "duration",
      "easing",
      "animation-duration",
      "transition-duration",
    ].includes(String(property))
  )
    return "motion";
  return "other";
}
export function coverageCategory(record: AnalysisRecord): string {
  if (
    record.category === "authoring/platforms" ||
    (record.category === "registry" && record.vocabulary === "platform")
  )
    return "platforms";
  return record.category.replace(/^authoring\//, "");
}
const categoryLabels: Record<string, string> = {
  tokens: "All tokens",
  components: "Components",
  relationships: "Relationships",
  fields: "Field definitions",
  registry: "Vocabulary and registry terms",
  guidelines: "Guidelines",
  foundations: "Foundation definitions",
  "mode-sets": "Mode declarations",
  platforms: "Platform declarations",
  rules: "Rules",
  scaleTypes: "Formulas",
  interpolations: "Interpolations",
  adaptiveClaims: "Adaptive claims",
  tokenOverrides: "Token overrides",
  "token-edits": "Token edits",
};
export function coverageInventoryRecords(
  input: AnalysisInput,
): AnalysisRecord[] {
  return input.records.flatMap((record) => {
    if (
      ![
        "authoring/tokenOverrides",
        "authoring/token-edits",
        "authoring/adaptiveClaims",
      ].includes(record.category) ||
      !record.value ||
      typeof record.value !== "object" ||
      Array.isArray(record.value)
    )
      return [record];
    return Object.entries(record.value).map(([key, value]) => ({
      ...record,
      id: `${record.id}/${key}`,
      name: key,
      value,
      pointer: `${record.pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
    }));
  });
}
const tokenKey = (record: AnalysisRecord, unit: CoverageUnit) =>
  unit === "concepts" && record.category === "tokens"
    ? (record.conceptId ?? record.identity ?? record.id)
    : record.id;
const percentage = (count: number, total: number) =>
  total ? Math.round((count / total) * 1000) / 10 : null;
export function buildCoverage(
  app: AnalysisInput,
  reference: AnalysisInput,
  findings: readonly AnalysisFinding[],
): CoverageSummary {
  const inventories = {
    app: app.inventoryStatus ?? (app.errors.length ? "partial" : "complete"),
    reference:
      reference.inventoryStatus ??
      (reference.errors.length ? "partial" : "complete"),
  };
  const appRecords = coverageInventoryRecords(app),
    referenceRecords = coverageInventoryRecords(reference);
  const pairs = new Map<
    string,
    {
      app: AnalysisRecord;
      reference: AnalysisRecord;
      result: "equal" | "different" | "notCompared";
    }
  >();
  for (const finding of findings)
    if (
      finding.app &&
      finding.reference &&
      finding.confidence !== "unassessable" &&
      finding.classification !== "ambiguous"
    ) {
      const key = JSON.stringify([finding.app.id, finding.reference.id]);
      const result =
        finding.classification === "equal"
          ? "equal"
          : ["value-difference", "structure-difference"].includes(
                finding.classification,
              )
            ? "different"
            : "notCompared";
      if (!pairs.has(key) || result !== "notCompared")
        pairs.set(key, {
          app: finding.app,
          reference: finding.reference,
          result,
        });
    }
  const group = (
    id: string,
    label: string,
    left: AnalysisRecord[],
    right: AnalysisRecord[],
    allowMissing = true,
  ): CoverageGroup => {
    const rightIds = new Set(right.map((record) => record.id)),
      leftIds = new Set(left.map((record) => record.id));
    const confirmed = [...pairs.values()].filter(
      (pair) => rightIds.has(pair.reference.id) && leftIds.has(pair.app.id),
    );
    const counts = (unit: CoverageUnit): CoverageCounts => {
      const native = new Set(left.map((record) => tokenKey(record, unit))),
        upstream = new Set(right.map((record) => tokenKey(record, unit)));
      const represented = new Set(
        confirmed.map((pair) => tokenKey(pair.reference, unit)),
      ).size;
      const appPaired = new Set(
        confirmed.map((pair) => tokenKey(pair.app, unit)),
      ).size;
      const missing =
        allowMissing && inventories.app === "complete" && native.size === 0
          ? upstream.size
          : 0;
      const unknown = upstream.size - represented - missing;
      return {
        app: native.size,
        reference: upstream.size,
        represented,
        missing,
        unknown,
        appOnly: native.size - appPaired,
        percent: percentage(represented, upstream.size),
        missingPercent: percentage(missing, upstream.size),
        unknownPercent: percentage(unknown, upstream.size),
      };
    };
    return {
      id,
      label,
      counts: { concepts: counts("concepts"), rows: counts("rows") },
      appRecordIds: [...leftIds].sort(),
      referenceRecordIds: [...rightIds].sort(),
      explanation:
        left.length === 0
          ? inventories.app === "complete"
            ? "No app dataset records in this category. This may be intentional scope, not a requirement to add them."
            : "App input is incomplete; absence cannot be confirmed."
          : right.length === 0
            ? "App data exists, but this reference inventory has no corresponding category. That is not proof of missing schema support."
            : "Confirmed counterparts use reviewed mappings or exact identities. Other records are not matched yet; different names alone do not prove they are missing.",
    };
  };
  const categoryKeys = [
    ...new Set(
      [...appRecords, ...referenceRecords, ...app.records, ...reference.records]
        .map(coverageCategory)
        .concat(
          [...app.categories, ...reference.categories].map((key) =>
            key.replace(/^authoring\//, ""),
          ),
        ),
    ),
  ]
    .filter((key) => key !== "input")
    .sort();
  const categories = categoryKeys.map((key) =>
    group(
      `category:${key}`,
      categoryLabels[key] ?? key.replaceAll("-", " "),
      appRecords.filter((record) => coverageCategory(record) === key),
      referenceRecords.filter((record) => coverageCategory(record) === key),
    ),
  );
  const leftTokens = appRecords.filter(
      (record) => record.category === "tokens",
    ),
    rightTokens = referenceRecords.filter(
      (record) => record.category === "tokens",
    );
  const tokenTypes = Object.entries(typeLabels).map(([key, label]) =>
    group(
      `type:${key}`,
      label,
      leftTokens.filter((record) => coverageTokenType(record) === key),
      rightTokens.filter((record) => coverageTokenType(record) === key),
      key !== "other",
    ),
  );
  const allTokens = group("all-tokens", "All tokens", leftTokens, rightTokens);
  for (const unit of ["concepts", "rows"] as const) {
    const absentIds = new Set(
      tokenTypes
        .filter((item) => item.counts[unit].missing > 0)
        .flatMap((item) => item.referenceRecordIds),
    );
    const representedKeys = new Set(
      [...pairs.values()]
        .filter(
          (pair) =>
            pair.reference.category === "tokens" &&
            pair.app.category === "tokens",
        )
        .map((pair) => tokenKey(pair.reference, unit)),
    );
    const missingKeys = new Set(
      rightTokens
        .filter((record) => absentIds.has(record.id))
        .map((record) => tokenKey(record, unit))
        .filter(
          (key) =>
            !representedKeys.has(key) &&
            rightTokens
              .filter((record) => tokenKey(record, unit) === key)
              .every((record) => absentIds.has(record.id)),
        ),
    );
    const count = allTokens.counts[unit];
    count.missing = missingKeys.size;
    count.unknown = count.reference - count.represented - count.missing;
    count.missingPercent = percentage(count.missing, count.reference);
    count.unknownPercent = percentage(count.unknown, count.reference);
  }
  const colorTypes = new Set(["primitive-color", "semantic-color"]);
  const colors = group(
    "type:color",
    "All color tokens",
    leftTokens.filter((record) => colorTypes.has(coverageTokenType(record))),
    rightTokens.filter((record) => colorTypes.has(coverageTokenType(record))),
  );
  for (const unit of ["concepts", "rows"] as const) {
    const missingIds = new Set(
      tokenTypes
        .filter(
          (item) =>
            colorTypes.has(item.id.replace("type:", "")) &&
            item.counts[unit].missing > 0,
        )
        .flatMap((item) => item.referenceRecordIds),
    );
    const colorRows = rightTokens.filter((record) =>
      colors.referenceRecordIds.includes(record.id),
    );
    const missing = new Set(
      colorRows
        .filter((record) => missingIds.has(record.id))
        .map((record) => tokenKey(record, unit))
        .filter((key) =>
          colorRows
            .filter((record) => tokenKey(record, unit) === key)
            .every((record) => missingIds.has(record.id)),
        ),
    ).size;
    colors.counts[unit].missing = missing;
    colors.counts[unit].unknown =
      colors.counts[unit].reference - colors.counts[unit].represented - missing;
    colors.counts[unit].missingPercent = percentage(
      missing,
      colors.counts[unit].reference,
    );
    colors.counts[unit].unknownPercent = percentage(
      colors.counts[unit].unknown,
      colors.counts[unit].reference,
    );
  }
  tokenTypes.unshift(colors);
  const tokenCategory = categories.find(
    (item) => item.id === "category:tokens",
  );
  if (tokenCategory) tokenCategory.counts = allTokens.counts;
  const values = [...pairs.values()].filter(
    (pair) =>
      pair.app.category === "tokens" && pair.reference.category === "tokens",
  );
  const equal = values.filter((pair) => pair.result === "equal").length,
    different = values.filter((pair) => pair.result === "different").length;
  return {
    schemaVersion: 1,
    inventories,
    identityFallbackRows: {
      app: leftTokens.filter((record) => !record.conceptId).length,
      reference: rightTokens.filter((record) => !record.conceptId).length,
    },
    allTokens,
    categories,
    tokenTypes,
    values: {
      equal,
      different,
      notCompared: values.length - equal - different,
      agreementPercent: percentage(equal, equal + different),
    },
    schemas: {
      app: [...app.schemas].sort(),
      reference: [...reference.schemas].sort(),
      compatibilityPercent: null,
      explanation:
        "Schema counts are not compatibility percentages. A complete schema-to-model requirements checklist has not been evaluated; data absence, shape differences and missing authoring schemas must be considered separately.",
    },
    limitations: [
      "Coverage is relative to this reference snapshot, not a health score or a mandate to reproduce its values.",
      "The concept lens deduplicates explicit concept IDs, falling back to UUID/record identity for rows without a concept ID. These totals are not canonical concept counts; mode collapse is unknown for fallback rows. Rows include contexts and app evaluation samples.",
      "Unknown/unmatched data is not classified as missing. Absence concerns the selected exported inventory, not every possible app authoring capability. App-only means no confirmed counterpart, not proof the reference lacks equivalent data.",
      "Token-family grouping uses declared properties and native foundation provenance, including recognized legacy font-size/line-height properties. It creates no matches; unclassified tokens remain visible.",
      "Partial inventories count observed records only. SDK validity and byte-matched curated reviews are separate from data coverage.",
    ],
  };
}
export function coverageMarkdown(summary: CoverageSummary): string {
  const text = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "## Data coverage overview",
    "",
    "Confirmed counterparts / design-data inventory. Unknown is not missing; values may intentionally differ.",
    "",
    "| Category / token family | App concepts or records | Reference concepts or records | Confirmed counterparts | Confirmed coverage | Missing app data | Not matched yet |",
    "| --- | ---: | ---: | ---: | --- | ---: | ---: |",
    ...[
      summary.allTokens,
      ...summary.categories.filter((item) => item.id !== "category:tokens"),
      ...summary.tokenTypes,
    ].map((item) => {
      const count = item.counts.concepts;
      return `| ${text(item.label)} | ${count.app} | ${count.reference} | ${count.represented} | ${count.percent === null ? "No reference denominator" : `${count.percent}%`} | ${count.missing} | ${count.unknown} |`;
    }),
    "",
    `Comparable token pairs: ${summary.values.equal} equal, ${summary.values.different} different, ${summary.values.notCompared} not value-compared.`,
    "",
    summary.schemas.explanation,
    "",
    ...summary.limitations.map((item) => `- ${text(item)}`),
    "",
  ].join("\n");
}
