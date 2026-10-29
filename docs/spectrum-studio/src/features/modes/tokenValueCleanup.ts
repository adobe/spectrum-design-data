// Copyright 2026 Adobe. All rights reserved.
import type {
  BrowserTokenEdit,
  BrowserTokenEdits,
} from "../tokens/browserEditTypes";
import { tokenModePairs } from "../tokens/browserModel";

export type RemovedTokenModeValues = Record<string, BrowserTokenEdit["values"]>;

export function removeTokenModeValues(
  edits: BrowserTokenEdits,
  axisId: string,
  modeIds?: ReadonlySet<string>,
) {
  const next: BrowserTokenEdits = {},
    removed: RemovedTokenModeValues = {};
  for (const [id, edit] of Object.entries(edits)) {
    const kept: BrowserTokenEdit["values"] = {},
      deleted: BrowserTokenEdit["values"] = {};
    for (const [key, value] of Object.entries(edit.values)) {
      const affected = tokenModePairs(key).some(
        ([axis, mode]) => axis === axisId && (!modeIds || modeIds.has(mode)),
      );
      (affected ? deleted : kept)[key] = value;
    }
    if (!Object.keys(deleted).length) {
      next[id] = edit;
      continue;
    }
    removed[id] = deleted;
    if (
      Object.keys(kept).length ||
      Object.keys(edit).some((key) => key !== "values")
    )
      next[id] = { ...edit, values: kept };
  }
  return { edits: next, removed };
}

export function restoreTokenModeValues(
  edits: BrowserTokenEdits,
  removed: RemovedTokenModeValues,
): BrowserTokenEdits {
  const next = { ...edits };
  for (const [id, values] of Object.entries(removed)) {
    const current = next[id] ?? { values: {} };
    if (Object.keys(values).some((key) => current.values[key] !== undefined)) {
      throw new Error(
        "A token value in this mode was edited after removal. Undo cannot overwrite it.",
      );
    }
    next[id] = { ...current, values: { ...current.values, ...values } };
  }
  return next;
}
