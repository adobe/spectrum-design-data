// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  Checkbox,
  DialogTrigger,
  AlertDialog,
  NumberField,
  Picker,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type {
  ColorScale,
  ContrastToken,
} from "../../features/color-system/model";
import type { Rule } from "../../features/logic/model";
import type { CustomContrastAction } from "../../features/color-system/customContrastState";
import { contrastStepIndex } from "../../features/color-system/contrastSteps";

const layout = style({ display: "flex", flexDirection: "column", gap: 12 });
const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
});
const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 8,
});

export interface CustomContrastEditorProps {
  scale: ColorScale;
  rules: readonly Rule[];
  modeLabel?: string;
  disabled?: boolean;
  patches?: Readonly<Record<string, number>>;
  effective?: readonly ContrastToken[];
  onAction: (action: CustomContrastAction) => void;
}

export function CustomContrastEditor({
  scale,
  rules,
  modeLabel,
  disabled = false,
  patches,
  effective,
  onAction: run,
}: CustomContrastEditorProps) {
  const scaleId = scale.id,
    custom = scale.customContrasts,
    isMode = modeLabel !== undefined;
  return (
    <section className={section} aria-label="Custom contrast steps">
      <h3>Contrast steps</h3>
      <Text>
        {isMode
          ? `Editing ${modeLabel}. Step structure and naming are shared.`
          : "Custom steps replace the shared contrast list for this scale."}
      </Text>
      {!custom ? (
        <Checkbox
          isSelected={false}
          isDisabled={disabled || isMode}
          onChange={() => run({ kind: "enable", scaleId })}
        >
          Use custom contrast steps
        </Checkbox>
      ) : (
        <>
          <Text>Using custom contrast steps</Text>
          <Picker
            label="Naming rule"
            selectedKey={custom.namingRuleId}
            isDisabled={disabled || isMode}
            onSelectionChange={(key) =>
              run({ kind: "rule", scaleId, ruleId: String(key) })
            }
          >
            {rules
              .filter((rule) => rule.type === "scale-naming")
              .map((rule) => (
                <PickerItem key={rule.id} id={rule.id}>
                  {rule.name}
                </PickerItem>
              ))}
          </Picker>
          <Picker
            label="Base swatch"
            selectedKey={custom.baseContrastId}
            isDisabled={disabled || isMode}
            onSelectionChange={(key) =>
              run({ kind: "base", scaleId, stepId: String(key) })
            }
          >
            {custom.steps.map((step, index) => (
              <PickerItem
                key={step.id}
                id={step.id}
              >{`${contrastStepIndex(index, scale, rules)} (${step.value}:1)`}</PickerItem>
            ))}
          </Picker>
          <Text>
            Names:{" "}
            {custom.steps
              .map((_, index) => contrastStepIndex(index, scale, rules))
              .join(", ")}
          </Text>
          {custom.steps.map((step, index) => {
            const label = contrastStepIndex(index, scale, rules);
            return (
              <div key={step.id} className={layout}>
                <div className={row}>
                  <NumberField
                    label={`Contrast ${label}`}
                    value={patches?.[step.id] ?? step.value}
                    minValue={1}
                    maxValue={21}
                    step={0.00000001}
                    formatOptions={{ maximumFractionDigits: 8 }}
                    isDisabled={disabled}
                    onChange={(value) =>
                      run({ kind: "value", scaleId, stepId: step.id, value })
                    }
                  />
                  {isMode ? (
                    <Button
                      variant="secondary"
                      isDisabled={disabled || patches?.[step.id] === undefined}
                      onPress={() =>
                        run({ kind: "reset", scaleId, stepId: step.id })
                      }
                    >
                      Reset {label}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      isDisabled={disabled || step.id === custom.baseContrastId}
                      onPress={() =>
                        run({ kind: "remove", scaleId, stepId: step.id })
                      }
                    >
                      Remove {label}
                    </Button>
                  )}
                </div>
                <Text>
                  {isMode
                    ? patches?.[step.id] === undefined
                      ? "Inherited"
                      : "Mode override"
                    : step.id === custom.baseContrastId
                      ? "Base swatch"
                      : "Shared across modes"}
                  {effective?.[index] &&
                    ` · Effective ${effective[index].value.toFixed(2)}:1`}
                </Text>
                {!isMode && (
                  <div className={row}>
                    <NumberField
                      label={`Opposite contrast ${label}`}
                      value={step.oppositeValue}
                      minValue={1}
                      maxValue={21}
                      step={0.00000001}
                      formatOptions={{ maximumFractionDigits: 8 }}
                      isDisabled={disabled}
                      onChange={(value) =>
                        run({
                          kind: "value",
                          scaleId,
                          stepId: step.id,
                          value,
                          opposite: true,
                        })
                      }
                    />
                    <Button
                      variant="secondary"
                      isDisabled={disabled || step.oppositeValue === undefined}
                      onPress={() =>
                        run({ kind: "reset", scaleId, stepId: step.id })
                      }
                    >
                      Use compensation
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {!isMode && (
            <div className={row}>
              <Button
                variant="secondary"
                isDisabled={disabled}
                onPress={() => run({ kind: "add", scaleId })}
              >
                Add contrast step
              </Button>
              <DialogTrigger>
                <Button
                  variant="negative"
                  fillStyle="outline"
                  isDisabled={disabled}
                >
                  Use shared contrast steps
                </Button>
                <AlertDialog
                  title="Discard custom contrast steps?"
                  variant="destructive"
                  primaryActionLabel="Use shared steps"
                  cancelLabel="Cancel"
                  onPrimaryAction={() => run({ kind: "disable", scaleId })}
                >
                  This removes this scale's custom list, naming settings, and
                  custom contrast mode overrides. The scale will use shared
                  steps.
                </AlertDialog>
              </DialogTrigger>
            </div>
          )}
        </>
      )}
    </section>
  );
}
