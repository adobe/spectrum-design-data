// Copyright 2026 Adobe. All rights reserved.
import { useNotify } from "../../components/notifications/notificationContext";
import { termLabel } from "../../features/taxonomy/termPresentation";
import { ActionButton, Checkbox, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import {
  useAtomValue,
  useSetAtom,
  useStore,
  type Atom,
  type WritableAtom,
} from "jotai";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DimensionValuePolicy } from "../../features/scales/issues";
import { EditOnly, useIsReadOnly } from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { RoundingRulePicker } from "../../components/logic/RoundingRulePicker";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
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
import {
  resolveScaleType,
  type ScaleType,
} from "../../features/scales/scaleType";
import { ScaleTypeSettingsFields } from "./ScaleTypeSettingsFields";
import { ScaleBaseValueField, ScaleFormulaPicker } from "./ScaleFormulaFields";
import { ClassificationTerms } from "../tokens/ClassificationTerms";
import { taxonomyDocumentAtom } from "../../features/taxonomy/state";
import { editDimensionScaleClassificationAtom } from "../../features/taxonomy/sourceState";
import { dimensionScaleNameCollisions } from "../../features/taxonomy/naming";
import { DimensionScaleCard } from "./DimensionScaleCard";

/** The atoms and wording of one foundation made of dimension scales, such as spacing or size. */
export interface DimensionFoundationBinding {
  /** Lowercase noun used in labels: "spacing" or "size". */
  noun: "spacing" | "size" | "radius";
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
  const update = useSetAtom(foundation.updateScaleAtom);
  const store = useStore();
  const formulaPart = foundation.updateFormulaPartAtom;
  return (
    <ScaleBaseValueField
      scale={scale}
      scaleType={scaleType}
      onChange={(patch) => update({ id: scale.id, patch })}
      onFormulaBaseChange={
        formulaPart &&
        ((value) =>
          store.set(formulaPart, {
            scaleId: scale.id,
            parameterId: BASE_BINDING_KEY,
            value,
          }))
      }
    />
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
  const isReadOnly = useIsReadOnly();
  const taxonomy = useAtomValue(taxonomyDocumentAtom);
  const document = useAtomValue(foundation.documentAtom);
  const editClassification = useSetAtom(editDimensionScaleClassificationAtom);
  const [error, setError] = useState("");
  // Classification has no single text input to focus; clear the request once shown.
  useEffect(() => {
    if (focusName) onNameFocused();
  }, [focusName, onNameFocused]);
  const collision = dimensionScaleNameCollisions(
    document,
    taxonomy,
    foundation.noun,
  ).find((item) => item.scaleIds.includes(scale.id))?.message;
  if (isReadOnly || !scale.nameRef?.classification)
    return <Text>Name: {termLabel(scale.name)}</Text>;
  return (
    <ClassificationTerms
      value={scale.nameRef.classification}
      taxonomy={taxonomy}
      scope={foundation.noun}
      tier="primitive"
      description={
        collision ??
        `Name: ${termLabel(scale.name)}. Built from the Registry terms below.`
      }
      errorMessage={error || undefined}
      onChange={(classification) => {
        try {
          editClassification({
            scope: foundation.noun,
            scaleId: scale.id,
            classification,
          });
          setError("");
        } catch (failure) {
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
        }
      }}
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
  const notify = useNotify();
  const foundation = useFoundation();
  const isReadOnly = useIsReadOnly();
  const store = useStore();
  const update = useSetAtom(foundation.updateScaleAtom);
  const updateFormulaPart = foundation.updateFormulaPartAtom;
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const scaleType = resolveScaleType(scaleTypes, scale.scaleTypeId);
  const values =
    useAtomValue(foundation.generatedAtom).find(
      (entry) => entry.scale.id === scale.id,
    )?.values ?? [];
  const patch = (next: DimensionScalePatch) => {
    try {
      update({ id: scale.id, patch: next });
    } catch (failure) {
      notify.error(
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
      onDelete={() =>
        notify.remove({
          kind: "dimensionScale",
          noun: `${sentenceCase(foundation.noun)} scale ${termLabel(scale.name)}`,
          run: (store) => store.set(foundation.removeScaleAtom, scale.id),
          undo: () => store.set(foundation.restoreScaleAtom, { scale, index }),
        })
      }
      onPublishingChange={(hideFromPublishing) => patch({ hideFromPublishing })}
      formulaField={
        <ScaleFormulaPicker
          scaleType={scaleType}
          onChange={(scaleTypeId) => patch({ scaleTypeId })}
        />
      }
      variables={
        <>
          <BaseValueField scale={scale} scaleType={scaleType} />
          {foundation.noun === "spacing" && (
            <Checkbox
              isSelected={scale.componentSizeScaling ?? false}
              isDisabled={isReadOnly}
              onChange={(componentSizeScaling) =>
                patch({ componentSizeScaling })
              }
            >
              Follow component size
            </Checkbox>
          )}
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
                      notify.error(
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
          <NumberField
            label="Formula step named 100"
            labelPosition="side"
            value={scale.startStep ?? 0}
            isDisabled={isReadOnly}
            minValue={-SCALE_BELOW_MAX}
            maxValue={SCALE_ABOVE_MAX}
            step={1}
            description="Starts the scale partway along its formula. 0 names the base value 100."
            onChange={(value) =>
              Number.isFinite(value) &&
              patch({ startStep: Math.round(value) || undefined })
            }
          />
        </>
      }
      roundingField={
        <RoundingRulePicker
          label="Rounding"
          valueType={foundation.noun}
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
  const notify = useNotify();
  const document = useAtomValue(foundation.documentAtom);
  const store = useStore();
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
              const id = notify.added(
                "dimensionScale",
                () => store.set(foundation.addScaleAtom),
                { noun: `${sentenceCase(foundation.noun)} scale` },
              );
              if (id) setFocusId(id);
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
