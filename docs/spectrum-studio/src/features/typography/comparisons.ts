// Copyright 2026 Adobe. All rights reserved.
import type { Rule } from "../logic/model";
import type { ModeSet } from "../modes/model";
import { parameterOwners, textZoomPercent } from "../modes/parameters";
import { generateScale } from "../scales/generate";
import type { Interpolation } from "../scales/interpolationDefinition";
import type { ScaleType } from "../scales/scaleType";
import type { TaxonomyDocument } from "../taxonomy/model";
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN, type TypographyDocument } from "./model";
import { resolveTypographyDocument } from "./resolution";
import {
  generateTypography,
  typographyScaleSettings,
} from "./typographyGeneration";
import { typographyTokenGroups, typographyTokenName } from "./typographyTokens";
import { formatTypographyNumber, toTypographyUnit } from "./units";
import type {
  ComparisonItem,
  ComparisonMetric,
  ComparisonValue,
  ScaleComparisonDataset,
} from "../scales/comparison";
export {
  comparisonSelection,
  comparisonSeries,
  defaultComparisonSelection,
} from "../scales/comparison";
export type {
  ComparisonItem,
  ComparisonMetric,
  ComparisonValue,
  ComparisonView,
} from "../scales/comparison";

export type ComparisonSource = "modes" | "zoom";

export interface ComparisonSetting extends ComparisonItem {
  textZoom: number;
}

export type ComparisonDataset = ScaleComparisonDataset<ComparisonSetting>;

export type ComparisonDatasets = {
  zoom: ComparisonDataset;
  modes?: ComparisonDataset;
};

interface ComparisonSample {
  steps: readonly ComparisonItem[];
  metrics: readonly Omit<ComparisonMetric, "rows">[];
  values: readonly (readonly ComparisonValue[])[];
}

function assertZoom(value: number) {
  if (
    !Number.isInteger(value) ||
    value < TEXT_ZOOM_MIN ||
    value > TEXT_ZOOM_MAX
  ) {
    throw new Error(
      "Choose a valid Text size setting before comparing values.",
    );
  }
}

export function textSizeComparisonSettings(
  document: TypographyDocument,
  modeSets: readonly ModeSet[],
) {
  assertZoom(document.textZoom);
  const ownerId = parameterOwners([...modeSets])["typography.textZoom"];
  const owner = modeSets.find((set) => set.id === ownerId);
  const zoom: ComparisonSetting[] = Array.from(
    { length: TEXT_ZOOM_MAX - TEXT_ZOOM_MIN + 1 },
    (_, index) => {
      const value = TEXT_ZOOM_MIN + index;
      return {
        id: `zoom:${value}`,
        textZoom: value,
        position: value,
        isRequired: value === document.textZoom,
        label: `${value === document.textZoom ? "Default" : `Zoom ${value}`} (${textZoomPercent(value)}%)`,
      };
    },
  );
  if (!owner) return { zoom };
  if (!owner.modes.some((mode) => mode.id === owner.defaultModeId)) {
    throw new Error(
      "Choose an available default mode before comparing Text size.",
    );
  }
  const modes = owner.modes
    .map((mode) => {
      const textZoom = resolveTypographyDocument(document, [mode], undefined, {
        modeSets: [...modeSets],
      }).textZoom;
      assertZoom(textZoom);
      const isRequired = mode.id === owner.defaultModeId;
      return {
        id: mode.id,
        textZoom,
        position: textZoom,
        isRequired,
        label: `${mode.name}${isRequired && mode.name.trim().toLowerCase() !== "default" ? " (default)" : ""} (${textZoomPercent(textZoom)}%)`,
      };
    })
    .sort((a, b) => a.textZoom - b.textZoom)
    .map((mode, position) => ({ ...mode, position }));
  return { zoom, modes };
}

