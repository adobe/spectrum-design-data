// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, PickerItem, Text, ToastQueue } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Edit from "@react-spectrum/s2/icons/Edit";
import {
  useAtomValue,
  useSetAtom,
  useStore,
  type Atom,
  type WritableAtom,
} from "jotai";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { DimensionValuePolicy } from "../../features/scales/issues";
import { useDeletionToast } from "../../components/deletionToastContext";
import { EditOnly, useIsReadOnly } from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { RoundingRulePicker } from "../../components/logic/RoundingRulePicker";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import { BINDABLE_PARAMETER_RANGES } from "../../features/modes/parameters";
import { setBindingPoint } from "../../features/scales/binding";
import {
  type DimensionDocument,
  type DimensionScale,
  type GeneratedDimensionValue,
} from "../../features/scales/foundation";
import type { DimensionScalePatch } from "../../features/scales/foundationState";
import {
  BASE_BINDING_KEY,
  SCALE_ABOVE_MAX,
  SCALE_BELOW_MAX,
} from "../../features/scales/generate";
import type { ParameterBinding } from "../../features/scales/interpolation";
import {
  resolveBaseValue,
  resolveScaleType,
  type ScaleType,
} from "../../features/scales/scaleType";
import { editingScaleTypeIdAtom } from "../../state/view/logicView";
import { activePageAtom } from "../../state/view/navigation";
import { ScaleTypeSettingsFields } from "./ScaleTypeSettingsFields";
import { SourceNameEditor } from "../registry/SourceNameEditor";
import { DimensionScaleCard } from "./DimensionScaleCard";

/** The atoms and wording of one foundation made of dimension scales, such as spacing or size. */
export interface DimensionFoundationBinding {
  /** Lowercase noun used in labels: "spacing" or "size". */
  noun: string;
  valuePolicy?: DimensionValuePolicy;
  preview?: (
    scale: DimensionScale,
    values: readonly GeneratedDimensionValue[],
  ) => ReactNode;
  documentAtom: Atom<DimensionDocument>;
  generatedAtom: Atom<
    { scale: DimensionScale; values: GeneratedDimensionValue[] }[]
  >;
  addScaleAtom: WritableAtom<null, [], string>;
  updateScaleAtom: WritableAtom<
    null,
    [{ id: string; patch: DimensionScalePatch }],
    boolean
  >;
  updateFormulaPartAtom?: WritableAtom<
    null,
    [{ scaleId: string; parameterId: string; value: number }],
    void
  >;
  removeScaleAtom: WritableAtom<null, [string], void>;
  restoreScaleAtom: WritableAtom<
    null,
    [{ scale: DimensionScale; index: number }],
    void
  >;
  isNameTaken: (
    document: DimensionDocument,
    name: string,
    exceptId?: string,
  ) => boolean;
}

const FoundationContext = createContext<DimensionFoundationBinding | null>(
  null,
);

function useFoundation() {
  const foundation = useContext(FoundationContext);
  if (!foundation)
    throw new Error(
      "Dimension foundation components must render inside DimensionFoundationPanel.",
    );
  return foundation;
}

const panelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
});
const pickerRowStyles = style({ display: "flex", alignItems: "end", gap: 8 });
const detailStyles = style({ font: "detail", color: "neutral-subdued" });

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function BaseValueField({
  scale,
  scaleType,
}: {
  scale: DimensionScale;
  scaleType: ScaleType;
}) {
  const foundation = useFoundation();
  const isReadOnly = useIsReadOnly();
  const update = useSetAtom(foundation.updateScaleAtom);
  const store = useStore();
  const formulaBase = scaleType.base;
  const locked = foundation.updateFormulaPartAtom
    ? !!scaleType.locked
    : !formulaBase.overridable;
  const binding = scale.bindings?.[BASE_BINDING_KEY];
  const value = resolveBaseValue(scaleType, scale.base);
  const isModified =
    !locked && scale.base !== undefined && scale.base !== formulaBase.default;
  const apply = (
    next: number | undefined,
    nextBinding: ParameterBinding | undefined,
  ) => {
    const bindings = { ...scale.bindings };
    // A locked base keeps the formula's value at the mode parameter's neutral position.
    const neutral =
      nextBinding &&
      BINDABLE_PARAMETER_RANGES[nextBinding.modeParameterId]?.neutral;
    if (nextBinding)
      bindings[BASE_BINDING_KEY] =
        locked && neutral !== undefined
          ? setBindingPoint(nextBinding, neutral, formulaBase.default)
          : nextBinding;
    else delete bindings[BASE_BINDING_KEY];
    update({
      id: scale.id,
      patch: {
        base:
          locked || next === undefined || next === formulaBase.default
            ? undefined
            : next,
        bindings,
      },
    });
  };
  const set = (next: number | undefined) => {
    const neutral =
      binding && BINDABLE_PARAMETER_RANGES[binding.modeParameterId]?.neutral;
    apply(
      next,
      binding && neutral !== undefined
        ? setBindingPoint(binding, neutral, next ?? formulaBase.default)
        : binding,
    );
  };

  return (
    <>
      <NumberField
        label="Base value"
        labelPosition="side"
        value={value}
        step={formulaBase.step}
        isDisabled={isReadOnly || locked}
        formatOptions={{ maximumFractionDigits: 4 }}
        onChange={(next) => {
          if (!Number.isFinite(next)) return;
          if (!foundation.updateFormulaPartAtom) {
            set(next);
            return;
          }
          try {
            store.set(foundation.updateFormulaPartAtom, {
              scaleId: scale.id,
              parameterId: BASE_BINDING_KEY,
              value: next,
            });
          } catch (failure) {
            ToastQueue.negative(
              failure instanceof Error ? failure.message : String(failure),
            );
          }
        }}
      />
      {locked && (
        <span className={detailStyles}>
          {foundation.updateFormulaPartAtom
            ? "This formula is read-only."
            : `Set by ${scaleType.name}; the formula does not allow overriding it.`}
        </span>
      )}
      {isModified && !foundation.updateFormulaPartAtom && (
        <EditOnly>
          <div className={pickerRowStyles}>
            <span className={detailStyles}>
              Modified from {scaleType.name} ({formulaBase.default})
            </span>
            <ActionButton isQuiet onPress={() => set(undefined)}>
              Revert
            </ActionButton>
          </div>
        </EditOnly>
      )}
    </>
  );
}

function ScaleNameField({
  scale,
  focusName,
  onNameFocused,
}: {
  scale: DimensionScale;
  focusName: boolean;
  onNameFocused: () => void;
}) {
  const foundation = useFoundation();
  return (
    <SourceNameEditor
      sourceId={`${foundation.noun}:${scale.id}`}
      label="Name"
      presentation="text"
      focusName={focusName}
      onNameFocused={onNameFocused}
    />
  );
}

