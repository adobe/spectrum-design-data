// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "../edit-session/state";
import { isTshirtRule, type TshirtSizingRule } from "../logic/model";
import { ruleAppliesTo } from "../logic/applicability";
import {
  generateDimensionScale,
  type DimensionScale,
} from "../scales/foundation";
import {
  SCALE_ABOVE_MAX,
  SCALE_BELOW_MAX,
  scaleStepName,
} from "../scales/stepNames";
import { scaleTypeIssues, type ScaleType } from "../scales/scaleType";
import { reconcileDimensionSourceNames } from "../taxonomy/naming";
import { registerTerm } from "../taxonomy/model";
import { primitiveReferenceId } from "../tokens/primitiveIdentity";
import {
  assignStructure,
  structureBindingId,
  structureGeneration,
  structureSlotDefinition,
  type Structure,
  type StructureRuleApplication,
  type StructureSelection,
  type StructureSlot,
} from "./model";
import { eligibleStructureBindings, governStructureName } from "./generation";
import { optionSlotChanges, structureEditor } from "./variants";
import { withLayoutConfiguration } from "./configuration";

export type LayoutChanges = Partial<
  Record<StructureSlot, StructureSelection | null>
>;
export interface LayoutEdit {
  structureId: string;
  changes: LayoutChanges;
  option?: { ownerId: string; path: string; valueId: string };
}
export interface LayoutScaleQuestion {
  slots: StructureSlot[];
  rule: TshirtSizingRule;
  applicationId: string;
  kind: "literal" | "token";
  value?: number;
  alternatives?: { applicationId: string; rule: TshirtSizingRule }[];
}
export type LayoutScaleAnswer =
  | { kind: "static" }
  | { kind: "follow"; applicationId?: string }
  | { kind: "formula"; formulaId: string; formula?: ScaleType };
export interface LayoutScaleProposal {
  source: EditSessionSnapshot;
  edit: LayoutEdit;
  application?: StructureRuleApplication;
  questions: LayoutScaleQuestion[];
  answers: LayoutScaleAnswer[];
}
export type LayoutScaleSource = Pick<
  EditSessionSnapshot,
  "spacing" | "size" | "radius" | "taxonomy" | "rules" | "scaleTypes"
>;

export function layoutSource(
  snapshot: Pick<EditSessionSnapshot, "structures">,
  id: string,
) {
  const source = snapshot.structures?.structures.find(
    (item) => item.conceptId === id,
  );
  if (!source)
    throw new Error("The selected Structure is no longer available.");
  return source;
}

export function layoutScaleQuestions(
  snapshot: Pick<EditSessionSnapshot, "structures" | "rules">,
  edit: LayoutEdit,
  application?: StructureRuleApplication,
): LayoutScaleQuestion[] {
  const source = layoutSource(snapshot, edit.structureId);
  const applications = application
    ? [application]
    : structureGeneration(source).applications;
  const questions: LayoutScaleQuestion[] = [];
  for (const [key, selection] of Object.entries(edit.changes)) {
    const slot = key as StructureSlot;
    const family = structureSlotDefinition(slot).family;
    if (
      !selection ||
      (family !== "spacing" && family !== "size" && family !== "radius")
    )
      continue;
    const numeric =
      "value" in selection &&
      selection.value.kind === "number" &&
      selection.value.unit === "px";
    if (!numeric && !("$ref" in selection)) continue;
    const id = structureBindingId(source.conceptId, slot);
    const compatible = applications.flatMap((item) => {
      const rule = snapshot.rules?.find((rule) => rule.id === item.ruleId);
      return rule && isTshirtRule(rule) && ruleAppliesTo(rule, family)
        ? [{ application: item, rule }]
        : [];
    });
    const targeted = compatible.filter(
      ({ application: item }) =>
        item.targets.kind === "all" || item.targets.bindingIds.includes(id),
    );
    if (application && !targeted.length) continue;
    if (!numeric && targeted.length) continue;
    const choices = numeric ? targeted : compatible;
    if (!choices.length) continue;
    if (numeric && choices.length !== 1)
      throw new Error(
        "Choose one nonoverlapping generation rule for this property first.",
      );
    const { application: item, rule } = choices[0];
    const value =
      numeric && "value" in selection && selection.value.kind === "number"
        ? selection.value.value
        : undefined;
    const group = questions.find(
      (question) =>
        question.applicationId === item.id &&
        question.value === value &&
        question.kind === (numeric ? "literal" : "token") &&
        structureSlotDefinition(question.slots[0]).family === family,
    );
    if (group) group.slots.push(slot);
    else
      questions.push({
        slots: [slot],
        rule,
        applicationId: item.id,
        kind: numeric ? "literal" : "token",
        value,
        ...(!numeric &&
          choices.length > 1 && {
            alternatives: choices.map((choice) => ({
              applicationId: choice.application.id,
              rule: choice.rule,
            })),
          }),
      });
  }
  return questions;
}

