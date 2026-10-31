// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  PickerItem,
} from "@react-spectrum/s2";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { css, style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ReactNode } from "react";
import type { ScaleType } from "../../features/scales/scaleType";
import type { Interpolation } from "../../features/scales/interpolationDefinition";
import {
  TYPE_SCALE_PRESETS,
  presetForRatio,
} from "../../features/typography/typeScalePresets";
import {
  fromTypographyUnit,
  toTypographyUnit,
  type TypographyUnit,
} from "../../features/typography/units";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const typeScaleFieldsStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  paddingStart: 8,
  paddingEnd: 8,
});
const pair = style({
  display: "grid",
  gridTemplateColumns: "[2fr 1fr]",
  gap: 8,
  minWidth: 0,
});
const field = style({ width: "full", minWidth: 0 });
const scalePickerStyles = css(
  "& { grid-template-columns: 1fr 2fr !important; }",
);

export function TypeScaleFields({
  formula,
  interpolations,
  unit = "px",
  isReadOnly,
  onChange,
  children,
}: {
  formula: ScaleType;
  interpolations: readonly Interpolation[];
  unit?: TypographyUnit;
  isReadOnly: boolean;
  onChange: (formula: ScaleType) => void;
  children?: ReactNode;
}) {
  const notify = useNotify();
  const adaptation = formula.textSizeAdaptation;
  if (formula.kind !== "type-scale" || !adaptation)
    throw new Error("Choose the shared Type scale.");
  const ratio = formula.parameters[0];
  const changeRatio = (value: number) =>
    onChange({ ...formula, parameters: [{ ...ratio, default: value }] });
  const changeBase = (value: number) => {
    try {
      onChange({
        ...formula,
        base: { ...formula.base, default: fromTypographyUnit(value, unit) },
      });
    } catch (failure) {
      notify.error(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };
  return (
    <div className={typeScaleFieldsStack} data-component="TypeScaleFields">
      <NumberField
        key={unit}
        labelPosition="side"
        label={`Base size (${unit})`}
        value={toTypographyUnit(formula.base.default, unit)}
        minValue={0}
        step={toTypographyUnit(1, unit)}
        formatOptions={{ maximumFractionDigits: 6 }}
        isDisabled={isReadOnly}
        onChange={changeBase}
        styles={field}
      />
      <div className={pair}>
        <Picker
          label="Scale"
          selectedKey={presetForRatio(ratio.default).id}
          isDisabled={isReadOnly}
          UNSAFE_className={scalePickerStyles}
          onSelectionChange={(key) => {
            const preset = TYPE_SCALE_PRESETS.find((item) => item.id === key);
            if (preset && preset.id !== "custom") changeRatio(preset.ratio);
          }}
        >
          {TYPE_SCALE_PRESETS.map((preset) => (
            <PickerItem id={preset.id} key={preset.id}>
              {preset.label}
            </PickerItem>
          ))}
        </Picker>
        <NumberField
          aria-label="Ratio"
          value={ratio.default}
          minValue={0.5}
          maxValue={3}
          step={0.001}
          formatOptions={{ maximumFractionDigits: 6 }}
          isDisabled={isReadOnly}
          onChange={changeRatio}
          styles={field}
        />
      </div>
      {children}
      <NestedPanelAccordion>
        <AccordionItem id="type-scale-adaptive">
          <AccordionItemTitle>Adaptive settings</AccordionItemTitle>
          <AccordionItemPanel>
            <div className={stack}>
              <Picker
                label="Interpolation"
                selectedKey={adaptation.interpolationId}
                isDisabled={isReadOnly}
                styles={field}
                onSelectionChange={(key) => {
                  if (key != null)
                    onChange({
                      ...formula,
                      textSizeAdaptation: {
                        ...adaptation,
                        interpolationId: String(key),
                      },
                    });
                }}
              >
                {interpolations.map((shape) => (
                  <PickerItem id={shape.id} key={shape.id}>
                    {shape.name}
                  </PickerItem>
                ))}
              </Picker>
              <NumberField
                label="Ratio at smallest setting"
                value={adaptation.ratioAtSmallest}
                minValue={0.5}
                maxValue={3}
                step={0.001}
                isDisabled={isReadOnly}
                formatOptions={{ maximumFractionDigits: 6 }}
                styles={field}
                onChange={(ratioAtSmallest) =>
                  onChange({
                    ...formula,
                    textSizeAdaptation: { ...adaptation, ratioAtSmallest },
                  })
                }
              />
              <NumberField
                label="Ratio at largest setting"
                value={adaptation.ratioAtLargest}
                minValue={0.5}
                maxValue={3}
                step={0.001}
                isDisabled={isReadOnly}
                formatOptions={{ maximumFractionDigits: 6 }}
                styles={field}
                onChange={(ratioAtLargest) =>
                  onChange({
                    ...formula,
                    textSizeAdaptation: { ...adaptation, ratioAtLargest },
                  })
                }
              />
            </div>
          </AccordionItemPanel>
        </AccordionItem>
      </NestedPanelAccordion>
    </div>
  );
}
