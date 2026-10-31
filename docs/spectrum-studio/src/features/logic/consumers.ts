// Copyright 2026 Adobe. All rights reserved.
import type { GeneratedSpacingValue, SpacingDocument } from "../spacing/model";
import {
  generateSpacingScale,
  spacingScaleIssues,
  type SpacingScaleIssue,
} from "../spacing/generate";
import type { SizeDocument } from "../size/model";
import { generateSizeScale } from "../size/generate";
import type { RadiusDocument } from "../radius/model";
import { generateRadiusScale } from "../radius/generate";
import { dimensionIssues } from "../scales/issues";
import type { TypographyDocument } from "../typography/model";
import { generateTypography } from "../typography/typographyGeneration";
import type { ScaleType } from "../scales/scaleType";
import type { Interpolation } from "../scales/interpolationDefinition";
import { isTshirtRule, type Rule } from "./model";
import type { StructuresDocument } from "../structures/model";
import { structureGeneration } from "../structures/model";
import type { EditSessionSnapshot } from "../edit-session/state";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { canonicalJson } from "../design-data/canonicalJson";
import type { ColorSystemDocument } from "../color-system/model";
import { contrastStepIndex } from "../color-system/contrastSteps";
import {
  ruleAppliesTo,
  ruleAppliesToReference,
  type RuleValueType,
} from "./applicability";

export type RuleConsumerSlot =
  | {
      foundation: "typography";
      field: "textRoundingRuleId" | "lineHeightRoundingRuleId";
    }
  | { foundation: "spacing"; scaleId: string }
  | { foundation: "size"; scaleId: string }
  | { foundation: "radius"; scaleId: string }
  | { foundation: "color"; scaleId: string }
  | { foundation: "structures"; structureId: string; applicationId: string };

export interface RuleConsumer {
  id: string;
  ruleId: string;
  label: string;
  slot: RuleConsumerSlot;
}

export interface RuleReferenceDocuments {
  typography: TypographyDocument;
  spacing: SpacingDocument;
  /** Optional so callers that predate the Size foundation stay valid. */
  size?: SizeDocument;
  radius?: RadiusDocument;
  /** Library used to generate spacing; shipped scale types when omitted. */
  scaleTypes?: readonly ScaleType[];
  /** Library used for line heights; shipped interpolations when omitted. */
  interpolations?: readonly Interpolation[];
  structures?: StructuresDocument;
  snapshot?: EditSessionSnapshot;
  draftSnapshot?: EditSessionSnapshot;
  color?: ColorSystemDocument;
}

/** Every place a foundation references a rule; the single source for "Used by" and deletion fallback. */
export function ruleConsumers({
  typography,
  spacing,
  size,
  radius,
  structures,
  color,
}: RuleReferenceDocuments): RuleConsumer[] {
  return [
    ...(color?.scales ?? []).flatMap((scale): RuleConsumer[] =>
      scale.customContrasts
        ? [
            {
              id: `color/${scale.id}`,
              ruleId: scale.customContrasts.namingRuleId,
              label: `Colors › ${scale.name}`,
              slot: { foundation: "color", scaleId: scale.id },
            },
          ]
        : [],
    ),
    {
      id: "typography/text-size",
      ruleId: typography.textRoundingRuleId,
      label: "Typography › Text size",
      slot: { foundation: "typography", field: "textRoundingRuleId" },
    },
    {
      id: "typography/line-height",
      ruleId: typography.lineHeightRoundingRuleId,
      label: "Typography › Line heights",
      slot: { foundation: "typography", field: "lineHeightRoundingRuleId" },
    },
    ...spacing.scales.map(
      (scale): RuleConsumer => ({
        id: `spacing/${scale.id}`,
        ruleId: scale.roundingRuleId,
        label: `Spacing › ${scale.name}`,
        slot: { foundation: "spacing", scaleId: scale.id },
      }),
    ),
    ...(size?.scales ?? []).map(
      (scale): RuleConsumer => ({
        id: `size/${scale.id}`,
        ruleId: scale.roundingRuleId,
        label: `Size › ${scale.name}`,
        slot: { foundation: "size", scaleId: scale.id },
      }),
    ),
    ...(radius?.scales ?? []).map(
      (scale): RuleConsumer => ({
        id: `radius/${scale.id}`,
        ruleId: scale.roundingRuleId,
        label: `Radius › ${scale.name}`,
        slot: { foundation: "radius", scaleId: scale.id },
      }),
    ),
    ...(structures?.structures ?? []).flatMap((structure) =>
      structureGeneration(structure).applications.map(
        (application): RuleConsumer => ({
          id: `structures/${structure.conceptId}/${application.id}`,
          ruleId: application.ruleId,
          label: `Structures › ${structure.name} (${application.targets.kind === "all" ? "All token-backed properties" : `${application.targets.bindingIds.length} properties`})`,
          slot: {
            foundation: "structures",
            structureId: structure.conceptId,
            applicationId: application.id,
          },
        }),
      ),
    ),
  ];
}

