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
  sampleText = "Ag",
}: PreviewTextOptions & { style?: CSSProperties; sampleText?: string }) {
  return (
    <span
      aria-hidden="true"
      className="valuePreviewText"
      style={{ fontSize, fontWeight, fontStyle, fontFamily, ...style }}
    >
      {sampleText}
    </span>
  );
}
