// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useRef } from "react";
import { useAtomValueRawSync, useSetAtom } from "jotai";
import { ToastQueue } from "@react-spectrum/s2";
import { DimensionArtifactRepository } from "./dimensionArtifactRepository";
import { dimensionArtifactPublicationAtom } from "./dimensionArtifactState";
import { dimensionArtifactRequestAtom } from "./artifactSources";
import { workerTask } from "../derived-work/workerTask";
import type {
  DimensionWorkOutput,
  DimensionWorkRequest,
} from "./dimensionWork";

/** Always mounted: in-memory generation does not depend on opening Analysis. */
export function useDimensionArtifacts() {
  const input = useAtomValueRawSync(dimensionArtifactRequestAtom);
  const publish = useSetAtom(dimensionArtifactPublicationAtom);
  const repository = useRef<DimensionArtifactRepository | undefined>(undefined);
  const lastError = useRef("");
  useEffect(() => {
    // Fast Refresh preserves refs, including repositories with older compiled schemas.
    if (
      !repository.current ||
      repository.current.constructor !== DimensionArtifactRepository
    ) {
      repository.current?.cancel();
      repository.current = new DimensionArtifactRepository(
        (state) => {
          publish(state);
          const issue =
            state.status === "stale" ? (state.issues.at(-1) ?? "") : "";
          if (issue && issue !== lastError.current) ToastQueue.negative(issue);
          lastError.current = issue;
        },
        150,
        workerTask<DimensionWorkRequest, DimensionWorkOutput>(
          () =>
            new Worker(new URL("./dimension.worker.ts", import.meta.url), {
              type: "module",
            }),
        ),
      );
    }
    const current = repository.current;
    current.request(input.working, input.saved);
    const flush = () => {
      void current.flush();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      current.cancel();
    };
  }, [input, publish]);
}
