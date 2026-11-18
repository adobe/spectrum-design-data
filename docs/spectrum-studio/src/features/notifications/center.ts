// Copyright 2026 Adobe. All rights reserved.
// One place that decides what a user action announces. Every action shows at
// most one toast; see .agents/rules/notifications.mdc.
import { editModeAtom } from "../../state/view/editMode";
import { taxonomyDocumentAtom } from "../taxonomy/state";
import { previewRemovedTokenNames, termIds, type Store } from "./impact";
import {
  addedText,
  deleteDialogTitle,
  deleteFlow,
  deleteImpactText,
  deletedText,
  deprecatedText,
  errorText,
  failureOf,
  newIds,
  NOTIFICATION_KINDS,
  nounFor,
  pickNotice,
  termsAddedText,
  toastText,
  type Notice,
  type NotificationKindId,
} from "./policy";

export interface LifecycleCandidate {
  id: string;
  label: string;
}

/**
 * How a delete follows the deletion and deprecation workflow. See
 * .agents/rules/deletion-and-deprecation.mdc.
 */
export interface LifecycleRemoval<D = unknown> {
  /** The item is in the shipped data, so it is deprecated, never deleted. */
  shipped: boolean;
  /** The shipped item is already deprecated. */
  deprecated?: boolean;
  /** Offered for simple items: keeps the ID and changes the value. */
  rename?: { current: string; run: (name: string) => unknown };
  /** Active items of the same kind (and token type) that can replace it. */
  candidates?: readonly LifecycleCandidate[];
  /** Marks the item deprecated. Returns what `undoDeprecate` needs. */
  deprecate?: (replacementId?: string) => D;
  undoDeprecate?: (result: D) => void;
}

/** What the lifecycle dialog shows. Each action throws when it fails. */
export interface LifecycleChoice {
  title: string;
  /** The item's name, for example "Accent". */
  name: string;
  /** The kind's noun in lower case, for example "term". */
  noun: string;
  deprecated: boolean;
  candidates: readonly LifecycleCandidate[];
  rename?: { current: string; apply: (name: string) => void };
  deprecate?: (replacementId?: string) => void;
}

export interface RemoveRequest<R, D = unknown> {
  kind: NotificationKindId;
  /** Overrides the kind's noun, for example "Spacing scale". */
  noun?: string;
  /** Performs the delete. Receives a store so it can also be dry-run. */
  run: (store: Store) => R;
  /** Restores what `run` removed. Offered as Undo on the toast. */
  undo?: (result: R) => void;
  /** Runs after the real delete succeeds (for example clearing selection). */
  onDone?: (result: R) => void;
  /**
   * Set when `run` changes local editor state instead of the store it is
   * given. Skips the dry run, so the flow comes from the kind's tier alone.
   */
  local?: boolean;
  /** Set when the caller's own dialog already confirmed the delete. */
  confirmed?: boolean;
  /**
   * Required for kinds marked "lifecycle" in LIFECYCLE_KINDS. Shipped items
   * open the lifecycle dialog instead of deleting; unshipped items delete
   * right away with an Undo toast.
   */
  lifecycle?: LifecycleRemoval<D>;
}

export interface Notify {
  /** Runs an add and confirms it with one positive toast. */
  added: <R>(
    kind: NotificationKindId,
    run: () => R,
    options?: { noun?: string },
  ) => R | undefined;
  /** Runs a delete with the silent, toast, or dialog flow its kind needs. */
  remove: <R, D = unknown>(request: RemoveRequest<R, D>) => void;
  /** Runs an edit. Shows nothing unless it fails or creates registry terms. */
  edit: <R>(run: () => R) => R | undefined;
  /** Runs work that must not announce anything but errors (undo, revert). */
  quietly: <R>(run: () => R) => R;
  error: (failure: unknown) => void;
  info: (message: string, undo?: () => void) => void;
  copied: () => void;
}

export interface DeleteDialog {
  title: string;
  description: string;
  onConfirm: () => void;
}

export interface NotificationCenterOptions {
  store: Store;
  /** Shows a toast and returns a function that closes it. */
  show: (notice: Notice, onClose: () => void) => () => void;
  /** Opens the delete confirmation dialog. */
  confirm: (dialog: DeleteDialog) => void;
  /** Opens the rename/deprecate dialog for a shipped item. */
  choose: (choice: LifecycleChoice) => void;
}

