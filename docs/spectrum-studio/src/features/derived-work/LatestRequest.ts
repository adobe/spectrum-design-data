// Copyright 2026 Adobe. All rights reserved.
export type WorkPriority = "nearby" | "visible" | "background";
export type DerivedState<Input, Value, Partial = never> =
  | { status: "pending"; input: Input; partial?: Partial }
  | { status: "ready"; input: Input; value: Value }
  | { status: "unavailable"; input: Input; error: string };
export type WorkExecutor<Input, Value, Partial = never> = (
  input: Input,
  signal: AbortSignal,
  progress: (value: Partial) => void,
) => Promise<Value>;

export class LatestRequest<Input, Value, Partial = never> {
  private sequence = 0;
  private controller?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private input?: Input;
  private priority?: WorkPriority;
  private started = false;

  constructor(
    private execute: WorkExecutor<Input, Value, Partial>,
    private publish: (state: DerivedState<Input, Value, Partial>) => void,
    private delays = { nearby: 0, visible: 0, background: 100 },
  ) {}

  request(input: Input, priority: WorkPriority = "background") {
    if (input === this.input && (this.started || priority === this.priority))
      return;
    this.cancel();
    this.input = input;
    this.priority = priority;
    const sequence = this.sequence;
    const controller = (this.controller = new AbortController());
    let finished = false;
    this.publish({ status: "pending", input });
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.started = true;
      const progress = (partial: Partial) => {
        if (!finished && sequence === this.sequence)
          this.publish({ status: "pending", input, partial });
      };
      void Promise.resolve()
        .then(() => {
          controller.signal.throwIfAborted();
          return this.execute(input, controller.signal, progress);
        })
        .then(
          (value) => {
            finished = true;
            if (sequence === this.sequence)
              this.publish({ status: "ready", input, value });
          },
          (failure: unknown) => {
            finished = true;
            if (sequence === this.sequence)
              this.publish({
                status: "unavailable",
                input,
                error:
                  failure instanceof Error ? failure.message : String(failure),
              });
          },
        );
    }, this.delays[priority]);
  }

  retry() {
    const input = this.input,
      priority = this.priority;
    if (input === undefined) return;
    this.cancel();
    this.request(input, priority);
  }

  cancel() {
    this.sequence += 1;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.controller?.abort();
    this.controller = undefined;
    this.input = undefined;
    this.priority = undefined;
    this.started = false;
  }
}
