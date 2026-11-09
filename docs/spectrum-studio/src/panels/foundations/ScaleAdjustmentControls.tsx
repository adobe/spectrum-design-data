// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Checkbox,
  ColorSwatch,
  DialogTrigger,
  PickerItem,
  Popover,
} from "@react-spectrum/s2";
import Revert from "@react-spectrum/s2/icons/Revert";
import {
  css,
  focusRing,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { Button, Dialog } from "react-aria-components";
import { useEffect, useId, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { NumberField } from "../../components/fields/NumberField";
import { Picker } from "../../components/fields/Picker";
import { ColorPickerContents } from "../../components/color-picker/ColorPickerContents";
import { ColorSlider } from "../../components/color-picker/ColorSlider";
import { getColorSpaceConfig } from "../../components/color-picker/colorUtils";
import { useDefaultPickerGamut } from "../../components/color-picker/ColorPickerDefaults";
import { popoverDialogStyles } from "../../components/popoverLayout";
import type { Mode } from "../../features/modes/model";
import {
  colorOutputSettingsAtom,
  updateModeScaleAdjustmentAtom,
} from "../../features/color-system/state";
import {
  MAX_CHROMA,
  paletteColorHex,
} from "../../features/color-system/paletteValue";
import { outputGamut } from "../../features/color-system/outputSettings";
import {
  DEFAULT_ABSOLUTE_COLOR,
  NEUTRAL_ADJUSTMENT_VALUES,
  RELATIVE_ADJUSTMENT,
  type ScaleAdjustment,
} from "../../features/color-system/scaleAdjustment";

const controlsStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "full",
  minWidth: 0,
});
const channelStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});
const trackStyles = style({ paddingX: 8 });
const colorFieldStyles = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  font: "ui-sm",
});
const swatchButtonReset = css("all: unset;");
const swatchFocusStyles = style({ ...focusRing() });
const pickerStyles = style({ padding: 16 });
const adjustmentConfig = getColorSpaceConfig("OKlch", "polar");
const hueRange = [-180, 180] as const;
const chromaRange = [0, MAX_CHROMA] as const;

export function ScaleAdjustmentControls({
  mode,
  value,
  onChange,
  relativeOnly = false,
}: {
  mode?: Mode;
  value?: ScaleAdjustment;
  onChange?: (adjustment: ScaleAdjustment) => void;
  relativeOnly?: boolean;
}) {
  const update = useSetAtom(updateModeScaleAdjustmentAtom);
  const colorOutput = useAtomValue(colorOutputSettingsAtom);
  const gamut = useDefaultPickerGamut();
  const colorLabelId = useId();
  const adjustmentControlsId = useId();
  const controlsRef = useRef<HTMLDivElement>(null);
  const [sliderSize, setSliderSize] = useState(200);
  useEffect(() => {
    const element = controlsRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSliderSize(Math.max(1, Math.floor(entry.contentRect.width - 16))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const adjustment = value ?? mode?.foundations.color?.scaleAdjustment;
  const current = adjustment ?? RELATIVE_ADJUSTMENT;
  const enabled =
    relativeOnly || (adjustment !== undefined && adjustment.enabled !== false);
  const write = (adjustment: ScaleAdjustment) => {
    if (onChange) onChange(adjustment);
    else if (mode) update({ modeId: mode.id, adjustment });
  };
  return (
    <div ref={controlsRef} className={controlsStyles}>
      {!relativeOnly && (
        <Checkbox
          isSelected={enabled}
          aria-controls={adjustmentControlsId}
          onChange={(enabled) => write({ ...current, enabled })}
        >
          Adjust colors
        </Checkbox>
      )}
      {enabled && (
        <div id={adjustmentControlsId} className={controlsStyles}>
          {!relativeOnly && (
            <Picker
              label="Adjustment method"
              size="S"
              selectedKey={current.method}
              onSelectionChange={(method) => {
                if (method === current.method) return;
                if (method === "relative")
                  write({ ...RELATIVE_ADJUSTMENT, enabled: true });
                if (method === "absolute")
                  write({
                    method,
                    enabled: true,
                    color: { ...DEFAULT_ABSOLUTE_COLOR },
                  });
              }}
            >
              <PickerItem id="relative">Relative</PickerItem>
              <PickerItem id="absolute">Absolute</PickerItem>
            </Picker>
          )}
          {current.method === "relative" ? (
            <>
              {!relativeOnly && (
                <ActionButton
                  isQuiet
                  size="S"
                  aria-label="Reset relative adjustments"
                  styles={style({ alignSelf: "end" })}
                  onPress={() =>
                    write({ ...RELATIVE_ADJUSTMENT, enabled: true })
                  }
                >
                  <Revert />
                </ActionButton>
              )}
              <div className={channelStyles}>
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
                <div className={trackStyles}>
                  <ColorSlider
                    config={adjustmentConfig}
                    channel="h"
                    colorCoordinates={[
                      0.65,
                      0.15,
                      current.hue ?? NEUTRAL_ADJUSTMENT_VALUES.hue,
                    ]}
                    gamut={gamut}
                    orientation="horizontal"
                    size={sliderSize}
                    range={hueRange}
                    ariaLabel="Hue shift (°)"
                    valueText={`${current.hue ?? NEUTRAL_ADJUSTMENT_VALUES.hue}°`}
                    onChange={(color) =>
                      write({ ...current, hue: Number(color.coords[2]) })
                    }
                  />
                </div>
              </div>
              <div className={channelStyles}>
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
                <div className={trackStyles}>
                  <ColorSlider
                    config={adjustmentConfig}
                    channel="c"
                    colorCoordinates={[
                      0.65,
                      ((current.chroma ?? NEUTRAL_ADJUSTMENT_VALUES.chroma) /
                        400) *
                        MAX_CHROMA,
                      current.hue ?? NEUTRAL_ADJUSTMENT_VALUES.hue,
                    ]}
                    gamut={gamut}
                    orientation="horizontal"
                    size={sliderSize}
                    range={chromaRange}
                    ariaLabel="Saturation (%)"
                    valueText={`${current.chroma ?? NEUTRAL_ADJUSTMENT_VALUES.chroma}%`}
                    onChange={(color) =>
                      write({
                        ...current,
                        chroma: (Number(color.coords[1]) / MAX_CHROMA) * 400,
                      })
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div className={colorFieldStyles}>
              <span id={colorLabelId}>Color</span>
              <DialogTrigger>
                <Button
                  aria-labelledby={colorLabelId}
                  className={(state) =>
                    `${swatchButtonReset} ${swatchFocusStyles(state)}`
                  }
                >
                  <ColorSwatch
                    color={paletteColorHex(
                      current.color,
                      outputGamut(colorOutput),
                    )}
                    size="L"
                    aria-label="Selected color"
                  />
                </Button>
                <Popover size="M" padding="none">
                  <Dialog
                    aria-label="Color"
                    className={`${popoverDialogStyles} ${pickerStyles}`}
                  >
                    <ColorPickerContents
                      color={`oklch(${current.color.lightness} ${(current.color.chroma / 100) * MAX_CHROMA} ${current.color.hue})`}
                      colorSpace="OKlch"
                      model="polar"
                      onChange={(_, color) => {
                        const [lightness, chroma, hue] = color
                          .to("oklch")
                          .coords.map(Number);
                        write({
                          method: "absolute",
                          enabled: true,
                          color: {
                            lightness,
                            chroma: (chroma / MAX_CHROMA) * 100,
                            hue: Number.isFinite(hue) ? hue : current.color.hue,
                          },
                        });
                      }}
                    />
                  </Dialog>
                </Popover>
              </DialogTrigger>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
