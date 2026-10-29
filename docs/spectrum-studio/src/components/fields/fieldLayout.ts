// Copyright 2026 Adobe. All rights reserved.
import { css } from "@react-spectrum/s2/style" with { type: "macro" };
import type { CSSProperties, ReactNode } from "react";

export interface FieldLayoutProps {
  label?: ReactNode;
  /** Defaults to "side"; use "top" for a stacked label. */
  labelPosition?: "side" | "top";
  /**
   * Side labels default to equal columns filling the parent's allocated width.
   * "flex" keeps Spectrum's content-sized label; top labels stay stacked.
   * Unlabeled grid fields use one full-width input column.
   * Grid width and columns take precedence over caller styles.
   */
  layout?: "flex" | "grid";
  UNSAFE_className?: string;
  UNSAFE_style?: CSSProperties;
}

const gridStyles = css(`
  & > button { width: 100%; min-width: 0; max-width: 100%; }
  & > span { min-width: 0; }
`);

export function getFieldLayoutProps({
  label,
  labelPosition = "side",
  layout = "grid",
  UNSAFE_className,
  UNSAFE_style,
}: FieldLayoutProps) {
  const isGrid = labelPosition === "side" && layout === "grid";
  return {
    labelPosition,
    UNSAFE_className: [UNSAFE_className, isGrid ? gridStyles : undefined]
      .filter(Boolean)
      .join(" "),
    UNSAFE_style: isGrid
      ? {
          ...UNSAFE_style,
          width: "100%",
          minWidth: 0,
          flexShrink: 1,
          gridTemplateColumns: label
            ? "repeat(2, minmax(0, 1fr))"
            : "minmax(0, 1fr)",
          ...(!label ? { gridTemplateAreas: '"input" "helptext"' } : {}),
          overflowWrap: "anywhere" as const,
        }
      : UNSAFE_style,
  };
}
