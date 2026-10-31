// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../edit-session/state";
import { browserSourcesForSnapshot } from "./browserSavedState";
import {
  workingTshirtArtifactsAtom,
  shippedTshirtArtifactsAtom,
} from "../design-data/tshirtState";
import { modeSetDefaultMode, type Mode } from "../modes/model";
import { canonicalAliasRows, completeAliasSource } from "./aliasTargets";
import { browserTokenEditsAtom } from "./browserEdits";
import { editModeAtom } from "../../state/view/editMode";
import { withValidatedAuthoringUpdates } from "../../state/authoringGuards";
import { commitDialogDraft, type TokenDialogDraft } from "./dialogModel";

export const tokenDialogCatalogAtom = atom((get) => {
  const snapshot = get(authoringSnapshotAtom);
  const generated = get(workingTshirtArtifactsAtom);
  if (generated.status === "error")
    return { status: "unavailable" as const, error: generated.error };
  try {
    return {
      status: "ready" as const,
      snapshot,
      rows: canonicalAliasRows(
        completeAliasSource(snapshot),
        generated.bundle,
        "preserve-for-review",
      ),
    };
  } catch (failure) {
    return {
      status: "unavailable" as const,
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});

// Temporary provenance policy: browser Save does not alter shipped source membership.
export const shippedTokenIdsAtom = atom((get) => {
  const snapshot = createDefaultSnapshot();
  const modes = snapshot.modeSets
    .map(modeSetDefaultMode)
    .filter((mode): mode is Mode => !!mode);
  const generated = get(shippedTshirtArtifactsAtom);
  if (generated.status === "error")
    return { status: "unavailable" as const, error: generated.error };
  try {
    return {
      status: "ready" as const,
      ids: new Set([
        ...browserSourcesForSnapshot(snapshot, modes).map((token) => token.id),
        ...generated.bundle.semantics.map((row) => row.conceptId),
      ]),
    };
  } catch (failure) {
    return {
      status: "unavailable" as const,
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});

export const saveTokenDialogAtom = atom(
  null,
  (
    get,
    set,
    input: {
      draft: TokenDialogDraft;
      expected: EditSessionSnapshot;
    },
  ) => {
    if (!get(editModeAtom))
      throw new Error("Enter edit mode to change tokens.");
    if (get(authoringSnapshotAtom) !== input.expected)
      throw new Error("Source data changed. Reopen this token before saving.");
    const catalog = get(tokenDialogCatalogAtom);
    if (catalog.status !== "ready") throw new Error(catalog.error);
    const taxonomy = catalog.snapshot.taxonomy;
    if (!taxonomy) throw new Error("The Registry is unavailable.");
    const edits = commitDialogDraft(
      input.draft,
      catalog.rows,
      get(browserTokenEditsAtom),
      taxonomy,
    );
    withValidatedAuthoringUpdates(
      get,
      new Map([["tokens/browser/edits", edits]]),
      () => {
        set(browserTokenEditsAtom, edits);
      },
    );
  },
);
