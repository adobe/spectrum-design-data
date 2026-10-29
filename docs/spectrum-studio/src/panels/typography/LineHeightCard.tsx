// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Checkbox,
  PickerItem,
  TextField,
  ToastQueue,
} from "@react-spectrum/s2";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import { foundationCardStyles } from "../../components/foundationCardStyles";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import Delete from "@react-spectrum/s2/icons/Delete";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import type { TypographyLineHeight } from "../../features/typography/model";
import type { Interpolation } from "../../features/scales/interpolationDefinition";
import {
  fromTypographyUnit,
  toTypographyUnit,
  type TypographyUnit,
} from "../../features/typography/units";
import { useRequestedFieldFocus } from "../../components/fields/useRequestedFieldFocus";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
});
const cardStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  minWidth: 0,
});
const row = style({ display: "flex", alignItems: "end", gap: 8 });
const pair = style({
  display: "grid",
  gridTemplateColumns: "[repeat(auto-fit, minmax(min(100%, 224px), 1fr))]",
  gap: 8,
  minWidth: 0,
});
const field = style({ width: "full", minWidth: 0 });

export function LineHeightCard({
  card,
  name,
  unit,
  interpolations,
  isReadOnly,
  focusName = false,
  onNameFocused,
  onChange,
  onRename,
  onDelete,
}: {
  card: TypographyLineHeight;
  name: string;
  unit: TypographyUnit;
  interpolations: readonly Interpolation[];
  isReadOnly: boolean;
  focusName?: boolean;
  onNameFocused?: () => void;
  onChange: (card: TypographyLineHeight) => void;
  onRename: (name: string) => string | undefined;
  onDelete: () => void;
}) {
  const nameRef = useRequestedFieldFocus(
    focusName && !isReadOnly,
    onNameFocused,
  );
  const [draft, setDraft] = useState<{
    source: string;
    readOnly: boolean;
    value: string;
    error?: string;
  }>({ source: name, readOnly: isReadOnly, value: name });
  const isCurrentDraft = draft.source === name && draft.readOnly === isReadOnly;
  if (!isCurrentDraft)
    setDraft({ source: name, readOnly: isReadOnly, value: name });
  const draftName = isCurrentDraft ? draft.value : name;
  const nameError = isCurrentDraft ? draft.error : undefined;
  const mapping = card.adaptive;
  const changeMapping = (patch: Partial<typeof mapping>) =>
    onChange({ ...card, adaptive: { ...mapping, ...patch } });
  const changeLength = (key: "from" | "to", value: number) => {
    try {
      changeMapping({ [key]: fromTypographyUnit(value, unit) });
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };
  return (
    <section
      className={`${foundationCardStyles} ${cardStyles}`}
      aria-label={`${name} line height`}
      data-component="LineHeightCard"
    >
      <div className={row}>
        <TextField
          label="Name"
          value={draftName}
          onChange={(value) =>
            setDraft({ source: name, readOnly: isReadOnly, value })
          }
          isReadOnly={isReadOnly}
          styles={field}
          ref={nameRef}
          isRequired
          isInvalid={!!nameError}
          errorMessage={nameError}
          validationBehavior="aria"
          onBlur={() => {
            if (draftName !== name)
              setDraft({
                source: name,
                readOnly: isReadOnly,
                value: draftName,
                error: onRename(draftName),
              });
          }}
        />
        {!isReadOnly && (
          <ActionButton
            isQuiet
            aria-label={`Delete ${name} line height`}
            onPress={onDelete}
          >
            <Delete />
          </ActionButton>
        )}
      </div>
      <NumberField
        label="Default line height"
        value={card.defaultValue}
        minValue={0.01}
        step={0.01}
        formatOptions={{ maximumFractionDigits: 6 }}
        isDisabled={isReadOnly}
        styles={field}
        onChange={(defaultValue) => onChange({ ...card, defaultValue })}
      />
      <Checkbox
        isSelected={card.isAdaptive}
        isDisabled={isReadOnly}
        onChange={(isAdaptive) => onChange({ ...card, isAdaptive })}
      >
        Make adaptive
      </Checkbox>
      {card.isAdaptive && (
        <NestedPanelAccordion>
          <AccordionItem id={`${card.id}-adaptive`}>
            <AccordionItemHeader>
              <AccordionItemTitle>Adaptive settings</AccordionItemTitle>
            </AccordionItemHeader>
            <AccordionItemPanel>
              <div className={stack}>
                <Picker
                  label="Interpolation"
                  selectedKey={mapping.interpolationId}
                  isDisabled={isReadOnly}
                  styles={field}
                  onSelectionChange={(key) => {
                    if (key != null)
                      changeMapping({ interpolationId: String(key) });
                  }}
                >
                  {interpolations.map((shape) => (
                    <PickerItem id={shape.id} key={shape.id}>
                      {shape.name}
                    </PickerItem>
                  ))}
                </Picker>
                <div className={pair}>
                  <NumberField
                    key={`from-${unit}`}
                    label={`From text size (${unit})`}
                    value={toTypographyUnit(mapping.from, unit)}
                    minValue={0}
                    maxValue={toTypographyUnit(mapping.to, unit) - 0.000001}
                    isDisabled={isReadOnly}
                    styles={field}
                    step={toTypographyUnit(1, unit)}
                    formatOptions={{ maximumFractionDigits: 6 }}
                    onChange={(value) => changeLength("from", value)}
                  />
                  <NumberField
                    key={`to-${unit}`}
                    label={`To text size (${unit})`}
                    value={toTypographyUnit(mapping.to, unit)}
                    minValue={0}
                    isDisabled={isReadOnly}
                    styles={field}
                    step={toTypographyUnit(1, unit)}
                    formatOptions={{ maximumFractionDigits: 6 }}
                    onChange={(value) => changeLength("to", value)}
                  />
                </div>
                <div className={pair}>
                  <NumberField
                    label="From line height"
                    value={mapping.outputAtFrom}
                    minValue={0.01}
                    step={0.01}
                    isDisabled={isReadOnly}
                    styles={field}
                    formatOptions={{ maximumFractionDigits: 6 }}
                    onChange={(outputAtFrom) => changeMapping({ outputAtFrom })}
                  />
                  <NumberField
                    label="To line height"
                    value={mapping.outputAtTo}
                    minValue={0.01}
                    step={0.01}
                    isDisabled={isReadOnly}
                    styles={field}
                    formatOptions={{ maximumFractionDigits: 6 }}
                    onChange={(outputAtTo) => changeMapping({ outputAtTo })}
                  />
                </div>
              </div>
            </AccordionItemPanel>
          </AccordionItem>
        </NestedPanelAccordion>
      )}
    </section>
  );
}
