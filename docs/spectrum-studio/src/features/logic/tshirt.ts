// Copyright 2026 Adobe. All rights reserved.
import {
  COMPONENT_SIZES,
  type ComponentSize,
} from "../foundations/componentSizes";
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import { isRule, type TshirtSizingRule } from "./model";

export interface TshirtVariantMapping {
  size: ComponentSize;
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
  if (!rule || rule.type !== "tshirt-sizing" || !isRule(rule))
    throw new Error(
      "The attached T-shirt rule is unavailable or incompatible. Choose a valid generation rule.",
    );
  return rule;
}

export function tshirtMappings(
  rule: TshirtSizingRule,
  anchor: PrimitiveReference,
  references: readonly PrimitiveReference[],
  sizes: readonly ComponentSize[],
): TshirtVariantMapping[] {
  if (!isRule(rule))
    throw new Error(
      "Use five finite integer offsets and a fixed Medium offset of zero.",
    );
  if (
    !sizes.length ||
    new Set(sizes).size !== sizes.length ||
    sizes.some((size) => !COMPONENT_SIZES.some((option) => option.id === size))
  ) {
    throw new Error("Choose supported, distinct T-shirt sizes.");
  }
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
  return COMPONENT_SIZES.filter((size) => sizes.includes(size.id)).map(
    (size) => {
      const termId = SIZE_TERM_IDS[size.id];
      const offset = rule.mappings.find(
        (mapping) => mapping.termId === termId,
      )!.offset;
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
      return {
        size: size.id,
        termId,
        offset,
        requested,
        actual,
        target,
        ...(actual !== requested && {
          warning: `${size.label}: requested ${rule.movement === "available-token" ? "token position" : "scale index"} ${requested}; using ${target.name} (scale index ${target.step}). Nearest available token.`,
        }),
      };
    },
  );
}