export function consumersOf(ruleId: string, documents: RuleReferenceDocuments) {
  return ruleConsumers(documents).filter(
    (consumer) => consumer.ruleId === ruleId,
  );
}

/** Points the given slots at another rule, leaving every other reference untouched. */
export function reassignConsumers(
  documents: RuleReferenceDocuments,
  consumers: readonly RuleConsumer[],
  ruleId: string | ((consumer: RuleConsumer) => string),
): RuleReferenceDocuments {
  let { typography, spacing, size, radius } = documents;
  for (const consumer of consumers) {
    const next = typeof ruleId === "function" ? ruleId(consumer) : ruleId;
    const { slot } = consumer;
    if (slot.foundation === "structures")
      throw new Error(
        "Edit the generation application on its Structure; it cannot use a rounding fallback.",
      );
    if (slot.foundation === "color")
      throw new Error("Choose a naming rule in the color Scale Editor.");
    if (slot.foundation === "typography")
      typography = { ...typography, [slot.field]: next };
    else if (slot.foundation === "size")
      size = size && {
        ...size,
        scales: size.scales.map((scale) =>
          scale.id === slot.scaleId
            ? { ...scale, roundingRuleId: next }
            : scale,
        ),
      };
    else if (slot.foundation === "radius")
      radius = radius && {
        ...radius,
        scales: radius.scales.map((scale) =>
          scale.id === slot.scaleId
            ? { ...scale, roundingRuleId: next }
            : scale,
        ),
      };
    else
      spacing = {
        ...spacing,
        scales: spacing.scales.map((scale) =>
          scale.id === slot.scaleId
            ? { ...scale, roundingRuleId: next }
            : scale,
        ),
      };
  }
  return {
    ...documents,
    typography,
    spacing,
    ...(size && { size }),
    ...(radius && { radius }),
  };
}

export interface ConsumerImpact {
  consumer: RuleConsumer;
  changed: number;
  total: number;
  issues: SpacingScaleIssue[];
  warnings?: string[];
  errors?: string[];
  inactive?: boolean;
}

function typographyValues(
  document: TypographyDocument,
  rules: readonly Rule[],
  field: "textRoundingRuleId" | "lineHeightRoundingRuleId",
  scaleTypes?: readonly ScaleType[],
  interpolations?: readonly Interpolation[],
) {
  return generateTypography(
    document,
    undefined,
    rules,
    scaleTypes,
    interpolations,
  ).flatMap((token) =>
    field === "textRoundingRuleId"
      ? [token.fontSize]
      : [
          ...Object.values(token.lineHeights).map((height) => height.length),
          ...(document.iconography.alignment === "line-height"
            ? [token.iconSize]
            : []),
        ],
  );
}

function spacingValues(
  documents: RuleReferenceDocuments,
  rules: readonly Rule[],
  scaleId: string,
): GeneratedSpacingValue[] {
  const scale = documents.spacing.scales.find(
    (candidate) => candidate.id === scaleId,
  );
  return scale ? generateSpacingScale(scale, rules, documents.scaleTypes) : [];
}

function sizeValues(
  documents: RuleReferenceDocuments,
  rules: readonly Rule[],
  scaleId: string,
): GeneratedSpacingValue[] {
  const scale = documents.size?.scales.find(
    (candidate) => candidate.id === scaleId,
  );
  return scale ? generateSizeScale(scale, rules, documents.scaleTypes) : [];
}

