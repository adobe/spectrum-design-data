// Copyright 2026 Adobe. All rights reserved.
import { useState } from "react";
import { ColorLoupe } from "./ColorLoupe";
import "./color-picker.css";

export function ColorHandle({
  color,
  position,
  valueNow = 0,
  valueMin,
  valueMax,
  orientation,
  ariaLabel = "Selected color",
  isDragging,
  onKeyDown,
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
  orientation?: "horizontal" | "vertical";
  ariaLabel?: string;
  isDragging: boolean;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
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
      style={{ left: position.x - 8, top: position.y - 8 }}
      tabIndex={0}
      role="slider"
      aria-valuenow={valueNow}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-orientation={orientation}
      aria-label={ariaLabel}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        setIsActive(true);
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
      <div
        className="colorPickerHandleDot"
        style={{ backgroundColor: color }}
        onPointerDown={() => setIsActive(true)}
        onPointerUp={() => setIsActive(false)}
        onPointerLeave={() => setIsActive(false)}
      />
      <ColorLoupe color={color} visible={showLoupe} />
    </div>
  );
}
