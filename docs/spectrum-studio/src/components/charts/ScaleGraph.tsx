// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { graphSeriesStyle } from "../logic/scaleGraphAppearance";
import {
  chartPath,
  chartSegments,
  type ChartPoint,
  type ChartLineType,
} from "./chartPaths";
import { chartGutters as PADDING, useChartViewport } from "./chartViewport";

export interface GraphPoint {
  index: number;
  step: number;
  raw: number;
  value: number;
}

const frameStyles = style({
  color: "neutral",
  width: "full",
  height: 360,
  display: "block",
});
const accentStyles = style({ color: "accent" });
const mutedStyles = style({ color: "neutral-subdued" });

const HEIGHT = 360;

/** Round the tick step to 1, 2, 2.5, 5 × a power of ten so axis labels read cleanly. */
function niceStep(rough: number) {
  if (!(rough > 0)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const factor =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;
  return factor * magnitude;
}

function formatTick(value: number) {
  return String(Math.round(value * 100) / 100);
}

export interface GraphSeries {
  id: string;
  label: string;
  isBaseline: boolean;
  points: readonly GraphPoint[];
}

interface ComparisonGraphProps {
  label: string;
  series: readonly GraphSeries[];
  domain: readonly GraphPoint[];
  ticks: readonly { index: number; label: string }[];
  reference: { index: number; label: string };
  xLabel: string;
  yLabel: string;
}

const seriesColors = [
  accentStyles,
  style({ color: "purple-900" }),
  style({ color: "green-900" }),
  style({ color: "orange-900" }),
  style({ color: "cyan-900" }),
  style({ color: "magenta-900" }),
];
const legendStyles = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  font: "body-sm",
  fontSize: "[12px]",
  padding: 0,
  margin: 0,
  listStyleType: "none",
});
const graphScrollStyles = style({ overflow: "auto", minWidth: 0 });
const comparisonFrameStyles = style({
  color: "neutral",
  width: "full",
  minWidth: 360,
  height: 360,
  display: "block",
});

function SeriesMarker({
  x,
  y,
  shape,
}: {
  x: number;
  y: number;
  shape: number;
}) {
  return shape === 0 ? (
    <circle cx={x} cy={y} r={2.5} fill="currentColor" />
  ) : (
    <rect
      x={x - 2.5}
      y={y - 2.5}
      width={5}
      height={5}
      fill="currentColor"
      transform={shape === 2 ? `rotate(45 ${x} ${y})` : undefined}
    />
  );
}

