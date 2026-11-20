// Copyright 2026 Adobe. All rights reserved.
import { atom, type Getter } from "jotai";
import {
  applyPersistedWrites,
  PERSISTENCE_ISSUE_PREFIXES,
  reportPersistenceIssueAtom,
} from "../../state/persist";
import { prepareAuthoringUpdates } from "../../state/authoringGuards";
import { editModeAtom } from "../../state/view/editMode";
import { NumericDrafts } from "./NumericDrafts";
import {
  collectNumericProposals,
  type NumericLayoutEdit,
} from "./numericProposal";
import { numericLayoutChoices } from "./numericLayoutChoices";
import { numericDraftStateAtom } from "./numericState";
import { numericFieldScopeAtom } from "./numericScope";
import {
  authoringResetRevisionAtom,
  authoringSourceSnapshotAtom,
  type EditSessionSnapshot,
} from "./state";
import { componentSizingDocumentAtom } from "../foundations/componentSizingState";
import {
  prepareNumericWork,
  type NumericWorkInput,
  type NumericWorkOutput,
} from "./numericWork";
import type { WorkExecutor } from "../derived-work/LatestRequest";
import type { Store } from "../notifications/impact";

const sessionAtom = atom((get) => ({
  source: get(authoringSourceSnapshotAtom),
  reset: get(authoringResetRevisionAtom),
  editing: get(editModeAtom),
}));
const applyAtom = atom(null, (get, set, output: NumericWorkOutput) => {
  applyPersistedWrites(get, set, output.updates);
  if (output.componentSizing)
    set(componentSizingDocumentAtom, output.componentSizing);
});
const message = (failure: unknown) =>
  failure instanceof Error ? failure.message : String(failure);

export function createNumericRuntime(
  store: Store,
  execute: WorkExecutor<NumericWorkInput, NumericWorkOutput>,
  reportError: (message: string) => void,
) {
  let drafts: NumericDrafts<EditSessionSnapshot> | undefined;
  const layoutFields = new Map<string, NumericLayoutEdit[]>();
  const current = () => store.get(sessionAtom);
  return {
    store,
    scopeAtom: numericFieldScopeAtom,
    start() {
      layoutFields.clear();
      const owner = new NumericDrafts<EditSessionSnapshot>({
        current,
        publish: (state) => {
          if (!state.proposals.size && !state.errors.size) layoutFields.clear();
          store.set(numericDraftStateAtom, state);
        },
        reportError,
        prepare: async (input, signal) => {
          const reset = current().reset;
          const prepared = await prepareAuthoringUpdates(
            store.get,
            async () => {
              const layoutIds = [...layoutFields.keys()];
              const request: NumericWorkInput = {
                ...input,
                layoutEdits: [...layoutFields.values()].flat(),
              };
              let output = await execute(request, signal, () => {});
              if (output.layoutChoices) {
                const layoutAnswers = await numericLayoutChoices(
                  store,
                  output.layoutChoices,
                  signal,
                  () =>
                    !signal.aborted &&
                    current().source === input.source &&
                    current().reset === reset &&
                    current().editing,
                  () => {
                    for (const id of layoutIds) {
                      layoutFields.delete(id);
                      owner.discardField(id);
                    }
                  },
                );
                output = await execute(
                  { ...request, layoutAnswers },
                  signal,
                  () => {},
                );
                if (output.layoutChoices)
                  throw new Error(
                    "Resolve every layout-scale choice before applying the edit.",
                  );
              }
              return { value: output, ...output };
            },
            () => {
              const now = current();
              return (
                !signal.aborted &&
                now.source === input.source &&
                now.reset === reset &&
                now.editing
              );
            },
          );
          return () =>
            prepared.commit(store.get, () => {
              store.set(applyAtom, prepared.value);
            });
        },
      });
      drafts = owner;
      store.set(numericDraftStateAtom, owner.snapshot());
      const stop = store.sub(sessionAtom, () => owner.sourceChanged());
      const stopScope = store.sub(numericFieldScopeAtom, () => {
        for (const id of [...layoutFields.keys()]) {
          layoutFields.delete(id);
          owner.setFieldError(
            id,
            "Complete the layout-scale choice before leaving this editor.",
          );
          owner.releaseField(id);
        }
      });
      return () => {
        stopScope();
        stop();
        owner.dispose();
        if (drafts === owner) drafts = undefined;
      };
    },
    capture(id: string, run: () => void) {
      if (!drafts) throw new Error("Numeric editing is not ready.");
      try {
        const interactions: NumericLayoutEdit[] = [];
        const proposals = collectNumericProposals(run, interactions);
        if (!proposals.length && !drafts.fieldPending(id)) {
          drafts.setFieldError(id);
          return true;
        }
        drafts.propose(id, proposals);
        layoutFields.delete(id);
        if (interactions.length && drafts.fieldPending(id))
          layoutFields.set(id, interactions);
        return true;
      } catch (failure) {
        drafts.setFieldError(id, message(failure));
        reportError(message(failure));
        return false;
      }
    },
    setError(id: string, error?: string) {
      drafts?.setFieldError(id, error);
    },
    pending(id: string) {
      return drafts?.fieldPending(id) ?? false;
    },
    release(id: string) {
      drafts?.releaseField(id);
      if (!drafts?.fieldPending(id)) layoutFields.delete(id);
    },
    discard(id: string) {
      layoutFields.delete(id);
      drafts?.discardField(id);
    },
    async flush() {
      if (!drafts) throw new Error("Numeric editing is not ready.");
      await drafts.flush();
    },
    settle() {
      void drafts?.flush().catch((failure: unknown) => {
        if (
          !(failure instanceof DOMException && failure.name === "AbortError") &&
          !drafts?.snapshot().errors.size &&
          drafts?.snapshot().error !== message(failure)
        )
          reportError(message(failure));
      });
    },
    pagehide() {
      try {
        drafts?.flushSynchronously((input) => {
          const output = prepareNumericWork({
            ...input,
            layoutEdits: [...layoutFields.values()].flat(),
          });
          if (output.layoutChoices)
            throw new Error(
              "Complete the layout-scale choice before leaving this page.",
            );
          return () => store.set(applyAtom, output);
        });
      } catch (failure) {
        store.set(
          reportPersistenceIssueAtom,
          `${PERSISTENCE_ISSUE_PREFIXES.authoring} Pending numeric edit: ${message(failure)}`,
        );
      }
    },
  };
}
export type NumericRuntime = ReturnType<typeof createNumericRuntime>;

export function numericFieldError(get: Getter, id: string) {
  return get(numericDraftStateAtom).errors.get(id);
}
