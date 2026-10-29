// Copyright 2026 Adobe. All rights reserved.
import type {
  DimensionAuthoringSource,
  DimensionArtifactBundle,
} from "./dimensionArtifacts";
import {
  computeDimensionWork,
  type DimensionWorkOutput,
  type DimensionWorkRequest,
} from "./dimensionWork";
import type { WorkExecutor } from "../derived-work/LatestRequest";

export const DIMENSION_ARTIFACT_STORAGE_KEY =
  "leonardo:v1:artifacts/dimensions";
export interface DimensionArtifactState {
  status: "pending" | "ready" | "stale";
  bundle?: DimensionArtifactBundle;
  savedSourceHash?: string;
  isSaved: boolean;
  issues: string[];
  input?: DimensionWorkRequest;
}
/** Rebuildable page-session artifacts. Never restores authoring state from tokens. */
export class DimensionArtifactRepository {
  private sequence = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private job?: DimensionWorkRequest;
  private controller?: AbortController;
  private lastGood?: DimensionArtifactBundle;
  constructor(
    private publish: (state: DimensionArtifactState) => void,
    private delay = 150,
    private execute: WorkExecutor<
      DimensionWorkRequest,
      DimensionWorkOutput
    > = computeDimensionWork,
  ) {}

  request(working: DimensionAuthoringSource, saved: DimensionAuthoringSource) {
    this.cancel();
    this.job = { working, saved };
    this.publish({
      status: "pending",
      bundle: this.lastGood,
      isSaved: false,
      issues: [],
      input: this.job,
    });
    this.timer = setTimeout(() => {
      void this.flush();
    }, this.delay);
  }

  cancel() {
    this.sequence += 1;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.job = undefined;
    this.controller?.abort();
    this.controller = undefined;
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    const job = this.job;
    if (!job) return;
    this.job = undefined;
    const sequence = this.sequence;
    const controller = (this.controller = new AbortController());
    try {
      const { bundle, savedSourceHash, issues } = await this.execute(
        job,
        controller.signal,
        () => {},
      );
      if (sequence !== this.sequence) return;
      this.lastGood = bundle;
      this.publish({
        status: "ready",
        bundle,
        savedSourceHash,
        isSaved: bundle.sourceHash === savedSourceHash,
        issues,
        input: job,
      });
    } catch (error) {
      if (sequence !== this.sequence) return;
      this.publish({
        status: "stale",
        bundle: this.lastGood,
        isSaved: false,
        input: job,
        issues: [
          `Artifact generation failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      });
    }
  }
}
