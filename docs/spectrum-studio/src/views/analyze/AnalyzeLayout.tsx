// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Badge, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue } from "jotai";
import { useId, useState, type ReactNode } from "react";
import {
  isPreviewDriven,
  previewOnlyParameterIdsAtom,
} from "../../features/modes/preview";
import { FoundationsElementsHeader } from "../FoundationsElementsHeader";
import "../chartLayout.css";

type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

const pageStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 16,
  minWidth: 0,
  minHeight: "full",
  overflow: "auto",
  color: "neutral",
});
const settingsStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 16,
  minWidth: 0,
});
const gridStyles = style({
  display: "grid",
  gap: 16,
  minWidth: 0,
  alignItems: "start",
});
const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  minWidth: 0,
});
const cardHeaderStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 12,
  minWidth: 0,
});
const cardSettingsStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  marginStart: "auto",
});
const cardTitleStyles = style({
  font: "title-sm",
  fontSize: "[14px]",
  margin: 0,
});
export const analyzeNoteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
export const analyzeTableScrollStyles = style({
  overflow: "auto",
  maxHeight: 420,
  minWidth: 0,
});
export const analyzeTableStyles = style({
  width: "full",
  borderCollapse: "collapse",
  font: "body-sm",
  fontSize: "[12px]",
});
export const analyzeTableHeaderStyles = style({
  textAlign: "start",
  font: "detail",
  fontSize: "[12px]",
  color: "neutral-subdued",
  padding: 8,
  position: "sticky",
  top: 0,
  backgroundColor: "layer-1",
});
export const analyzeTableCellStyles = style({
  textAlign: "start",
  padding: 8,
  borderTopWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-200",
});

/** Header badge shown while the displayed charts use preview-only setting values. */
export function usePreviewData(drivers: readonly string[]) {
  return isPreviewDriven(useAtomValue(previewOnlyParameterIdsAtom), drivers);
}

/**
 * Shared Analyze page: foundation title with an optional "Preview data" badge,
 * then the page's tabs, settings row and chart cards as children.
 */
export function AnalyzePage({
  component,
  title,
  previewData = false,
  children,
}: {
  /** `data-component` value, such as `OpacityAnalyze`. */
  component: string;
  title: string;
  previewData?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`${pageStyles} chartComparisonContainer`}
      data-component={component}
    >
      <FoundationsElementsHeader
        title={title}
        controls={
          previewData ? <Badge variant="notice">Preview data</Badge> : undefined
        }
      />
      {children}
    </div>
  );
}

/** Settings that change every chart on the page, in one row under the title. */
export function AnalyzeSettings({
  label = "Analysis settings",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={settingsStyles} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/** One column, or two at 1000px wide and above. `gridClassName` replaces the multi-card columns. */
export function AnalyzeCardGrid({
  count,
  gridClassName = "chartComparisonGrid",
  children,
}: {
  count: number;
  gridClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${gridStyles} ${count > 1 ? gridClassName : "chartSingleGrid"}`}
      data-chart-grid
    >
      {children}
    </div>
  );
}

export type ChartCardProps = DataAttributes & {
  title: ReactNode;
  /** Accessible name; defaults to `<title> chart` when the title is text. */
  label?: string;
  /** Settings that change only this chart. */
  settings?: ReactNode;
  children: ReactNode;
  /** Values table revealed by the footer's Show values button. */
  values?: ReactNode;
  /** Opens the values table on first render. */
  defaultShowValues?: boolean;
  component?: string;
};

/** Card holding one chart: title and own settings, chart, notes, then a Show values footer. */
export function ChartCard({
  title,
  label,
  settings,
  children,
  values,
  defaultShowValues = false,
  component,
  ...data
}: ChartCardProps) {
  const [showValues, setShowValues] = useState(defaultShowValues);
  const valuesId = useId();
  return (
    <section
      className={cardStyles}
      aria-label={
        label ?? (typeof title === "string" ? `${title} chart` : undefined)
      }
      data-component={component}
      {...data}
    >
      <div className={cardHeaderStyles}>
        <h3 className={cardTitleStyles}>{title}</h3>
        {settings && <div className={cardSettingsStyles}>{settings}</div>}
      </div>
      {children}
      {values !== undefined && (
        <div>
          <ActionButton
            aria-expanded={showValues}
            aria-controls={valuesId}
            onPress={() => setShowValues((shown) => !shown)}
          >
            <Text>{showValues ? "Hide values" : "Show values"}</Text>
          </ActionButton>
        </div>
      )}
      {values !== undefined && showValues && <div id={valuesId}>{values}</div>}
    </section>
  );
}

/** Standard values table: column headings and plain text rows. */
export function AnalyzeValuesTable({
  label,
  headings,
  rows,
}: {
  label: string;
  headings: readonly string[];
  rows: readonly { id: string; values: readonly ReactNode[] }[];
}) {
  return (
    <div className={analyzeTableScrollStyles}>
      <table aria-label={label} className={analyzeTableStyles}>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className={analyzeTableHeaderStyles}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.values.map((value, index) =>
                index === 0 ? (
                  <th
                    key={index}
                    scope="row"
                    className={analyzeTableCellStyles}
                  >
                    {value}
                  </th>
                ) : (
                  <td key={index} className={analyzeTableCellStyles}>
                    {value}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