/** How a draft rule would change each consumer's generated output. */
export function draftRuleImpact(
  draft: Rule,
  rules: readonly Rule[],
  documents: RuleReferenceDocuments,
): ConsumerImpact[] {
  const withDraft = rules.some((rule) => rule.id === draft.id)
    ? rules.map((rule) => (rule.id === draft.id ? draft : rule))
    : [...rules, draft];
  const consumers = consumersOf(draft.id, documents);
  if (draft.type === "conditional") {
    if (consumers.length)
      throw new Error(
        "Conditional rules do not yet support generated-token or Structure consumers.",
      );
    return [];
  }
  if (draft.type === "scale-naming")
    return consumers.map((consumer) => {
      if (consumer.slot.foundation !== "color")
        throw new Error(
          "A naming rule cannot round values or generate Structure variants.",
        );
      const scaleId = consumer.slot.scaleId;
      const source = documents.color?.scales.find(
        (scale) => scale.id === scaleId,
      );
      if (!source?.customContrasts)
        throw new Error("The naming-rule consumer is unavailable.");
      const before = source.customContrasts.steps.map((_, position) =>
        contrastStepIndex(position, source, rules),
      );
      const after = source.customContrasts.steps.map((_, position) =>
        contrastStepIndex(position, source, withDraft),
      );
      return {
        consumer,
        changed: after.filter((value, position) => value !== before[position])
          .length,
        total: after.length,
        issues: [],
        warnings: [`Indices: ${after.join(", ")}`],
      };
    });
  if (isTshirtRule(draft)) {
    if (!consumers.length) return [];
    if (!documents.snapshot)
      throw new Error(
        "Generation impact needs the complete authoritative snapshot.",
      );
    try {
      const before = buildTshirtArtifacts(documents.snapshot);
      const after = buildTshirtArtifacts({
        ...(documents.draftSnapshot ?? documents.snapshot),
        rules: [...withDraft],
      });
      return consumers.map((consumer) => {
        if (consumer.slot.foundation !== "structures")
          throw new Error(
            "A generation rule is referenced by a rounding consumer.",
          );
        const { applicationId: id, structureId } = consumer.slot;
        const left = new Map(
          before.semantics
            .filter((row) => row.applicationIds.includes(id))
            .map((row) => [
              row.token.uuid,
              canonicalJson({ token: row.token, value: row.target.value }),
            ]),
        );
        const right = new Map(
          after.semantics
            .filter((row) => row.applicationIds.includes(id))
            .map((row) => [
              row.token.uuid,
              canonicalJson({ token: row.token, value: row.target.value }),
            ]),
        );
        const all = [...new Set([...left.keys(), ...right.keys()])];
        const affected = after.semantics.filter((row) =>
          row.applicationIds.includes(id),
        );
        return {
          consumer,
          inactive:
            affected.length > 0 &&
            affected.every((row) => !ruleAppliesToReference(draft, row.target)),
          changed: all.filter((key) => left.get(key) !== right.get(key)).length,
          total: all.length,
          issues: [],
          warnings: after.diagnostics
            .filter((diagnostic) => diagnostic.structureId === structureId)
            .map((diagnostic) => diagnostic.message),
        };
      });
    } catch (failure) {
      return consumers.map((consumer) => ({
        consumer,
        changed: 0,
        total: 0,
        issues: [],
        errors: [failure instanceof Error ? failure.message : String(failure)],
      }));
    }
  }
  return consumers.map((consumer) => {
    const { slot } = consumer;
    if (slot.foundation === "structures")
      throw new Error("A rounding rule cannot generate Structure variants.");
    if (slot.foundation === "color")
      throw new Error("A rounding rule cannot name color steps.");
    if (slot.foundation === "typography") {
      const before = typographyValues(
        documents.typography,
        rules,
        slot.field,
        documents.scaleTypes,
        documents.interpolations,
      );
      const after = typographyValues(
        documents.typography,
        withDraft,
        slot.field,
        documents.scaleTypes,
        documents.interpolations,
      );
      return {
        consumer,
        changed: after.filter((value, index) => value !== before[index]).length,
        total: after.length,
        issues: [],
        inactive: !roundingConsumerTypes(consumer).some((type) =>
          ruleAppliesTo(draft, type),
        ),
      };
    }
    const values =
      slot.foundation === "radius"
        ? radiusValues
        : slot.foundation === "size"
          ? sizeValues
          : spacingValues;
    const before = values(documents, rules, slot.scaleId);
    const after = values(documents, withDraft, slot.scaleId);
    return {
      consumer,
      changed: after.filter(
        (value, index) => value.value !== before[index]?.value,
      ).length,
      total: after.length,
      inactive: !ruleAppliesTo(draft, slot.foundation),
      issues:
        slot.foundation === "radius"
          ? dimensionIssues(after, "non-negative").issues
          : spacingScaleIssues(after),
    };
  });
}

export function roundingConsumerTypes(consumer: RuleConsumer): RuleValueType[] {
  const slot = consumer.slot;
  return slot.foundation === "typography"
    ? slot.field === "textRoundingRuleId"
      ? ["font-size", "workflow-icon-size"]
      : ["line-height"]
    : slot.foundation === "spacing" ||
        slot.foundation === "size" ||
        slot.foundation === "radius"
      ? [slot.foundation]
      : [];
}

function radiusValues(
  documents: RuleReferenceDocuments,
  rules: readonly Rule[],
  scaleId: string,
): GeneratedSpacingValue[] {
  const scale = documents.radius?.scales.find(
    (candidate) => candidate.id === scaleId,
  );
  return scale ? generateRadiusScale(scale, rules, documents.scaleTypes) : [];
}
