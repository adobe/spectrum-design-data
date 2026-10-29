// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";

export type PreviewOverrides = Record<string, string | number>;

/** Deliberately not persisted: a reload should always land back on a real mode. */
export const previewOverridesAtom = atom<PreviewOverrides>({});

export const setPreviewParameterAtom = atom(
  null,
  (get, set, input: { parameterId: string; value: string | number }) => {
    set(previewOverridesAtom, {
      ...get(previewOverridesAtom),
      [input.parameterId]: input.value,
    });
  },
);

export const clearPreviewParametersAtom = atom(
  null,
  (get, set, parameterIds: readonly string[]) => {
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
