// Copyright 2026 Adobe. All rights reserved.
import { Badge } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  DivergentToken,
  HealthPillar,
  PlatformDivergenceCell,
} from "../../features/insights/model";
import { ModuleHeading } from "./shared";
import { foundationLabel, formatPercent, platformName } from "./labels";

// S2 palette steps invert between color schemes, so text uses gray steps that invert with them.
const LEVELS = [
  {
    label: "None",
    max: 0,
    className: style({ backgroundColor: "gray-100", color: "gray-800" }),
  },
  {
    label: "Under 5%",
    max: 0.05,
    className: style({ backgroundColor: "fuchsia-200", color: "gray-900" }),
  },
  {
    label: "5–15%",
    max: 0.15,
    className: style({ backgroundColor: "fuchsia-400", color: "gray-900" }),
  },
  {
    label: "15–30%",
    max: 0.3,
    className: style({ backgroundColor: "fuchsia-900", color: "gray-25" }),
  },
  {
    label: "30% or more",
    max: Infinity,
    className: style({ backgroundColor: "fuchsia-1100", color: "gray-25" }),
  },
];

function levelFor(ratio: number) {
  return (
    LEVELS.find((level) => ratio <= level.max) ?? LEVELS[LEVELS.length - 1]
  );
}

function Heatmap({ cells }: { cells: PlatformDivergenceCell[] }) {
  const platformIds = [...new Set(cells.map((cell) => cell.platformId))];
  const foundationIds = [...new Set(cells.map((cell) => cell.foundationId))];
  return (
    <table className="homeHeatmap">
      <caption
        className={style({
          font: "detail-sm",
          color: "gray-700",
          textAlign: "start",
          paddingBottom: 8,
        })}
      >
        Share of each foundation's tokens a platform overrides
      </caption>
      <thead>
        <tr>
          <th scope="col">
            <span className={style({ font: "detail-sm", color: "gray-700" })}>
              Platform
            </span>
          </th>
          {foundationIds.map((foundationId) => (
            <th
              key={foundationId}
              scope="col"
              className={style({
                font: "detail-sm",
                color: "gray-700",
                fontWeight: "normal",
              })}
            >
              {foundationLabel(foundationId)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {platformIds.map((platformId) => (
          <tr key={platformId}>
            <th
              scope="row"
              className={style({
                font: "ui-sm",
                textAlign: "start",
                fontWeight: "normal",
              })}
            >
              {platformName(platformId)}
            </th>
            {foundationIds.map((foundationId) => {
              const cell = cells.find(
                (candidate) =>
                  candidate.platformId === platformId &&
                  candidate.foundationId === foundationId,
              );
              const ratio = cell ? cell.overriddenCount / cell.totalCount : 0;
              return (
                <td
                  key={foundationId}
                  className={`homeHeatmapCell ${levelFor(ratio).className}`}
                  title={
                    cell
                      ? `${cell.overriddenCount} of ${cell.totalCount} tokens overridden`
                      : undefined
                  }
                >
                  {formatPercent(ratio)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Legend() {
  return (
    <ul
      className={`homeLegend ${style({ font: "detail-sm", color: "gray-800" })}`}
      aria-label="Heatmap legend"
    >
      {LEVELS.map((level) => (
        <li key={level.label}>
          <span
            aria-hidden="true"
            className={`homeLegendSwatch ${level.className}`}
          />
          {level.label}
        </li>
      ))}
    </ul>
  );
}

function TopTokens({ tokens }: { tokens: DivergentToken[] }) {
  return (
    <section
      aria-labelledby="divergent-tokens-heading"
      className={style({ marginTop: 24 })}
    >
      <h4
        id="divergent-tokens-heading"
        className={style({ font: "title-sm", margin: 0, marginBottom: 8 })}
      >
        Most diverged tokens
      </h4>
      <ul className="homeTokenList">
        {tokens.map((token) => (
          <li key={token.tokenName} className="homeTokenItem">
            <div
              className={style({
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              })}
            >
              <code
                className={style({ font: "code-sm", overflowWrap: "anywhere" })}
              >
                {token.tokenName}
              </code>
              <span className={style({ font: "detail-sm", color: "gray-700" })}>
                {foundationLabel(token.foundationId)} ·{" "}
                {token.platformIds.length} platforms:{" "}
                {token.platformIds.map(platformName).join(", ")}
              </span>
            </div>
            {token.recommendation === "promote" ? (
              <Badge size="S" variant="informative">
                Opportunity: promote to foundation
              </Badge>
            ) : (
              <Badge size="S" variant="neutral" fillStyle="subtle">
                Expected platform difference
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlatformDivergence({
  cells,
  topTokens,
  pillar,
}: {
  cells: PlatformDivergenceCell[];
  topTokens: DivergentToken[];
  pillar?: HealthPillar;
}) {
  return (
    <section aria-labelledby="divergence-heading">
      <ModuleHeading
        id="divergence-heading"
        title="Platform divergence"
        description="Where platforms depart from the foundation, and whether the foundation should change instead"
        pillar={pillar}
      />
      <div className={style({ overflowX: "auto" })}>
        <Heatmap cells={cells} />
      </div>
      <Legend />
      <TopTokens tokens={topTokens} />
    </section>
  );
}
