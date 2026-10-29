// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import {
  PREVIEW_DEFAULTS,
  type PreviewTextOptions,
} from "../../features/tokens/valuePreview";
import "./ValuePreview.css";

export function TextValuePreview({
  fontSize = PREVIEW_DEFAULTS.fontSize,
  fontWeight = 400,
  fontStyle = "normal",
  fontFamily,
  style,
}: PreviewTextOptions & { style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className="valuePreviewText"
      style={{ fontSize, fontWeight, fontStyle, fontFamily, ...style }}
    >
      Ag
    </span>
  );
}
