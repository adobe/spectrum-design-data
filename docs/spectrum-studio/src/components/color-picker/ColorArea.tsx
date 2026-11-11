// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ColorCanvas } from "./ColorCanvas";
import { ColorHandle } from "./ColorHandle";
import {
  canvasToColor,
  colorToCanvas,
  createColorFromCoords,
  getThirdChannelValue,
  getChannelRange,
  getColorCoords,
  isOutOfGamut,
  mapColorToGamut,
  movePickerAreaPosition,
  pickerChannelName,
  pickerChannelValueText,
  type ChannelName,
  type ColorSpaceConfig,
  type PickerGamut,
} from "./colorUtils";
import "./color-picker.css";

function constrainPosition(
  position: { x: number; y: number },
  size: number,
  color: Color,
  config: ColorSpaceConfig,
  channels: [ChannelName, ChannelName],
  gamut: PickerGamut,
) {
  const candidate = canvasToColor(
    position.x,
    position.y,
    size,
    color,
    config,
    channels,
  );
  if (!isOutOfGamut(candidate, gamut)) return position;

  const current = colorToCanvas(color, size, config, channels);
  const currentColor = canvasToColor(
    current.x,
    current.y,
    size,
    color,
    config,
    channels,
  );
  const anchor = isOutOfGamut(currentColor, gamut)
    ? mapColorToGamut(currentColor, gamut)
    : currentColor;
  const anchorPosition = colorToCanvas(anchor, size, config, channels);
  const segmentInGamut = (t: number) => {
    const next = {
      x: position.x + (anchorPosition.x - position.x) * t,
      y: position.y + (anchorPosition.y - position.y) * t,
    };
    return !isOutOfGamut(
      canvasToColor(next.x, next.y, size, color, config, channels),
      gamut,
    );
  };

  if (segmentInGamut(1)) {
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 16; iteration += 1) {
      const middle = (low + high) / 2;
      if (segmentInGamut(middle)) high = middle;
      else low = middle;
    }
    return {
      x: position.x + (anchorPosition.x - position.x) * high,
      y: position.y + (anchorPosition.y - position.y) * high,
    };
  }
  let best: { x: number; y: number } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let step = 0; step < 16; step += 1) {
    const angle = (step / 16) * Math.PI * 2;
    let low = 0;
    let high = size * 0.5;
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const radius = (low + high) / 2;
      const next = {
        x: Math.min(size, Math.max(0, position.x + Math.cos(angle) * radius)),
        y: Math.min(size, Math.max(0, position.y + Math.sin(angle) * radius)),
      };
      const inGamut = !isOutOfGamut(
        canvasToColor(next.x, next.y, size, color, config, channels),
        gamut,
      );
      if (inGamut) {
        high = radius;
        const distance = Math.hypot(next.x - position.x, next.y - position.y);
        if (distance < bestDistance) {
          best = next;
          bestDistance = distance;
        }
      } else {
        low = radius;
      }
    }
  }
  return best ?? { x: size / 2, y: size / 2 };
}

