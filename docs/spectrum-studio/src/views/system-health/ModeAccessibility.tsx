// Copyright 2026 Adobe. All rights reserved.
import { Badge, Meter } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  HealthPillar,
  ModeCombinationAccessibility,
} from "../../features/insights/model";
import { ModuleHeading } from "./shared";

function meterVariant(row: ModeCombinationAccessibility) {
  if (row.passing === row.total) return "positive";
  return row.total - row.passing > 10 ? "negative" : "notice";
}

export function ModeAccessibility({
  combinations,
  pillar,
}: {
  combinations: ModeCombinationAccessibility[];
  pillar?: HealthPillar;
}) {
  return (
    <section aria-labelledby="mode-accessibility-heading">
      <ModuleHeading
        id="mode-accessibility-heading"
        title="Accessibility across modes"
        description="Contrast pass rate for every mode combination, including the ends of adaptive ranges"
        pillar={pillar}
      />
      <ul className="homeAccessibilityList">
        {combinations.map((row) => {
          const failing = row.total - row.passing;
          return (
            <li
              key={row.id}
              className={style({
                display: "flex",
                flexDirection: "column",
                gap: 4,
              })}
            >
              <div
                className={style({
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                })}
              >
                {row.isAdaptiveExtreme && (
                  <Badge size="S" variant="neutral" fillStyle="subtle">
                    Adaptive extreme
                  </Badge>
                )}
                <span
                  className={
                    failing > 0
                      ? style({
                          font: "detail-sm",
                          color: "negative",
                          marginStart: "auto",
                        })
                      : style({
                          font: "detail-sm",
                          color: "gray-700",
                          marginStart: "auto",
                        })
                  }
                >
                  {failing > 0 ? `${failing} failing pairs` : "All pairs pass"}
                </span>
              </div>
              <Meter
                label={row.modeLabels.join(" · ")}
                value={(row.passing / row.total) * 100}
                valueLabel={`${row.passing} / ${row.total}`}
                variant={meterVariant(row)}
                size="S"
                styles={style({ width: "full" })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