function ComparisonGraph({
  label,
  series,
  domain,
  ticks: xTicks,
  reference,
  xLabel,
  yLabel,
}: ComparisonGraphProps) {
  const { width, ref } = useChartViewport();
  const finite = domain.filter(
    (point) => Number.isFinite(point.raw) && Number.isFinite(point.value),
  );
  if (!finite.length)
    return (
      <p role="status" className={mutedStyles}>
        There are no comparison values to plot.
      </p>
    );
  const minIndex = Math.min(...finite.map((point) => point.index));
  const maxIndex = Math.max(...finite.map((point) => point.index));
  const all = finite.flatMap((point) => [point.raw, point.value]);
  const step = niceStep((Math.max(0, ...all) - Math.min(0, ...all)) / 5);
  const yMin = Math.floor(Math.min(0, ...all) / step) * step;
  const yMax = Math.max(
    Math.ceil(Math.max(0, ...all) / step) * step,
    yMin + step,
  );
  const x = (index: number) =>
    PADDING.left +
    (maxIndex === minIndex
      ? (width - PADDING.left - PADDING.right) / 2
      : ((index - minIndex) / (maxIndex - minIndex)) *
        (width - PADDING.left - PADDING.right));
  const y = (value: number) =>
    PADDING.top +
    (1 - (value - yMin) / (yMax - yMin)) * (HEIGHT - PADDING.top - 80);
  const yTicks: number[] = [];
  for (let tick = yMin; tick <= yMax + step / 2; tick += step)
    yTicks.push(tick);
  const tickCapacity = Math.max(
    2,
    Math.floor(
      (width - PADDING.left - PADDING.right) /
        (xLabel === "Token step" ? 40 : 80),
    ),
  );
  const labelEvery = Math.max(1, Math.ceil(xTicks.length / tickCapacity));
  return (
    <div>
      <ul aria-label={`${label} lines`} className={legendStyles}>
        {series.map((line) => {
          const treatment = graphSeriesStyle(line.id, line.isBaseline);
          return (
            <li key={line.id}>
              <svg
                aria-hidden="true"
                width="32"
                height="12"
                className={seriesColors[treatment.color]}
              >
                <line
                  x1="0"
                  x2="30"
                  y1="6"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray={treatment.dash}
                  vectorEffect="non-scaling-stroke"
                />
                <SeriesMarker x={15} y={6} shape={treatment.shape} />
              </svg>{" "}
              {line.label}
            </li>
          );
        })}
      </ul>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Scrollable plots need keyboard focus. */}
      <div
        className={graphScrollStyles}
        role="region"
        aria-label={`${label} plot`}
        tabIndex={0}
      >
        <svg
          ref={ref}
          role="img"
          aria-label={label}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className={comparisonFrameStyles}
        >
          <desc>{`${xLabel} compared with ${yLabel}. ${reference.label} is marked. Use Show values for exact numbers.`}</desc>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                strokeOpacity={0.12}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PADDING.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="12"
                fill="currentColor"
                fillOpacity={0.7}
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}
          <line
            x1={x(reference.index)}
            x2={x(reference.index)}
            y1={PADDING.top}
            y2={HEIGHT - 80}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={x(reference.index)}
            y={HEIGHT - 30}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
          >
            {reference.label}
          </text>
          {xTicks.map(
            (tick, index) =>
              (index % labelEvery === 0 ||
                tick.index === reference.index ||
                index === xTicks.length - 1) && (
                <text
                  key={tick.index}
                  x={x(tick.index)}
                  y={HEIGHT - 62}
                  textAnchor="end"
                  transform={`rotate(-30 ${x(tick.index)} ${HEIGHT - 62})`}
                  fontSize="12"
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  {tick.label}
                </text>
              ),
          )}
          <text
            x={width / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
          >
            {xLabel}
          </text>
          {series.map((line) => {
            const treatment = graphSeriesStyle(line.id, line.isBaseline);
            const points = line.points.filter(
              (point) =>
                Number.isFinite(point.raw) && Number.isFinite(point.value),
            );
            return (
              <g
                key={line.id}
                data-series-id={line.id}
                data-baseline={line.isBaseline}
                className={seriesColors[treatment.color]}
              >
                <polyline
                  points={points
                    .map((point) => `${x(point.index)},${y(point.raw)}`)
                    .join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray={treatment.dash}
                  vectorEffect="non-scaling-stroke"
                />
                {points.map((point) => (
                  <g key={point.index}>
                    <title>{`${line.label}, ${xTicks.find((tick) => tick.index === point.index)?.label}: ${Number(point.raw.toFixed(6))} ${yLabel}${point.raw !== point.value ? `, rounded ${Number(point.value.toFixed(6))}` : ""}`}</title>
                    <SeriesMarker
                      x={x(point.index)}
                      y={y(point.raw)}
                      shape={treatment.shape}
                    />
                    {point.raw !== point.value && (
                      <circle
                        cx={x(point.index)}
                        cy={y(point.value)}
                        r={3}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function ScaleGraph(
  props:
    | { points: readonly GraphPoint[]; label: string }
    | ComparisonGraphProps
    | NumericGraphProps,
) {
  if ("kind" in props) return <NumericGraph {...props} />;
  return "points" in props ? (
    <SingleScaleTypeGraph {...props} />
  ) : (
    <ComparisonGraph {...props} />
  );
}

export interface NumericSeries {
  id: string;
  label: string;
  points: readonly ChartPoint[];
  isBaseline?: boolean;
  dashed?: boolean;
}
export interface NumericGraphProps {
  kind: "numeric";
  label: string;
  series: readonly NumericSeries[];
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  ticks?: readonly { index: number; label: string }[];
  xLabel: string;
  yLabel: string;
  percent?: boolean;
  lineType?: ChartLineType;
  markers?: boolean;
  connectPoints?: boolean;
}

const numericFrameStyles = style({
  color: "neutral",
  width: "full",
  minWidth: 300,
  height: 240,
  display: "block",
});

function NumericGraph({
  label,
  series,
  xDomain,
  yDomain,
  ticks,
  xLabel,
  yLabel,
  percent,
  lineType = "linear",
  markers = true,
  connectPoints = true,
}: NumericGraphProps) {
  const { width, ref } = useChartViewport();
  const height = 240;
  const plotWidth = width - PADDING.left - PADDING.right;
  const bottom = height - PADDING.bottom;
  const x = (value: number) =>
    PADDING.left +
    ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotWidth;
  const y = (value: number) =>
    bottom -
    ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * (bottom - PADDING.top);
  const actualPoints = series.flatMap((line) =>
    chartSegments(line.points).flat(),
  );
  if (!actualPoints.length)
    return (
      <p role="status" className={mutedStyles}>
        There are no values to plot for {label}.
      </p>
    );
  const yTicks = Array.from(
    { length: 5 },
    (_, i) => yDomain[0] + (i / 4) * (yDomain[1] - yDomain[0]),
  );
  const xTicks =
    ticks ??
    Array.from({ length: 5 }, (_, i) => {
      const value = xDomain[0] + (i / 4) * (xDomain[1] - xDomain[0]);
      return { index: value, label: formatTick(value) };
    });
  const every = Math.max(
    1,
    Math.ceil(xTicks.length / Math.max(2, Math.floor(plotWidth / 48))),
  );
  return (
    <div>
      <ul aria-label={`${label} lines`} className={legendStyles}>
        {series.map((line) => {
          const treatment = graphSeriesStyle(line.id, line.isBaseline);
          return (
            <li key={line.id}>
              <svg
                aria-hidden="true"
                width={32}
                height={12}
                className={seriesColors[treatment.color]}
              >
                <line
                  x1={0}
                  x2={30}
                  y1={6}
                  y2={6}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray={line.dashed ? "6 4" : treatment.dash}
                />
                <SeriesMarker x={15} y={6} shape={treatment.shape} />
              </svg>{" "}
              {line.label}
            </li>
          );
        })}
      </ul>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The chart may scroll at narrow widths. */}
      <div
        className={graphScrollStyles}
        role="region"
        aria-label={`${label} plot`}
        tabIndex={0}
      >
        <svg
          ref={ref}
          role="img"
          aria-label={label}
          viewBox={`0 0 ${width} ${height}`}
          className={numericFrameStyles}
        >
          <desc>{`${xLabel} compared with ${yLabel}. ${connectPoints ? "Lines are display paths" : "Markers are discrete values"}; use Show values for observed numbers.`}</desc>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                strokeOpacity={0.15}
              />
              <text
                x={PADDING.left - 6}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="currentColor"
              >
                {percent ? `${formatTick(tick * 100)}%` : formatTick(tick)}
              </text>
            </g>
          ))}
          {xTicks
            .filter(
              (_, index) => index % every === 0 || index === xTicks.length - 1,
            )
            .map((tick) => (
              <text
                key={tick.index}
                x={x(tick.index)}
                y={bottom + 14}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
              >
                {tick.label}
              </text>
            ))}
          <text
            x={PADDING.left + plotWidth / 2}
            y={height - 3}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
          >
            {xLabel}
          </text>
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${height / 2})`}
            fontSize={11}
            fill="currentColor"
          >
            {yLabel}
          </text>
          {series.map((line) => {
            const treatment = graphSeriesStyle(line.id, line.isBaseline);
            const projected = line.points.map((point) => ({
              ...point,
              x: x(point.x),
              y: point.y === null ? null : y(point.y),
            }));
            return (
              <g
                key={line.id}
                data-series-id={line.id}
                className={seriesColors[treatment.color]}
              >
                {connectPoints && (
                  <path
                    d={chartPath(projected, lineType)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray={line.dashed ? "6 4" : treatment.dash}
                  />
                )}
                {markers &&
                  chartSegments(line.points)
                    .flat()
                    .map((point) => (
                      <g key={point.x}>
                        <title>
                          {point.label ??
                            `${line.label}, ${formatTick(point.x)}: ${percent ? `${formatTick(point.y * 100)}%` : formatTick(point.y)}`}
                        </title>
                        <SeriesMarker
                          x={x(point.x)}
                          y={y(point.y)}
                          shape={treatment.shape}
                        />
                      </g>
                    ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Raw values as a line and rounded values as dots, by index; the base (index 0) is marked. */
function SingleScaleTypeGraph({
  points,
  label,
}: {
  points: readonly GraphPoint[];
  label: string;
}) {
  const { width, ref } = useChartViewport();
  const finite = points.filter((point) => Number.isFinite(point.raw));
  if (finite.length === 0) {
    return (
      <p className={mutedStyles} role="status">
        The formula produces no values to plot.
      </p>
    );
  }
  const indices = points.map((point) => point.index);
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);
  const all = finite.flatMap((point) =>
    Number.isFinite(point.value) ? [point.raw, point.value] : [point.raw],
  );
  const dataMin = Math.min(0, ...all);
  const dataMax = Math.max(0, ...all);
  const step = niceStep((dataMax - dataMin) / 5);
  const yMin = Math.floor(dataMin / step) * step;
  const yMax = Math.max(Math.ceil(dataMax / step) * step, yMin + step);
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (index: number) =>
    PADDING.left +
    (maxIndex === minIndex
      ? plotWidth / 2
      : ((index - minIndex) / (maxIndex - minIndex)) * plotWidth);
  const y = (value: number) =>
    PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  const ticks: number[] = [];
  for (let tick = yMin; tick <= yMax + step / 2; tick += step) ticks.push(tick);
  const line = finite
    .map((point) => `${x(point.index)},${y(point.raw)}`)
    .join(" ");
  const labelEvery = Math.max(
    1,
    Math.ceil(points.length / Math.max(2, Math.floor(plotWidth / 32))),
  );

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className={frameStyles}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="currentColor"
            strokeOpacity={tick === 0 ? 0.5 : 0.12}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={PADDING.left - 8}
            y={y(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="12"
            fill="currentColor"
            fillOpacity={0.7}
          >
            {formatTick(tick)}
          </text>
        </g>
      ))}
      {minIndex <= 0 && maxIndex >= 0 && (
        <line
          x1={x(0)}
          x2={x(0)}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {points.map(
        (point, position) =>
          (position % labelEvery === 0 || point.index === 0) && (
            <text
              key={point.index}
              x={x(point.index)}
              y={HEIGHT - PADDING.bottom + 18}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
              fillOpacity={0.7}
            >
              {point.index}
            </text>
          ),
      )}
      <g className={accentStyles}>
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {finite.map((point) => (
          <circle
            key={point.index}
            cx={x(point.index)}
            cy={y(point.raw)}
            r={2.5}
            fill="currentColor"
            fillOpacity={0.35}
          >
            <title>{`Index ${point.index}: ${formatTick(point.raw)}`}</title>
          </circle>
        ))}
      </g>
      {finite
        .filter(
          (point) => Number.isFinite(point.value) && point.value !== point.raw,
        )
        .map((point) => (
          <circle
            key={point.index}
            cx={x(point.index)}
            cy={y(point.value)}
            r={3}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`Index ${point.index} rounded: ${formatTick(point.value)}`}</title>
          </circle>
        ))}
    </svg>
  );
}
