// Copyright 2026 Adobe. All rights reserved.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { LoadingIndicator } from "../../../components/LoadingIndicator";
import { DataVisHeatmap } from "./DataVisHeatmap";
import { dataVisStatePaths } from "../../../assets/dataVisStates";
import {
  categoricalExample,
  quantitativeExample,
  type QuantitativeExampleKind,
} from "../../../features/color-system/data-vis/examples";
import "./DataVisExamples.css";

const CategoricalCharts = lazy(() =>
  import("./DataVisCategoricalCharts").then((module) => ({
    default: module.DataVisCategoricalCharts,
  })),
);

export type DataVisExamplesProps = {
  name: string;
  background: string;
  colorScheme: "light" | "dark";
} & (
  | { kind: "categorical"; colors: readonly string[] }
  | { kind: QuantitativeExampleKind; evaluate: (position: number) => string }
);

export function DataVisExamples(props: DataVisExamplesProps) {
  return props.kind === "categorical" ? (
    <CategoricalExamples {...props} />
  ) : (
    <QuantitativeExamples {...props} />
  );
}

function CategoricalExamples({
  name,
  colors,
  background,
  colorScheme,
}: Extract<DataVisExamplesProps, { kind: "categorical" }>) {
  const data = useMemo(
    () => categoricalExample(colors.length),
    [colors.length],
  );
  const palette = useMemo(() => [...colors], [colors]);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLElement>(null);
  useEffect(() => {
    const target = frame.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      {
        root: target.closest('[data-component="DataVisElements"]'),
        rootMargin: "240px 0px",
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return (
    <figure className="dataVisExampleFigure" ref={frame}>
      {!colors.length ? (
        <p>No categorical colors to preview.</p>
      ) : visible ? (
        <Suspense
          fallback={
            <div className="dataVisExampleChart">
              <LoadingIndicator size="M" aria-label="Loading chart examples" />
            </div>
          }
        >
          <CategoricalCharts
            name={name}
            colors={palette}
            data={data}
            background={background}
            colorScheme={colorScheme}
          />
        </Suspense>
      ) : (
        <div
          className="dataVisExampleGrid"
          data-kind="categorical"
          aria-hidden="true"
        >
          <div className="dataVisExampleChart" />
          <div className="dataVisExampleChart" />
          <div className="dataVisExampleChart" />
        </div>
      )}
      {!!colors.length && (
        <Disclosure
          isQuiet
          isExpanded={expanded}
          onExpandedChange={setExpanded}
        >
          <DisclosureTitle>Sample data</DisclosureTitle>
          <DisclosurePanel>
            {expanded && (
              <div className="dataVisExampleTable">
                <TableView
                  aria-label={`${name} sample data`}
                  density="compact"
                  overflowMode="wrap"
                >
                  <TableHeader>
                    <Column isRowHeader>Category</Column>
                    <Column>Sample</Column>
                    <Column>Metric 1</Column>
                    <Column>Metric 2</Column>
                    <Column>Metric 3</Column>
                  </TableHeader>
                  <TableBody>
                    {data.records.map((record) => (
                      <Row id={record.id} key={record.id}>
                        <Cell>{record.category}</Cell>
                        <Cell>{record.sample}</Cell>
                        <Cell>{record.metric1.toFixed(2)}</Cell>
                        <Cell>{record.metric2.toFixed(2)}</Cell>
                        <Cell>{record.metric3.toFixed(2)}</Cell>
                      </Row>
                    ))}
                  </TableBody>
                </TableView>
              </div>
            )}
          </DisclosurePanel>
        </Disclosure>
      )}
    </figure>
  );
}

function QuantitativeExamples({
  name,
  kind,
  evaluate,
}: Extract<DataVisExamplesProps, { kind: QuantitativeExampleKind }>) {
  const records = useMemo(
    () => quantitativeExample(kind, evaluate),
    [kind, evaluate],
  );
  const byId = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records],
  );
  const [expanded, setExpanded] = useState(false);
  return (
    <figure className="dataVisExampleFigure">
      <div className="dataVisExampleGrid" data-kind={kind}>
        <svg
          className="dataVisExampleMap"
          viewBox="0 0 975 610"
          role="img"
          aria-label={`${name} choropleth example`}
        >
          <desc>
            Regions are colored by Metric 1. Exact values are available in
            Sample data.
          </desc>
          {dataVisStatePaths.map((state) => {
            const record = byId.get(state.id)!;
            return (
              <path
                key={state.id}
                d={state.path}
                fill={record.color}
                stroke="var(--elements-preview-divider, currentColor)"
                strokeWidth={0.75}
                strokeLinejoin="round"
              >
                <title>
                  {record.region}: {record.value.toFixed(2)}
                </title>
              </path>
            );
          })}
        </svg>
        <DataVisHeatmap name={name} records={records} />
      </div>
      <Disclosure isQuiet isExpanded={expanded} onExpandedChange={setExpanded}>
        <DisclosureTitle>Sample data</DisclosureTitle>
        <DisclosurePanel>
          {expanded && (
            <div className="dataVisExampleTable">
              <TableView
                aria-label={`${name} sample data`}
                density="compact"
                overflowMode="wrap"
              >
                <TableHeader>
                  <Column isRowHeader>Region</Column>
                  <Column>Metric 1</Column>
                  <Column>Function position</Column>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <Row id={record.id} key={record.id}>
                      <Cell>{record.region}</Cell>
                      <Cell>{record.value.toFixed(2)}</Cell>
                      <Cell>{record.position.toFixed(4)}</Cell>
                    </Row>
                  ))}
                </TableBody>
              </TableView>
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
    </figure>
  );
}
