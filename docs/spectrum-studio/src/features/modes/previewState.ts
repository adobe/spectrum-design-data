// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type PreviewOverrides = Record<string, string | number>;

/** Deliberately not persisted: a reload should always land back on a real mode. */
export const previewOverridesAtom = atom<PreviewOverrides>({});

/** Reset also invalidates drag values that have not reached their next frame. */
export const previewResetVersionsAtom = atom<Record<string, number>>({});

export const setPreviewParameterAtom = atom(
  null,
  (get, set, input: { parameterId: string; value: string | number }) => {
    if (Object.is(get(previewOverridesAtom)[input.parameterId], input.value))
      return;
    set(previewOverridesAtom, {
      ...get(previewOverridesAtom),
      [input.parameterId]: input.value,
    });
  },
);

export const clearPreviewParametersAtom = atom(
  null,
  (get, set, parameterIds: readonly string[]) => {
    const versions = { ...get(previewResetVersionsAtom) };
    for (const id of parameterIds) versions[id] = (versions[id] ?? 0) + 1;
    set(previewResetVersionsAtom, versions);
    const current = get(previewOverridesAtom);
    const next = { ...current };
    let changed = false;
    for (const parameterId of parameterIds) {
      if (parameterId in next) {
        delete next[parameterId];
        changed = true;
      }
    }
    if (changed) set(previewOverridesAtom, next);
  },
);
