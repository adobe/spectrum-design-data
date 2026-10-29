// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type React from "react";

export function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-component="BentoGrid"
      className={style({
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridAutoRows: "minmax(0px, auto)",
        gridAutoFlow: "dense",
        paddingX: 24,
        paddingY: 24,
        gap: 16,
        flexShrink: 0,
      })}
    >
      {children}
    </div>
  );
}
