// Copyright 2026 Adobe. All rights reserved.
import { atom, type Atom } from "jotai";
import { selectAtom } from "jotai/utils";
import type { NumericDraftState } from "./NumericDrafts";
import type { EditSessionSnapshot } from "./state";
import type { NumericSource } from "./numericProposal";
import { authoringSourceSnapshotAtom } from "./state";

export const numericDraftStateAtom = atom<
  NumericDraftState<EditSessionSnapshot>
>({
  proposals: new Map(),
  errors: new Map(),
  status: "idle",
  reset: 0,
});
export const numericDraftResetAtom = selectAtom(
  numericDraftStateAtom,
  (state) => state.reset,
);
export const numericDraftStatusAtom = selectAtom(
  numericDraftStateAtom,
  (state) => state.status,
);
export const numericDraftInvalidAtom = selectAtom(
  numericDraftStateAtom,
  (state) => state.errors.size > 0,
);
export const numericDraftPendingAtom = selectAtom(
  numericDraftStateAtom,
  (state) => state.proposals.size > 0,
);
const numericPreviewProposalsAtom = selectAtom(
  numericDraftStateAtom,
  (state) => state.proposals,
  (previous, next) =>
    previous.size === next.size &&
    [...previous].every(([source, change]) => next.get(source) === change),
);
export const numericPreviewSnapshotAtom = atom((get) => {
  let source = get(authoringSourceSnapshotAtom);
  for (const change of get(numericPreviewProposalsAtom).values())
    source = { ...source, [change.source]: change.next };
  return source;
});

/** Only visible-preview consumers use proposals; canonical selectors do not. */
export function numericPreviewSource<Value>(
  source: Atom<Value>,
  field: NumericSource,
  validate: (value: unknown) => value is Value,
) {
  const proposalAtom = selectAtom(numericDraftStateAtom, (state) =>
    state.proposals.get(field),
  );
  return atom((get) => {
    const proposal = get(proposalAtom);
    if (!proposal) return get(source);
    if (!validate(proposal.next))
      throw new Error(`The ${field} preview has invalid numeric source data.`);
    return proposal.next;
  });
}
