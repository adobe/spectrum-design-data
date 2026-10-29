// Copyright 2026 Adobe. All rights reserved.
import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { editModeAtom } from "../../state/view/editMode";
import { changelogCollapsedAtom } from "../../state/view/navigation";
import { LatestRequest } from "../derived-work/LatestRequest";
import { workerTask } from "../derived-work/workerTask";
import {
  comparisonPublicationAtom,
  comparisonRequestAtom,
} from "./asyncComparisonState";
import type {
  ComparisonOutput,
  ComparisonProgress,
  ComparisonRequest,
} from "./comparisonWork";

export function useComparisonWork() {
  const input = useAtomValue(comparisonRequestAtom);
  const editing = useAtomValue(editModeAtom);
  const collapsed = useAtomValue(changelogCollapsedAtom);
  const publish = useSetAtom(comparisonPublicationAtom);
  const current =
    useRef<
      LatestRequest<ComparisonRequest, ComparisonOutput, ComparisonProgress>
    >(undefined);
  useEffect(() => {
    const work = new LatestRequest(
      workerTask<ComparisonRequest, ComparisonOutput, ComparisonProgress>(
        () =>
          new Worker(new URL("./comparison.worker.ts", import.meta.url), {
            type: "module",
          }),
      ),
      publish,
    );
    current.current = work;
    return () => {
      work.cancel();
      current.current = undefined;
    };
  }, [publish]);
  useEffect(() => {
    if (!editing) {
      current.current?.cancel();
      return;
    }
    current.current?.request(input, collapsed ? "background" : "visible");
  }, [input, editing, collapsed]);
}
