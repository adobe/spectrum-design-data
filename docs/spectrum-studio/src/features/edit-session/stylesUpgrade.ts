// Copyright 2026 Adobe. All rights reserved.
import { EMPTY_STYLES } from "../styles/model";

/** Adds the empty Styles document to snapshots saved before Styles existed. */
export function upgradeStylesSnapshot<T>(source: T): T {
  if (!source || typeof source !== "object" || "styles" in source)
    return source;
  return { ...source, styles: structuredClone(EMPTY_STYLES) };
}
