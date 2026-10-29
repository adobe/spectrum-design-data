// Copyright 2026 Adobe. All rights reserved.
import {
  Cell,
  Column,
  Disclosure,
  DisclosurePanel,
  DisclosureTitle,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  dataVisExampleBars,
  dataVisExampleCells,
} from "../../../features/color-system/data-vis/examples";

const example = style({
  width: "full",
  maxWidth: 640,
  height: 200,
  display: "block",
});
const caption = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });
const figure = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  margin: 0,
  minWidth: 0,
});

export function DataVisExamples({
  name,
  colors,
  evaluate,
  diverging = false,
}: {
  name: string;
  colors: readonly string[];
  evaluate?: (position: number) => string;
  diverging?: boolean;
}) {
  if (evaluate) {
    const cells = dataVisExampleCells(diverging);
    return (
      <figure className={figure}>
        <svg
          className={example}
          viewBox="0 0 640 200"
          role="img"
          aria-label={`${name} heatmap example`}
        >
          <desc>
            Sample data is normalized by this example, not stored in the color
            Foundation. Exact values are available in the sample values table.
          </desc>
          {cells.map((cell, index) => (
            <rect
              key={index}
              x={(cell.column - 1) * 53}
              y={(cell.row - 1) * 48}
              width={49}
              height={44}
              rx={3}
              fill={evaluate(cell.position)}
            >
              <title>
                Row {cell.row}, column {cell.column}: {cell.value.toFixed(2)}
              </title>
            </rect>
          ))}
        </svg>
        <figcaption className={caption}>
          {diverging
            ? "This example owns a -4 to 7 data range with a zero midpoint."
            : "This example owns a 0 to 1 data range."}{" "}
          The function itself remains continuous.
        </figcaption>
        <Disclosure isQuiet>
          <DisclosureTitle>Sample values</DisclosureTitle>
          <DisclosurePanel>
            <TableView
              aria-label={`${name} sample values`}
              density="compact"
              overflowMode="wrap"
            >
              <TableHeader>
                <Column isRowHeader>Cell</Column>
                <Column>Value</Column>
                <Column>Function position</Column>
              </TableHeader>
              <TableBody>
                {cells.map((cell, index) => (
                  <Row id={index} key={index}>
                    <Cell>
                      Row {cell.row}, column {cell.column}
                    </Cell>
                    <Cell>{cell.value.toFixed(2)}</Cell>
                    <Cell>{cell.position.toFixed(4)}</Cell>
                  </Row>
                ))}
              </TableBody>
            </TableView>
          </DisclosurePanel>
        </Disclosure>
      </figure>
    );
  }
  const bars = dataVisExampleBars(colors.length);
  return (
    <figure className={figure}>
      <svg
        className={example}
        viewBox="0 0 640 200"
        role="img"
        aria-label={`${name} category example`}
      >
        <desc>
          Each numbered category uses one saved member in its selected order.
          Exact values are available in the sample values table.
        </desc>
        {bars.map((bar, index) => (
          <g key={bar.category}>
            <rect
              x={8 + (index * 624) / bars.length}
              y={180 - bar.value}
              width={Math.max(2, 624 / bars.length - 8)}
              height={bar.value}
              rx={3}
              fill={colors[index]}
            >
              <title>
                Category {bar.category}: {bar.value}
              </title>
            </rect>
            <text
              x={8 + ((index + 0.5) * 624) / bars.length - 4}
              y={196}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
            >
              {bar.category}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={caption}>
        {colors.length ? (
          <>
            Sample categories use the saved order
            {colors.length > 20
              ? "; this small example shows the first 20"
              : ""}
            . No extra tokens are created.
          </>
        ) : (
          "No categorical colors to preview."
        )}
      </figcaption>
      {bars.length > 0 && (
        <Disclosure isQuiet>
          <DisclosureTitle>Sample values</DisclosureTitle>
          <DisclosurePanel>
            <TableView
              aria-label={`${name} sample values`}
              density="compact"
              overflowMode="wrap"
            >
              <TableHeader>
                <Column isRowHeader>Category</Column>
                <Column>Value</Column>
              </TableHeader>
              <TableBody>
                {bars.map((bar) => (
                  <Row id={bar.category} key={bar.category}>
                    <Cell>{bar.category}</Cell>
                    <Cell>{bar.value}</Cell>
                  </Row>
                ))}
              </TableBody>
            </TableView>
          </DisclosurePanel>
        </Disclosure>
      )}
    </figure>
  );
}
