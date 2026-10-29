// Copyright 2026 Adobe. All rights reserved.
import { Heading } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";

const headerStyles = style({
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  width: "full",
});

const titleStyles = style({ flexShrink: 0, margin: 0 });
const controlsStyles = style({
  display: "flex",
  alignItems: "end",
  justifyContent: "end",
  gap: 12,
  flexWrap: "wrap",
  marginStart: "auto",
});

export function FoundationsElementsHeader({
  title,
  controls,
}: {
  title: string;
  controls?: ReactNode;
}) {
  return (
    <header className={headerStyles}>
      <Heading level={2} styles={titleStyles}>
        {title}
      </Heading>
      {controls && <div className={controlsStyles}>{controls}</div>}
    </header>
  );
}
