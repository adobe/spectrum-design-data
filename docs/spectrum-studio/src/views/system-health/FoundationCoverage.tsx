// Copyright 2026 Adobe. All rights reserved.
import { StatusLight } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  CoverageCapability,
  CoverageStatus,
  FoundationCoverage as FoundationCoverageRow,
  HealthPillar,
} from "../../features/insights/model";
import { ModuleHeading } from "./shared";
import { foundationLabel } from "./labels";

const CAPABILITIES: { id: CoverageCapability; label: string }[] = [
  { id: "formula", label: "Formula" },
  { id: "modes", label: "Modes" },
  { id: "adaptiveParameters", label: "Adaptive parameters" },
  { id: "tokens", label: "Tokens" },
  { id: "cssOutput", label: "CSS output" },
  { id: "designDataExport", label: "Design-data export" },
];

const STATUS = {
  complete: { variant: "positive", label: "Complete" },
  partial: { variant: "notice", label: "Partial" },
  missing: { variant: "neutral", label: "Missing" },
} as const satisfies Record<CoverageStatus, { variant: string; label: string }>;

export function FoundationCoverage({
  coverage,
  pillar,
}: {
  coverage: FoundationCoverageRow[];
  pillar?: HealthPillar;
}) {
  return (
    <section aria-labelledby="coverage-heading">
      <ModuleHeading
        id="coverage-heading"
        title="Foundation coverage"
        description="How far each foundation has progressed from formula to shippable output"
        pillar={pillar}
      />
      <div className={style({ overflowX: "auto" })}>
        <table className="homeCoverageTable">
          <thead>
            <tr>
              <th
                scope="col"
                className={style({
                  font: "detail-sm",
                  color: "gray-700",
                  fontWeight: "normal",
                  textAlign: "start",
                })}
              >
                Foundation
              </th>
              {CAPABILITIES.map((capability) => (
                <th
                  key={capability.id}
                  scope="col"
                  className={style({
                    font: "detail-sm",
                    color: "gray-700",
                    fontWeight: "normal",
                    textAlign: "start",
                  })}
                >
                  {capability.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coverage.map((row) => (
              <tr key={row.foundationId}>
                <th
                  scope="row"
                  className={style({
                    font: "ui",
                    fontWeight: "normal",
                    textAlign: "start",
                  })}
                >
                  {foundationLabel(row.foundationId)}
                </th>
                {CAPABILITIES.map((capability) => {
                  const status = STATUS[row.capabilities[capability.id]];
                  return (
                    <td key={capability.id}>
                      <StatusLight size="S" variant={status.variant}>
                        {status.label}
                      </StatusLight>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
