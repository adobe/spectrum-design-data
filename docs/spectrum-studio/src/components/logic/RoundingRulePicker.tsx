// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, PickerItem } from "@react-spectrum/s2";
import Edit from "@react-spectrum/s2/icons/Edit";
import { useAtomValue, useSetAtom } from "jotai";
import type { ComponentProps } from "react";
import { EditablePicker } from "../editable";
import { rulesAtom } from "../../features/logic/library";
import { activePageAtom } from "../../state/view/navigation";
import { Picker } from "../fields/Picker";
import { useIsReadOnly } from "../editable";
import {
  ruleAppliesTo,
  type RuleValueType,
} from "../../features/logic/applicability";

export interface RoundingRulePickerProps {
  label: string;
  labelPosition?: ComponentProps<typeof EditablePicker>["labelPosition"];
  layout?: ComponentProps<typeof EditablePicker>["layout"];
  ruleId: string;
  onChange: (ruleId: string) => void;
  showDisabledControl?: boolean;
  valueType?: RuleValueType;
  valueTypes?: readonly RuleValueType[];
}

export function RoundingRulePicker({
  label,
  labelPosition = "side",
  layout,
  ruleId,
  onChange,
  showDisabledControl = false,
  valueType,
  valueTypes,
}: RoundingRulePickerProps) {
  const contexts = valueTypes ?? (valueType ? [valueType] : []);
  const applies = (rule: Parameters<typeof ruleAppliesTo>[0]) =>
    !contexts.length || contexts.some((type) => ruleAppliesTo(rule, type));
  const rules = useAtomValue(rulesAtom).filter(
    (rule) => rule.type === "rounding" && (rule.id === ruleId || applies(rule)),
  );
  const setActivePage = useSetAtom(activePageAtom);
  const selectedRule = rules.find((rule) => rule.id === ruleId) ?? rules[0];
  const isReadOnly = useIsReadOnly();
  const pickerProps = {
    label,
    labelPosition,
    layout,
    UNSAFE_style: { flex: "1 1 0%", minWidth: 0 },
    selectedKey: selectedRule?.id ?? "",
    isDisabled: isReadOnly,
    onSelectionChange: (key: string | number | null) => {
      if (key != null) onChange(String(key));
    },
    children: rules.map((rule) => (
      <PickerItem key={rule.id} id={rule.id} textValue={rule.name}>
        {rule.name}
        {!applies(rule) ? " (inactive)" : ""}
      </PickerItem>
    )),
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {showDisabledControl ? (
        <Picker {...pickerProps} />
      ) : (
        <EditablePicker
          {...pickerProps}
          displayValue={
            selectedRule
              ? `${selectedRule.name}${!applies(selectedRule) ? " (inactive)" : ""}`
              : "No rounding rule"
          }
        />
      )}
      <ActionButton
        isQuiet
        aria-label={`Edit ${label} in Logic`}
        onPress={() => setActivePage("logic")}
      >
        <Edit />
      </ActionButton>
    </div>
  );
}
