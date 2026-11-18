// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

/**
 * The one label style for every Foundations preview scale: indices, values,
 * contrasts, shadow values and table columns. Matches the Icons ramp caption.
 */
export const previewLabelStyles = style({
  font: "detail-sm",
  fontSize: "[12px]",
  color: "inherit",
  opacity: 0.8,
  margin: 0,
  whiteSpace: "nowrap",
});

/** Scale names beside a row of swatches, such as "Cinnamon". */
export const previewScaleNameStyles = style({
  font: "title-sm",
  fontSize: "[16px]",
  fontWeight: "bold",
  color: "inherit",
  margin: 0,
});
