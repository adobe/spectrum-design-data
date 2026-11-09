// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisRecord } from "./comparison";
import { canonicalJson } from "./canonicalJson";
import { exactPaletteColor } from "./paletteAssessment";
import { assertShadowValue } from "./shadowValue";
import type { TokenShadowLayer } from "../tokens/browserEditTypes";

export type FoundationValueType =
  | "color"
  | "opacity"
  | "typography"
  | "spacing"
  | "size"
  | "radius"
  | "elevation"
  | "motion";

const properties: Record<FoundationValueType, readonly string[]> = {
  color: [
    "color",
    "background-color",
    "border-color",
    "fill-color",
    "icon-color",
    "content-color",
    "visual-color",
    "shadow-color",
    "key-color",
    "overlay-color",
    "outline-color",
    "square-dark",
    "square-light",
  ],
  opacity: ["opacity", "border-opacity", "overlay-opacity"],
  typography: [
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "line-height",
    "unitless-line-height",
    "line-height-multiplier",
    "letter-spacing",
    "paragraph-spacing",
    "text-size",
    "icon-size",
    "typography",
    "text-align",
    "text-transform",
    "margin-multiplier",
    "margin-top-multiplier",
    "margin-bottom-multiplier",
  ],
  spacing: [
    "spacing",
    "gap",
    "padding",
    "padding-horizontal",
    "padding-vertical",
    "margin",
    "margin-top",
    "margin-bottom",
    "space-between",
    "indent",
  ],
  size: [
    "size",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "minimum-width",
    "maximum-width",
    "default-width",
    "minimum-height",
    "border-width",
    "outline-width",
    "length",
    "thickness",
    "width-multiplier",
    "minimum-width-multiplier",
    "maximum-width-multiplier",
  ],
  radius: ["corner-radius", "radius", "rounding-increment"],
  elevation: ["shadow", "drop-shadow", "box-shadow", "elevation"],
  motion: ["duration", "delay", "easing", "easing-function", "cubic-bezier"],
};

export function foundationProperty(row: AnalysisRecord): string {
  const name = row.structuredName ?? row.taxonomy?.flat;
  const property = String(name?.property ?? "");
  if (
    /^font-size-\d+$/.test(property) ||
    (row.tokenType === "typography" &&
      name?.element === "text" &&
      property === "size")
  )
    return "font-size";
  if (/^line-height-\d+$/.test(property)) return "line-height-multiplier";
  return property;
}

export function fontSizeStep(row: AnalysisRecord): number | undefined {
  if (foundationProperty(row) !== "font-size") return;
  const step = row.structuredName?.scaleIndex ?? row.taxonomy?.flat.scaleIndex;
  const index =
    typeof step === "number" && Number.isFinite(step)
      ? step
      : typeof step === "string" && /^\d+$/.test(step)
        ? Number(step)
        : undefined;
  const property = row.structuredName?.property ?? row.taxonomy?.flat.property;
  const indexed =
    typeof property === "string" ? /^font-size-(\d+)$/.exec(property) : null;
  return indexed && Number(indexed[1]) !== index ? undefined : index;
}

export function foundationValueType(
  row: AnalysisRecord,
): FoundationValueType | undefined {
  if (row.tokenType)
    return row.tokenType === "colors" ? "color" : row.tokenType;
  const property = foundationProperty(row);
  const declared = (Object.keys(properties) as FoundationValueType[]).find(
    (type) => properties[type].includes(String(property)),
  );
  if (declared) return declared;
  const schema = row.schema
    ?.split("/")
    .at(-1)
    ?.replace(/\.json$/, "");
  return (Object.keys(properties) as FoundationValueType[]).find((type) =>
    properties[type].includes(schema ?? ""),
  );
}

export interface ScalarValue {
  value: number;
  unit: string;
}