export function createLayoutScale<Source extends LayoutScaleSource>(
  snapshot: Source,
  family: "spacing" | "size" | "radius",
  base: number,
  formulaId: string,
  offsets: readonly number[],
  roundingRuleId: string,
  allocate: (key: string) => string = () => crypto.randomUUID(),
  key = "scale",
  options: {
    componentSizeScaling?: boolean;
    validateBase?: boolean;
    name?: string;
  } = {},
): { snapshot: Source; reference: string } {
  const document = snapshot[family];
  const taxonomy = snapshot.taxonomy;
  const formula = snapshot.scaleTypes?.find((item) => item.id === formulaId);
  if (!document || !taxonomy || !formula)
    throw new Error("Choose an available Foundation and formula.");
  if (!formula.base.overridable)
    throw new Error(
      "This formula locks its base. Choose a formula that allows a custom base.",
    );
  const problems = scaleTypeIssues(formula);
  if (problems.length) throw new Error(problems.join(" "));
  if (!Number.isFinite(base) || base < 0)
    throw new Error("Enter a finite, non-negative base value.");
  if (offsets.some((offset) => !Number.isSafeInteger(offset)))
    throw new Error("Generation offsets must be whole scale steps.");
  const below = Math.max(0, -Math.min(0, ...offsets));
  const above = Math.max(0, ...offsets);
  if (below > SCALE_BELOW_MAX || above > SCALE_ABOVE_MAX)
    throw new Error(
      "The generation rule exceeds the supported Foundation scale range.",
    );
  let number = 1;
  while (
    document.scales.some(
      (item) => item.name.toLowerCase() === `scale ${number}`,
    )
  )
    number++;
  const scale: DimensionScale = {
    id: allocate(`${key}:id`),
    name: options.name ?? `Scale ${number}`,
    scaleTypeId: formulaId,
    base,
    below,
    above,
    parameters: {},
    roundingRuleId,
    ...(options.componentSizeScaling && { componentSizeScaling: true }),
  };
  const values = generateDimensionScale(
    family,
    scale,
    snapshot.rules,
    snapshot.scaleTypes,
  );
  if (values.some((item) => !Number.isFinite(item.value) || item.value < 0))
    throw new Error(
      "This formula produces invalid or negative values in the required range.",
    );
  if (
    options.validateBase !== false &&
    values.find((item) => item.index === 0)?.value !== base
  )
    throw new Error(
      "The formula and rounding must preserve the entered value at the base.",
    );
  // Allocate names before reconciliation so saved/working migrations share identities.
  const nameCategory = taxonomy.categories.find(
    (item) => item.key === "foundationScale",
  );
  const stepCategory = taxonomy.categories.find(
    (item) => item.key === "scaleIndex",
  );
  if (!nameCategory || !stepCategory)
    throw new Error(
      "The Foundation naming categories are unavailable in the Registry.",
    );
  let registry = registerTerm(
    taxonomy,
    nameCategory.id,
    scale.name,
    allocate(`${key}:name`),
  );
  for (let index = -below; index <= above; index++) {
    const step = scaleStepName(index, below);
    registry = registerTerm(
      registry,
      stepCategory.id,
      step,
      allocate(`scale-step:${step}`),
    );
  }
  const named = reconcileDimensionSourceNames(
    registry,
    document,
    { ...document, scales: [scale, ...document.scales] },
    family,
  );
  return {
    snapshot: {
      ...snapshot,
      [family]: named.document,
      taxonomy: named.taxonomy,
    },
    reference: primitiveReferenceId(family, scale.id, 0),
  };
}

export function writeLayoutEdit(
  snapshot: EditSessionSnapshot,
  edit: LayoutEdit,
  applications?: StructureRuleApplication[],
): EditSessionSnapshot {
  const source = layoutSource(snapshot, edit.structureId);
  const updated = edit.option ? source : assignStructure(source, edit.changes);
  const structure: Structure = applications
    ? {
        ...updated,
        generation: { ...structureGeneration(updated), applications },
      }
    : updated;
  let structures = snapshot.structures!.structures.map((item) =>
    item.conceptId === source.conceptId ? structure : item,
  );
  if (edit.option) {
    const { ownerId, path, valueId } = edit.option;
    const owner = structures.find((item) => item.conceptId === ownerId);
    if (!owner) throw new Error("The owning Structure is no longer available.");
    const editor = structureEditor(owner);
    const scope = path ? (editor.layouts?.[path] ?? {}) : editor;
    const overrides = {
      ...scope.overrides,
      [valueId]: optionSlotChanges(
        source,
        scope.overrides?.[valueId] ?? {},
        edit.changes,
      ),
    };
    const nextEditor = path
      ? withLayoutConfiguration(editor, path, { ...scope, overrides })
      : { ...editor, overrides };
    structures = structures.map((item) =>
      item.conceptId === ownerId ? { ...item, editor: nextEditor } : item,
    );
  }
  return { ...snapshot, structures: { ...snapshot.structures!, structures } };
}

