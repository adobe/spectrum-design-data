// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  ScaleTypeGraph,
  type GraphPoint,
} from "../../components/logic/ScaleTypeGraph";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";

export interface AnalyzeGraph {
  label: string;
  heading: string;
  points: readonly GraphPoint[];
}

export interface AnalyzeRow {
  key: string;
  isBase: boolean;
  cells: readonly string[];
}

export interface AnalyzeSection {
  id: string;
  title: string;
  graphs: readonly AnalyzeGraph[];
  columns: readonly string[];
  rows: readonly AnalyzeRow[];
  /** Shown above the graphs, for example when some values could not be calculated. */
  warning?: string;
}

const containerStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 16,
  minHeight: "full",
  overflow: "auto",
});
const sectionStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 16,
  minWidth: 0,
});
const headingStyle = style({ font: "title", margin: 0 });
const subheadingStyle = style({
  font: "title-sm",
  fontSize: "[14px]",
  margin: 0,
});
const noteStyle = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const layoutStyle = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "start",
  gap: 24,
});
const graphColumnStyle = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  flexGrow: 1,
  flexBasis: 360,
  minWidth: 0,
});
const tableWrapperStyle = style({
  overflow: "auto",
  maxHeight: 420,
  flexGrow: 1,
  flexBasis: 280,
  minWidth: 0,
});
const tableStyle = style({
  width: "full",
  borderCollapse: "collapse",
  font: "code-sm",
});
const headerCellStyle = style({
  textAlign: "end",
  font: "detail",
  color: "neutral-subdued",
  paddingY: 4,
  paddingX: 8,
  position: "sticky",
  top: 0,
  backgroundColor: "layer-1",
});
const cellStyle = style({
  textAlign: "end",
  paddingY: 4,
  paddingX: 8,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});
const baseCellStyle = style({
  textAlign: "end",
  paddingY: 4,
  paddingX: 8,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
  fontWeight: "bold",
});

/** For each section, graphs of the generated values beside a table of every value. */
export function ScaleAnalyzeView({
  title,
  dataComponent,
  sections,
}: {
  title: string;
  dataComponent: string;
  sections: readonly AnalyzeSection[];
}) {
  return (
    <div data-component={dataComponent} className={containerStyle}>
      <FoundationsElementsHeader title={title} />
      {sections.map((section) => (
        <section
          key={section.id}
          className={sectionStyle}
          aria-labelledby={`${dataComponent}-${section.id}-heading`}
        >
          <h3
            id={`${dataComponent}-${section.id}-heading`}
            className={headingStyle}
          >
            {section.title}
          </h3>
          {section.warning && (
            <p role="alert" className={noteStyle}>
              {section.warning}
            </p>
          )}
          <div className={layoutStyle}>
            <div className={graphColumnStyle}>
              {section.graphs.map((graph) => (
                <div key={graph.label}>
                  <h4 className={subheadingStyle}>{graph.heading}</h4>
                  <ScaleTypeGraph label={graph.label} points={graph.points} />
                </div>
              ))}
              {section.graphs.some((graph) =>
                graph.points.some((point) => point.value !== point.raw),
              ) && (
                <p className={noteStyle}>
                  The line is the calculated value. Open circles are values
                  after rounding.
                </p>
              )}
            </div>
            <div className={tableWrapperStyle}>
              <table
                className={tableStyle}
                aria-label={`${section.title} values`}
              >
                <thead>
                  <tr>
                    {section.columns.map((column) => (
                      <th key={column} scope="col" className={headerCellStyle}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.key}>
                      {row.cells.map((cell, index) => (
                        <td
                          key={index}
                          className={row.isBase ? baseCellStyle : cellStyle}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
