// Copyright 2026 Adobe. All rights reserved.
import {
  lightDark,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import type { ContrastToken } from "../../features/color-system/model";
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
}

const rampStyles = style({
  position: "relative",
  flexShrink: 0,
  width: 64,
  minHeight: 400,
  height: "full",
  borderRadius: "default",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
  boxShadow: "elevated",
});

const rampContainerStyles = style({
  position: "sticky",
  top: 12,
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  minHeight: 400,
});

const dotStyles = style({
  position: "absolute",
  insetStart: "50%",
  width: 8,
  height: 8,
  borderRadius: "full",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "white",
  backgroundColor: {
    default: "gray-25",
    isFocused: lightDark("accent-900", "accent-700"),
  },
  boxShadow: "elevated",
  transform: "translate(-50%, -50%)",
});

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
        aria-label="Grayscale output strip"
        className={measuredStyles}
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
}: TargetRampProps) {
  return (
    <div className={rampContainerStyles}>
      <div
        aria-label="Contrast lightness ramp"
        className={rampStyles}
        style={{ background: "linear-gradient(to bottom, #ffffff, #000000)" }}
      >
        {contrasts.map((contrast) => {
          const lightness = contrastLightness(background, contrast.value, side);
          return (
            <span
              key={contrast.id}
              aria-hidden="true"
              className={dotStyles({
                isFocused: contrast.id === focusedContrastId,
              })}
              style={{ top: `${(1 - lightness) * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
