// Copyright 2026 Adobe. All rights reserved.
import { atom, type createStore } from "jotai";
import {
  clearPersistenceIssuesAtom,
  PERSISTENCE_ISSUE_PREFIXES,
  reportPersistenceIssueAtom,
} from "../../state/persist";
import { createTshirtCacheWriter, type TshirtCacheStatus } from "./tshirtCache";
import { tshirtArtifactSourceAtom } from "./artifactSources";
import { LatestRequest } from "../derived-work/LatestRequest";
import { workerTask } from "../derived-work/workerTask";
import type {
  TshirtAuthoringSource,
  TshirtArtifactBundle,
} from "./tshirtArtifacts";

export const tshirtCacheStatusAtom = atom<TshirtCacheStatus>({
  status: "pending",
});
export function initializeTshirtArtifactCache(
  store: ReturnType<typeof createStore>,
) {
  const writer = createTshirtCacheWriter({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  });
  let disposed = false;
  const fail = (error: string) => {
    store.set(tshirtCacheStatusAtom, { status: "error", error });
    store.set(
      reportPersistenceIssueAtom,
      `${PERSISTENCE_ISSUE_PREFIXES.artifacts} ${error}`,
    );
  };
  const work = new LatestRequest(
    workerTask<TshirtAuthoringSource, TshirtArtifactBundle>(
      () =>
        new Worker(new URL("./tshirt.worker.ts", import.meta.url), {
          type: "module",
        }),
    ),
    (state) => {
      if (state.status === "pending")
        store.set(tshirtCacheStatusAtom, { status: "pending" });
      else if (state.status === "unavailable") fail(state.error);
      else
        void (async () => {
          try {
            const result = await writer.update(state.input, state.value);
            if (disposed || result.status === "superseded") return;
            if (result.repaired) console.warn(result.repaired);
            store.set(tshirtCacheStatusAtom, { status: "ready" });
            store.set(clearPersistenceIssuesAtom, "artifacts");
          } catch (failure) {
            if (disposed || store.get(tshirtArtifactSourceAtom) !== state.input)
              return;
            const error =
              failure instanceof Error ? failure.message : String(failure);
            fail(error);
          }
        })();
    },
    { nearby: 0, visible: 0, background: 200 },
  );
  const schedule = () => {
    writer.invalidate();
    work.request(store.get(tshirtArtifactSourceAtom));
  };
  const unsubscribe = store.sub(tshirtArtifactSourceAtom, schedule);
  schedule();
  return () => {
    disposed = true;
    work.cancel();
    writer.invalidate();
    unsubscribe();
  };
}
