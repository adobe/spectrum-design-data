// Copyright 2026 Adobe. All rights reserved.
import { PickerItem } from "@react-spectrum/s2";
import { useSetAtom } from "jotai";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { ColorPickerContents } from "../../components/color-picker/ColorPickerContents";
import type { Mode } from "../../features/modes/model";
import { updateModeScaleAdjustmentAtom } from "../../features/color-system/state";
import { MAX_CHROMA } from "../../features/color-system/paletteValue";
import {
  DEFAULT_ABSOLUTE_COLOR,
  NEUTRAL_ADJUSTMENT_VALUES,
  RELATIVE_ADJUSTMENT,
  type ScaleAdjustment,
} from "../../features/color-system/scaleAdjustment";

export function ScaleAdjustmentControls({
  mode,
  value,
  onChange,
}: {
  mode?: Mode;
  value?: ScaleAdjustment;
  onChange?: (adjustment: ScaleAdjustment) => void;
}) {
  const update = useSetAtom(updateModeScaleAdjustmentAtom);
  const current =
    value ?? mode?.foundations.color?.scaleAdjustment ?? RELATIVE_ADJUSTMENT;
  const write = (adjustment: ScaleAdjustment) => {
    if (onChange) onChange(adjustment);
    else if (mode) update({ modeId: mode.id, adjustment });
  };
  return (
    <>
      <Picker
        label="Adjustment method"
        size="S"
        selectedKey={current.method}
        onSelectionChange={(method) => {
          if (method === current.method) return;
          if (method === "relative") write(RELATIVE_ADJUSTMENT);
          if (method === "absolute")
            write({ method, color: { ...DEFAULT_ABSOLUTE_COLOR } });
        }}
      >
        <PickerItem id="relative">Relative</PickerItem>
        <PickerItem id="absolute">Absolute</PickerItem>
      </Picker>
      {current.method === "relative" ? (
        <>
          <NumberField
            label="Hue shift (°)"
            size="S"
            value={current.hue ?? NEUTRAL_ADJUSTMENT_VALUES.hue}
            minValue={-180}
            maxValue={180}
            step={0.1}
            onChange={(hue) => {
              if (Number.isFinite(hue)) write({ ...current, hue });
            }}
          />
          <NumberField
            label="Saturation (%)"
            size="S"
            value={current.chroma ?? NEUTRAL_ADJUSTMENT_VALUES.chroma}
            minValue={0}
            maxValue={400}
            step={0.1}
            onChange={(chroma) => {
              if (Number.isFinite(chroma)) write({ ...current, chroma });
            }}
          />
        </>
      ) : (
        <ColorPickerContents
          color={`oklch(${current.color.lightness} ${(current.color.chroma / 100) * MAX_CHROMA} ${current.color.hue})`}
          onChange={(_, color) => {
            const [lightness, chroma, hue] = color
              .to("oklch")
              .coords.map(Number);
            write({
              method: "absolute",
              color: {
                lightness,
                chroma: (chroma / MAX_CHROMA) * 100,
                hue: Number.isFinite(hue) ? hue : current.color.hue,
              },
            });
          }}
        />
      )}
    </>
  );
}
