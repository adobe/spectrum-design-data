// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { normalizeStructureEditorAfterReset } from "../structures/variants";
import { rebaseGenerator } from "../logic/generator";
import { isTshirtRule } from "../logic/model";
import { editModeAtom } from "../../state/view/editMode";
import {
  foundationModeAttachmentsAtom,
  FOUNDATION_MODE_ATTACHMENT_DEFAULTS,
  isFoundationModeAttachments,
  type FoundationModeAttachments,
} from "../../state/view/foundationModeAttachments";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../edit-session/state";
import {
  applyBrowserTokenEdits,
  canonicalTokenModeKey,
  tokenModePairs,
  type BrowserTokenSource,
} from "../tokens/browserModel";
import { browserSourcesForSnapshot } from "../tokens/browserSavedState";
import {
  staticCategoricalTokenIds,
  editStaticMemberOverrides,
} from "../color-system/data-vis/frozenColors";
import type { ChangeField, ChangeGroup, ChangeItem } from "./changes";
import {
  pathId,
  readPath,
  restorePath,
  sameValue,
  type AuthoredAddress,
} from "./contract";

export interface ResetSnapshot extends EditSessionSnapshot {
  attachments: FoundationModeAttachments;
}

export interface SourceResetPlan {
  kind: "source";
  title: string;
  addresses: AuthoredAddress[];
}

export interface OverrideResetPlan {
  kind: "override";
  title: string;
  tokenId: string;
  modeKey: string;
  shippedValue: string | number;
  expectedSource: BrowserTokenSource;
  expectedEdit: unknown;
}

export interface ManualResetPlan {
  kind: "manual";
  title: string;
  expected: {
    browserTokenEdits: EditSessionSnapshot["browserTokenEdits"];
    tokenOverrides: EditSessionSnapshot["tokenOverrides"];
    staticValues: AuthoredAddress[];
  };
}

export type ChangeResetPlan =
  | SourceResetPlan
  | OverrideResetPlan
  | ManualResetPlan;
export interface ResetChoice {
  id: string;
  label: string;
  description: string;
  plan?: ChangeResetPlan;
  disabledReason?: string;
}

export function sourceResetPlan(
  title: string,
  addresses: readonly AuthoredAddress[],
): SourceResetPlan {
  const unique = new Map(
    addresses.map((address) => [pathId(address.path), address]),
  );
  if (!unique.size)
    throw new Error(
      "This change has no registered reset address. Edit its source instead.",
    );
  return {
    kind: "source",
    title,
    addresses: structuredClone([...unique.values()]),
  };
}

export function itemResetAddresses(item: ChangeItem): AuthoredAddress[] {
  return item.address
    ? [item.address]
    : (item.addresses ??
        item.fields.flatMap((field) => (field.address ? [field.address] : [])));
}

export function itemResetPlan(item: ChangeItem): SourceResetPlan {
  return sourceResetPlan(item.title, itemResetAddresses(item));
}

export function topicResetPlan(group: ChangeGroup): SourceResetPlan {
  return sourceResetPlan(group.label, group.items.flatMap(itemResetAddresses));
}

function staticOverrideAddresses(
  snapshot: EditSessionSnapshot,
): AuthoredAddress[] {
  return snapshot.colorSystem.dataVisScales.flatMap((scale) =>
    scale.kind === "categorical"
      ? (scale.staticColors ?? []).flatMap((color) =>
          color.overrideValue === undefined
            ? []
            : [
                {
                  path: [
                    "colorSystem",
                    "dataVisScales",
                    { key: "id" as const, id: scale.id },
                    "staticColors",
                    { key: "id" as const, id: color.id },
                    "overrideValue",
                  ],
                  expected: color.overrideValue,
                },
              ],
        )
      : [],
  );
}

export function manualTokenResetPlan(
  snapshot: EditSessionSnapshot,
): ManualResetPlan {
  return {
    kind: "manual",
    title: "Clear manual token edits",
    expected: structuredClone({
      browserTokenEdits: snapshot.browserTokenEdits,
      tokenOverrides: snapshot.tokenOverrides,
      staticValues: staticOverrideAddresses(snapshot),
    }),
  };
}