export const ColorArea = memo(function ColorArea({
  colorCoordinates,
  alpha = 1,
  config,
  channels,
  gamut,
  colorScheme,
  size = 200,
  onChange,
}: {
  colorCoordinates: number[];
  alpha?: number;
  config: ColorSpaceConfig;
  channels: [ChannelName, ChannelName];
  gamut: PickerGamut;
  colorScheme: "light" | "dark";
  size?: number;
  onChange: (color: Color) => void;
}) {
  const parsedColor = useMemo(
    () => createColorFromCoords(config, colorCoordinates, alpha),
    [colorCoordinates, config, alpha],
  );
  const canvasThirdChannelValue = useMemo(
    () => getThirdChannelValue(parsedColor, config),
    [config, parsedColor],
  );
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dragColor, setDragColor] = useState<Color | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const dragColorRef = useRef<Color | null>(null);
  const committedPosition = useMemo(
    () => colorToCanvas(parsedColor, size, config, channels),
    [channels, config, parsedColor, size],
  );
  const position = dragPosition ?? committedPosition;
  const handleColor = (dragColor ?? parsedColor).toString({ format: "hex" });
  const coords = getColorCoords(dragColor ?? parsedColor, config);
  const axes = channels.map((channel) => ({
    valueNow: coords[config.channels.indexOf(channel)],
    valueMin: getChannelRange(channel, config.id)[0],
    valueMax: getChannelRange(channel, config.id)[1],
    ariaLabel: pickerChannelName(channel, config.id),
    valueText: pickerChannelValueText(
      channel,
      coords[config.channels.indexOf(channel)],
      config.id,
    ),
  }));

  useEffect(() => {
    if (!isDragging) setDragPosition(null);
  }, [colorCoordinates, isDragging]);

  const updateFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    const container = event.currentTarget.closest(".colorPickerArea");
    if (!container) return;
    const areaRect = container.getBoundingClientRect();
    const raw = {
      x: event.clientX - areaRect.left,
      y: event.clientY - areaRect.top,
    };
    const target = {
      x: Math.min(size, Math.max(0, raw.x)),
      y: Math.min(size, Math.max(0, raw.y)),
    };
    const constrained = constrainPosition(
      target,
      size,
      parsedColor,
      config,
      channels,
      gamut,
    );
    setDragPosition(constrained);
    const nextColor = mapColorToGamut(
      canvasToColor(
        constrained.x,
        constrained.y,
        size,
        parsedColor,
        config,
        channels,
      ),
      gamut,
    );
    dragColorRef.current = nextColor;
    setDragColor(nextColor);
  };

  const beginPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (activePointerId.current !== null) return;
    const area = event.currentTarget.closest(".colorPickerArea");
    if (!area?.contains(document.activeElement))
      area
        ?.querySelector<HTMLInputElement>('input[type="range"]')
        ?.focus({ preventScroll: true });
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateFromPointer(event);
  };

  const endPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    const finalColor = dragColorRef.current;
    activePointerId.current = null;
    dragColorRef.current = null;
    if (finalColor) onChange(finalColor);
    setDragPosition(null);
    setDragColor(null);
    setIsDragging(false);
  };

  const movePointer = (event: React.PointerEvent<HTMLElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    if (event.buttons === 0) {
      endPointer(event);
      return;
    }
    updateFromPointer(event);
  };

  const commitPosition = (target: { x: number; y: number }) => {
    const next = constrainPosition(
      target,
      size,
      parsedColor,
      config,
      channels,
      gamut,
    );
    onChange(
      mapColorToGamut(
        canvasToColor(next.x, next.y, size, parsedColor, config, channels),
        gamut,
      ),
    );
  };
  const changeAxisValue = (axis: 0 | 1, value: number) => {
    const [minimum, maximum] = getChannelRange(channels[axis], config.id);
    const normalized = (value - minimum) / (maximum - minimum);
    commitPosition(
      axis === 0
        ? { x: normalized * size, y: position.y }
        : { x: position.x, y: (1 - normalized) * size },
    );
  };
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    axis: 0 | 1,
  ) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0;
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    commitPosition(
      movePickerAreaPosition(
        position,
        size,
        axis,
        direction * step,
        channels[axis] === "h",
      ),
    );
  };

  return (
    <div
      className="colorPickerArea"
      role="group"
      aria-label="Color area"
      style={{ width: size, height: size }}
    >
      <ColorCanvas
        thirdChannelValue={canvasThirdChannelValue}
        config={config}
        channels={channels}
        gamut={gamut}
        colorScheme={colorScheme}
        size={size}
      />
      <ColorHandle
        color={handleColor}
        position={position}
        {...axes[0]}
        orientation="horizontal"
        secondaryAxis={{
          ...axes[1],
          orientation: "vertical",
          onKeyDown: (event) => handleKeyDown(event, 1),
          onValueChange: (value) => changeAxisValue(1, value),
        }}
        isDragging={isDragging}
        onKeyDown={(event) => handleKeyDown(event, 0)}
        onValueChange={(value) => changeAxisValue(0, value)}
        onPointerDown={(event) => {
          event.stopPropagation();
          beginPointer(event);
        }}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
      />
      <canvas
        className="colorPickerInteractionCanvas"
        aria-hidden="true"
        onPointerDown={beginPointer}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
      />
    </div>
  );
});
