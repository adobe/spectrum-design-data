// Copyright 2026 Adobe. All rights reserved.
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import type { ScaleType } from "../scales/scaleType";
import {
  isRoundingRule,
  isRule,
  isTshirtRule,
  type Rule,
  type TshirtSizingRule,
} from "./model";
import { applyRoundingRule } from "./evaluate";
import { generatorSizeKey, generatorTermId } from "./generator";
import { ruleAppliesToReference } from "./applicability";

export interface TshirtVariantMapping {
  size: string;
  termId: string;
  offset: number;
  requested: number;
  actual: number;
  target: PrimitiveReference;
  warning?: string;
}

export function resolveTshirtRule(
  rules: readonly import("./model").Rule[],
  id: string,
): TshirtSizingRule {
  const rule = rules.find((item) => item.id === id);
  if (!rule || !isTshirtRule(rule) || !isRule(rule))
    throw new Error(
      "The attached T-shirt rule is unavailable or incompatible. Choose a valid generation rule.",
    );
  return rule;
}

export interface TshirtMappingContext {
  scaleTypes?: readonly ScaleType[];
  rules?: readonly Rule[];
  componentSize?: number;
}

function componentMultiplier(
  rule: TshirtSizingRule,
  anchor: PrimitiveReference,
  context: TshirtMappingContext,
) {
  return ruleAppliesToReference(rule, anchor) &&
    !anchor.componentSizeApplied &&
    (anchor.family === "spacing" ||
      (anchor.synthetic &&
        (anchor.family === "size" || anchor.family === "radius"))) &&
    anchor.unit !== "multiplier"
    ? (context.componentSize ?? 1)
    : 1;
}

