// Copyright 2026 Adobe. All rights reserved.
import {
  applyNumericSourceAtom,
  assertStoredSnapshot,
  authoringSourceSnapshotAtom,
  createNumericValidationStore,
  isSnapshot,
  type EditSessionSnapshot,
} from "./state";
import {
  numericSourceKeys,
  type NumericProposal,
  type NumericSource,
  type NumericLayoutEdit,
} from "./numericProposal";
import {
  layoutScaleQuestions,
  resolveLayoutScaleProposal,
  type LayoutScaleAnswer,
  type LayoutScaleProposal,
} from "../structures/layoutScales";
import { synchronizeVariantIdentities } from "../structures/semanticIdentity";
import { validateStructuresAtom } from "../structures/state";
import { recordPersistedWrites } from "../../state/persist";
import {
  assertAuthoringUpdates,
  authoringGuardConfiguration,
  withValidatedAuthoringUpdates,
} from "../../state/authoringGuards";

export interface NumericWorkInput {
  source: EditSessionSnapshot;
  proposals: NumericProposal[];
  layoutEdits?: NumericLayoutEdit[];
  layoutAnswers?: LayoutScaleAnswer[][];
}
const allowedSources = new Set<NumericSource>([
  ...Object.values(numericSourceKeys).filter(
    (source): source is NumericSource => source !== undefined,
  ),
  "componentSizing",
]);

export function prepareNumericWork(input: NumericWorkInput) {
  for (const proposal of input.proposals)
    if (!allowedSources.has(proposal.source) || proposal.next === undefined)
      throw new Error("The numeric edit has an unsupported source.");
  let candidate = {
    ...input.source,
    ...Object.fromEntries<unknown>(
      input.proposals.map((proposal) => [proposal.source, proposal.next]),
    ),
  };
  if (!isSnapshot(candidate) || candidate === null)
    throw new Error("Enter valid numeric settings before applying this edit.");
  const fields = [
    ...new Set(input.proposals.map((proposal) => proposal.source)),
  ];
  const grouped = new Map<string, NumericLayoutEdit>();
  for (const request of input.layoutEdits ?? []) {
    const key = JSON.stringify([
      request.edit.structureId,
      request.edit.option,
      request.application?.id,
    ]);
    const previous = grouped.get(key);
    grouped.set(key, {
      ...request,
      edit: {
        ...request.edit,
        changes: { ...previous?.edit.changes, ...request.edit.changes },
      },
    });
  }
  const layouts: LayoutScaleProposal[] = [...grouped.values()].map(
    (request, index) => ({
      ...request,
      source: candidate,
      questions: layoutScaleQuestions(
        candidate,
        request.edit,
        request.application,
      ),
      answers: input.layoutAnswers?.[index] ?? [],
    }),
  );
  if (layouts.some((layout) => layout.answers.length > layout.questions.length))
    throw new Error("The layout-scale answers no longer match this edit.");
  if (
    layouts.some((layout) => layout.answers.length !== layout.questions.length)
  )
    return {
      updates: new Map<string, unknown>(),
      guards: authoringGuardConfiguration(),
      componentSizing: undefined,
      layoutChoices: layouts,
    };
  for (const layout of layouts) {
    candidate = resolveLayoutScaleProposal({ ...layout, source: candidate });
    for (const field of [
      "taxonomy",
      "spacing",
      "size",
      "radius",
      "scaleTypes",
      "structures",
    ] as const)
      if (!fields.includes(field)) fields.push(field);
  }
  if (fields.includes("structures"))
    candidate = {
      ...candidate,
      structures: synchronizeVariantIdentities(
        candidate.structures!,
        candidate.modeSets,
      ),
    };
  const store = createNumericValidationStore(input.source);
  const requested = new Map(
    Object.entries(numericSourceKeys).flatMap(
      ([key, field]): [string, unknown][] =>
        field && fields.includes(field) ? [[key, candidate[field]]] : [],
    ),
  );
  const updates = recordPersistedWrites(() => {
    withValidatedAuthoringUpdates(store.get, requested, () => {
      store.set(applyNumericSourceAtom, { source: candidate, fields });
    });
    if (fields.includes("structures"))
      store.set(
        validateStructuresAtom,
        store.get(authoringSourceSnapshotAtom).structures!,
      );
    assertStoredSnapshot(store.get(authoringSourceSnapshotAtom));
  });
  assertAuthoringUpdates(store.get, updates);
  return {
    updates,
    guards: authoringGuardConfiguration(),
    componentSizing: input.proposals.some(
      (proposal) => proposal.source === "componentSizing",
    )
      ? candidate.componentSizing
      : undefined,
    layoutChoices: undefined,
  };
}
export type NumericWorkOutput = ReturnType<typeof prepareNumericWork>;
