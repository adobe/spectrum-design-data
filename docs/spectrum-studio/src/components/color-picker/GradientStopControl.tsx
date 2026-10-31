// Copyright 2026 Adobe. All rights reserved.
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useRef } from "react";
import {
  gradientPointerPosition,
  isGradientDragIntentional,
} from "./gradientStopPositions";

export interface GradientStop {
  id: string;
  position: number;
  color: string;
  label: string;
  movable?: boolean;
  minimum?: number;
  maximum?: number;
}
export interface GradientStopControlProps {
  stops: readonly GradientStop[];
  gradient: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onMove?: (id: string, position: number) => void;
  onAdd?: (position: number) => void;
  isReadOnly?: boolean;
  disableReadOnlySelection?: boolean;
}
const trackStyles = style({
  position: "relative",
  width: "full",
  height: 44,
  borderRadius: "default",
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "gray-200",
  cursor: "default",
});
const rootStyles = style({ paddingX: 8, minWidth: 0 });
const handleStyles = style({
  position: "absolute",
  top: "50%",
  width: 44,
  height: 44,
  padding: 12,
  backgroundColor: "transparent",
  borderWidth: 0,
  cursor: "default",
  transform: "translate(-50%, -50%)",
});
const swatchStyles = style({
  display: "block",
  boxSizing: "border-box",
  width: 20,
  height: 20,
  borderRadius: "full",
  borderStyle: "solid",
  borderWidth: { default: 2, isSelected: 4 },
  borderColor: "white",
  boxShadow: "elevated",
});

export function GradientStopControl({
  stops,
  gradient,
  selectedId,
  onSelect,
  onMove,
  onAdd,
  isReadOnly = false,
  disableReadOnlySelection = false,
}: GradientStopControlProps) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    position: number;
    active: boolean;
  } | null>(null);
  return (
    <div className={rootStyles} data-component="GradientStopControl">
      <div
        ref={track}
        className={trackStyles}
        style={{ background: gradient }}
        onDoubleClick={(event) => {
          if (isReadOnly || !onAdd || event.target !== event.currentTarget)
            return;
          const bounds = event.currentTarget.getBoundingClientRect();
          onAdd(
            gradientPointerPosition(event.clientX, bounds.left, bounds.width),
          );
        }}
      >
        {stops.map((stop) => (
          <button
            key={stop.id}
            type="button"
            aria-label={stop.label}
            aria-pressed={stop.id === selectedId}
            disabled={isReadOnly && disableReadOnlySelection}
            className={handleStyles}
            style={{ left: `${stop.position * 100}%`, touchAction: "none" }}
            onClick={() => onSelect(stop.id)}
            onPointerDown={(event) => {
              if (event.button !== 0 || !event.isPrimary) return;
              onSelect(stop.id);
              if (!isReadOnly && onMove && stop.movable !== false) {
                drag.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  position: stop.position,
                  active: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={(event) => {
              if (
                isReadOnly ||
                !onMove ||
                stop.movable === false ||
                !event.currentTarget.hasPointerCapture(event.pointerId)
              )
                return;
              const bounds = track.current?.getBoundingClientRect();
              const gesture = drag.current;
              if (!bounds || !gesture || gesture.pointerId !== event.pointerId)
                return;
              if (!gesture.active) {
                if (
                  !isGradientDragIntentional(
                    event.pointerType,
                    gesture.startX,
                    event.clientX,
                  )
                )
                  return;
                gesture.active = true;
              }
              const position = gradientPointerPosition(
                event.pointerType === "mouse"
                  ? bounds.left +
                      gesture.position * bounds.width +
                      event.clientX -
                      gesture.startX
                  : event.clientX,
                bounds.left,
                bounds.width,
                stop.minimum,
                stop.maximum,
              );
              if (position !== stop.position) onMove(stop.id, position);
            }}
            onPointerUp={(event) => {
              drag.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              if (isReadOnly || !onMove || stop.movable === false) return;
              const minimum = stop.minimum ?? 0,
                maximum = stop.maximum ?? 1;
              let position: number;
              if (event.key === "ArrowLeft" || event.key === "ArrowDown")
                position = Math.max(
                  minimum,
                  stop.position - (event.shiftKey ? 0.001 : 0.01),
                );
              else if (event.key === "ArrowRight" || event.key === "ArrowUp")
                position = Math.min(
                  maximum,
                  stop.position + (event.shiftKey ? 0.001 : 0.01),
                );
              else if (event.key === "Home") position = minimum;
              else if (event.key === "End") position = maximum;
              else return;
              event.preventDefault();
              if (position !== stop.position)
                onMove(stop.id, Number(position.toFixed(8)));
            }}
          >
            <span
              aria-hidden="true"
              className={swatchStyles({ isSelected: stop.id === selectedId })}
              style={{ backgroundColor: stop.color }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
