// Copyright 2026 Adobe. All rights reserved.
import { Checkbox, PickerItem } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  EditableNumberField,
  EditablePicker,
  useIsReadOnly,
} from "../../components/editable";
import {
  BINDABLE_PARAMETER_RANGES,
  bindableParameters,
} from "../../features/modes/parameters";
import { createBinding, setBindingPoint } from "../../features/scales/binding";
import {
  INTERPOLATION_METHODS,
  type InterpolationMethod,
  type ParameterBinding,
} from "../../features/scales/interpolation";

const editorStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingStart: 12,
  borderStartWidth: 2,
  borderStyle: "solid",
  borderColor: "gray-200",
});
const hintStyles = style({ font: "detail", color: "neutral-subdued" });

export interface AdaptiveBindingChange {
  binding: ParameterBinding | undefined;
  /** The parameter's own value, which is the binding's value at the mode parameter's neutral position. */
  value: number;
}

export interface AdaptiveBindingEditorProps {
  label: string;
  /** Static value of the parameter; equals the binding's value at the neutral position. */
  value: number;
  binding?: ParameterBinding;
  step: number;
  /** Mode parameters offered; all bindable parameters when omitted. */
  allowedParameterIds?: readonly string[];
  onChange: (change: AdaptiveBindingChange) => void;
}

function formatPosition(value: number) {
  return String(Math.round(value * 100) / 100);
}

/** Lets a scale parameter follow a mode parameter, with its own value at each end of the range. */
export function AdaptiveBindingEditor({
  label,
  value,
  binding,
  step,
  allowedParameterIds,
  onChange,
}: AdaptiveBindingEditorProps) {
  const isReadOnly = useIsReadOnly();
  const options = bindableParameters().filter(
    (option) => !allowedParameterIds || allowedParameterIds.includes(option.id),
  );
  const range = binding
    ? BINDABLE_PARAMETER_RANGES[binding.modeParameterId]
    : undefined;
  const followed = options.find(
    (option) => option.id === binding?.modeParameterId,
  );

  return (
    <>
      <Checkbox
        isSelected={!!binding}
        isDisabled={isReadOnly || options.length === 0}
        onChange={(isSelected) => {
          if (!isSelected) return onChange({ binding: undefined, value });
          const first = options[0];
          onChange({
            binding: createBinding(
              first.id,
              BINDABLE_PARAMETER_RANGES[first.id],
              value,
            ),
            value,
          });
        }}
      >
        {`Make ${label.toLowerCase()} adaptive`}
      </Checkbox>
      {binding && range && (
        <div
          className={editorStyles}
          role="group"
          aria-label={`${label} adaptive settings`}
        >
          <EditablePicker
            label="Follows"
            labelPosition="side"
            selectedKey={binding.modeParameterId}
            displayValue={followed?.label ?? binding.modeParameterId}
            onSelectionChange={(key) => {
              if (key == null) return;
              onChange({
                binding: createBinding(
                  String(key),
                  BINDABLE_PARAMETER_RANGES[String(key)],
                  value,
                  binding.method,
                ),
                value,
              });
            }}
          >
            {options.map((option) => (
              <PickerItem
                key={option.id}
                id={option.id}
                textValue={option.label}
              >
                {option.label}
              </PickerItem>
            ))}
          </EditablePicker>
          <EditablePicker
            label="Interpolation"
            labelPosition="side"
            selectedKey={binding.method}
            displayValue={
              INTERPOLATION_METHODS.find(
                (method) => method.id === binding.method,
              )?.label ?? binding.method
            }
            onSelectionChange={(key) => {
              if (key != null)
                onChange({
                  binding: {
                    ...binding,
                    method: String(key) as InterpolationMethod,
                  },
                  value,
                });
            }}
          >
            {INTERPOLATION_METHODS.map((method) => (
              <PickerItem key={method.id} id={method.id}>
                {method.label}
              </PickerItem>
            ))}
          </EditablePicker>
          {binding.points
            .filter((point) => point.at !== range.neutral)
            .map((point) => (
              <EditableNumberField
                key={point.at}
                label={`${label} at ${formatPosition(point.at)}`}
                labelPosition="side"
                value={point.value}
                step={step}
                formatOptions={{ maximumFractionDigits: 4 }}
                onChange={(next) =>
                  Number.isFinite(next) &&
                  onChange({
                    binding: setBindingPoint(binding, point.at, next),
                    value,
                  })
                }
              />
            ))}
          <span
            className={hintStyles}
          >{`The value above applies when ${followed?.label.toLowerCase() ?? "the parameter"} is ${formatPosition(range.neutral)}.`}</span>
        </div>
      )}
    </>
  );
}
