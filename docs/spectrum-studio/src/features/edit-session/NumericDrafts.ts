// Copyright 2026 Adobe. All rights reserved.
import { sameValue } from "../changelog/contract";
import { rebaseDraft } from "./rebaseDraft";

export interface NumericChange<Source> {
  source: keyof Source;
  previous: unknown;
  next: unknown;
}
export interface NumericDraftState<Source> {
  proposals: ReadonlyMap<keyof Source, NumericChange<Source>>;
  errors: ReadonlyMap<string, string>;
  status: "idle" | "pending" | "validating" | "unavailable";
  error?: string;
  reset: number;
}
interface NumericHost<Source> {
  current: () => { source: Source; reset: number; editing: boolean };
  prepare: (
    input: { source: Source; proposals: NumericChange<Source>[] },
    signal: AbortSignal,
  ) => Promise<() => void>;
  publish: (state: NumericDraftState<Source>) => void;
  reportError: (message: string) => void;
  schedule?: (run: () => void, delay: number) => () => void;
}

/** Owns temporary field edits; only a current, fully prepared batch may apply. */
export class NumericDrafts<Source extends object> {
  private fields = new Map<string, NumericChange<Source>[]>();
  private errors = new Map<string, string>();
  private source: Source;
  private sourceReset: number;
  private reset = 0;
  private revision = 0;
  private cancelTimer?: () => void;
  private active?: { abort: AbortController; promise: Promise<void> };
  private committing = false;
  private disposed = false;
  private state: NumericDraftState<Source>;

  constructor(private host: NumericHost<Source>) {
    const current = host.current();
    this.source = current.source;
    this.sourceReset = current.reset;
    this.state = {
      proposals: new Map(),
      errors: new Map(),
      status: "idle",
      reset: 0,
    };
  }

  snapshot() {
    return this.state;
  }

  fieldPending(id: string) {
    return this.fields.has(id);
  }

  private invalidate() {
    this.revision++;
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    this.active?.abort.abort();
    this.active = undefined;
  }

  private compose() {
    const proposals = new Map<keyof Source, NumericChange<Source>>();
    for (const changes of this.fields.values())
      for (const change of changes) {
        const previous = this.source[change.source];
        const current = proposals.get(change.source)?.next ?? previous;
        const next = rebaseDraft(
          change.previous === undefined ? previous : change.previous,
          change.next,
          current,
          true,
        );
        if (sameValue(previous, next)) proposals.delete(change.source);
        else proposals.set(change.source, { ...change, previous, next });
      }
    for (const [key, proposal] of proposals) {
      const before = this.state.proposals.get(key);
      if (
        before &&
        before.previous === proposal.previous &&
        sameValue(before.next, proposal.next)
      )
        proposals.set(key, before);
    }
    return proposals;
  }

  private publish(
    status: NumericDraftState<Source>["status"],
    error?: string,
    proposals = this.compose(),
  ) {
    this.state = {
      proposals,
      errors: new Map(this.errors),
      status: proposals.size || this.errors.size ? status : "idle",
      error,
      reset: this.reset,
    };
    this.host.publish(this.state);
  }

  propose(id: string, changes: NumericChange<Source>[]) {
    if (this.disposed || !this.host.current().editing) return;
    this.sourceChanged();
    const previousFields = this.fields;
    this.fields = new Map(previousFields);
    this.fields.delete(id);
    const changed = changes
      .map((change) => ({
        ...change,
        previous:
          change.previous === undefined
            ? this.source[change.source]
            : change.previous,
      }))
      .filter((change) => !sameValue(change.previous, change.next));
    if (changed.length) this.fields.set(id, changed);
    let proposals: ReturnType<typeof this.compose>;
    try {
      proposals = this.compose();
    } catch (failure) {
      this.fields = previousFields;
      throw failure;
    }
    this.invalidate();
    this.errors.delete(id);
    this.publish("pending", undefined, proposals);
    this.schedule();
  }

  setFieldError(id: string, error?: string) {
    if (this.disposed || this.errors.get(id) === error) return;
    this.invalidate();
    if (error) this.errors.set(id, error);
    else this.errors.delete(id);
    this.publish("pending");
    this.schedule();
  }

  releaseField(id: string) {
    if (!this.errors.has(id)) return;
    this.invalidate();
    this.fields.delete(id);
    this.errors.delete(id);
    this.publish("pending");
    this.host.reportError("The incomplete numeric edit was not applied.");
    this.schedule();
  }

  discardField(id: string) {
    if (!this.fields.has(id) && !this.errors.has(id)) return;
    this.invalidate();
    this.fields.delete(id);
    this.errors.delete(id);
    this.publish("pending");
    this.schedule();
  }