function ScaleEditorContent({
  scale,
  canDelete,
  index,
  focusName,
  onNameFocused,
}: {
  scale: DimensionScale;
  canDelete: boolean;
  index: number;
  focusName: boolean;
  onNameFocused: () => void;
}) {
  const foundation = useFoundation();
  const isReadOnly = useIsReadOnly();
  const store = useStore();
  const update = useSetAtom(foundation.updateScaleAtom);
  const remove = useSetAtom(foundation.removeScaleAtom);
  const restore = useSetAtom(foundation.restoreScaleAtom);
  const updateFormulaPart = foundation.updateFormulaPartAtom;
  const { notifyDeleted } = useDeletionToast();
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const scaleType = resolveScaleType(scaleTypes, scale.scaleTypeId);
  const setActivePage = useSetAtom(activePageAtom);
  const setEditingScaleType = useSetAtom(editingScaleTypeIdAtom);
  const values =
    useAtomValue(foundation.generatedAtom).find(
      (entry) => entry.scale.id === scale.id,
    )?.values ?? [];
  const patch = (next: DimensionScalePatch) => {
    try {
      update({ id: scale.id, patch: next });
    } catch (failure) {
      ToastQueue.negative(
        failure instanceof Error ? failure.message : String(failure),
      );
    }
  };

  return (
    <DimensionScaleCard
      noun={foundation.noun}
      scale={scale}
      values={values}
      isReadOnly={isReadOnly}
      canDelete={canDelete}
      valuePolicy={foundation.valuePolicy}
      preview={foundation.preview?.(scale, values)}
      nameField={
        <ScaleNameField
          scale={scale}
          focusName={focusName}
          onNameFocused={onNameFocused}
        />
      }
      onDelete={() => {
        try {
          remove(scale.id);
          notifyDeleted(
            `${sentenceCase(foundation.noun)} scale ${scale.name}`,
            () => {
              try {
                restore({ scale, index });
              } catch (failure) {
                ToastQueue.negative(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
            },
          );
        } catch (failure) {
          ToastQueue.negative(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      }}
      onPublishingChange={(hideFromPublishing) => patch({ hideFromPublishing })}
      formulaField={
        <div className={pickerRowStyles}>
          <Picker
            label="Formula"
            labelPosition="side"
            selectedKey={scaleType.id}
            isDisabled={isReadOnly}
            onSelectionChange={(key) => {
              if (key != null) patch({ scaleTypeId: String(key) });
            }}
          >
            {scaleTypes.map((candidate) => (
              <PickerItem
                key={candidate.id}
                id={candidate.id}
                textValue={candidate.name}
              >
                {candidate.name}
              </PickerItem>
            ))}
          </Picker>
          <ActionButton
            aria-label={`Edit formula ${scaleType.name} in Logic`}
            onPress={() => {
              setEditingScaleType(scaleType.id);
              setActivePage("logic");
            }}
          >
            <Edit />
          </ActionButton>
        </div>
      }
      variables={
        <>
          <BaseValueField scale={scale} scaleType={scaleType} />
          <ScaleTypeSettingsFields
            scaleType={scaleType}
            parameters={scale.parameters}
            bindings={scale.bindings}
            showRatioPresets={false}
            showAdaptiveControls={false}
            showDisabledFields
            isFormulaLocked={scaleType.locked}
            onDefaultChange={
              updateFormulaPart
                ? (parameterId, value) => {
                    try {
                      store.set(updateFormulaPart, {
                        scaleId: scale.id,
                        parameterId,
                        value,
                      });
                    } catch (failure) {
                      ToastQueue.negative(
                        failure instanceof Error
                          ? failure.message
                          : String(failure),
                      );
                    }
                  }
                : undefined
            }
            onChange={({ parameters, bindings }) =>
              patch({ parameters, bindings })
            }
          />
          <NumberField
            label="Smaller values"
            labelPosition="side"
            value={scale.below}
            isDisabled={isReadOnly}
            minValue={0}
            maxValue={SCALE_BELOW_MAX}
            step={1}
            onChange={(value) =>
              Number.isFinite(value) && patch({ below: value })
            }
          />
          <NumberField
            label="Larger values"
            labelPosition="side"
            value={scale.above}
            isDisabled={isReadOnly}
            minValue={0}
            maxValue={SCALE_ABOVE_MAX}
            step={1}
            onChange={(value) =>
              Number.isFinite(value) && patch({ above: value })
            }
          />
        </>
      }
      roundingField={
        <RoundingRulePicker
          label="Rounding"
          ruleId={scale.roundingRuleId}
          onChange={(roundingRuleId) => patch({ roundingRuleId })}
          showDisabledControl
        />
      }
    />
  );
}

/** Shared inline scale editor for dimension foundations. */
export function DimensionFoundationPanel({
  foundation,
  componentName,
}: {
  foundation: DimensionFoundationBinding;
  componentName: string;
}) {
  const document = useAtomValue(foundation.documentAtom);
  const addScale = useSetAtom(foundation.addScaleAtom);
  const [focusId, setFocusId] = useState<string | null>(null);

  return (
    <FoundationContext.Provider value={foundation}>
      <div
        data-component={componentName}
        className={`foundationEditorPanel ${panelStyles}`}
      >
        <EditOnly>
          <ActionButton
            onPress={() => {
              try {
                setFocusId(addScale());
              } catch (failure) {
                ToastQueue.negative(
                  failure instanceof Error ? failure.message : String(failure),
                );
              }
            }}
          >
            <Add />
            <Text>{`Add ${foundation.noun} scale`}</Text>
          </ActionButton>
        </EditOnly>
        {document.scales.map((scale, index) => (
          <ScaleEditorContent
            key={scale.id}
            scale={scale}
            index={index}
            canDelete={document.scales.length > 1}
            focusName={focusId === scale.id}
            onNameFocused={() =>
              setFocusId((id) => (id === scale.id ? null : id))
            }
          />
        ))}
      </div>
    </FoundationContext.Provider>
  );
}
