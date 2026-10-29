// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  FoundationDerivation,
  HealthPillar,
} from "../../features/insights/model";
import { ModuleHeading } from "./shared";
import { foundationLabel } from "./labels";

const SEGMENTS = [
  {
    key: "generated",
    label: "Formula-generated",
    className: style({ backgroundColor: "indigo-800" }),
  },
  {
    key: "ruleDerived",
    label: "Rule-derived",
    className: style({ backgroundColor: "indigo-400" }),
  },
  {
    key: "overridden",
    label: "Manual override",
    className: style({ backgroundColor: "yellow-600" }),
  },
  {
    key: "staleOverridden",
    label: "Stale override",
    className: style({ backgroundColor: "red-800" }),
  },
] as const;

export function DerivationBreakdown({
  derivation,
  pillar,
}: {
  derivation: FoundationDerivation[];
  pillar?: HealthPillar;
}) {
  return (
    <section aria-labelledby="derivation-heading">
      <ModuleHeading
        id="derivation-heading"
        title="Derived vs overridden"
        description="How much of each foundation is still driven by the system"
        pillar={pillar}
      />
      <ul
        className={`homeLegend ${style({ font: "detail-sm", color: "gray-800" })}`}
        aria-label="Derivation legend"
      >
        {SEGMENTS.map((segment) => (
          <li key={segment.key}>
            <span
              aria-hidden="true"
              className={`homeLegendSwatch ${segment.className}`}
            />
            {segment.label}
          </li>
        ))}
      </ul>
      <ul className="homeDerivationList">
        {derivation.map((row) => {
          const total = SEGMENTS.reduce(
            (sum, segment) => sum + row[segment.key],
            0,
          );
          const summary = SEGMENTS.map(
            (segment) => `${row[segment.key]} ${segment.label.toLowerCase()}`,
          ).join(", ");
          return (
            <li key={row.foundationId} className="homeDerivationRow">
              <span className={style({ font: "ui-sm" })}>
                {foundationLabel(row.foundationId)}
              </span>
              <div
                role="img"
                aria-label={`${foundationLabel(row.foundationId)}: ${summary}`}
                className="homeDerivationBar"
              >
                {SEGMENTS.map(
                  (segment) =>
                    row[segment.key] > 0 && (
                      <span
                        key={segment.key}
                        className={segment.className}
                        style={{ flexGrow: row[segment.key] }}
                      />
                    ),
                )}
              </div>
              <span
                className={style({
                  font: "detail-sm",
                  color: "gray-700",
                  textAlign: "end",
                })}
              >
                {row.staleOverridden > 0
                  ? `${row.staleOverridden} stale`
                  : `${total} values`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
