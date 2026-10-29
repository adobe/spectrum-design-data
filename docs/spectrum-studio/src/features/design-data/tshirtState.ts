// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../edit-session/state";
import {
  buildTshirtArtifacts,
  type TshirtArtifactBundle,
} from "./tshirtArtifacts";

export type TshirtGenerationState =
  | { status: "ready"; bundle: TshirtArtifactBundle }
  | { status: "error"; error: string };
export const workingTshirtArtifactsAtom = atom((get): TshirtGenerationState => {
  try {
    return {
      status: "ready",
      bundle: buildTshirtArtifacts(get(authoringSnapshotAtom), "working"),
    };
  } catch (failure) {
    return {
      status: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});
export const savedTshirtArtifactsAtom = atom((get): TshirtGenerationState => {
  try {
    return {
      status: "ready",
      bundle: buildTshirtArtifacts(
        get(editSessionSnapshotAtom) ?? createDefaultSnapshot(),
        "saved",
      ),
    };
  } catch (failure) {
    return {
      status: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});
export const shippedTshirtArtifactsAtom = atom((): TshirtGenerationState => {
  try {
    return {
      status: "ready",
      bundle: buildTshirtArtifacts(createDefaultSnapshot(), "shipped"),
    };
  } catch (failure) {
    return {
      status: "error",
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
});
export const tshirtUnsavedImpactAtom = atom((get) => {
  const working = get(workingTshirtArtifactsAtom),
    saved = get(savedTshirtArtifactsAtom);
  if (working.status === "error" || saved.status === "error")
    return {
      added: 0,
      removed: 0,
      saved: 0,
      values: 0,
      error:
        working.status === "error"
          ? working.error
          : saved.status === "error"
            ? saved.error
            : "",
    };
  const before = new Set(saved.bundle.semantics.map((row) => row.conceptId)),
    after = new Set(working.bundle.semantics.map((row) => row.conceptId));
  return {
    added: [...after].filter((id) => !before.has(id)).length,
    removed: [...before].filter((id) => !after.has(id)).length,
    saved: before.size,
    values: saved.bundle.semantics.length,
    error: "",
  };
});