function comparisonDatasets(
  settings: ReturnType<typeof textSizeComparisonSettings>,
  generate: (textZoom: number) => ComparisonSample,
): ComparisonDatasets {
  const samples = new Map<number, ComparisonSample>();
  const build = (items: readonly ComparisonSetting[]): ComparisonDataset => {
    const rows = items.map((item) => {
      if (!samples.has(item.textZoom))
        samples.set(item.textZoom, generate(item.textZoom));
      return samples.get(item.textZoom)!;
    });
    const first = rows[0];
    if (!first || !first.steps.some((step) => step.isRequired)) {
      throw new Error("Include the base token before comparing values.");
    }
    for (const sample of rows) {
      if (
        sample.steps.length !== first.steps.length ||
        sample.metrics.length !== first.metrics.length ||
        sample.steps.some((step, index) => step.id !== first.steps[index].id) ||
        sample.metrics.some(
          (metric, index) => metric.id !== first.metrics[index].id,
        )
      ) {
        throw new Error(
          "Comparison settings must use the same token steps and metrics.",
        );
      }
      if (
        sample.values.length !== first.metrics.length ||
        sample.values.some(
          (values) =>
            values.length !== first.steps.length ||
            values.some(
              (point) =>
                !Number.isFinite(point.raw) || !Number.isFinite(point.value),
            ),
        )
      ) {
        throw new Error(
          "Some comparison values could not be calculated. Check the formula.",
        );
      }
    }
    return {
      settings: items,
      steps: first.steps,
      metrics: first.metrics.map((metric, index) => ({
        ...metric,
        rows: rows.map((sample) => sample.values[index]),
      })),
    };
  };
  return {
    zoom: build(settings.zoom),
    ...(settings.modes ? { modes: build(settings.modes) } : {}),
  };
}

export function buildTypographyComparisons(
  document: TypographyDocument,
  modeSets: readonly ModeSet[],
  registry: TaxonomyDocument,
  library: {
    rules: readonly Rule[];
    scaleTypes: readonly ScaleType[];
    interpolations: readonly Interpolation[];
  },
): ComparisonDatasets {
  const naming = { names: document.metricNames, registry };
  const groups = typographyTokenGroups(document, naming).filter(
    (group) => !group.isUnitless,
  );
  let metadata: Pick<ComparisonSample, "steps" | "metrics"> | undefined;
  return comparisonDatasets(
    textSizeComparisonSettings(document, modeSets),
    (textZoom) => {
      const tokens = generateTypography(
        document,
        textZoom,
        library.rules,
        library.scaleTypes,
        library.interpolations,
      );
      metadata ??= {
        steps: tokens.map((token) => ({
          id: String(token.scale),
          label: `${token.scale}${token.position === 0 ? " (base)" : ""}`,
          position: token.position,
          isRequired: token.position === 0,
        })),
        metrics: groups.map((group) => ({
          id: group.id,
          label: group.label,
          unit: document.outputUnit,
          tokenNames: tokens.map((token) =>
            typographyTokenName(group, token, naming),
          ),
        })),
      };
      return {
        ...metadata,
        values: groups.map((group) =>
          tokens.map((token) => {
            const value = toTypographyUnit(
              group.value(token),
              document.outputUnit,
            );
            const card = document.lineHeights.find(
              (card) => group.id === `${card.id}-lineHeight`,
            );
            return {
              raw: value,
              value,
              ...(card
                ? {
                    detail: `${formatTypographyNumber(token.lineHeights[card.id].multiplier)} multiplier`,
                  }
                : {}),
            };
          }),
        ),
      };
    },
  );
}

export function buildTypeScaleComparisons(
  formula: ScaleType,
  document: TypographyDocument,
  modeSets: readonly ModeSet[],
  options: {
    below: number;
    above: number;
    roundingRuleId: string;
    rules: readonly Rule[];
    interpolations: readonly Interpolation[];
  },
): ComparisonDatasets {
  const preview = {
    ...document,
    scaleTypeId: formula.id,
    componentSize: "m" as const,
    smallSizes: options.below,
    largeSizes: options.above,
    textRoundingRuleId: options.roundingRuleId,
  };
  return comparisonDatasets(
    textSizeComparisonSettings(document, modeSets),
    (textZoom) => {
      const points = generateScale(
        typographyScaleSettings(
          preview,
          [formula],
          options.interpolations,
          textZoom,
        ),
        { scaleTypes: [formula], rules: options.rules },
      );
      return {
        steps: points.map((point) => ({
          id: String(point.step),
          label: `${point.step}${point.index === 0 ? " (base)" : ""}`,
          position: point.index,
          isRequired: point.index === 0,
        })),
        metrics: [
          {
            id: "font-size",
            label: "Font size",
            unit: "px",
            tokenNames: points.map((point) => `Step ${point.step}`),
          },
        ],
        values: [
          points.map((point) => ({ raw: point.raw, value: point.value })),
        ],
      };
    },
  );
}