export function hasManualTokenEdits(snapshot: EditSessionSnapshot): boolean {
  const dormant = staticCategoricalTokenIds(snapshot.colorSystem);
  return (
    Object.keys(snapshot.tokenOverrides).some((id) => !dormant.has(id)) ||
    Object.entries(snapshot.browserTokenEdits ?? {}).some(
      ([id, edit]) =>
        edit.name !== undefined ||
        edit.description !== undefined ||
        edit.status !== undefined ||
        (!dormant.has(id) && Object.keys(edit.values).length > 0),
    ) ||
    staticOverrideAddresses(snapshot).length > 0
  );
}

export function assertResetContext(
  modeKey: string,
  snapshot: EditSessionSnapshot,
): void {
  const pairs = tokenModePairs(modeKey);
  if (
    new Set(pairs.map(([id]) => id)).size !== pairs.length ||
    canonicalTokenModeKey(Object.fromEntries(pairs)) !== modeKey
  )
    throw new Error("This value has an invalid mode context.");
  for (const [setId, modeId] of pairs) {
    if (
      !snapshot.modeSets.some(
        (set) =>
          set.id === setId && set.modes.some((mode) => mode.id === modeId),
      )
    ) {
      throw new Error(
        "The value's modes changed. Reopen Changes before resetting it.",
      );
    }
  }
  if (
    snapshot.modeSets.some(
      (set) => set.modes.length && !pairs.some(([id]) => id === set.id),
    )
  ) {
    throw new Error(
      "This value's mode context is incomplete. Reopen Changes before resetting it.",
    );
  }
}

export function sourceForResetContext(
  snapshot: EditSessionSnapshot,
  modeKey: string,
  tokenId: string,
): BrowserTokenSource | undefined {
  assertResetContext(modeKey, snapshot);
  const selection = Object.fromEntries(tokenModePairs(modeKey));
  const modes = snapshot.modeSets.flatMap((set) =>
    set.modes.filter((mode) => mode.id === selection[set.id]),
  );
  return browserSourcesForSnapshot(snapshot, modes).find(
    (source) => source.id === tokenId,
  );
}

function lockedFormulaReason(
  source: BrowserTokenSource,
  snapshot: EditSessionSnapshot,
): string | undefined {
  const formulaId =
    source.type === "typography"
      ? snapshot.typography.scaleTypeId
      : source.type === "spacing"
        ? snapshot.spacing?.scales.find((scale) => scale.id === source.groupId)
            ?.scaleTypeId
        : source.type === "size"
          ? snapshot.size?.scales.find((scale) => scale.id === source.groupId)
              ?.scaleTypeId
          : source.type === "radius"
            ? snapshot.radius?.scales.find(
                (scale) => scale.id === source.groupId,
              )?.scaleTypeId
            : undefined;
  const formula = snapshot.scaleTypes?.find((item) => item.id === formulaId);
  if (
    formula &&
    (!formula.base.overridable ||
      formula.parameters.some((part) => !part.overridable))
  ) {
    return "This output includes locked formula parts. Restore its changed source instead.";
  }
}

