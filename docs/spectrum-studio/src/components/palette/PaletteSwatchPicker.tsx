// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  ColorSwatch,
  Text,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
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
  presentation?: "default" | "swatches" | "link";
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
const swatchStyles = style({ padding: 0, minWidth: 0 });
const groupStyles = style({ flexWrap: "wrap" });

/** Lets a color stop reference a palette color; the stop follows the palette color when it changes. */
export function PaletteSwatchPicker({
  palette,
  outputGamut,
  linkedId,
  onLink,
  onUnlink,
  isReadOnly = false,
  presentation = "default",
}: PaletteSwatchPickerProps) {
  const swatches = useMemo(
    () => paletteSwatches(palette, outputGamut),
    [palette, outputGamut],
  );
  const linked = swatches.find((swatch) => swatch.color.id === linkedId);
  // Swatches must be unique, so colors that render identically to an earlier one are left out.
  const pickable = swatches.filter((swatch) => !swatch.duplicateOf);

  if (
    !palette.length ||
    (isReadOnly && !linked) ||
    (presentation === "link" && !linked)
  )
    return null;

  return (
    <div className={sectionStyles}>
      {presentation !== "link" && (
        <span className={labelStyles}>
          {presentation === "swatches" ? "Palette colors" : "Palette"}
        </span>
      )}
      {linked && presentation !== "swatches" && (
        <div className={linkedRowStyles}>
          <ColorSwatch
            color={linked.hex}
            size="S"
            aria-label={termLabel(linked.color.name)}
          />
          <Text>Linked to {termLabel(linked.color.name)}</Text>
        </div>
      )}
      {!isReadOnly && presentation !== "link" && (
        <ToggleButtonGroup
          aria-label="Palette colors"
          selectionMode="single"
          size="M"
          UNSAFE_className={String(groupStyles)}
          selectedKeys={linked ? [linked.color.id] : []}
          onSelectionChange={(keys) => {
            const id = [...keys][0];
            if (typeof id === "string") onLink(id);
            else if (linkedId) onUnlink();
          }}
        >
          {pickable.map((swatch) => (
            <TooltipTrigger key={swatch.color.id}>
              <ToggleButton
                id={swatch.color.id}
                aria-label={termLabel(swatch.color.name)}
                UNSAFE_className={String(swatchStyles)}
              >
                <ColorSwatch color={swatch.hex} size="M" />
              </ToggleButton>
              <Tooltip>
                {swatch.color.id === linkedId
                  ? "Click to unlink"
                  : "Link to palette color"}
              </Tooltip>
            </TooltipTrigger>
          ))}
        </ToggleButtonGroup>
      )}
    </div>
  );
}
