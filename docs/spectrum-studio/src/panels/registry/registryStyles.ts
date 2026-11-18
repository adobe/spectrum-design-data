// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

export const registrySection = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
export const registryActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});
export const registryField = style({ width: "full", minWidth: 0 });
export const registryMuted = style({
  font: "body-sm",
  color: "neutral-subdued",
});
export const registryTableBody = style({ backgroundColor: "layer-2" });
export const registryTableMedium = style({ font: "ui" });
export const registryPasteboard = style({
  backgroundColor: "pasteboard",
  borderRadius: "lg",
  padding: 24,
});
export const registryDropLine = style({
  display: "block",
  width: 2,
  height: "full",
  backgroundColor: "accent",
});
export const registrySurface = style({
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
