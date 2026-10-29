// Copyright 2026 Adobe. All rights reserved.
import {
  Badge,
  Cell,
  Column,
  Meter,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { DataVisComparison } from "../../../features/color-system/data-vis/analysis";

const colors = style({ display: "flex", alignItems: "center", gap: 8 });
const swatch = style({
  width: 32,
  height: 32,
  flexShrink: 0,
  borderRadius: "sm",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
});
const meter = style({ minWidth: 128 });
const table = style({ height: 400, flexShrink: 0, minWidth: 0 });

export function DataVisComparisonTable({
  rows,
  deltaETarget,
}: {
  rows: readonly DataVisComparison[];
  deltaETarget?: number;
}) {
  const maximum = rows.reduce(
    (value, row) => Math.max(value, row.measurement.deltaE),
    100,
  );
  return (
    <TableView
      aria-label="Data vis color comparisons"
      density="compact"
      overflowMode="wrap"
      styles={table}
    >
      <TableHeader>
        <Column isRowHeader minWidth={200}>
          Colors
        </Column>
        <Column minWidth={100}>UI background</Column>
        <Column minWidth={100}>Contrast</Column>
        <Column minWidth={140}>WCAG non-text</Column>
        <Column minWidth={160}>Delta E 2000</Column>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <Row key={row.id} id={row.id}>
            <Cell>
              <div className={colors}>
                <span
                  role="img"
                  aria-label={row.firstLabel}
                  className={swatch}
                  style={{ background: row.measurement.first }}
                />
                <span
                  role="img"
                  aria-label={row.secondLabel}
                  className={swatch}
                  style={{ background: row.measurement.second }}
                />
                <span>
                  {row.firstLabel} / {row.secondLabel}
                </span>
              </div>
            </Cell>
            <Cell>
              <span
                role="img"
                aria-label={`UI background ${row.measurement.background}`}
                className={swatch}
                style={{
                  display: "block",
                  background: row.measurement.background,
                }}
              />
            </Cell>
            <Cell>{row.measurement.contrast.toFixed(3)}:1</Cell>
            <Cell>
              {row.wcagNonText === "not-applicable" ? (
                "Simulation, not a WCAG result"
              ) : (
                <Badge
                  variant={row.wcagNonText === "pass" ? "positive" : "negative"}
                >
                  {row.wcagNonText === "pass" ? "Pass (3:1)" : "Fail (3:1)"}
                </Badge>
              )}
            </Cell>
            <Cell>
              <Meter
                styles={meter}
                aria-label={`Delta E between ${row.firstLabel} and ${row.secondLabel}`}
                label="Delta E 2000"
                value={row.measurement.deltaE}
                minValue={0}
                maxValue={maximum}
                valueLabel={row.measurement.deltaE.toFixed(2)}
              />
              {deltaETarget !== undefined && (
                <span>
                  {row.measurement.deltaE >= deltaETarget ? "Meets" : "Below"}{" "}
                  {deltaETarget} difference target
                </span>
              )}
            </Cell>
          </Row>
        ))}
      </TableBody>
    </TableView>
  );
}
