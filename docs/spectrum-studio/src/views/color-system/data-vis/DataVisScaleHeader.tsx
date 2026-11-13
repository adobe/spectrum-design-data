// Copyright 2026 Adobe. All rights reserved.
import { Badge } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { ScaleColorPreview } from "../ScaleColorPreview";
import type { DataVisScale } from "../../../features/color-system/data-vis/model";
import "./DataVisExamples.css";

const title = style({ font: "heading-sm", margin: 0 });
const badge = style({ width: "fit", flexShrink: 0 });
const variants = {
  categorical: "neutral",
  sequential: "informative",
  diverging: "notice",
} as const;
const labels = {
  categorical: "Categorical",
  sequential: "Sequential",
  diverging: "Diverging",
};

export function DataVisScaleHeader({
  name,
  kind,
  colors,
  positions,
  background,
}: {
  name: string;
  kind: DataVisScale["kind"];
  colors: readonly string[];
  positions?: readonly number[];
  background: string;
}) {
  return (
    <header className="dataVisScaleHeader">
      <div className="dataVisScaleTitle">
        <h2 className={title}>{name}</h2>
        <Badge variant={variants[kind]} fillStyle="subtle" styles={badge}>
          {labels[kind]}
        </Badge>
      </div>
      <ScaleColorPreview
        colors={colors}
        positions={positions}
        continuous={kind !== "categorical"}
        interpolation={kind === "sequential" ? "oklch" : "oklab"}
        label={`${name} colors`}
        background={background}
        fluid
      />
    </header>
  );
}
