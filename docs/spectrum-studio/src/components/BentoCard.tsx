// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type React from "react";
import "./BentoCard.css";

const bentoCard = style({
  display: "flex",
  flexDirection: "column",
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 24,
  minWidth: 0,
});

export function BentoCard({
  colSpan = 1,
  rowSpan = 1,
  children,
  className,
}: {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  children: React.ReactNode;
  className?: string;
}) {
  const spanClassName = [
    colSpan > 1 ? `bentoCard-colSpan${colSpan}` : "",
    rowSpan === 2 ? "bentoCard-rowSpan2" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      data-component="BentoCard"
      className={[bentoCard, spanClassName, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </article>
  );
}
