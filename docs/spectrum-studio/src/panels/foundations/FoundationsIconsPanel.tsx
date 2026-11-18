// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import { useNotify } from "../../components/notifications/notificationContext";
import {
  EditableNumberField,
  EditOnly,
  EditableTextField,
  useIsReadOnly,
} from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { useRequestedFieldFocus } from "../../components/fields/useRequestedFieldFocus";
import { RoundingRulePicker } from "../../components/logic/RoundingRulePicker";
import { iconScaleFollowsTypeSteps } from "../../features/icons/generate";
import {
  WORKFLOW_ICON_SCALE_ID,
  isIconSizeSource,
  type IconScale,
  type IconSizeSource,
} from "../../features/icons/model";
import {
  addIconScaleAtom,
  generatedIconsAtom,
  iconsDocumentAtom,
  removeIconScaleAtom,
  restoreIconScaleAtom,
  updateIconScaleAtom,
  updateIconsSettingsAtom,
  type IconScalePatch,
} from "../../features/icons/state";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import {
  SCALE_ABOVE_MAX,
  SCALE_BELOW_MAX,
} from "../../features/scales/generate";
import {
  resolveScaleType,
  TYPOGRAPHY_SCALE_TYPE_ID,
} from "../../features/scales/scaleType";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { lineHeightName } from "../../features/typography/lineHeightNames";
import { typographyDocumentAtom } from "../../features/typography/state";
import { DimensionScaleCard } from "./DimensionScaleCard";
import { FoundationModeSettings } from "./FoundationModeSettings";
import { firstAccordionItemStyle } from "../accordionStyles";
import { ScaleBaseValueField, ScaleFormulaPicker } from "./ScaleFormulaFields";
import { ScaleTypeSettingsFields } from "./ScaleTypeSettingsFields";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
  padding: 8,
});
const panel = style({ padding: 0 });
const controls = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
});
const nameField = style({ width: "full", minWidth: 0 });
const note = style({ font: "body-sm", color: "neutral-subdued", margin: 0 });

export const ICON_SIZE_SOURCE_LABELS: Record<IconSizeSource, string> = {
  "follow-typography": "Follow Typography",
  formula: "Formula",
  "line-height": "Line height",
};

const SOURCE_NOTES: Record<IconSizeSource, string> = {
  "follow-typography": "Uses Typography's type scale with its own base size.",
  formula: "Uses any formula from Logic.",
  "line-height": "Matches a Typography line height at each type step.",
};

function errorText(failure: unknown) {
  return failure instanceof Error ? failure.message : String(failure);
}

function IconScaleNameField({
  scale,
  focusName,
  onNameFocused,
}: {
  scale: IconScale;
  focusName: boolean;
  onNameFocused: () => void;
}) {
  const isReadOnly = useIsReadOnly();
  const update = useSetAtom(updateIconScaleAtom);
  const ref = useRequestedFieldFocus(focusName && !isReadOnly, onNameFocused);
  const [draft, setDraft] = useState({
    source: scale.name,
    value: scale.name,
    error: undefined as string | undefined,
  });
  if (draft.source !== scale.name)
    setDraft({ source: scale.name, value: scale.name, error: undefined });
  const commit = () => {
    if (draft.value.trim() === scale.name) return;
    try {
      const saved = update({ id: scale.id, patch: { name: draft.value } });
      if (!saved)
        setDraft({
          ...draft,
          error: "Enter a name that no other icon scale uses.",
        });
    } catch (failure) {
      setDraft({ ...draft, error: errorText(failure) });
    }
  };
  return (
    <EditableTextField
      label="Name"
      value={draft.value}
      onChange={(value) => setDraft({ ...draft, value, error: undefined })}
      onBlur={commit}
      ref={ref}
      isReadOnly={isReadOnly}
      isRequired
      isInvalid={!!draft.error}
      errorMessage={draft.error}
      validationBehavior="aria"
      styles={nameField}
    />
  );
}

