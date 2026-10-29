// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";

const panelStyles = style({
  backgroundColor: "layer-2",
  boxShadow: "elevated",
  borderRadius: "[16px]",
  color: "neutral",
  padding: 12,
  minWidth: 0,
  overflow: "auto",
});

export interface PanelProps {
  label: string;
  children: ReactNode;
  className?: string;
}
export function Panel({ label, children, className = "" }: PanelProps) {
  return (
    <section
      aria-label={label}
      className={`${panelStyles} ${className}`}
      data-component="Panel"
    >
      {children}
    </section>
  );
}
