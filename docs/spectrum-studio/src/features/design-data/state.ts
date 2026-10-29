// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
} from "../edit-session/state";
import { canonicalJson } from "./comparison";
import { projectSnapshot } from "./authoringProjection";

export const analysisAuthoringAtom = atom((get) => {
  const working = get(authoringSnapshotAtom);
  const saved = get(editSessionSnapshotAtom) ?? createDefaultSnapshot();
  return {
    saved,
    working,
    unsaved: canonicalJson(saved) !== canonicalJson(working),
  };
});

export const analysisSavedInputAtom = atom((get) =>
  projectSnapshot(get(analysisAuthoringAtom).saved, "saved"),
);
export const analysisWorkingInputAtom = atom((get) =>
  projectSnapshot(get(analysisAuthoringAtom).working, "working"),
);
