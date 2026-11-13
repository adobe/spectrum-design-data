// Copyright 2026 Adobe. All rights reserved.
import type { quantitativeExample } from "../../../features/color-system/data-vis/examples";

export function DataVisHeatmap({
  name,
  records,
}: {
  name: string;
  records: ReturnType<typeof quantitativeExample>;
}) {
  return (
    <svg
      className="dataVisExampleHeatmap"
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${name} heat map example`}
    >
      <desc>
        The same regional Metric 1 values and colors as the choropleth.
      </desc>
      {records.map((record) => (
        <rect
          key={record.id}
          x={record.column * 40 + 1}
          y={record.row * 40 + 1}
          width={38}
          height={38}
          rx={3}
          fill={record.color}
        >
          <title>
            {record.region}: {record.value.toFixed(2)}
          </title>
        </rect>
      ))}
    </svg>
  );
}