export function generatedOverrideReason(
  item: ChangeItem,
  field: ChangeField,
  source: BrowserTokenSource | undefined,
  snapshot: EditSessionSnapshot,
): string | undefined {
  if (item.sourceKind === "semantic-token" || source?.semantic)
    return "Semantic outputs have no independent overrides. Restore a changed Structure, rule or foundation source.";
  if (item.kind === "removed")
    return "This token is no longer available to edit independently.";
  if (item.kind === "new")
    return "This value has no shipped counterpart to restore.";
  if (!field.tokenValue)
    return "This generated field has no independently editable value context.";
  if (!source)
    return "This token is no longer available to edit independently.";
  if (source.id !== field.tokenValue.tokenId)
    return "This generated value no longer matches its registered token identity. Reopen Changes before resetting it.";
  if (field.tokenValue.shippedValue === undefined)
    return "This value has no shipped counterpart to restore.";
  if (source.alias)
    return "Compatibility aliases resolve their canonical source and have no independent value.";
  if (source.paletteColorId)
    return "Palette value edits write through to the shared source, not an independent mode value.";
  if (source.dataVis?.static)
    return "Static categorical edits are shared across all modes, not independent context overrides.";
  if (source.type === "elevation")
    return "Complete shadows must be edited in the Elevation foundation.";
  if (source.validationError) return source.validationError;
  try {
    assertResetContext(field.tokenValue.modeKey, snapshot);
    const locked = lockedFormulaReason(source, snapshot);
    if (locked) return locked;
    applyBrowserTokenEdits(
      [source],
      snapshot.browserTokenEdits ?? {},
      [source.id],
      field.tokenValue.modeKey,
      { value: field.tokenValue.shippedValue },
    );
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function generatedResetOptions(
  item: ChangeItem,
  field: ChangeField,
  source: BrowserTokenSource | undefined,
  snapshot: EditSessionSnapshot,
): ResetChoice[] {
  const disabledReason = generatedOverrideReason(item, field, source, snapshot);
  const value = field.tokenValue;
  const contexts =
    disabledReason || !value?.contexts?.length
      ? [{ key: value?.modeKey ?? "", label: "this context" }]
      : value.contexts;
  return [
    ...contexts.map((context, index): ResetChoice => {
      const contextualSource =
        value && context.key !== value.modeKey
          ? sourceForResetContext(snapshot, context.key, value.tokenId)
          : source;
      const choice: ResetChoice = {
        id: index === 0 ? "override" : `override-${index}`,
        label:
          contexts.length === 1
            ? "Use shipped value in this context"
            : `Use shipped value: ${context.label}`,
        description: `Add a manual override for ${context.label} only. Automation and other contexts remain unchanged.`,
      };
      const reason =
        disabledReason ??
        generatedOverrideReason(
          item,
          {
            ...field,
            tokenValue: value && { ...value, modeKey: context.key },
          },
          contextualSource,
          snapshot,
        );
      if (
        reason ||
        !value ||
        !contextualSource ||
        value.shippedValue === undefined
      )
        return {
          ...choice,
          disabledReason:
            reason ??
            "This context has no independently editable shipped value.",
        };
      return {
        ...choice,
        plan: {
          kind: "override",
          title: item.title,
          tokenId: value.tokenId,
          modeKey: context.key,
          shippedValue: value.shippedValue,
          expectedSource: structuredClone(contextualSource),
          expectedEdit: structuredClone(
            snapshot.browserTokenEdits?.[value.tokenId]?.values[
              contextualSource.modeKey ?? context.key
            ],
          ),
        },
      };
    }),
    ...(item.upstream ?? []).map((upstream, index) => ({
      id: `source-${index}`,
      label: `Restore ${upstream.title}`,
      description:
        "Restore this changed source to its shipped value. Every dependent output may change; unrelated authored edits are retained.",
      plan: sourceResetPlan(upstream.title, [upstream.address]),
    })),
  ];
}

function assertAttachments(snapshot: ResetSnapshot): void {
  if (
    !isFoundationModeAttachments(snapshot.attachments) ||
    Object.keys(snapshot.attachments).some(
      (id) => !snapshot.modeSets.some((set) => set.id === id),
    )
  ) {
    throw new Error(
      "Foundation mode attachments reference an unavailable mode set. Restore or detach it first.",
    );
  }
}

/** Pure preflight: rejection and cancellation never mutate working or saved data. */
export function prepareChangeReset(
  working: ResetSnapshot,
  plan: ChangeResetPlan,
  sources: readonly BrowserTokenSource[] = [],
  editing = true,
): ResetSnapshot {
  if (!editing) throw new Error("Enter edit mode to reset changes.");
  let candidate = structuredClone(working);
  if (plan.kind === "source") {
    const shipped: ResetSnapshot = {
      ...createDefaultSnapshot(),
      attachments: structuredClone(FOUNDATION_MODE_ATTACHMENT_DEFAULTS),
    };
    // Check every address against the original before applying overlapping object/field restores.
    for (const address of plan.addresses)
      if (!sameValue(readPath(working, address.path), address.expected)) {
        throw new Error(
          "This change has been updated. Reopen Changes before reverting it.",
        );
      }
    for (const address of plan.addresses)
      candidate = restorePath(candidate, shipped, {
        ...address,
        expected: readPath(candidate, address.path),
      });
    const defaultResets = new Set(
      plan.addresses.flatMap(({ path }) => {
        const identity = path[1];
        return path.length === 3 &&
          path[0] === "rules" &&
          path[2] === "defaultTermId" &&
          identity &&
          typeof identity === "object" &&
          "id" in identity
          ? [identity.id]
          : [];
      }),
    );
    candidate.rules = candidate.rules?.map((rule) =>
      defaultResets.has(rule.id) && isTshirtRule(rule) && rule.defaultTermId
        ? rebaseGenerator(rule, rule.defaultTermId)
        : rule,
    );
    if (
      candidate.structures &&
      plan.addresses.some((address) => address.path[0] === "structures")
    )
      candidate.structures = {
        ...candidate.structures,
        structures: candidate.structures.structures.map((structure) => {
          if (!structure.editor) return structure;
          const editor = normalizeStructureEditorAfterReset(structure.editor);
          const restored = { ...structure };
          if (editor) restored.editor = editor;
          else delete restored.editor;
          return restored;
        }),
      };
  } else if (plan.kind === "override") {
    assertResetContext(plan.modeKey, working);
    const source = sources.find((item) => item.id === plan.tokenId);
    if (
      !source ||
      !sameValue(source, plan.expectedSource) ||
      !sameValue(
        working.browserTokenEdits?.[plan.tokenId]?.values[
          source?.modeKey ?? plan.modeKey
        ],
        plan.expectedEdit,
      )
    ) {
      throw new Error(
        "This generated value or its context changed. Reopen Changes before resetting it.",
      );
    }
    const field: ChangeField = {
      key: "Value",
      tokenValue: {
        tokenId: plan.tokenId,
        modeKey: plan.modeKey,
        shippedValue: plan.shippedValue,
      },
    };
    const reason = generatedOverrideReason(
      {
        id: plan.tokenId,
        title: plan.title,
        topic: "tokens",
        sourceKind: "token",
        kind: "modified",
        fields: [field],
      },
      field,
      source,
      working,
    );
    if (reason) throw new Error(reason);
    candidate.browserTokenEdits = applyBrowserTokenEdits(
      [source],
      working.browserTokenEdits ?? {},
      [plan.tokenId],
      plan.modeKey,
      { value: plan.shippedValue },
    );
  } else {
    if (
      !sameValue(working.browserTokenEdits, plan.expected.browserTokenEdits) ||
      !sameValue(working.tokenOverrides, plan.expected.tokenOverrides) ||
      !sameValue(staticOverrideAddresses(working), plan.expected.staticValues)
    ) {
      throw new Error(
        "Manual token edits changed. Reopen Changes before clearing them.",
      );
    }
    const dormant = staticCategoricalTokenIds(working.colorSystem);
    candidate.colorSystem = editStaticMemberOverrides(
      candidate.colorSystem,
      new Map([...dormant].map((id) => [id, null])),
    );
    candidate.tokenOverrides = Object.fromEntries(
      Object.entries(working.tokenOverrides).filter(([id]) => dormant.has(id)),
    );
    candidate.browserTokenEdits = Object.fromEntries(
      Object.entries(working.browserTokenEdits ?? {})
        .filter(
          ([id, edit]) => dormant.has(id) && Object.keys(edit.values).length,
        )
        .map(([id, edit]) => [id, { values: edit.values }]),
    );
  }
  assertAttachments(candidate);
  assertStoredSnapshot(candidate);
  if (
    plan.kind === "override" &&
    !sourceForResetContext(candidate, plan.modeKey, plan.tokenId)
  ) {
    throw new Error(
      "This token is no longer available in the selected context.",
    );
  }
  return candidate;
}

export const resetSnapshotAtom = atom(
  (get): ResetSnapshot => ({
    ...get(authoringSnapshotAtom),
    attachments: get(foundationModeAttachmentsAtom),
  }),
);

export const applyChangeResetPlanAtom = atom(
  null,
  (get, set, plan: ChangeResetPlan) => {
    const working = get(resetSnapshotAtom);
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to reset changes.");
    const source =
      plan.kind === "override"
        ? sourceForResetContext(working, plan.modeKey, plan.tokenId)
        : undefined;
    const { attachments, ...candidate } = prepareChangeReset(
      working,
      plan,
      source ? [source] : [],
      true,
    );
    set(restoreAuthoringSnapshotAtom, candidate);
    set(foundationModeAttachmentsAtom, attachments);
  },
);
