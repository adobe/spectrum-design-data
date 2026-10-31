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
  errorText,
  failureOf,
  newIds,
  pickNotice,
  termsAddedText,
  toastText,
  type Notice,
  type NotificationKindId,
} from "./policy";

export interface RemoveRequest<R> {
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
}

export interface Notify {
  /** Runs an add and confirms it with one positive toast. */
  added: <R>(
    kind: NotificationKindId,
    run: () => R,
    options?: { noun?: string },
  ) => R | undefined;
  /** Runs a delete with the silent, toast, or dialog flow its kind needs. */
  remove: <R>(request: RemoveRequest<R>) => void;
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
}

export function createNotificationCenter({
  store,
  show,
  confirm,
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
      const removed = request.local
        ? 0
        : previewRemovedTokenNames(store, request.run);
      const flow = deleteFlow(request.kind, removed ?? 0);
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
