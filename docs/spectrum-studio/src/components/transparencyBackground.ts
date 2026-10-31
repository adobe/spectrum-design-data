// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";

const checkerboard =
  "repeating-conic-gradient(var(--checkerboard-alternate, var(--checkerboard-theme-alternate)) 0% 25%, var(--checkerboard-base, var(--checkerboard-theme-base)) 0% 50%)";

function inkColor(ink: string, alpha: number) {
  if (ink !== "black" && ink !== "white")
    return `rgb(from ${ink} r g b / ${alpha})`;
  const channels = ink === "black" ? "0 0 0" : "255 255 255";
  return `rgb(${channels} / ${alpha})`;
}

export function transparencyBackground(
  ink: string,
  alpha: number,
): CSSProperties {
  const overlay = inkColor(ink, alpha);
  return {
    backgroundImage: `linear-gradient(${overlay}, ${overlay}), ${checkerboard}`,
    backgroundSize: "100% 100%, 16px 16px",
    backgroundPosition: "0 0, 0 0",
  };
}

export function transparencyRampBackground(
  ink: "black" | "white",
): CSSProperties {
  return {
    backgroundImage: `linear-gradient(to bottom, ${inkColor(ink, 1)} 0%, transparent 100%), ${checkerboard}`,
    backgroundSize: "100% 100%, 16px 16px",
    backgroundPosition: "0 0, 0 0",
  };
}
