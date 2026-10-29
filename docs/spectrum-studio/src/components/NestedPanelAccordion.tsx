// Copyright 2026 Adobe. All rights reserved.
import { Accordion } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ComponentProps } from "react";

type NestedPanelAccordionProps = Omit<
  ComponentProps<typeof Accordion>,
  "size" | "isQuiet" | "UNSAFE_className" | "UNSAFE_style" | "styles"
>;

const nestedStyles = style({
  backgroundColor: "layer-1",
  borderRadius: "lg",
  padding: 8,
});

export function NestedPanelAccordion(props: NestedPanelAccordionProps) {
  return (
    <Accordion
      allowsMultipleExpanded
      {...props}
      size="S"
      isQuiet
      UNSAFE_className={String(nestedStyles)}
      data-component="NestedPanelAccordion"
    />
  );
}
