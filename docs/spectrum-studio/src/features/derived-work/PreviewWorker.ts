// Copyright 2026 Adobe. All rights reserved.
import type { DerivedState } from "./LatestRequest";
import type { TaskWorker, WorkerReply } from "./workerTask";

export interface PreviewRequest<Input> {
  id: number;
  input: Input;
}
export interface PreviewReply<Value> {
  id: number;
  reply: WorkerReply<Value>;
}
export type PreviewWorkerPort<Input, Value> = Omit<
  TaskWorker<PreviewRequest<Input>, Value>,
  "onmessage"
> & {
  onmessage: ((event: MessageEvent<PreviewReply<Value>>) => void) | null;
};

/** Keeps one warm worker, one active calculation and only the newest queued input. */
export class PreviewWorker<Input extends object, Value> {
  private worker?: PreviewWorkerPort<Input, Value>;
  private active?: PreviewRequest<Input>;
  private queued?: PreviewRequest<Input>;
  private latest?: PreviewRequest<Input>;
  private sequence = 0;
  private disposed = false;

  constructor(
    private createWorker: () => PreviewWorkerPort<Input, Value>,
    private publish: (state: DerivedState<Input, Value>) => void,
  ) {}

  request(input: Input) {
    if (this.disposed || this.latest?.input === input) return;
    this.enqueue(input);
  }

  retry() {
    if (!this.disposed && this.latest) this.enqueue(this.latest.input);
  }

  private enqueue(input: Input) {
    this.latest = this.queued = { id: ++this.sequence, input };
    this.publish({ status: "pending", input });
    this.advance();
  }

  private fail(failure: unknown) {
    const latest = this.latest;
    this.closeWorker();
    this.active = undefined;
    this.queued = undefined;
    if (!this.disposed && latest)
      this.publish({
        status: "unavailable",
        input: latest.input,
        error: failure instanceof Error ? failure.message : String(failure),
      });
  }

  private closeWorker() {
    const worker = this.worker;
    this.worker = undefined;
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
  }

  private advance() {
    if (this.disposed || this.active || !this.queued) return;
    const job = this.queued;
    this.queued = undefined;
    this.active = job;
    try {
      if (!this.worker) {
        const worker = this.createWorker();
        this.worker = worker;
        worker.onmessage = ({ data }) => {
          if (this.disposed || this.worker !== worker) return;
          try {
            const completed = this.active;
            if (!completed || completed.id !== data.id) return;
            this.active = undefined;
            const result = data.reply;
            if (result.type !== "ready" && result.type !== "error") {
              this.fail(new Error("Unexpected preview worker response."));
              return;
            }
            if (completed === this.latest)
              this.publish(
                result.type === "ready"
                  ? {
                      status: "ready",
                      input: completed.input,
                      value: result.value,
                    }
                  : {
                      status: "unavailable",
                      input: completed.input,
                      error: result.error,
                    },
              );
            this.advance();
          } catch (failure) {
            this.fail(failure);
          }
        };
        worker.onerror = (event) => {
          if (this.worker === worker && !this.disposed)
            this.fail(
              new Error(event.message || "The preview worker could not run."),
            );
        };
        worker.onmessageerror = () => {
          if (this.worker === worker && !this.disposed)
            this.fail(
              new Error("The preview worker result could not be read."),
            );
        };
      }
      this.worker.postMessage(job);
    } catch (failure) {
      this.fail(failure);
    }
  }

  dispose() {
    this.disposed = true;
    this.closeWorker();
    this.active = undefined;
    this.queued = undefined;
    this.latest = undefined;
  }
}
