// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ContrastToken } from "../../features/color-system/model";
import { MarkerRamp } from "./MarkerRamp";
import {
  hexToLinear,
  linearToOklch,
  luminance,
  targetLuminance,
} from "../../features/color-system/colorMath";

interface TargetRampProps {
  background: string;
  contrasts: ContrastToken[];
  side: "auto" | "light" | "dark";
  focusedContrastId: string | null;
  variant?: "default" | "narrow";
}

function contrastLightness(
  background: string,
  contrast: number,
  side: TargetRampProps["side"],
) {
  const backgroundLinear = hexToLinear(background);
  const backgroundLuminance = luminance(backgroundLinear);
  const isDark =
    side === "dark" || (side === "auto" && backgroundLuminance > 0.1791);
  const target = targetLuminance(backgroundLuminance, contrast, isDark);
  return linearToOklch([target, target, target])[0];
}

export interface MeasuredRampProps {
  kind: "samples";
  label?: string;
  background?: string;
  samples: readonly { id: string; css: string; description: string }[];
}

const measuredStyles = style({
  display: "flex",
  width: "full",
  minWidth: 0,
  overflow: "hidden",
  borderRadius: "default",
});
const cellStyles = style({
  flexGrow: 1,
  flexBasis: 0,
  minWidth: 36,
  height: 72,
});

export function ContrastRamp(props: TargetRampProps | MeasuredRampProps) {
  if ("kind" in props)
    return props.samples.length ? (
      <div
        role="list"
        aria-label={props.label ?? "Grayscale output strip"}
        className={measuredStyles}
        style={{ background: props.background }}
      >
        {props.samples.map((sample) => (
          <div
            role="listitem"
            key={sample.id}
            data-stop-id={sample.id}
            className={cellStyles}
            style={{ background: sample.css }}
            aria-label={sample.description}
            title={sample.description}
          />
        ))}
      </div>
    ) : (
      <p role="status">There are no output stops to preview.</p>
    );
  return <TargetRamp {...props} />;
}

function TargetRamp({
  background,
  contrasts,
  side,
  focusedContrastId,
  variant,
}: TargetRampProps) {
  return (
    <MarkerRamp
      label="Contrast lightness ramp"
      background={{
        background: "linear-gradient(to bottom, #ffffff, #000000)",
      }}
      markers={contrasts.map((contrast) => ({
        id: contrast.id,
        position: 1 - contrastLightness(background, contrast.value, side),
      }))}
      focusedId={focusedContrastId}
      variant={variant}
    />
  );
}
