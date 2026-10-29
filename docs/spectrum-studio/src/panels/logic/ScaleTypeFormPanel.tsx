// Copyright 2026 Adobe. All rights reserved.
import {
  Checkbox,
  PickerItem,
  Slider,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { ParameterListEditor } from "../../components/logic/ParameterListEditor";
import {
  SCALE_TYPE_KINDS,
  withScaleTypeKind,
  type ScaleType,
  type ScaleTypeKind,
  type ScaleTypeParameter,
} from "../../features/scales/scaleType";
import {
  presetForRatio,
  TYPE_SCALE_PRESETS,
} from "../../features/typography/typeScalePresets";
import { useAtomValue } from "jotai";
import { interpolationsAtom } from "../../features/logic/scaleTypeLibrary";
import { TypeScaleFields } from "../typography/TypeScaleFields";

const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  backgroundColor: "layer-1",
  borderRadius: "xl",
  padding: 16,
});
const headingStyles = style({ font: "title", margin: 0 });
const noteStyles = style({
  font: "body-sm",
  color: "neutral-subdued",
  margin: 0,
});
const parameterStyles = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(min(100%, 224px), 1fr))]",
  gap: 12,
  alignItems: "end",
  minWidth: 0,
});
const flagsStyles = style({ display: "flex", flexWrap: "wrap", columnGap: 16 });

function asNumber(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value;
}

export interface ScaleTypeFormPanelProps {
  draft: ScaleType;
  onChange: (next: ScaleType) => void;
  nameError?: string;
  /** Problems with the formula itself, such as an expression that does not parse. */
  issues: string[];
  isReadOnly: boolean;
}

function ParameterControl({
  parameter,
  isReadOnly,
  onChange,
}: {
  parameter: ScaleTypeParameter;
  isReadOnly: boolean;
  onChange: (value: number) => void;
}) {
  const hasRange = parameter.min !== undefined && parameter.max !== undefined;
  const set = (value: number) => Number.isFinite(value) && onChange(value);
  return (
    <>
      {parameter.id === "ratio" && (
        <Picker
          label="Ratio preset"
          isDisabled={isReadOnly}
          selectedKey={presetForRatio(parameter.default).id}
          onSelectionChange={(key) => {
            const preset = TYPE_SCALE_PRESETS.find(
              (candidate) => candidate.id === key,
            );
            if (preset && preset.id !== "custom") onChange(preset.ratio);
          }}
        >
          {TYPE_SCALE_PRESETS.map((preset) => (
            <PickerItem key={preset.id} id={preset.id}>
              {preset.label}
            </PickerItem>
          ))}
        </Picker>
      )}
      <div className={parameterStyles}>
        {hasRange ? (
          <Slider
            label={parameter.label}
            isDisabled={isReadOnly}
            minValue={parameter.min}
            maxValue={parameter.max}
            step={parameter.step}
            value={parameter.default}
            formatOptions={{ maximumFractionDigits: 4 }}
            onChange={(value) => set(asNumber(value))}
          />
        ) : (
          <span />
        )}
        <NumberField
          label={hasRange ? "Value" : parameter.label}
          isDisabled={isReadOnly}
          value={parameter.default}
          minValue={parameter.min}
          maxValue={parameter.max}
          step={parameter.step}
          formatOptions={{ maximumFractionDigits: 4 }}
          onChange={set}
        />
      </div>
    </>
  );
}

function PartFlags({
  part,
  isReadOnly,
  onChange,
}: {
  part: { adaptable: boolean; overridable: boolean };
  isReadOnly: boolean;
  onChange: (patch: { adaptable?: boolean; overridable?: boolean }) => void;
}) {
  return (
    <div className={flagsStyles}>
      <Checkbox
        isDisabled={isReadOnly}
        isSelected={part.overridable}
        onChange={(overridable) => onChange({ overridable })}
      >
        Allow override
      </Checkbox>
      <Checkbox
        isDisabled={isReadOnly}
        isSelected={part.adaptable}
        onChange={(adaptable) => onChange({ adaptable })}
      >
        Adaptive
      </Checkbox>
    </div>
  );
}

