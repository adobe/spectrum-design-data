// Copyright 2026 Adobe. All rights reserved.
import { MarkerRamp } from "../color-system/MarkerRamp";
import { transparencyRampBackground } from "../../components/transparencyBackground";

export function OpacityRamp({
  ink,
  levels,
  focusedId,
}: {
  ink: "black" | "white";
  levels: readonly { id: string; value: number }[];
  focusedId: string | null;
}) {
  return (
    <MarkerRamp
      label="Opacity ramp"
      background={transparencyRampBackground(ink)}
      markers={levels.map((level) => ({
        id: level.id,
        position: 1 - level.value,
      }))}
      focusedId={focusedId}
    />
  );
}
