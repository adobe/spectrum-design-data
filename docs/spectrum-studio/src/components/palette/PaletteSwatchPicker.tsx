// Copyright 2026 Adobe. All rights reserved.
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  ColorSwatch,
  ColorSwatchPicker,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useMemo, useRef, useState } from "react";
import { TooltipContext } from "react-aria-components";
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
interface SwatchTarget {
  id: string;
  element: Element;
}

function swatchTarget(target: EventTarget | null): SwatchTarget | null {
  const element =
    target instanceof Element ? target.closest('[role="option"]') : null;
  const id = element
    ?.querySelector("[data-palette-color-id]")
    ?.getAttribute("data-palette-color-id");
  return element && id ? { id, element } : null;
}

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
  const pressedLinkedSwatch = useRef<Element | null>(null);
  const [hoveredSwatch, setHoveredSwatch] = useState<SwatchTarget | null>(null);
  const [focusedSwatch, setFocusedSwatch] = useState<SwatchTarget | null>(null);
  const tooltipSwatch = hoveredSwatch ?? focusedSwatch;
  const tooltipRef = useMemo(
    () => ({ current: tooltipSwatch?.element ?? null }),
    [tooltipSwatch],
  );
  const swatches = useMemo(
    () => paletteSwatches(palette, outputGamut),
    [palette, outputGamut],
  );
  const linked = swatches.find((swatch) => swatch.color.id === linkedId);
  // Swatches must be unique, so colors that render identically to an earlier one are left out.
  const pickable = swatches.filter((swatch) => !swatch.duplicateOf);
  const selectedId = pickable.find((swatch) => swatch.hex === linked?.hex)
    ?.color.id;

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
        <div
          onPointerOver={(event) => {
            const target = swatchTarget(event.target);
            setHoveredSwatch((current) =>
              current?.id === target?.id ? current : target,
            );
          }}
          onPointerOut={(event) => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !swatchTarget(event.target)?.element.contains(event.relatedTarget)
            )
              setHoveredSwatch(null);
          }}
          onFocusCapture={(event) =>
            setFocusedSwatch(swatchTarget(event.target))
          }
          onBlurCapture={() => setFocusedSwatch(null)}
          onPointerDownCapture={(event) => {
            // Spectrum may select on press, before the click reaches this wrapper.
            const option = swatchTarget(event.target)?.element;
            pressedLinkedSwatch.current =
              option?.getAttribute("aria-selected") === "true" ? option : null;
          }}
          onClickCapture={(event) => {
            const option = swatchTarget(event.target)?.element;
            const unlink =
              option &&
              (event.detail === 0
                ? option.getAttribute("aria-selected") === "true"
                : option === pressedLinkedSwatch.current);
            pressedLinkedSwatch.current = null;
            if (unlink) {
              event.preventDefault();
              event.stopPropagation();
              onUnlink();
            }
          }}
          onKeyDownCapture={(event) => {
            const option = swatchTarget(event.target)?.element;
            if (
              (event.key === "Enter" || event.key === " ") &&
              option &&
              (event.repeat || option.getAttribute("aria-selected") === "true")
            ) {
              event.preventDefault();
              event.stopPropagation();
              if (!event.repeat) onUnlink();
            }
          }}
        >
          <ColorSwatchPicker
            aria-label="Palette colors"
            size="M"
            rounding="default"
            value={linked?.hex ?? "#0000"}
            onChange={(color) => {
              const hex = color.toString("hex").toLowerCase();
              const swatch = pickable.find(
                (candidate) => candidate.hex === hex,
              );
              if (swatch) onLink(swatch.color.id);
            }}
          >
            {pickable.map((swatch) => (
              <ColorSwatch
                key={swatch.color.id}
                color={swatch.hex}
                aria-label={termLabel(swatch.color.name)}
                data-palette-color-id={swatch.color.id}
              />
            ))}
          </ColorSwatchPicker>
          <TooltipTrigger
            isOpen={tooltipSwatch !== null}
            onOpenChange={(open) => {
              if (!open) {
                setHoveredSwatch(null);
                setFocusedSwatch(null);
              }
            }}
          >
            <TooltipContext.Provider value={{ triggerRef: tooltipRef }}>
              <Tooltip>
                {tooltipSwatch && tooltipSwatch.id === selectedId
                  ? "Click to unlink"
                  : "Link to palette color"}
              </Tooltip>
            </TooltipContext.Provider>
          </TooltipTrigger>
        </div>
      )}
    </div>
  );
}
