// Copyright 2026 Adobe. All rights reserved.
import { memo } from "react";
import {
  Axis,
  Bar,
  Chart,
  Donut,
  DonutSummary,
} from "@spectrum-charts/react-spectrum-charts-s2";
import { Scatter } from "@spectrum-charts/react-spectrum-charts-s2/lab";
import type { categoricalExample } from "../../../features/color-system/data-vis/examples";

interface Props {
  name: string;
  colors: string[];
  data: ReturnType<typeof categoricalExample>;
  background: string;
  colorScheme: "light" | "dark";
}

export const DataVisCategoricalCharts = memo(function DataVisCategoricalCharts({
  name,
  colors,
  data,
  background,
  colorScheme,
}: Props) {
  const common = {
    colors,
    colorScheme,
    backgroundColor: background,
    height: 224,
    renderer: "svg" as const,
    animations: false,
  };
  return (
    <div className="dataVisExampleGrid" data-kind="categorical">
      <div className="dataVisExampleChart" data-chart="bar">
        <Chart
          {...common}
          data={data.records}
          description={`${name} bar example`}
        >
          <Axis position="bottom" baseline title="Sample" />
          <Axis position="left" grid title="Metric 1" />
          <Bar
            dimension="sample"
            metric="metric1"
            color="category"
            type="stacked"
          />
        </Chart>
      </div>
      <div className="dataVisExampleChart" data-chart="donut">
        <Chart
          {...common}
          data={data.donut}
          description={`${name} donut example`}
        >
          <Donut metric="metric1" color="category" sortOrder="data">
            <DonutSummary label="Metric 1" />
          </Donut>
        </Chart>
      </div>
      <div className="dataVisExampleChart" data-chart="scatter">
        <Chart
          {...common}
          data={data.records}
          description={`${name} scatter example`}
        >
          <Axis position="bottom" baseline title="Metric 2" />
          <Axis position="left" grid title="Metric 3" />
          <Scatter dimension="metric2" metric="metric3" color="category" />
        </Chart>
      </div>
    </div>
  );
});
