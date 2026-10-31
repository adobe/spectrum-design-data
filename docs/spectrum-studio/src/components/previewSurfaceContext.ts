// Copyright 2026 Adobe. All rights reserved.
import { createContext, useContext, type CSSProperties } from "react";

export type PreviewSurface =
  | { status: "ready"; background: string; alternate: string }
  | { status: "unavailable"; message: string };

export const PreviewSurfaceContext = createContext<PreviewSurface>({
  status: "unavailable",
  message: "Preview surface is not available.",
});

export function usePreviewSurface() {
  return useContext(PreviewSurfaceContext);
}

interface ThemeSurfaceStyle extends CSSProperties {
  "--checkerboard-theme-base"?: string;
  "--checkerboard-theme-alternate"?: string;
}

export function previewThemeStyle(surface: PreviewSurface): ThemeSurfaceStyle {
  return surface.status === "ready"
    ? {
        "--checkerboard-theme-base": surface.background,
        "--checkerboard-theme-alternate": surface.alternate,
      }
    : {};
}
