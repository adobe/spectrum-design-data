// Copyright 2026 Adobe. All rights reserved.
import { Meter } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { HealthPillar } from "../../features/insights/model";
import { PillarBadge } from "./shared";
import { formatPercent } from "./labels";

function meterVariant(score: number) {
  if (score >= 0.9) return "positive";
  if (score >= 0.75) return "notice";
  return "negative";
}

function Trend({ pillar }: { pillar: HealthPillar }) {
  const delta = Math.round((pillar.score - pillar.previousScore) * 100);
  if (delta === 0)
    return (
      <span className={style({ font: "detail-sm", color: "gray-700" })}>
        No change since last release
      </span>
    );
  const improved = delta > 0;
  return (
    <span
      className={
        improved
          ? style({ font: "detail-sm", color: "green-900" })
          : style({ font: "detail-sm", color: "negative" })
      }
    >
      <span aria-hidden="true">{improved ? "▲" : "▼"} </span>
      {improved ? "Up" : "Down"} {Math.abs(delta)}{" "}
      {Math.abs(delta) === 1 ? "point" : "points"} since last release
    </span>
  );
}

export function HealthSummary({ pillars }: { pillars: HealthPillar[] }) {
  return (
    <section aria-labelledby="health-summary-heading">
      <h2
        id="health-summary-heading"
        className={style({ font: "heading-sm", margin: 0, marginBottom: 16 })}
      >
        System health
      </h2>
      <ul className="homeHealthPillars">
        {pillars.map((pillar) => (
          <li
            key={pillar.id}
            data-pillar={pillar.id}
            className={style({
              display: "flex",
              flexDirection: "column",
              alignItems: "start",
              gap: 8,
            })}
          >
            <PillarBadge pillar={pillar} />
            <span className={style({ font: "heading-lg" })}>
              {formatPercent(pillar.score)}
            </span>
            <Meter
              aria-label={`${pillar.label} score`}
              value={pillar.score * 100}
              variant={meterVariant(pillar.score)}
              size="S"
              styles={style({ width: "full" })}
            />
            <Trend pillar={pillar} />
            <p
              className={style({
                font: "body-sm",
                color: "gray-700",
                margin: 0,
              })}
            >
              {pillar.summary}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
