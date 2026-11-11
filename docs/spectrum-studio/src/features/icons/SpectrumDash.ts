// Copyright 2026 Adobe. All rights reserved.
import { DashSmall } from "@adobe/react-spectrum-ui/dist/DashSmall.js";
import type { IconProps } from "@react-spectrum/s2";
import { createElement } from "react";

export default function SpectrumDash(props: IconProps) {
  return createElement(DashSmall, {
    "aria-hidden": props["aria-hidden"],
    "aria-label": props["aria-label"],
    className: props.UNSAFE_className,
    style: props.UNSAFE_style,
    viewBox: "0 0 10 10",
    fill: "currentColor",
  });
}
