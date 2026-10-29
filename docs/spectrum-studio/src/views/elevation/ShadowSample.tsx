// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { shadowCss } from "../../features/elevation/generate";
import type { GeneratedShadow } from "../../features/elevation/model";

const surface = style({
  width: 96,
  height: 72,
  backgroundColor: "[light-dark(#ffffff, #5b5b5b)]",
  borderRadius: "default",
  flexShrink: 0,
});
export function ShadowSample({
  shadows,
  label,
  small = false,
}: {
  shadows: GeneratedShadow[];
  label: string;
  small?: boolean;
}) {
  return (
    <div
      className={surface}
      role="img"
      aria-label={label}
      data-shadow-sample
      style={{
        boxShadow: shadowCss({ shadows }),
        ...(small && { width: 48, height: 24 }),
      }}
    />
  );
}