/** The multiplier a "ratio" rule applies per step, read from its typed value or linked formula part. */
export function tshirtRatio(
  rule: TshirtSizingRule,
  scaleTypes: readonly ScaleType[] = [],
): number {
  const source = rule.ratio;
  if (rule.movement !== "ratio" || !source)
    throw new Error("Only a Multiply by ratio rule has a ratio.");
  const value =
    source.kind === "value"
      ? source.value
      : scaleTypes
          .find((type) => type.id === source.scaleTypeId)
          ?.parameters.find((parameter) => parameter.id === source.parameterId)
          ?.default;
  if (value === undefined)
    throw new Error(
      `${rule.name}: the linked ratio is unavailable. Link another formula part or type a ratio.`,
    );
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${rule.name}: the ratio must be a positive number.`);
  return value;
}

function ratioMappings(
  rule: TshirtSizingRule,
  anchor: PrimitiveReference,
  references: readonly PrimitiveReference[],
  sizes: readonly string[],
  context: TshirtMappingContext,
): TshirtVariantMapping[] {
  if (
    anchor.error ||
    typeof anchor.value !== "number" ||
    !Number.isFinite(anchor.value) ||
    anchor.value < 0
  )
    throw new Error(
      anchor.error ??
        "The Medium value must be a finite, non-negative number to multiply by a ratio.",
    );
  const ratio = tshirtRatio(rule, context.scaleTypes);
  const rounding = rule.roundingRuleId
    ? context.rules?.find((item) => item.id === rule.roundingRuleId)
    : undefined;
  if (rule.roundingRuleId && (!rounding || !isRoundingRule(rounding)))
    throw new Error(
      `${rule.name}: the rounding rule is unavailable. Choose another rounding rule.`,
    );
  const base = anchor.value;
  const multiplier = componentMultiplier(rule, anchor, context);
  const unit = anchor.unit ?? "px";
  return rule.mappings
    .filter((mapping) => sizes.includes(generatorSizeKey(mapping.termId)))
    .map((option) => {
      const size = generatorSizeKey(option.termId);
      const offset = ruleAppliesToReference(rule, anchor) ? option.offset : 0;
      const raw = base * ratio ** offset * multiplier;
      const value =
        rounding && isRoundingRule(rounding)
          ? applyRoundingRule(rounding, raw)
          : raw;
      const match =
        offset === 0 && multiplier === 1
          ? anchor
          : [...references]
              .filter(
                (item) =>
                  item.family === anchor.family &&
                  !item.hidden &&
                  !item.error &&
                  item.value === value,
              )
              .sort(
                (left, right) =>
                  Number(right.sourceId === anchor.sourceId) -
                  Number(left.sourceId === anchor.sourceId),
              )[0];
      const target: PrimitiveReference = match ?? {
        ...anchor,
        id: `${anchor.id}:ratio:${offset}`,
        name: `${value}${unit === "px" ? "px" : ""}`,
        value,
        displayValue: unit === "px" ? `${value}px` : String(value),
        hidden: true,
        synthetic: true,
      };
      return {
        size,
        termId: option.termId,
        offset,
        requested: offset,
        actual: offset,
        target,
      };
    });
}

export function tshirtMappings(
  rule: TshirtSizingRule,
  anchor: PrimitiveReference,
  references: readonly PrimitiveReference[],
  sizes: readonly string[],
  context: TshirtMappingContext = {},
): TshirtVariantMapping[] {
  if (!isRule(rule))
    throw new Error(
      "Use distinct options with integer offsets and one zero-offset default.",
    );
  if (
    !sizes.length ||
    new Set(sizes).size !== sizes.length ||
    sizes.some(
      (size) =>
        !rule.mappings.some(
          (option) => option.termId === generatorTermId(size),
        ),
    )
  ) {
    throw new Error("Choose supported, distinct T-shirt sizes.");
  }
  if (rule.movement === "ratio")
    return ratioMappings(rule, anchor, references, sizes, context);
  const available = references
    .filter(
      (item) =>
        item.family === anchor.family && item.sourceId === anchor.sourceId,
    )
    .sort((left, right) => left.index - right.index);
  if (!available.some((item) => item.id === anchor.id) || anchor.error)
    throw new Error(
      anchor.error ??
        "The Medium anchor is unavailable. Repair its source reference.",
    );
  if (
    !available.length ||
    available.some(
      (item) =>
        !Number.isSafeInteger(item.index) ||
        !Number.isSafeInteger(item.step) ||
        item.error ||
        (item.family !== "elevation" &&
          (typeof item.value !== "number" ||
            !Number.isFinite(item.value) ||
            item.value < 0)),
    )
  ) {
    throw new Error(
      "The source contains unavailable indices or invalid values. Repair the foundation before generating sizes.",
    );
  }
  if (
    new Set(available.map((item) => item.index)).size !== available.length ||
    new Set(available.map((item) => item.step)).size !== available.length ||
    new Set(available.map((item) => item.id)).size !== available.length
  )
    throw new Error("The source has ambiguous token indices or identities.");
  const anchorPosition = available.findIndex((item) => item.id === anchor.id);
  return rule.mappings
    .filter((mapping) => sizes.includes(generatorSizeKey(mapping.termId)))
    .map((option) => {
      const termId = option.termId;
      const size = generatorSizeKey(termId);
      const offset = ruleAppliesToReference(rule, anchor) ? option.offset : 0;
      const requested =
        (rule.movement === "available-token" ? anchorPosition : anchor.step!) +
        offset;
      if (!Number.isSafeInteger(requested))
        throw new Error(
          "The requested scale index exceeds the supported integer range.",
        );
      let target: PrimitiveReference;
      let actual: number;
      if (rule.movement === "available-token") {
        actual = Math.min(available.length - 1, Math.max(0, requested));
        target = available[actual];
      } else {
        target = available.reduce((closest, candidate) => {
          const distance = Math.abs(candidate.step! - requested),
            previous = Math.abs(closest.step! - requested);
          return distance < previous ||
            (distance === previous &&
              (offset < 0
                ? candidate.step! < closest.step!
                : candidate.step! > closest.step!))
            ? candidate
            : closest;
        }, anchor);
        actual = target.step!;
      }
      const multiplier = componentMultiplier(rule, anchor, context);
      if (multiplier !== 1 && typeof target.value === "number") {
        const value = target.value * multiplier;
        target = {
          ...target,
          id: `${target.id}:component-size:${multiplier}`,
          value,
          name: `${value}px`,
          displayValue: `${value}px`,
          hidden: true,
          synthetic: true,
        };
      }
      return {
        size,
        termId,
        offset,
        requested,
        actual,
        target,
        ...(actual !== requested && {
          warning: `${size}: requested ${rule.movement === "available-token" ? "token position" : "scale index"} ${requested}; using ${target.name} (scale index ${target.step}). Nearest available token.`,
        }),
      };
    });
}
