// Copyright 2026 Adobe. All rights reserved.
import type { Rule } from "../logic/model";
import type { ModeSet } from "../modes/model";
import { resolveModeParameterValues } from "../modes/parameterResolution";
import {
  BINDABLE_PARAMETER_RANGES,
  FOUNDATION_PARAMETERS,
  formatParameterValue,
  parameterOwners,
  type FoundationDocuments,
} from "../modes/parameters";
import type { ComparisonItem, ScaleComparisonDataset } from "./comparison";
import type { DimensionScale, GeneratedDimensionValue } from "./foundation";
import {
  BASE_BINDING_KEY,
  generateScale,
  type ModeParameterValues,
} from "./generate";
import type { ScaleType } from "./scaleType";
import { dimensionIssues, type DimensionValuePolicy } from "./issues";

export interface DimensionComparisonInput {
  scale: DimensionScale;
  values: readonly GeneratedDimensionValue[];
  rules: readonly Rule[];
  scaleTypes: readonly ScaleType[];
  documents: FoundationDocuments;
  modeSets: readonly ModeSet[];
  current: ModeParameterValues;
  valuePolicy?: DimensionValuePolicy;
}

export interface DimensionComparisonSetting extends ComparisonItem {
  value: number;
}

export interface DimensionComparisons {
  parameterIds: readonly string[];
  parameterId?: string;
  range: ScaleComparisonDataset<DimensionComparisonSetting>;
  modes?: ScaleComparisonDataset<DimensionComparisonSetting>;
}

export function dimensionComparisonParameters(
  scale: DimensionScale,
  scaleTypes: readonly ScaleType[],
) {
  const formula = scaleTypes.find((item) => item.id === scale.scaleTypeId);
  if (!formula) throw new Error("The selected formula is unavailable.");
  const used = new Set([
    BASE_BINDING_KEY,
    ...formula.parameters
      .filter((part) => part.adaptable)
      .map((part) => part.id),
  ]);
  const ids = [
    ...new Set(
      Object.entries(scale.bindings ?? {})
        .filter(([key]) => used.has(key))
        .map(([, binding]) => binding.modeParameterId),
    ),
  ];
  for (const id of ids) {
    if (!BINDABLE_PARAMETER_RANGES[id])
      throw new Error(`The connected variable ${id} is unavailable.`);
  }
  return ids;
}

export function buildDimensionComparisons(
  input: DimensionComparisonInput,
  chosenParameter?: string,
): DimensionComparisons {
  const { scale, values, documents, modeSets, current } = input;
  if (
    input.valuePolicy === "non-negative" &&
    dimensionIssues(values, input.valuePolicy).issues.some(
      (issue) => issue !== "duplicate",
    )
  ) {
    throw new Error("Radius values must be finite and non-negative.");
  }
  const parameterIds = dimensionComparisonParameters(scale, input.scaleTypes);
  const parameterId =
    chosenParameter && parameterIds.includes(chosenParameter)
      ? chosenParameter
      : parameterIds[0];
  if (!input.rules.some((rule) => rule.id === scale.roundingRuleId))
    throw new Error("The selected rounding rule is unavailable.");
  if (!values.length || !values.some((value) => value.index === 0))
    throw new Error("Include the base token before comparing this scale.");
  const steps = values.map((point) => ({
    id: String(point.step),
    label: `${point.step}${point.index === 0 ? " (base)" : ""}`,
    position: point.index,
    isRequired: point.index === 0,
  }));
  const build = (
    settings: readonly DimensionComparisonSetting[],
  ): ScaleComparisonDataset<DimensionComparisonSetting> => {
    const rows = settings.map((setting) => {
      const points = parameterId
        ? generateScale(scale, input, {
            ...current,
            [parameterId]: setting.value,
          })
        : values;
      if (
        points.length !== steps.length ||
        points.some(
          (point, index) =>
            point.step !== Number(steps[index].id) ||
            !Number.isFinite(point.raw) ||
            !Number.isFinite(point.value) ||
            (input.valuePolicy === "non-negative" &&
              (point.raw < 0 || point.value < 0)),
        )
      ) {
        throw new Error(
          "Some comparison values could not be calculated. Check the scale's formula and connections.",
        );
      }
      return points.map(({ raw, value }) => ({ raw, value }));
    });
    return {
      settings,
      steps,
      metrics: [
        {
          id: scale.id,
          label: scale.name,
          unit: "px",
          tokenNames: values.map((point) => point.name),
          rows,
        },
      ],
    };
  };
  if (!parameterId)
    return {
      parameterIds,
      range: build([
        {
          id: "default",
          label: "Default",
          position: 0,
          isRequired: true,
          value: 0,
        },
      ]),
    };
  const definition = FOUNDATION_PARAMETERS.find(
    (item) => item.id === parameterId,
  );
  if (!definition)
    throw new Error("The connected variable has no display definition.");
  const bounds = BINDABLE_PARAMETER_RANGES[parameterId];
  const defaultValue = resolveModeParameterValues(documents, [], undefined, {
    modeSets: [...modeSets],
  })[parameterId];
  const count = Math.floor((bounds.max - bounds.min) / bounds.step + 1e-9);
  const samples = Array.from({ length: count + 1 }, (_, index) =>
    Number((bounds.min + index * bounds.step).toFixed(12)),
  );
  if (!samples.includes(defaultValue)) samples.push(defaultValue);
  samples.sort((a, b) => a - b);
  const range = build(
    samples.map((value) => ({
      id: `adaptive:${parameterId}:${value}`,
      value,
      position: value,
      isRequired: value === defaultValue,
      label: `${value === defaultValue ? "Default " : ""}${formatParameterValue(definition, value, documents)}`,
    })),
  );
  const ownerId = parameterOwners([...modeSets])[parameterId];
  const owner = modeSets.find((set) => set.id === ownerId);
  if (!owner) return { parameterIds, parameterId, range };
  if (!owner.modes.some((mode) => mode.id === owner.defaultModeId))
    throw new Error("The connected variable has no available default mode.");
  const settings = owner.modes
    .map((mode) => {
      const value = resolveModeParameterValues(documents, [mode], undefined, {
        modeSets: [...modeSets],
      })[parameterId];
      return {
        id: mode.id,
        value,
        position: value,
        isRequired: mode.id === owner.defaultModeId,
        label: `${mode.name} (${formatParameterValue(definition, value, documents)})`,
      };
    })
    .sort((a, b) => a.value - b.value)
    .map((setting, position) => ({ ...setting, position }));
  return { parameterIds, parameterId, range, modes: build(settings) };
}
