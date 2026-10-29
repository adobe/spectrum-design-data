// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties, ReactNode } from "react";
import Star from "@react-spectrum/s2/icons/Star";
import { PREVIEW_DEFAULTS } from "../../features/tokens/valuePreview";
import "./ValuePreview.css";

export function IconValuePreview({
  icon,
  style,
}: {
  icon?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className="valuePreviewIcon"
      style={{
        width: PREVIEW_DEFAULTS.iconSize,
        height: PREVIEW_DEFAULTS.iconSize,
        ...style,
      }}
    >
      {icon ?? <Star />}
    </span>
  );
}
