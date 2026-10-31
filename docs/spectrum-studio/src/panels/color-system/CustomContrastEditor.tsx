// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  AlertDialog,
  DialogContainer,
  PickerItem,
  Switch,
  Text,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import Sort from "@react-spectrum/s2/icons/Sort";
import { useState } from "react";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { EditableSlider } from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import type {
  ColorScale,
  ContrastToken,
} from "../../features/color-system/model";
import type { Rule } from "../../features/logic/model";
import type { CustomContrastAction } from "../../features/color-system/customContrastState";
import { contrastStepIndex } from "../../features/color-system/contrastSteps";
import { ContrastRamp } from "../../views/color-system/ContrastRamp";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});
const settings = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 8,
});
const setting = style({
  minWidth: 0,
  flexGrow: 1,
  flexBasis: 0,
  width: "full",
});
const actions = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
});
const list = style({ display: "flex", gap: 8, minWidth: 0 });
const rows = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flexGrow: 1,
  minWidth: 0,
});
const row = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
const slider = style({ minWidth: 0, flexGrow: 1, width: "full" });
const switchStyles = style({ flexShrink: 0, marginStart: "auto" });

export interface CustomContrastEditorProps {
  scale: ColorScale;
  rules: readonly Rule[];
  modeLabel?: string;
  disabled?: boolean;
  patches?: Readonly<Record<string, number>>;
  values?: Readonly<Record<string, number>>;
  inheritanceLabel?: string;
  effective?: readonly ContrastToken[];
  sharedContrasts?: readonly ContrastToken[];
  background?: string;
  side?: "auto" | "light" | "dark";
  onAction: (action: CustomContrastAction) => void;
}

