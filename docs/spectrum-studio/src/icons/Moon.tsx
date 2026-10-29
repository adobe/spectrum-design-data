// Copyright 2026 Adobe. All rights reserved.
import { createIcon } from "@react-spectrum/s2";
import { forwardRef } from "react";
import type { SVGProps } from "react";

const MoonSvg = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--iconPrimary, light-dark(rgb(41, 41, 41), rgb(219, 219, 219)))"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      ref={ref}
      {...props}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
);
MoonSvg.displayName = "MoonSvg";

const Moon = createIcon(MoonSvg);

export default Moon;