export function resolveLayoutScaleProposal(
  proposal: LayoutScaleProposal,
): EditSessionSnapshot {
  if (proposal.answers.length !== proposal.questions.length)
    throw new Error("Resolve every value before applying this change.");
  let snapshot = proposal.source;
  let source = layoutSource(snapshot, proposal.edit.structureId);
  if (!structureGeneration(source).nameRef) {
    const named = governStructureName(source, snapshot.taxonomy!);
    source = named.structure;
    snapshot = {
      ...snapshot,
      taxonomy: named.taxonomy,
      structures: {
        ...snapshot.structures!,
        structures: snapshot.structures!.structures.map((item) =>
          item.conceptId === source.conceptId ? source : item,
        ),
      },
    };
  }
  const generation = structureGeneration(source);
  let applications = proposal.application
    ? [
        ...generation.applications.filter(
          (item) => item.id !== proposal.application!.id,
        ),
        proposal.application,
      ]
    : [...generation.applications];
  const changes = { ...proposal.edit.changes };
  for (const [index, question] of proposal.questions.entries()) {
    const answer = proposal.answers[index];
    const applicationId =
      answer.kind === "follow" && question.alternatives
        ? question.alternatives.find(
            (item) => item.applicationId === answer.applicationId,
          )?.applicationId
        : question.applicationId;
    if (!applicationId)
      throw new Error("Choose the generation rule to restore.");
    if (answer.kind === "follow" && question.kind !== "token")
      throw new Error(
        "A hardcoded value needs a formula or must remain static.",
      );
    const ids = question.slots.map((slot) =>
      structureBindingId(source.conceptId, slot),
    );
    if (answer.kind === "formula") {
      if (question.kind !== "literal")
        throw new Error("A token already has a Foundation scale.");
      if (answer.formula) {
        if (answer.formula.id !== answer.formulaId)
          throw new Error("Choose the formula being created.");
        if (
          snapshot.scaleTypes?.some(
            (item) =>
              item.id === answer.formula!.id ||
              item.name.trim().toLowerCase() ===
                answer.formula!.name.trim().toLowerCase(),
          )
        )
          throw new Error(
            "This formula already exists or its name is already in use.",
          );
        snapshot = {
          ...snapshot,
          scaleTypes: [...(snapshot.scaleTypes ?? []), answer.formula],
        };
      }
      const family = structureSlotDefinition(question.slots[0]).family;
      if (family !== "spacing" && family !== "size" && family !== "radius")
        throw new Error("This property does not support a dimension scale.");
      const result = createLayoutScale(
        snapshot,
        family,
        question.value!,
        answer.formulaId,
        question.rule.mappings.map((item) =>
          question.rule.movement === "scale-index"
            ? Math.sign(item.offset) * Math.ceil(Math.abs(item.offset) / 100)
            : item.offset,
        ),
        "rule-no-rounding",
        undefined,
        undefined,
        { componentSizeScaling: family === "spacing" },
      );
      snapshot = result.snapshot;
      for (const slot of question.slots)
        changes[slot] = { $ref: result.reference };
    }
    if (answer.kind === "static" && question.kind === "token") continue;
    applications = applications.map((item) => {
      if (item.id !== applicationId) return item;
      const targets =
        item.targets.kind === "all"
          ? eligibleStructureBindings(assignStructure(source, changes)).map(
              (binding) => binding.id,
            )
          : [...item.targets.bindingIds];
      return answer.kind === "static"
        ? {
            ...item,
            previewTargets:
              item.previewTargets ??
              (item.targets.kind === "all"
                ? { kind: "all" as const }
                : { kind: "custom" as const, bindingIds: [] }),
            targets: {
              kind: "custom" as const,
              bindingIds: targets.filter((id) => !ids.includes(id)),
            },
          }
        : item.targets.kind === "all"
          ? item
          : {
              ...item,
              targets: {
                kind: "custom" as const,
                bindingIds: [...new Set([...targets, ...ids])],
              },
            };
    });
  }
  const result = writeLayoutEdit(
    snapshot,
    { ...proposal.edit, changes },
    applications,
  );
  if (!proposal.application) return result;
  const current = layoutSource(result, source.conceptId);
  const named = governStructureName(current, result.taxonomy!);
  return {
    ...result,
    taxonomy: named.taxonomy,
    structures: {
      ...result.structures!,
      structures: result.structures!.structures.map((item) =>
        item.conceptId === current.conceptId ? named.structure : item,
      ),
    },
  };
}