export function createNotificationCenter({
  store,
  show,
  confirm,
  choose,
}: NotificationCenterOptions): Notify & { start: () => () => void } {
  let depth = 0;
  let quiet = 0;
  let collected: Notice[] = [];
  let actionTerms = 0;
  let termsReported = false;
  let known = termIds(store);
  const visible = new Map<string, () => void>();

  function present(notice: Notice) {
    // A repeat of a visible toast replaces it instead of stacking a second one.
    visible.get(notice.message)?.();
    const close = show(notice, () => {
      if (visible.get(notice.message) === close) visible.delete(notice.message);
    });
    visible.set(notice.message, close);
  }

  function display(notice: Notice) {
    if (quiet && notice.variant !== "negative") return;
    if (depth) collected.push(notice);
    else present(notice);
  }

  /** Starts watching for registry terms created as a side effect. */
  function start() {
    known = termIds(store);
    return store.sub(taxonomyDocumentAtom, () => {
      const next = termIds(store);
      const added = newIds(known, next).length;
      known = next;
      if (!added || quiet) return;
      if (depth) actionTerms += added;
      else if (store.get(editModeAtom))
        display({ variant: "positive", message: termsAddedText(added) });
    });
  }

  function act<R>(
    run: () => R,
    describe?: (result: R, terms: number) => Notice | undefined,
  ): R | undefined {
    const outer = depth === 0;
    if (outer) {
      collected = [];
      actionTerms = 0;
      termsReported = false;
    }
    depth++;
    let result: R | undefined;
    try {
      const value = run();
      const failure = failureOf(value);
      if (failure)
        display({ variant: "negative", message: toastText(failure) });
      else {
        result = value;
        const notice = describe?.(value, actionTerms);
        if (notice) display(notice);
      }
    } catch (failure) {
      display({ variant: "negative", message: errorText(failure) });
    } finally {
      depth--;
    }
    if (outer) {
      if (actionTerms && !termsReported && !quiet)
        collected.push({
          variant: "positive",
          message: termsAddedText(actionTerms),
        });
      const notice = pickNotice(collected);
      collected = [];
      actionTerms = 0;
      if (notice) present(notice);
    }
    return result;
  }

  function quietly<R>(run: () => R): R {
    quiet++;
    try {
      return run();
    } finally {
      quiet--;
      known = termIds(store);
    }
  }

  /** Runs a dialog action quietly and throws its failure for inline display. */
  function settle<R>(run: () => R): R {
    const result = quietly(run);
    const failure = failureOf(result);
    if (failure) throw new Error(failure);
    return result;
  }

  function lifecycleChoice<R, D>(
    request: RemoveRequest<R, D>,
    lifecycle: LifecycleRemoval<D>,
  ): LifecycleChoice {
    const { rename, deprecate, undoDeprecate } = lifecycle;
    return {
      title: deleteDialogTitle(request.kind),
      name: nounFor(request.kind, request.noun),
      noun: NOTIFICATION_KINDS[request.kind].noun.toLowerCase(),
      deprecated: !!lifecycle.deprecated,
      candidates: lifecycle.candidates ?? [],
      rename: rename && {
        current: rename.current,
        apply: (name) => void settle(() => rename.run(name)),
      },
      deprecate:
        deprecate &&
        ((replacementId) => {
          const result = settle(() => deprecate(replacementId));
          present({
            variant: "neutral",
            message: deprecatedText(request.kind, request.noun),
            undo:
              undoDeprecate &&
              (() => quietly(() => act(() => undoDeprecate(result)))),
          });
        }),
    };
  }

  return {
    added: (kind, run, options) =>
      act(run, (_result, terms) => {
        termsReported = true;
        return {
          variant: "positive",
          message: addedText(kind, terms, options?.noun),
        };
      }),
    remove: (request) => {
      const lifecycle = request.lifecycle;
      if (lifecycle?.shipped) {
        choose(lifecycleChoice(request, lifecycle));
        return;
      }
      const removed =
        request.local || lifecycle
          ? 0
          : previewRemovedTokenNames(store, request.run);
      // Unshipped items were never published, so they delete with Undo.
      const flow = lifecycle ? "toast" : deleteFlow(request.kind, removed ?? 0);
      const perform = () =>
        act(
          () => request.run(store),
          (result) => {
            request.onDone?.(result);
            if (flow === "silent") return undefined;
            const undo = request.undo;
            return {
              variant: "neutral",
              message: deletedText(request.kind, request.noun),
              undo: undo && (() => quietly(() => act(() => undo(result)))),
            };
          },
        );
      if (flow === "confirm" && removed !== undefined && !request.confirmed)
        confirm({
          title: deleteDialogTitle(request.kind, request.noun),
          description: deleteImpactText(request.kind, removed),
          onConfirm: perform,
        });
      else perform();
    },
    edit: (run) => act(run),
    quietly,
    error: (failure) =>
      display({ variant: "negative", message: errorText(failure) }),
    info: (message, undo) =>
      display({
        variant: "info",
        message: toastText(message),
        undo: undo && (() => quietly(() => act(undo))),
      }),
    copied: () =>
      display({ variant: "neutral", message: "Copied to clipboard" }),
    start,
  };
}
