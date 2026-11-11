// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import { ruleAppliesToReference } from "../logic/applicability";
import type { Rule } from "../logic/model";
import { resolveTshirtRule, tshirtMappings } from "../logic/tshirt";
import type { PrimitiveReference } from "../tokens/primitiveReferences";
import {
  structureGeneration,
  type Structure,
  type StructureRuleApplication,
} from "./model";
import {
  ELEMENT_SLOT_LABELS,
  ELEMENT_TYPES,
  elementReferenceAllowed,
  type ElementBinding,
  type StructureElement,
} from "./elements";
import { STRUCTURE_TERM_IDS } from "./vocabulary";
import { leafElements } from "./children";
import {
  resolveTextStyleAppearance,
  type TextStyleSource,
} from "../styles/textAppearance";

export function templateTargets(application: StructureRuleApplication) {
  return (
    application.previewTargets ??
    (application.targets.kind === "all"
      ? { kind: "all" as const }
      : { kind: "custom" as const, bindingIds: [] })
  );
}
type ElementReferenceBinding = Extract<ElementBinding, { $ref: string }>;
export function hasCustomElementTargets(
  structure: Structure,
  elementId: string,
) {
  const element = leafElements(structure).find((item) => item.id === elementId);
  if (!element) return false;
  const ids = new Set(element.bindings.map((binding) => binding.id));
  return structureGeneration(structure).applications.some((application) => {
    const targets = templateTargets(application);
    return (
      targets.kind === "custom" && targets.bindingIds.some((id) => ids.has(id))
    );
  });
}
export function appliedElementBindings(
  structure: Structure,
  rules: readonly Rule[],
  references: readonly Pick<
    PrimitiveReference,
    "id" | "family" | "metricId" | "unit"
  >[] = [],
) {
  const bindings = leafElements(structure).flatMap((element) =>
    element.bindings.map((binding) => ({ element, binding })),
  );
  const claimed = new Set<string>();
  return structureGeneration(structure).applications.flatMap((application) => {
    const rule = resolveTshirtRule(rules, application.ruleId);
    const targets = templateTargets(application);
    const selected =
      targets.kind === "all"
        ? bindings
        : targets.bindingIds.map((id) => {
            const found = bindings.find((item) => item.binding.id === id);
            if (!found)
              throw new Error(
                "An element preview target is no longer token-backed. Restore its binding or edit the rule selection.",
              );
            return found;
          });
    return selected
      .filter(
        (
          item,
        ): item is {
          element: StructureElement;
          binding: ElementReferenceBinding;
        } => {
          if (!("$ref" in item.binding)) return false;
          const reference = references.find(
            (reference) => reference.id === item.binding.$ref,
          );
          if (reference) return ruleAppliesToReference(rule, reference);
          return item.binding.family === "size"
            ? ruleAppliesToReference(rule, { family: "size" })
            : !rule.applicability || rule.applicability.kind === "all";
        },
      )
      .map((item) => {
        if (claimed.has(item.binding.id))
          throw new Error(
            "Element preview rules overlap. Choose disjoint preview properties.",
          );
        claimed.add(item.binding.id);
        return { ...item, application, rule };
      });
  });
}
export interface ResolvedElement {
  element: StructureElement;
  styles: CSSProperties;
  issues: string[];
  warnings: string[];
  targets: { binding: ElementBinding; reference: PrimitiveReference }[];
}
export function resolveElements(
  structure: Structure,
  references: readonly PrimitiveReference[],
  rules: readonly Rule[],
  size: string = "m",
  textStyles?: TextStyleSource,
): ResolvedElement[] {
  let applied: ReturnType<typeof appliedElementBindings> = [];
  let applicationError = "";
  try {
    applied = appliedElementBindings(structure, rules, references);
  } catch (failure) {
    applicationError =
      failure instanceof Error ? failure.message : String(failure);
  }
  return leafElements(structure).map((element) => {
    const styles: CSSProperties = { flexShrink: 0 };
    const issues: string[] = applicationError ? [applicationError] : [],
      warnings: string[] = [];
    const targets: ResolvedElement["targets"] = [];
    if (element.kind === "text") {
      styles.fontSize = 16;
      styles.lineHeight = 1.5;
    } else if (element.kind === "bar") {
      styles.width =
        element.orientation === STRUCTURE_TERM_IDS.vertical ? 2 : 64;
      styles.height =
        element.orientation === STRUCTURE_TERM_IDS.vertical ? 64 : 2;
    } else {
      styles.width =
        element.kind === "visual" ? 64 : element.kind === "slot" ? 96 : 20;
      styles.height = element.kind === "slot" ? 24 : styles.width;
    }
    for (const binding of element.bindings) {
      if (element.textStyle && binding.slot === "lineHeight") continue;
      try {
        if (!("$ref" in binding)) {
          const value = binding.value.value;
          if (
            !Number.isFinite(value) ||
            value < 0 ||
            !["px", "multiplier"].includes(binding.value.unit)
          )
            throw new Error("Choose a finite, non-negative value.");
          if (binding.slot === "size") {
            styles.width = value;
            styles.height = value;
          } else if (binding.slot === "lineHeight")
            styles.lineHeight =
              binding.value.unit === "multiplier" ? value : `${value}px`;
          else if (binding.slot === "length")
            styles[
              element.orientation === STRUCTURE_TERM_IDS.vertical
                ? "height"
                : "width"
            ] = value;
          else if (binding.slot === "thickness")
            styles[
              element.orientation === STRUCTURE_TERM_IDS.vertical
                ? "width"
                : "height"
            ] = value;
          else styles[binding.slot] = value;
          continue;
        }
        const anchor = references.find((item) => item.id === binding.$ref);
        if (
          !anchor ||
          !elementReferenceAllowed(binding.slot, anchor) ||
          anchor.error
        )
          throw new Error(
            anchor?.error ??
              "The linked source is unavailable or incompatible.",
          );
        const application = applied.find(
          (item) => item.binding.id === binding.id,
        );
        const mapping = application
          ? tshirtMappings(application.rule, anchor, references, [size], {
              rules,
            })[0]
          : undefined;
        const reference = mapping?.target ?? anchor;
        if (
          typeof reference.value !== "number" ||
          !Number.isFinite(reference.value) ||
          reference.value < 0
        )
          throw new Error("Choose a finite, non-negative source value.");
        targets.push({ binding, reference });
        if (mapping?.warning) warnings.push(mapping.warning);
        if (binding.slot === "size") {
          styles.width = reference.value;
          styles.height = reference.value;
        } else if (binding.slot === "lineHeight")
          styles.lineHeight =
            reference.unit === "multiplier"
              ? reference.value
              : `${reference.value}px`;
        else if (binding.slot === "length")
          styles[
            element.orientation === STRUCTURE_TERM_IDS.vertical
              ? "height"
              : "width"
          ] = reference.value;
        else if (binding.slot === "thickness")
          styles[
            element.orientation === STRUCTURE_TERM_IDS.vertical
              ? "width"
              : "height"
          ] = reference.value;
        else styles[binding.slot] = reference.value;
      } catch (failure) {
        issues.push(
          `${ELEMENT_TYPES[element.kind].label} ${ELEMENT_SLOT_LABELS[binding.slot]}: ${failure instanceof Error ? failure.message : String(failure)}`,
        );
      }
    }
    if (element.textStyle) {
      delete styles.lineHeight;
      if (!textStyles) {
        issues.push("Text Style appearance is unavailable.");
      } else {
        const font = targets.find(
          (target) => target.binding.slot === "fontSize",
        );
        const resolved = resolveTextStyleAppearance(
          element.textStyle,
          textStyles,
          font?.reference.step,
        );
        Object.assign(styles, resolved.appearance);
        issues.push(...resolved.issues);
      }
    }
    for (const [minimum, maximum] of [
      ["minWidth", "maxWidth"],
      ["minHeight", "maxHeight"],
    ] as const) {
      const min = styles[minimum],
        max = styles[maximum];
      if (typeof min === "number" && typeof max === "number" && min > max)
        issues.push(
          `${ELEMENT_TYPES[element.kind].label}: ${ELEMENT_SLOT_LABELS[minimum]} must not exceed ${ELEMENT_SLOT_LABELS[maximum].toLowerCase()}.`,
        );
    }
    return { element, styles, issues, warnings, targets };
  });
}
