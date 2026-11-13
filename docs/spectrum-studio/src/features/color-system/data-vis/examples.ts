// Copyright 2026 Adobe. All rights reserved.
import { categoricalProfiles, regionMeasurements } from "./exampleFixtures";

export type QuantitativeExampleKind = "sequential" | "diverging";
export type CategoricalExampleRecord = {
  id: string;
  category: string;
  sample: string;
  metric1: number;
  metric2: number;
  metric3: number;
};

export function categoricalExample(count: number) {
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error("The example needs a valid categorical color count.");
  const records: CategoricalExampleRecord[] = [];
  for (let index = 0; index < count; index++) {
    const profile =
      categoricalProfiles[
        count <= categoricalProfiles.length
          ? Math.floor((index * categoricalProfiles.length) / count)
          : index % categoricalProfiles.length
      ];
    profile.forEach(([magnitude, x, y], sample) => {
      records.push({
        id: `${index}-${sample}`,
        category: `Category ${index + 1}`,
        sample: `Sample ${sample + 1}`,
        metric1: magnitude / 1_000_000,
        metric2: x / 1_000,
        metric3: y,
      });
    });
  }
  return {
    records,
    donut: records.filter((record) => record.sample === "Sample 5"),
  };
}

export function normalizeExampleValue(
  value: number,
  kind: QuantitativeExampleKind,
  minimum: number,
  maximum: number,
) {
  if (
    ![value, minimum, maximum].every(Number.isFinite) ||
    minimum >= maximum ||
    value < minimum ||
    value > maximum ||
    (kind === "diverging" && !(minimum < 0 && maximum > 0))
  )
    throw new Error("The example needs a finite value within its data domain.");
  return kind === "sequential"
    ? (value - minimum) / (maximum - minimum)
    : value <= 0
      ? 0.5 * (1 - value / minimum)
      : 0.5 + (0.5 * value) / maximum;
}

function prepareRegions(kind: QuantitativeExampleKind) {
  const incomes = regionMeasurements
    .map(([, , income]) => income)
    .sort((a, b) => a - b);
  const median = (incomes[24] + incomes[25]) / 2;
  const values = regionMeasurements.map(([, rate, income]) =>
    kind === "sequential" ? rate : income - median,
  );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return regionMeasurements.map(([id], index) => ({
    id,
    region: `Region ${index + 1}`,
    value: values[index],
    position: normalizeExampleValue(values[index], kind, minimum, maximum),
    row: Math.floor(index / 10),
    column: index % 10,
  }));
}

const regions = {
  sequential: prepareRegions("sequential"),
  diverging: prepareRegions("diverging"),
};

export function quantitativeExample(
  kind: QuantitativeExampleKind,
  evaluate: (position: number) => string,
) {
  return regions[kind].map((record) => ({
    ...record,
    color: evaluate(record.position),
  }));
}
