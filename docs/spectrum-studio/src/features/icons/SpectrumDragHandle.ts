// Copyright 2026 Adobe. All rights reserved.
import { ListGripper } from "@adobe/react-spectrum-ui/dist/ListGripper.js";
import type { IconProps } from "@react-spectrum/s2";
import { createElement } from "react";

export default function SpectrumDragHandle(props: IconProps) {
  return createElement(ListGripper, {
    "aria-hidden": props["aria-hidden"],
    "aria-label": props["aria-label"],
    className: props.UNSAFE_className,
    style: props.UNSAFE_style,
    viewBox: "0 0 6 12",
    fill: "currentColor",
  });
}
