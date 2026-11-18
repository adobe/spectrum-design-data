// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

export const alignedSwatchCellStyles = style({
  position: "relative",
  display: "flex",
  flexShrink: 0,
  width: 110,
  height: 64,
  overflow: "hidden",
});
/** Column width for labels under or above a swatch; pair with `previewLabelStyles`. */
export const alignedSwatchLabelStyles = style({
  flexShrink: 0,
  width: 110,
  textAlign: "center",
});
