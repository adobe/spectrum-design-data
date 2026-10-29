// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, LabeledValue, PickerItem } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  EditableNumberField,
  EditablePicker,
  EditOnly,
  useIsReadOnly,
} from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { BINDABLE_PARAMETER_RANGES } from "../../features/modes/parameters";
import { setBindingPoint } from "../../features/scales/binding";
import type { ParameterBinding } from "../../features/scales/interpolation";
import type {
  ScaleType,
  ScaleTypeParameter,
} from "../../features/scales/scaleType";
import {
  presetForRatio,
  TYPE_SCALE_PRESETS,
} from "../../features/typography/typeScalePresets";
import { AdaptiveBindingEditor } from "./AdaptiveBindingEditor";

const rowStyles = style({ display: "flex", alignItems: "end", gap: 8 });
const modifiedStyles = style({ font: "detail", color: "neutral-subdued" });

export interface ScaleTypeSettingsChange {
  parameters: Record<string, number>;
  bindings: Record<string, ParameterBinding>;
}

export interface ScaleTypeSettingsFieldsProps {
  scaleType: ScaleType;
  /** Overrides of the scale type's parameter defaults. */
  parameters: Record<string, number>;
  bindings?: Record<string, ParameterBinding>;
  onChange: (next: ScaleTypeSettingsChange) => void;
  /** Mode parameters a binding may follow; all bindable parameters when omitted. */
  allowedBindingParameterIds?: readonly string[];
  showRatioPresets?: boolean;
  showAdaptiveControls?: boolean;
  showDisabledFields?: boolean;
  onDefaultChange?: (parameterId: string, value: number) => void;
  isFormulaLocked?: boolean;
}

function ParameterField({
  parameter,
  parameters,
  bindings,
  onChange,
  allowedBindingParameterIds,
  formulaName,
  showRatioPresets = true,
  showAdaptiveControls = true,
  showDisabledFields = false,
  onDefaultChange,
  isFormulaLocked = false,
}: Omit<ScaleTypeSettingsFieldsProps, "scaleType"> & {
  parameter: ScaleTypeParameter;
  formulaName: string;
}) {
  const isReadOnly = useIsReadOnly();
  const NumericField = showDisabledFields ? NumberField : EditableNumberField;
  const locked = onDefaultChange ? isFormulaLocked : !parameter.overridable;
  const override = !parameter.overridable
    ? undefined
    : parameters[parameter.id];
  const value = override ?? parameter.default;
  const binding = bindings?.[parameter.id];
  const isModified = override !== undefined && override !== parameter.default;

  const apply = (
    nextValue: number | undefined,
    nextBinding: ParameterBinding | undefined,
  ) => {
    const nextParameters = { ...parameters };
    if (locked || nextValue === undefined || nextValue === parameter.default)
      delete nextParameters[parameter.id];
    else nextParameters[parameter.id] = nextValue;
    const nextBindings = { ...bindings };
    // A locked part keeps the formula's value at the mode parameter's neutral position.
    const neutral =
      nextBinding &&
      BINDABLE_PARAMETER_RANGES[nextBinding.modeParameterId]?.neutral;
    if (nextBinding)
      nextBindings[parameter.id] =
        locked && neutral !== undefined
          ? setBindingPoint(nextBinding, neutral, parameter.default)
          : nextBinding;
    else delete nextBindings[parameter.id];
    onChange({ parameters: nextParameters, bindings: nextBindings });
  };
  // The binding's value at the mode parameter's neutral position is this field's value.
  const set = (next: number | undefined) => {
    if (onDefaultChange) {
      onDefaultChange(parameter.id, next ?? parameter.default);
      return;
    }
    const neutral =
      binding && BINDABLE_PARAMETER_RANGES[binding.modeParameterId]?.neutral;
    apply(
      next,
      binding && neutral !== undefined
        ? setBindingPoint(binding, neutral, next ?? parameter.default)
        : binding,
    );
  };

  return (
    <>
      {locked && !showDisabledFields ? (
        <>
          <LabeledValue
            label={parameter.label}
            labelPosition="side"
            value={value}
            formatOptions={{ maximumFractionDigits: 4 }}
          />
          <span className={modifiedStyles}>
            Set by {formulaName}; the formula does not allow overriding it.
          </span>
        </>
      ) : (
        <>
          {showRatioPresets && parameter.id === "ratio" && (
            <EditablePicker
              label="Ratio preset"
              labelPosition="side"
              selectedKey={presetForRatio(value).id}
              displayValue={presetForRatio(value).label}
              onSelectionChange={(key) => {
                const preset = TYPE_SCALE_PRESETS.find(
                  (candidate) => candidate.id === key,
                );
                if (preset && preset.id !== "custom") set(preset.ratio);
              }}
            >
              {TYPE_SCALE_PRESETS.map((preset) => (
                <PickerItem
                  key={preset.id}
                  id={preset.id}
                  textValue={preset.label}
                >
                  {preset.label}
                </PickerItem>
              ))}
            </EditablePicker>
          )}
          <NumericField
            label={parameter.label}
            labelPosition="side"
            value={value}
            minValue={parameter.min}
            maxValue={parameter.max}
            isDisabled={locked || isReadOnly}
            step={parameter.step}
            formatOptions={{ maximumFractionDigits: 4 }}
            onChange={(next) => Number.isFinite(next) && set(next)}
          />
          {locked && (
            <span className={modifiedStyles}>
              {onDefaultChange
                ? "This formula is read-only."
                : `Set by ${formulaName}; the formula does not allow overriding it.`}
            </span>
          )}
          {isModified && !onDefaultChange && (
            <EditOnly>
              <div className={rowStyles}>
                <span className={modifiedStyles}>
                  Modified from {formulaName} ({parameter.default})
                </span>
                <ActionButton isQuiet onPress={() => set(undefined)}>
                  Revert
                </ActionButton>
              </div>
            </EditOnly>
          )}
        </>
      )}
      {showAdaptiveControls && parameter.adaptable && (
        <AdaptiveBindingEditor
          label={parameter.label}
          value={value}
          binding={binding}
          step={parameter.step}
          allowedParameterIds={allowedBindingParameterIds}
          onChange={({ binding: nextBinding, value: nextValue }) =>
            apply(nextValue, nextBinding)
          }
        />
      )}
    </>
  );
}

/** A formula's parameters as fields: editable where the formula allows an override, read-only where it does not. */
export function ScaleTypeSettingsFields({
  scaleType,
  ...rest
}: ScaleTypeSettingsFieldsProps) {
  const ordered = [...scaleType.parameters].sort((a, b) => {
    const priority = (id: string) =>
      id === "ratio" ? 0 : id === "offset" ? 1 : 2;
    return priority(a.id) - priority(b.id);
  });
  return (
    <>
      {ordered.map((parameter) => (
        <ParameterField
          key={parameter.id}
          parameter={parameter}
          formulaName={scaleType.name}
          {...rest}
        />
      ))}
    </>
  );
}
