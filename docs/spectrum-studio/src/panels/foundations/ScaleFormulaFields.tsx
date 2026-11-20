// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, PickerItem } from "@react-spectrum/s2";
import Edit from "@react-spectrum/s2/icons/Edit";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useAtomValue, useSetAtom } from "jotai";
import { useNotify } from "../../components/notifications/notificationContext";
import { EditOnly, useIsReadOnly } from "../../components/editable";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { scaleTypesAtom } from "../../features/logic/scaleTypeLibrary";
import { BINDABLE_PARAMETER_RANGES } from "../../features/modes/parameters";
import { setBindingPoint } from "../../features/scales/binding";
import type { DimensionScale } from "../../features/scales/foundation";
import { BASE_BINDING_KEY } from "../../features/scales/generate";
import type { ParameterBinding } from "../../features/scales/interpolation";
import {
  resolveBaseValue,
  type ScaleType,
} from "../../features/scales/scaleType";
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  editingScaleTypeIdAtom,
  formulasTabAtom,
} from "../../state/view/logicView";
import { activePageAtom } from "../../state/view/navigation";

const pickerRowStyles = style({ display: "flex", alignItems: "end", gap: 8 });
const detailStyles = style({ font: "detail", color: "neutral-subdued" });

export interface ScaleBasePatch {
  base: number | undefined;
  bindings: { [parameterId: string]: ParameterBinding };
}

/** Base value of a scale built on a formula; shared by every foundation made of scales. */
export function ScaleBaseValueField({
  scale,
  scaleType,
  label = "Base value",
  onChange,
  onFormulaBaseChange,
}: {
  scale: Pick<DimensionScale, "base" | "bindings">;
  scaleType: ScaleType;
  label?: string;
  onChange: (patch: ScaleBasePatch) => void;
  /** When set, edits change the formula's own base instead of overriding it on the scale. */
  onFormulaBaseChange?: (value: number) => void;
}) {
  const notify = useNotify();
  const isReadOnly = useIsReadOnly();
  const formulaBase = scaleType.base;
  const locked = onFormulaBaseChange
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
    onChange({
      base:
        locked || next === undefined || next === formulaBase.default
          ? undefined
          : next,
      bindings,
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
        label={label}
        labelPosition="side"
        value={value}
        step={formulaBase.step}
        isDisabled={isReadOnly || locked}
        formatOptions={{ maximumFractionDigits: 4 }}
        onChange={(next) => {
          if (!Number.isFinite(next)) return;
          if (!onFormulaBaseChange) {
            set(next);
            return;
          }
          try {
            onFormulaBaseChange(next);
          } catch (failure) {
            notify.error(
              failure instanceof Error ? failure.message : String(failure),
            );
          }
        }}
      />
      {locked && (
        <span className={detailStyles}>
          {onFormulaBaseChange
            ? "This formula is read-only."
            : `Set by ${scaleType.name}; the formula does not allow overriding it.`}
        </span>
      )}
      {isModified && !onFormulaBaseChange && (
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

/** Formula picker with a shortcut to edit the chosen formula in Formulas. */
export function ScaleFormulaPicker({
  scaleType,
  onChange,
}: {
  scaleType: ScaleType;
  onChange: (scaleTypeId: string) => void;
}) {
  const isReadOnly = useIsReadOnly();
  const scaleTypes = useAtomValue(scaleTypesAtom);
  const setActivePage = useSetAtom(activePageAtom);
  const setEditingScaleType = useSetAtom(editingScaleTypeIdAtom);
  const setFormulasTab = useSetAtom(formulasTabAtom);
  return (
    <div className={pickerRowStyles}>
      <Picker
        label="Formula"
        labelPosition="side"
        selectedKey={scaleType.id}
        isDisabled={isReadOnly}
        onSelectionChange={(key) => {
          if (key != null) onChange(String(key));
        }}
      >
        {scaleTypes.map((candidate) => (
          <PickerItem
            key={candidate.id}
            id={candidate.id}
            textValue={termLabel(candidate.name)}
          >
            {termLabel(candidate.name)}
          </PickerItem>
        ))}
      </Picker>
      <ActionButton
        aria-label={`Edit formula ${scaleType.name} in Formulas`}
        onPress={() => {
          setFormulasTab("progressions");
          setEditingScaleType(scaleType.id);
          setActivePage("formulas");
        }}
      >
        <Edit />
      </ActionButton>
    </div>
  );
}
