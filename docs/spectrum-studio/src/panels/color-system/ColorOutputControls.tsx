// Copyright 2026 Adobe. All rights reserved.
import { Checkbox, PickerItem } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useState } from "react";
import { EditablePicker } from "../../components/editable";
import {
  COLOR_FORMATS,
  COLOR_GAMUTS,
  FORMAT_LABELS,
  GAMUT_LABELS,
  isFormatAvailable,
  outputGamut,
  updateColorOutputSettings,
  type ColorOutputSettings,
} from "../../features/color-system/outputSettings";

const stack = style({ display: "flex", flexDirection: "column", gap: 16 });
const help = style({ font: "body-sm", color: "neutral-subdued" });

export interface ColorOutputControlsProps {
  value: ColorOutputSettings;
  onChange: (value: ColorOutputSettings) => void;
  isReadOnly?: boolean;
}

export function ColorOutputControls({
  value,
  onChange,
  isReadOnly = false,
}: ColorOutputControlsProps) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const update = (patch: Partial<ColorOutputSettings>) => {
    try {
      const result = updateColorOutputSettings(value, patch);
      onChange(result.settings);
      setMessage(result.message);
      setError(undefined);
    } catch (failure) {
      setMessage(undefined);
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  return (
    <div className={stack}>
      <EditablePicker
        label="Gamut"
        selectedKey={value.authoringGamut}
        displayValue={GAMUT_LABELS[value.authoringGamut]}
        isReadOnly={isReadOnly}
        onSelectionChange={(key) => {
          const gamut = COLOR_GAMUTS.find((item) => item === key);
          if (gamut) update({ authoringGamut: gamut });
        }}
      >
        {COLOR_GAMUTS.map((gamut) => (
          <PickerItem id={gamut} key={gamut}>
            {GAMUT_LABELS[gamut]}
          </PickerItem>
        ))}
      </EditablePicker>
      <EditablePicker
        label="Color format"
        selectedKey={value.outputFormat}
        displayValue={FORMAT_LABELS[value.outputFormat]}
        isReadOnly={isReadOnly}
        disabledKeys={COLOR_FORMATS.filter(
          (format) => !isFormatAvailable(value, format),
        )}
        onSelectionChange={(key) => {
          const format = COLOR_FORMATS.find((item) => item === key);
          if (format) update({ outputFormat: format });
        }}
      >
        {COLOR_FORMATS.map((format) => (
          <PickerItem id={format} key={format}>
            {FORMAT_LABELS[format]}
          </PickerItem>
        ))}
      </EditablePicker>
      <Checkbox
        isSelected={value.mapOutputsToSrgb}
        isDisabled={isReadOnly}
        onChange={(mapOutputsToSrgb) => update({ mapOutputsToSrgb })}
      >
        Map outputs to sRGB
      </Checkbox>
      <p className={help}>
        Keeps authored wide-gamut colors intact and maps generated output to
        sRGB. Hex and HSL require sRGB output.
      </p>
      <p className={help}>
        Output gamut: {GAMUT_LABELS[outputGamut(value)]}. Adaptive CSS uses
        functional colors rather than changing Hex literals.
      </p>
      <div role="status" aria-live="polite" className={help}>
        {message}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
