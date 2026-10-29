// Copyright 2026 Adobe. All rights reserved.
import { NumberField, Picker, PickerItem, Text } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import type { ScaleNamingRule } from "../../features/logic/model";
import { scaleNamingIndices } from "../../features/logic/scaleNaming";

const layout = style({ display: "flex", flexDirection: "column", gap: 12 });

export function ScaleNamingRuleEditor({
  rule,
  onChange,
}: {
  rule: ScaleNamingRule;
  onChange: (rule: ScaleNamingRule) => void;
}) {
  let preview: string;
  try {
    preview = scaleNamingIndices(rule, 13, 3).join(", ");
  } catch (failure) {
    preview = failure instanceof Error ? failure.message : String(failure);
  }
  return (
    <div className={layout}>
      <NumberField
        label="Base label"
        value={rule.baseLabel}
        minValue={1}
        onChange={(baseLabel) => onChange({ ...rule, baseLabel })}
      />
      <NumberField
        label="Above-base increment"
        value={rule.aboveIncrement}
        minValue={1}
        onChange={(aboveIncrement) => onChange({ ...rule, aboveIncrement })}
      />
      <Picker
        label="Below-base spacing"
        selectedKey={rule.below.kind}
        onSelectionChange={(key) =>
          onChange({
            ...rule,
            below:
              key === "fixed"
                ? { kind: "fixed", increment: 25 }
                : { kind: "automatic" },
          })
        }
      >
        <PickerItem id="automatic">Automatic clean increments</PickerItem>
        <PickerItem id="fixed">Fixed increment</PickerItem>
      </Picker>
      {rule.below.kind === "fixed" && (
        <NumberField
          label="Below-base increment"
          minValue={1}
          value={rule.below.increment}
          onChange={(increment) =>
            onChange({ ...rule, below: { kind: "fixed", increment } })
          }
        />
      )}
      <Text>Example with three swatches below the base: {preview}</Text>
    </div>
  );
}