  sourceChanged() {
    if (this.disposed || this.committing) return;
    const current = this.host.current();
    if (current.reset !== this.sourceReset || !current.editing) {
      this.clear();
      return;
    }
    if (current.source === this.source) return;
    this.invalidate();
    for (const [id, changes] of this.fields) {
      try {
        this.fields.set(
          id,
          changes.map((change) => ({
            ...change,
            previous: current.source[change.source],
            next: rebaseDraft(
              change.previous === undefined
                ? this.source[change.source]
                : change.previous,
              change.next,
              current.source[change.source],
            ),
          })),
        );
      } catch (failure) {
        const error =
          failure instanceof Error ? failure.message : String(failure);
        this.fields.delete(id);
        this.errors.set(id, error);
        this.host.reportError(error);
      }
    }
    this.source = current.source;
    this.publish("pending");
    this.schedule();
  }

  private schedule() {
    if (!this.state.proposals.size || this.errors.size || this.disposed) return;
    const schedule =
      this.host.schedule ??
      ((run: () => void, delay: number) => {
        const timer = setTimeout(run, delay);
        return () => clearTimeout(timer);
      });
    this.cancelTimer = schedule(() => {
      this.cancelTimer = undefined;
      void this.start();
    }, 200);
  }

  private start() {
    if (this.active) return this.active.promise;
    if (!this.state.proposals.size || this.errors.size || this.disposed)
      return Promise.resolve();
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    const revision = this.revision;
    const input = {
      source: this.source,
      proposals: [...this.state.proposals.values()],
    };
    const abort = new AbortController();
    const promise = Promise.resolve().then(async () => {
      try {
        if (abort.signal.aborted) return;
        const commit = await this.host.prepare(input, abort.signal);
        const current = this.host.current();
        if (
          this.disposed ||
          abort.signal.aborted ||
          revision !== this.revision ||
          current.source !== input.source ||
          current.reset !== this.sourceReset ||
          !current.editing
        ) {
          if (!abort.signal.aborted && revision === this.revision)
            this.sourceChanged();
          return;
        }
        this.committing = true;
        try {
          commit();
        } finally {
          this.committing = false;
        }
        if (revision !== this.revision) {
          this.sourceChanged();
          return;
        }
        this.fields.clear();
        this.errors.clear();
        this.source = this.host.current().source;
        this.publish("idle");
      } catch (failure) {
        if (
          !abort.signal.aborted &&
          revision === this.revision &&
          !this.disposed
        ) {
          const error =
            failure instanceof Error ? failure.message : String(failure);
          this.publish("unavailable", error);
          this.host.reportError(error);
        }
      } finally {
        if (this.active?.abort === abort) this.active = undefined;
      }
    });
    this.active = { abort, promise };
    this.publish("validating");
    return promise;
  }

  async flush() {
    const reset = this.reset;
    while (this.state.proposals.size || this.errors.size) {
      if (this.disposed || reset !== this.reset)
        throw new DOMException("The numeric edit was cancelled.", "AbortError");
      const error = this.errors.values().next().value;
      if (error) throw new Error(error);
      await this.start();
      if (this.state.error) throw new Error(this.state.error);
    }
    if (this.disposed || reset !== this.reset)
      throw new DOMException("The numeric edit was cancelled.", "AbortError");
  }

  flushSynchronously(
    prepare: (input: {
      source: Source;
      proposals: NumericChange<Source>[];
    }) => () => void,
  ) {
    this.sourceChanged();
    const error = this.errors.values().next().value;
    if (error) throw new Error(error);
    if (!this.state.proposals.size || this.disposed) return;
    this.invalidate();
    const source = this.source;
    const reset = this.sourceReset;
    const revision = this.revision;
    const commit = prepare({
      source,
      proposals: [...this.state.proposals.values()],
    });
    const current = this.host.current();
    if (
      current.source !== source ||
      current.reset !== reset ||
      revision !== this.revision ||
      !current.editing
    )
      throw new Error("The numeric edit source changed before it could apply.");
    this.committing = true;
    try {
      commit();
    } finally {
      this.committing = false;
    }
    if (revision !== this.revision) {
      this.sourceChanged();
      throw new Error("The numeric edit changed while it was being applied.");
    }
    this.fields.clear();
    this.errors.clear();
    this.source = this.host.current().source;
    this.publish("idle");
  }

  clear() {
    this.invalidate();
    this.fields.clear();
    this.errors.clear();
    const current = this.host.current();
    this.source = current.source;
    this.sourceReset = current.reset;
    this.reset++;
    this.publish("idle");
  }

  dispose() {
    this.clear();
    this.disposed = true;
  }
}