function IconScaleCard({
  scale,
  index,
  focusName,
  onNameFocused,
}: {
  scale: IconScale;
  index: number;
  focusName: boolean;
  onNameFocused: () => void;
}) {
  const notify = useNotify();
  const store = useStore();
  const isReadOnly = useIsReadOnly();
  const update = useSetAtom(updateIconScaleAtom);
  const typography = useAtomValue(typographyDocumentAtom);
  const registry = useAtomValue(taxonomyDocumentAtom);
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const generated = useAtomValue(generatedIconsAtom).find(
    (entry) => entry.scale.id === scale.id,
  );
  const scaleType = resolveScaleType(scaleTypes, scale.scaleTypeId);
  const isWorkflow = scale.id === WORKFLOW_ICON_SCALE_ID;
  const fixedSteps = iconScaleFollowsTypeSteps(scale);
  const patch = (next: IconScalePatch) => {
    try {
      update({ id: scale.id, patch: next });
    } catch (failure) {
      notify.error(errorText(failure));
    }
  };
  const sourceField = (
    <>
      <Picker
        label="Size source"
        labelPosition="side"
        selectedKey={scale.source}
        isDisabled={isReadOnly}
        onSelectionChange={(key) => {
          if (isIconSizeSource(key)) patch({ source: key });
        }}
      >
        {Object.entries(ICON_SIZE_SOURCE_LABELS).map(([id, label]) => (
          <PickerItem key={id} id={id}>
            {label}
          </PickerItem>
        ))}
      </Picker>
      <p className={note}>{SOURCE_NOTES[scale.source]}</p>
      {scale.source === "formula" && (
        <ScaleFormulaPicker
          scaleType={scaleType}
          onChange={(scaleTypeId) => patch({ scaleTypeId })}
        />
      )}
      {scale.source === "line-height" && (
        <Picker
          label="Line height"
          labelPosition="side"
          selectedKey={scale.lineHeightId ?? null}
          isDisabled={isReadOnly}
          onSelectionChange={(key) => {
            if (key != null) patch({ lineHeightId: String(key) });
          }}
        >
          {typography.lineHeights.map((card) => {
            const label = termLabel(
              lineHeightName(typography, registry, card.id),
            );
            return (
              <PickerItem key={card.id} id={card.id} textValue={label}>
                {label}
              </PickerItem>
            );
          })}
        </Picker>
      )}
      {fixedSteps && (
        <p className={note}>
          {isWorkflow
            ? "Workflow publishes one icon size per Typography type step."
            : "Uses one icon size per Typography type step."}
        </p>
      )}
    </>
  );
  const range = !fixedSteps && (
    <>
      <NumberField
        label="Smaller values"
        labelPosition="side"
        value={scale.below}
        isDisabled={isReadOnly}
        minValue={0}
        maxValue={SCALE_BELOW_MAX}
        step={1}
        onChange={(value) => Number.isFinite(value) && patch({ below: value })}
      />
      <NumberField
        label="Larger values"
        labelPosition="side"
        value={scale.above}
        isDisabled={isReadOnly}
        minValue={0}
        maxValue={SCALE_ABOVE_MAX}
        step={1}
        onChange={(value) => Number.isFinite(value) && patch({ above: value })}
      />
    </>
  );
  const variables =
    scale.source === "line-height" ? undefined : (
      <>
        <ScaleBaseValueField
          label={
            scale.source === "follow-typography" ? "Base size" : "Base value"
          }
          scale={scale}
          scaleType={resolveScaleType(
            scaleTypes,
            scale.source === "follow-typography"
              ? TYPOGRAPHY_SCALE_TYPE_ID
              : scale.scaleTypeId,
          )}
          onChange={patch}
        />
        {scale.source === "formula" && (
          <ScaleTypeSettingsFields
            scaleType={scaleType}
            parameters={scale.parameters}
            bindings={scale.bindings}
            showRatioPresets={false}
            showAdaptiveControls={false}
            showDisabledFields
            isFormulaLocked={scaleType.locked}
            onChange={({ parameters, bindings }) =>
              patch({ parameters, bindings })
            }
          />
        )}
        {range}
      </>
    );
  return (
    <DimensionScaleCard
      noun="icon"
      scale={scale}
      values={generated?.values ?? []}
      isReadOnly={isReadOnly}
      canDelete={!isWorkflow}
      nameField={
        <IconScaleNameField
          scale={scale}
          focusName={focusName}
          onNameFocused={onNameFocused}
        />
      }
      formulaField={sourceField}
      variables={variables}
      onDelete={() =>
        notify.remove({
          kind: "dimensionScale",
          noun: `Icon scale ${scale.name}`,
          run: (store) => store.set(removeIconScaleAtom, scale.id),
          undo: () => store.set(restoreIconScaleAtom, { scale, index }),
        })
      }
    />
  );
}

export function FoundationsIconsPanel() {
  const notify = useNotify();
  const document = useAtomValue(iconsDocumentAtom);
  const updateSettings = useSetAtom(updateIconsSettingsAtom);
  const store = useStore();
  const [focusId, setFocusId] = useState<string | null>(null);
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (failure) {
      notify.error(errorText(failure));
    }
  };
  const systemSettings = (
    <AccordionItem id="system-settings" UNSAFE_style={firstAccordionItemStyle}>
      <AccordionItemTitle>System settings</AccordionItemTitle>
      <AccordionItemPanel UNSAFE_className={String(panel)}>
        <div className={stack}>
          <RoundingRulePicker
            labelPosition="side"
            label="Icon size rounding"
            valueType="font-size"
            ruleId={document.roundingRuleId}
            onChange={(roundingRuleId) =>
              attempt(() => updateSettings({ roundingRuleId }))
            }
          />
          <EditableNumberField
            labelPosition="side"
            label="Min icon size (px)"
            value={document.minIconSize}
            minValue={1}
            maxValue={document.maxIconSize}
            onChange={(minIconSize) =>
              attempt(() => updateSettings({ minIconSize }))
            }
          />
          <EditableNumberField
            labelPosition="side"
            label="Max icon size (px)"
            value={document.maxIconSize}
            minValue={document.minIconSize}
            onChange={(maxIconSize) =>
              attempt(() => updateSettings({ maxIconSize }))
            }
          />
        </div>
      </AccordionItemPanel>
    </AccordionItem>
  );
  return (
    <div
      className="foundationEditorPanel"
      data-component="FoundationsIconsPanel"
    >
      <FoundationModeSettings foundation="icons" before={systemSettings} />
      <div className={controls}>
        <EditOnly>
          <ActionButton
            onPress={() => {
              const id = notify.added(
                "dimensionScale",
                () => store.set(addIconScaleAtom),
                { noun: "Icon scale" },
              );
              if (id) setFocusId(id);
            }}
          >
            <Add />
            <Text>Add icon scale</Text>
          </ActionButton>
        </EditOnly>
        {document.scales.map((scale, index) => (
          <IconScaleCard
            key={scale.id}
            scale={scale}
            index={index}
            focusName={focusId === scale.id}
            onNameFocused={() =>
              setFocusId((id) => (id === scale.id ? null : id))
            }
          />
        ))}
      </div>
    </div>
  );
}
