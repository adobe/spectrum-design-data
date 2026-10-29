// Copyright 2026 Adobe. All rights reserved.
import { ActionButton, ColorSwatch, Text } from "@react-spectrum/s2";
import {
  ColorSwatchPicker,
  parseColor,
} from "@react-spectrum/s2/ColorSwatchPicker";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo } from "react";
import type {
  OutputGamut,
  PaletteColor,
} from "../../features/color-system/model";
import { paletteSwatches } from "../../features/color-system/palette";

export interface PaletteSwatchPickerProps {
  palette: readonly PaletteColor[];
  outputGamut: OutputGamut;
  /** The palette color the stop is linked to, if any. */
  linkedId?: string;
  onLink: (paletteColorId: string) => void;
  onUnlink: () => void;
  isReadOnly?: boolean;
}

const sectionStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});
const labelStyles = style({ font: "ui-sm", color: "neutral-subdued" });
const linkedRowStyles = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
});
// Transparent matches no palette swatch, so nothing looks selected while unlinked.
const NO_SELECTION = "#00000000";

function swatchKey(hex: string) {
  return parseColor(hex).toString("hex");
}

/** Lets a color stop reference a palette color; the stop follows the palette color when it changes. */
export function PaletteSwatchPicker({
  palette,
  outputGamut,
  linkedId,
  onLink,
  onUnlink,
  isReadOnly = false,
}: PaletteSwatchPickerProps) {
  const swatches = useMemo(
    () => paletteSwatches(palette, outputGamut),
    [palette, outputGamut],
  );
  const linked = swatches.find((swatch) => swatch.color.id === linkedId);
  // Swatches must be unique, so colors that render identically to an earlier one are left out.
  const pickable = swatches.filter((swatch) => !swatch.duplicateOf);

  if (!palette.length || (isReadOnly && !linked)) return null;

  return (
    <div className={sectionStyles}>
      <span className={labelStyles}>Palette</span>
      {linked && (
        <div className={linkedRowStyles}>
          <ColorSwatch
            color={linked.hex}
            size="S"
            aria-label={linked.color.name}
          />
          <Text>Linked to {linked.color.name}</Text>
          {!isReadOnly && (
            <ActionButton isQuiet onPress={onUnlink}>
              Unlink
            </ActionButton>
          )}
        </div>
      )}
      {!isReadOnly && (
        <ColorSwatchPicker
          aria-label="Palette colors"
          size="M"
          rounding="default"
          value={linked?.hex ?? NO_SELECTION}
          onChange={(color) => {
            const match = pickable.find(
              (swatch) => swatchKey(swatch.hex) === color.toString("hex"),
            );
            if (match && match.color.id !== linkedId) onLink(match.color.id);
          }}
        >
          {pickable.map((swatch) => (
            <ColorSwatch
              key={swatch.color.id}
              color={swatch.hex}
              aria-label={swatch.color.name}
            />
          ))}
        </ColorSwatchPicker>
      )}
    </div>
  );
}