/** Name, type, base, and parameters for one formula; each part says whether a foundation may override it. */
export function ScaleTypeFormPanel({
  draft,
  onChange,
  nameError,
  issues,
  isReadOnly,
}: ScaleTypeFormPanelProps) {
  const interpolations = useAtomValue(interpolationsAtom);
  const patchParameter = (id: string, patch: Partial<ScaleTypeParameter>) =>
    onChange({
      ...draft,
      parameters: draft.parameters.map((parameter) =>
        parameter.id === id ? { ...parameter, ...patch } : parameter,
      ),
    });
  const setDefault = (id: string, value: number) =>
    patchParameter(id, { default: value });

  return (
    <div className={panelStyles} data-component="ScaleTypeFormPanel">
      <section className={sectionStyles} aria-label="Identity">
        <TextField
          label="Name"
          isRequired
          isDisabled={isReadOnly}
          value={draft.name}
          validationBehavior="aria"
          isInvalid={!!nameError}
          errorMessage={nameError}
          onChange={(name) => onChange({ ...draft, name })}
        />
        {draft.kind !== "type-scale" && (
          <Picker
            label="Type"
            isDisabled={isReadOnly}
            selectedKey={draft.kind}
            onSelectionChange={(key) =>
              onChange(withScaleTypeKind(draft, String(key) as ScaleTypeKind))
            }
          >
            {SCALE_TYPE_KINDS.map((kind) => (
              <PickerItem key={kind.id} id={kind.id}>
                {kind.label}
              </PickerItem>
            ))}
          </Picker>
        )}
        <TextArea
          label="Description"
          isDisabled={isReadOnly}
          value={draft.description}
          onChange={(description) => onChange({ ...draft, description })}
        />
      </section>
      {draft.kind === "type-scale" ? (
        <section className={sectionStyles} aria-label="Type scale settings">
          <TypeScaleFields
            formula={draft}
            interpolations={interpolations}
            isReadOnly={isReadOnly}
            onChange={onChange}
          />
          <p className={noteStyles}>
            Font size and ratio always follow Text size. The ratio at the normal
            setting is the selected Scale ratio.
          </p>
        </section>
      ) : (
        <>
          <section className={sectionStyles} aria-label="Base value">
            <h3 className={headingStyles}>Base value</h3>
            <NumberField
              label="Base value"
              isDisabled={isReadOnly}
              value={draft.base.default}
              step={draft.base.step}
              onChange={(value) =>
                Number.isFinite(value) &&
                onChange({ ...draft, base: { ...draft.base, default: value } })
              }
            />
            <PartFlags
              part={draft.base}
              isReadOnly={isReadOnly}
              onChange={(patch) =>
                onChange({ ...draft, base: { ...draft.base, ...patch } })
              }
            />
          </section>
          <section
            className={sectionStyles}
            aria-label={
              draft.kind === "expression" ? "Expression" : "Parameters"
            }
          >
            <h3 className={headingStyles}>
              {draft.kind === "expression" ? "Expression" : "Parameters"}
            </h3>
            {draft.kind === "expression" ? (
              <>
                <TextField
                  label="Value at index i"
                  description="Use i (index), base, and your parameter names. Functions: pow, min, max, abs, round, floor, ceil, clamp, sqrt, log, exp."
                  isDisabled={isReadOnly}
                  value={draft.expression ?? ""}
                  isInvalid={issues.length > 0}
                  errorMessage={issues[0]}
                  onChange={(expression) => onChange({ ...draft, expression })}
                />
                {!isReadOnly && (
                  <ParameterListEditor
                    parameters={draft.parameters}
                    showOverridable
                    onChange={(parameters) =>
                      onChange({ ...draft, parameters })
                    }
                  />
                )}
              </>
            ) : (
              <>
                {draft.parameters.map((parameter) => (
                  <div key={parameter.id} className={panelStyles}>
                    <ParameterControl
                      parameter={parameter}
                      isReadOnly={isReadOnly}
                      onChange={(value) => setDefault(parameter.id, value)}
                    />
                    <PartFlags
                      part={parameter}
                      isReadOnly={isReadOnly}
                      onChange={(patch) => patchParameter(parameter.id, patch)}
                    />
                  </div>
                ))}
              </>
            )}
            <p className={noteStyles}>
              Steps are set in each foundation. Parts that allow override can be
              changed where the formula is used.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
