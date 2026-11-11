// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import { ColorLoupe } from "./ColorLoupe";
import "./color-picker.css";

interface HandleAxis {
  valueNow: number;
  valueMin: number;
  valueMax: number;
  valueText: string;
  orientation: "horizontal" | "vertical";
  ariaLabel: string;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onValueChange: (value: number) => void;
}

export function ColorHandle({
  color,
  position,
  valueNow = 0,
  valueMin,
  valueMax,
  valueText,
  orientation,
  ariaLabel = "Selected color",
  secondaryAxis,
  isDragging,
  onKeyDown,
  onValueChange,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
}: {
  color: string;
  position: { x: number; y: number };
  valueNow?: number;
  valueMin?: number;
  valueMax?: number;
  valueText?: string;
  orientation?: "horizontal" | "vertical";
  ariaLabel?: string;
  secondaryAxis?: HandleAxis;
  isDragging: boolean;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onValueChange: (value: number) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onLostPointerCapture?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const showLoupe = isDragging || isFocused || isActive;

  return (
    <div
      className="colorPickerHandle"
      style={{ left: position.x - 12, top: position.y - 12 }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPointerDown={(event) => {
        event.preventDefault();
        setIsActive(true);
        if (!event.currentTarget.contains(document.activeElement))
          event.currentTarget
            .querySelector<HTMLInputElement>('input[type="range"]')
            ?.focus({ preventScroll: true });
        onPointerDown(event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        setIsActive(false);
        onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        setIsActive(false);
        onPointerCancel?.(event);
      }}
      onLostPointerCapture={(event) => {
        setIsActive(false);
        onLostPointerCapture?.(event);
      }}
    >
      <input
        className="colorPickerHandleControl"
        type="range"
        step="any"
        value={valueNow}
        aria-valuenow={valueNow}
        aria-valuemin={
          valueMin === undefined ? undefined : Math.min(valueMin, valueNow)
        }
        aria-valuemax={
          valueMax === undefined ? undefined : Math.max(valueMax, valueNow)
        }
        min={valueMin === undefined ? undefined : Math.min(valueMin, valueNow)}
        max={valueMax === undefined ? undefined : Math.max(valueMax, valueNow)}
        aria-valuetext={valueText}
        aria-orientation={orientation}
        aria-label={ariaLabel}
        aria-disabled={valueMin === valueMax ? true : undefined}
        onKeyDown={onKeyDown}
        onChange={(event) => onValueChange(event.currentTarget.valueAsNumber)}
      />
      {secondaryAxis && (
        <input
          className="colorPickerHandleControl colorPickerHandleSecondaryAxis"
          type="range"
          step="any"
          value={secondaryAxis.valueNow}
          aria-valuenow={secondaryAxis.valueNow}
          aria-valuemin={Math.min(
            secondaryAxis.valueMin,
            secondaryAxis.valueNow,
          )}
          aria-valuemax={Math.max(
            secondaryAxis.valueMax,
            secondaryAxis.valueNow,
          )}
          min={Math.min(secondaryAxis.valueMin, secondaryAxis.valueNow)}
          max={Math.max(secondaryAxis.valueMax, secondaryAxis.valueNow)}
          aria-valuetext={secondaryAxis.valueText}
          aria-orientation={secondaryAxis.orientation}
          aria-label={secondaryAxis.ariaLabel}
          onKeyDown={secondaryAxis.onKeyDown}
          onChange={(event) =>
            secondaryAxis.onValueChange(event.currentTarget.valueAsNumber)
          }
        />
      )}
      <div
        className="colorPickerHandleDot"
        aria-hidden="true"
        style={{ backgroundColor: color }}
      />
      <ColorLoupe color={color} visible={showLoupe} />
    </div>
  );
}
