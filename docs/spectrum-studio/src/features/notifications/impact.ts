// Copyright 2026 Adobe. All rights reserved.
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  type EditSessionSnapshot,
} from "../edit-session/state";
import { editModeAtom } from "../../state/view/editMode";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { failureOf, removedNames } from "./policy";

export type Store = ReturnType<typeof createStore>;

const names = new WeakMap<EditSessionSnapshot, Set<string>>();

/** Every token name in the design data output for this snapshot. */
export function exportedTokenNames(snapshot: EditSessionSnapshot) {
  const cached = names.get(snapshot);
  if (cached) return cached;
  const result = new Set(
    canonicalAliasRows(
      completeAliasSource(snapshot),
      buildTshirtArtifacts(snapshot),
      "preserve-for-review",
    ).map((row) => row.token.name),
  );
  names.set(snapshot, result);
  return result;
}

export function termIds(store: Store) {
  return new Set(store.get(taxonomyDocumentAtom).terms.map((term) => term.id));
}

/**
 * Runs a delete against a throwaway copy of the authoring data and counts the
 * exported token names it would remove (renamed names count as removed).
 * Returns undefined when the delete would fail, so the real run reports it.
 */
export function previewRemovedTokenNames(
  store: Store,
  run: (store: Store) => unknown,
): number | undefined {
  const before = store.get(authoringSnapshotAtom);
  const draft = createStore();
  try {
    draft.set(restoreAuthoringSnapshotAtom, before);
    if (store.get(editModeAtom)) draft.set(enterEditModeAtom);
    if (failureOf(run(draft))) return undefined;
  } catch {
    return undefined;
  }
  return removedNames(
    exportedTokenNames(before),
    exportedTokenNames(draft.get(authoringSnapshotAtom)),
  );
}
