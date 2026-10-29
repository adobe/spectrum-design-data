// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, Checkbox, Text, TextField } from "@react-spectrum/s2";
import { NumberField } from "../fields/NumberField";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import type { FormulaParameter } from "../../features/scales/scaleType";

const listStyles = style({ display: "flex", flexDirection: "column", gap: 12 });
const rowStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(min(100%, 224px), 1fr))]",
  gap: 8,
  alignItems: "end",
  minWidth: 0,
});
const hintStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});

type EditableParameter = FormulaParameter & { overridable?: boolean };

function nextParameterId(parameters: readonly EditableParameter[]) {
  let index = parameters.length + 1;
  while (parameters.some((parameter) => parameter.id === `param${index}`))
    index++;
  return `param${index}`;
}

export interface ParameterListEditorProps<P extends EditableParameter> {
  parameters: P[];
  onChange: (parameters: P[]) => void;
  /** Whether a foundation may bind the parameter to a mode parameter; interpolation parameters cannot. */
  allowAdaptable?: boolean;
  /** Formula parts only: whether a foundation may set its own value. */
  showOverridable?: boolean;
}

export function ParameterListEditor<P extends EditableParameter>({
  parameters,
  onChange,
  allowAdaptable = true,
  showOverridable = false,
}: ParameterListEditorProps<P>) {
  const update = (index: number, patch: Partial<EditableParameter>) =>
    onChange(
      parameters.map((parameter, position) =>
        position === index ? { ...parameter, ...patch } : parameter,
      ),
    );

  return (
    <div className={listStyles} data-component="ParameterListEditor">
      {parameters.length === 0 && (
        <p className={hintStyles}>
          No parameters. Add one to reference it by name in the expression.
        </p>
      )}
      {parameters.map((parameter, index) => (
        <div key={index} className={rowStyles}>
          <TextField
            label="Name in expression"
            value={parameter.id}
            onChange={(id) => update(index, { id: id.trim() })}
          />
          <TextField
            label="Label"
            value={parameter.label}
            onChange={(label) => update(index, { label })}
          />
          <NumberField
            label="Default"
            value={parameter.default}
            onChange={(value) =>
              Number.isFinite(value) && update(index, { default: value })
            }
          />
          <NumberField
            label="Step"
            value={parameter.step}
            minValue={0.0001}
            onChange={(value) =>
              Number.isFinite(value) &&
              value > 0 &&
              update(index, { step: value })
            }
          />
          {allowAdaptable ? (
            <Checkbox
              isSelected={parameter.adaptable}
              onChange={(adaptable) => update(index, { adaptable })}
            >
              Adaptive
            </Checkbox>
          ) : (
            <span />
          )}
          {showOverridable ? (
            <Checkbox
              isSelected={!!parameter.overridable}
              onChange={(overridable) => update(index, { overridable })}
            >
              Allow override
            </Checkbox>
          ) : (
            <span />
          )}
          <ActionButton
            isQuiet
            aria-label={`Remove parameter ${parameter.label || parameter.id}`}
            onPress={() =>
              onChange(parameters.filter((_, position) => position !== index))
            }
          >
            <Delete />
          </ActionButton>
        </div>
      ))}
      <div>
        <ActionButton
          onPress={() =>
            onChange([
              ...parameters,
              {
                id: nextParameterId(parameters),
                label: "Parameter",
                default: 1,
                step: 1,
                adaptable: false,
                ...(showOverridable && { overridable: false }),
              } as P,
            ])
          }
        >
          <Add />
          <Text>Add parameter</Text>
        </ActionButton>
      </div>
    </div>
  );
}