export function CustomContrastEditor({
  scale,
  rules,
  modeLabel,
  disabled = false,
  patches,
  values,
  inheritanceLabel = "Inherited",
  effective,
  sharedContrasts = [],
  background = "#ffffff",
  side = "auto",
  onAction: run,
}: CustomContrastEditorProps) {
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const scaleId = scale.id;
  const custom = scale.customContrasts;
  const isMode = modeLabel !== undefined;
  const steps = custom?.steps ?? sharedContrasts;
  const valuesDisabled = disabled || !custom;
  const structureDisabled = valuesDisabled || isMode;
  const namingRules = rules.filter((rule) => rule.type === "scale-naming");
  return (
    <AccordionItem id="custom-contrasts">
      <AccordionItemHeader>
        <AccordionItemTitle>Custom contrast steps</AccordionItemTitle>
        <Switch
          aria-label="Use custom contrast steps"
          size="S"
          styles={switchStyles}
          isSelected={!!custom}
          isDisabled={disabled || isMode}
          onChange={(enabled) => {
            if (enabled) run({ kind: "enable", scaleId });
            else setConfirmDisable(true);
          }}
        />
      </AccordionItemHeader>
      <AccordionItemPanel>
        <div className={stack} role="region" aria-label="Custom contrast steps">
          <div className={settings}>
            <Picker
              label="Naming rule"
              labelPosition="top"
              styles={setting}
              selectedKey={custom?.namingRuleId ?? null}
              isDisabled={structureDisabled}
              onSelectionChange={(key) => {
                if (typeof key === "string")
                  run({ kind: "rule", scaleId, ruleId: key });
              }}
            >
              {namingRules.map((rule) => (
                <PickerItem key={rule.id} id={rule.id}>
                  {rule.name}
                </PickerItem>
              ))}
            </Picker>
            <Picker
              label="Base swatch"
              labelPosition="top"
              styles={setting}
              selectedKey={custom?.baseContrastId ?? null}
              isDisabled={structureDisabled}
              onSelectionChange={(key) => {
                if (typeof key === "string")
                  run({ kind: "base", scaleId, stepId: key });
              }}
            >
              {steps.map((step, index) => (
                <PickerItem key={step.id} id={step.id}>
                  {`${contrastStepIndex(index, scale, rules)} (${step.value}:1)`}
                </PickerItem>
              ))}
            </Picker>
          </div>
          <div className={actions}>
            <ActionButton
              isDisabled={structureDisabled}
              onPress={() => run({ kind: "add", scaleId })}
            >
              <Add />
              <Text>Add contrast</Text>
            </ActionButton>
            <ActionButton
              isDisabled={structureDisabled}
              onPress={() => run({ kind: "sort", scaleId })}
            >
              <Sort />
              <Text>Sort</Text>
            </ActionButton>
          </div>
          <div className={list}>
            <ContrastRamp
              variant="narrow"
              background={background}
              contrasts={[...(effective ?? steps)]}
              side={side}
              focusedContrastId={focusedId}
            />
            <div className={rows}>
              {steps.map((step, index) => {
                const label = contrastStepIndex(index, scale, rules);
                const value =
                  values?.[step.id] ?? patches?.[step.id] ?? step.value;
                return (
                  <div
                    key={step.id}
                    className={row}
                    data-contrast-id={step.id}
                    onFocusCapture={() => setFocusedId(step.id)}
                    onBlurCapture={() => setFocusedId(null)}
                  >
                    <EditableSlider
                      label={String(label)}
                      aria-label={`Contrast ${label}`}
                      labelPosition="side"
                      styles={slider}
                      value={value}
                      fillOffset={value}
                      minValue={1}
                      maxValue={21}
                      step={0.01}
                      formatOptions={{
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }}
                      isDisabled={valuesDisabled}
                      onChange={(value) =>
                        run({ kind: "value", scaleId, stepId: step.id, value })
                      }
                    />
                    <ActionButton
                      isQuiet
                      aria-label={`Remove ${label}`}
                      isDisabled={
                        structureDisabled || step.id === custom?.baseContrastId
                      }
                      onPress={() =>
                        run({ kind: "remove", scaleId, stepId: step.id })
                      }
                    >
                      <Delete />
                    </ActionButton>
                  </div>
                );
              })}
            </div>
          </div>
          {custom && (
            <NestedPanelAccordion allowsMultipleExpanded={false}>
              <AccordionItem id="contrast-options">
                <AccordionItemTitle>More options</AccordionItemTitle>
                <AccordionItemPanel>
                  <div className={stack}>
                    <Text>
                      {isMode
                        ? `Editing ${modeLabel}. Step structure and naming are shared.`
                        : "Custom steps replace the shared contrast list for this scale."}
                    </Text>
                    <Text>
                      Names:{" "}
                      {steps
                        .map((_, index) =>
                          contrastStepIndex(index, scale, rules),
                        )
                        .join(", ")}
                    </Text>
                    {steps.map((step, index) => {
                      const label = contrastStepIndex(index, scale, rules);
                      return (
                        <div key={step.id} className={stack}>
                          <NumberField
                            label={`Contrast ${label}`}
                            value={
                              values?.[step.id] ??
                              patches?.[step.id] ??
                              step.value
                            }
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
                              })
                            }
                          />
                          <Text>
                            {isMode
                              ? patches?.[step.id] === undefined
                                ? inheritanceLabel
                                : "Mode override"
                              : step.id === custom.baseContrastId
                                ? "Base swatch"
                                : "Default contrast"}
                            {effective?.[index] &&
                              ` · Effective ${effective[index].value.toFixed(2)}:1`}
                          </Text>
                          {isMode ? (
                            <ActionButton
                              isDisabled={
                                disabled || patches?.[step.id] === undefined
                              }
                              onPress={() =>
                                run({ kind: "reset", scaleId, stepId: step.id })
                              }
                            >
                              Reset {label}
                            </ActionButton>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </AccordionItemPanel>
              </AccordionItem>
            </NestedPanelAccordion>
          )}
        </div>
      </AccordionItemPanel>
      <DialogContainer onDismiss={() => setConfirmDisable(false)}>
        {confirmDisable && (
          <AlertDialog
            title="Discard custom contrast steps"
            variant="destructive"
            primaryActionLabel="Discard"
            cancelLabel="Cancel"
            onPrimaryAction={() => run({ kind: "disable", scaleId })}
          >
            This removes this scale's custom list, naming settings, and custom
            contrast mode overrides. The scale will use shared steps.
          </AlertDialog>
        )}
      </DialogContainer>
    </AccordionItem>
  );
}
