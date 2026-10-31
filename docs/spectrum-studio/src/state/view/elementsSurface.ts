// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { resolvedBackgroundAtom } from "../../features/color-system/state";
import { elementsSurfaceStyle } from "../../features/color-system/previewSurface";
export { elementsSurfaceStyle } from "../../features/color-system/previewSurface";

export const elementsSurfaceStyleAtom = atom((get) =>
  elementsSurfaceStyle(get(resolvedBackgroundAtom)),
);
