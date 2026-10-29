// Copyright 2026 Adobe. All rights reserved.
export type ComparisonView = "settings" | "tokens";

export interface ComparisonItem {
  id: string;
  label: string;
  position: number;
  isRequired: boolean;
}

export interface ComparisonValue {
  raw: number;
  value: number;
  detail?: string;
}

export interface ComparisonMetric {
  id: string;
  label: string;
  unit: string;
  tokenNames: readonly string[];
  rows: readonly (readonly ComparisonValue[])[];
}

export interface ScaleComparisonDataset<
  Setting extends ComparisonItem = ComparisonItem,
> {
  settings: readonly Setting[];
  steps: readonly ComparisonItem[];
  metrics: readonly ComparisonMetric[];
}

export function defaultComparisonSelection(
  items: readonly ComparisonItem[],
  view: ComparisonView = "settings",
): string[] {
  const baseline = items.find((item) => item.isRequired);
  if (!baseline)
    throw new Error("Comparison data needs an always-visible baseline.");
  if (view === "tokens") return items.map((item) => item.id);
  const nearby = items
    .filter((item) => !item.isRequired)
    .sort(
      (a, b) =>
        Math.abs(a.position - baseline.position) -
        Math.abs(b.position - baseline.position),
    )
    .slice(0, 2);
  return [baseline.id, ...nearby.map((item) => item.id)];
}

export function comparisonSelection(
  items: readonly ComparisonItem[],
  selected: readonly string[],
): string[] {
  return items
    .filter((item) => item.isRequired || selected.includes(item.id))
    .map((item) => item.id);
}

export function comparisonSeries(
  dataset: ScaleComparisonDataset,
  metric: ComparisonMetric,
  view: ComparisonView,
  selected: readonly string[],
) {
  const items = view === "settings" ? dataset.settings : dataset.steps;
  const visible = comparisonSelection(items, selected);
  return items.flatMap((item, index) =>
    !visible.includes(item.id)
      ? []
      : [
          {
            id: item.id,
            label: view === "settings" ? item.label : metric.tokenNames[index],
            isBaseline: item.isRequired,
            points:
              view === "settings"
                ? dataset.steps.map((step, column) => ({
                    index: step.position,
                    step: Number(step.id),
                    ...metric.rows[index][column],
                  }))
                : dataset.settings.map((setting, row) => ({
                    index: setting.position,
                    step: Number(item.id),
                    ...metric.rows[row][index],
                  })),
          },
        ],
  );
}