export function scalarValue(
  value: unknown,
  unit = "",
): ScalarValue | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? { value, unit } : undefined;
  if (typeof value !== "string") return;
  const match =
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(px|pt|rem|em|ms|s|%|deg)?$/i.exec(
      value.trim(),
    );
  if (!match) return;
  const number = Number(match[1]);
  if (!Number.isFinite(number) || (unit && match[2] && unit !== match[2]))
    return;
  return { value: number, unit: match[2] ?? unit };
}

export function comparableScalars(
  app: unknown,
  reference: unknown,
  appUnit = "",
  referenceUnit = "",
): { app: number; reference: number; unit: string } | undefined {
  const a = scalarValue(app, appUnit);
  const b = scalarValue(reference, referenceUnit);
  if (!a || !b) return;
  if (a.unit === b.unit)
    return { app: a.value, reference: b.value, unit: a.unit };
  const absolute: Record<string, { factor: number; unit: string }> = {
    px: { factor: 1, unit: "px" },
    pt: { factor: 4 / 3, unit: "px" },
    ms: { factor: 1, unit: "ms" },
    s: { factor: 1000, unit: "ms" },
  };
  const left = absolute[a.unit],
    right = absolute[b.unit];
  if (!left || !right || left.unit !== right.unit) return;
  return {
    app: a.value * left.factor,
    reference: b.value * right.factor,
    unit: left.unit,
  };
}

export function shadowLayers(value: unknown): TokenShadowLayer[] {
  assertShadowValue(value);
  return value;
}

export function compareFoundationValue(
  type: FoundationValueType,
  app: unknown,
  reference: unknown,
  appUnit?: string,
  referenceUnit?: string,
  property?: string,
): {
  verdict: "pass" | "fail" | "unassessable";
  difference?: ScalarValue;
  issue?: string;
} {
  if (type === "motion")
    return {
      verdict: "unassessable",
      issue: "Motion generation is not available in Studio.",
    };
  if (type === "elevation") {
    try {
      const a = shadowLayers(app),
        b = shadowLayers(reference);
      const equal =
        a.length === b.length &&
        a.every((layer, index) => {
          const other = b[index];
          return (
            (["x", "y", "blur", "spread"] as const).every((key) => {
              const values = comparableScalars(layer[key], other[key]);
              return values && values.app === values.reference;
            }) &&
            exactPaletteColor(layer.color, other.color).valueAlignment ===
              "exact"
          );
        });
      return { verdict: equal ? "pass" : "fail" };
    } catch (error) {
      return {
        verdict: "unassessable",
        issue: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const values = comparableScalars(app, reference, appUnit, referenceUnit);
  if (values)
    return {
      verdict: values.app === values.reference ? "pass" : "fail",
      difference: { value: values.app - values.reference, unit: values.unit },
    };
  if (
    type === "typography" &&
    typeof app === "string" &&
    typeof reference === "string" &&
    [
      "font-family",
      "font-style",
      "text-align",
      "text-transform",
      "font-weight",
    ].includes(property ?? "") &&
    app.trim() &&
    reference.trim() &&
    !scalarValue(app, appUnit) &&
    !scalarValue(reference, referenceUnit) &&
    !appUnit &&
    !referenceUnit
  ) {
    return {
      verdict:
        canonicalJson(app) === canonicalJson(reference) ? "pass" : "fail",
    };
  }
  return {
    verdict: "unassessable",
    issue:
      "Values need compatible types and units. Relative units require the same unit or explicit conversion context.",
  };
}

export function differenceText(row: {
  deltaE2000?: number;
  difference?: ScalarValue;
  verdict?: string;
}): string {
  if (row.deltaE2000 !== undefined)
    return `ΔE ${Number(row.deltaE2000.toPrecision(8))}`;
  if (!row.difference)
    return row.verdict === "unassessable" ? "Unavailable" : "Not applicable";
  const { value, unit } = row.difference;
  const number = Object.is(value, -0) ? 0 : value;
  return `${number > 0 ? "+" : ""}${Number(number.toPrecision(8))}${unit}`;
}
