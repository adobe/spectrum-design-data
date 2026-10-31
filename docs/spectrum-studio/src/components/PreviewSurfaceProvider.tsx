// Copyright 2026 Adobe. All rights reserved.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { checkerboardColors } from "../features/color-system/previewSurface";
import { DEFAULT_COLOR_OUTPUT } from "../features/color-system/outputSettings";
import {
  PreviewSurfaceContext,
  type PreviewSurface,
} from "./previewSurfaceContext";
const probeStyles = style({
  position: "absolute",
  width: 0,
  height: 0,
  overflow: "hidden",
  pointerEvents: "none",
  backgroundColor: "layer-1",
});

export function PreviewSurfaceProvider({
  children,
  colorScheme,
}: {
  children: ReactNode;
  colorScheme: "light" | "dark";
}) {
  const probe = useRef<HTMLSpanElement>(null);
  const [surface, setSurface] = useState<PreviewSurface>({
    status: "unavailable",
    message: "Preview surface is loading.",
  });
  useLayoutEffect(() => {
    if (!probe.current) return;
    try {
      const background = getComputedStyle(probe.current).backgroundColor;
      setSurface({
        status: "ready",
        ...checkerboardColors(background, {
          ...DEFAULT_COLOR_OUTPUT,
          outputFormat: "rgb",
        }),
      });
    } catch (failure) {
      setSurface({
        status: "unavailable",
        message: failure instanceof Error ? failure.message : String(failure),
      });
    }
  }, [colorScheme]);
  return (
    <PreviewSurfaceContext.Provider value={surface}>
      <span
        ref={probe}
        className={probeStyles}
        data-preview-theme-surface
        aria-hidden
      />
      {children}
    </PreviewSurfaceContext.Provider>
  );
}
