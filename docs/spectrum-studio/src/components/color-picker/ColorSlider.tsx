// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ColorHandle } from "./ColorHandle";
import {
  createColorFromCoords,
  createColorWithChannelValue,
  getCanvasPixelColor,
  getChannelRange,
  getColorCoords,
  type ColorSpaceConfig,
  type ChannelName,
  type PickerGamut,
} from "./colorUtils";
import "./color-picker.css";

interface ColorSliderProps {
  colorCoordinates: number[];
  config: ColorSpaceConfig;
  channel: ChannelName;
  gamut: PickerGamut;
  orientation?: "horizontal" | "vertical";
  size?: number;
  range?: readonly [number, number];
  ariaLabel?: string;
  onChange: (color: Color) => void;
}

export const ColorSlider = memo(function ColorSlider({
  colorCoordinates,
  config,
  channel,
  orientation = "vertical",
  size = 200,
  range: constrainedRange,
  ariaLabel,
  onChange,
}: ColorSliderProps) {
  const parsedColor = useMemo(
    () => createColorFromCoords(config, colorCoordinates),
    [colorCoordinates, config],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragColor, setDragColor] = useState<Color | null>(null);
  const [focused, setFocused] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const dragColorRef = useRef<Color | null>(null);
  const range = constrainedRange ?? getChannelRange(channel, config.id);
  const channelIndex = config.channels.indexOf(channel);
  const currentValue = getColorCoords(parsedColor, config)[channelIndex];
  const gradientBaseKey = colorCoordinates
    .map((value, index) => (index === channelIndex ? "0" : value.toString()))
    .join(",");
  const normalizedPosition = Math.min(
    1,
    Math.max(0, (currentValue - range[0]) / (range[1] - range[0])),
  );
  const committedPosition =
    (orientation === "vertical" ? 1 - normalizedPosition : normalizedPosition) *
    size;
  const position = dragPosition ?? committedPosition;
  const colorHex = (dragColor ?? parsedColor).toString({ format: "hex" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderBaseCoordinates = gradientBaseKey.split(",").map(Number);
    const width = orientation === "vertical" ? 1 : size;
    const height = orientation === "vertical" ? size : 1;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const gradientPosition = orientation === "vertical" ? y : x;
        const normalized =
          orientation === "vertical"
            ? 1 - gradientPosition / Math.max(1, size - 1)
            : gradientPosition / Math.max(1, size - 1);
        const value = range[0] + normalized * (range[1] - range[0]);
        const nextCoordinates = renderBaseCoordinates.slice();
        nextCoordinates[channelIndex] = value;
        const next = createColorFromCoords(config, nextCoordinates);
        const rgb = getCanvasPixelColor(next, "srgb");
        const offset = (y * width + x) * 4;
        image.data[offset] = rgb[0];
        image.data[offset + 1] = rgb[1];
        image.data[offset + 2] = rgb[2];
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, [
    channel,
    channelIndex,
    config,
    gradientBaseKey,
    orientation,
    range,
    size,
  ]);

  const updateFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    const container = event.currentTarget.closest(".colorPickerSlider");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const raw =
      orientation === "vertical"
        ? event.clientY - rect.top
        : event.clientX - rect.left;
    const nextPosition = Math.min(size, Math.max(0, raw));
    const normalized =
      orientation === "vertical"
        ? 1 - nextPosition / size
        : nextPosition / size;
    const value = range[0] + normalized * (range[1] - range[0]);
    const nextColor = createColorWithChannelValue(
      parsedColor,
      config,
      channel,
      value,
    );
    setDragPosition(nextPosition);
    dragColorRef.current = nextColor;
    setDragColor(nextColor);
  };

  const beginPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (activePointerId.current !== null) return;
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const direction =
      orientation === "vertical"
        ? event.key === "ArrowUp"
          ? -1
          : event.key === "ArrowDown"
            ? 1
            : 0
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowLeft"
            ? -1
            : 0;
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const nextPosition = Math.min(
      size,
      Math.max(0, position + direction * step),
    );
    const normalized =
      orientation === "vertical"
        ? 1 - nextPosition / size
        : nextPosition / size;
    const value = range[0] + normalized * (range[1] - range[0]);
    onChange(createColorWithChannelValue(parsedColor, config, channel, value));
  };

  const handlePosition =
    orientation === "vertical"
      ? { x: 12, y: position }
      : { x: position, y: 12 };
  return (
    <div
      className={`colorPickerSlider colorPickerSlider-${orientation}`}
      style={{
        width: orientation === "vertical" ? 24 : size,
        height: orientation === "vertical" ? size : 24,
      }}
    >
      <canvas
        ref={canvasRef}
        className="colorPickerCanvas colorPickerSliderCanvas"
        onPointerDown={beginPointer}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
      />
      <div onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        <ColorHandle
          color={colorHex}
          position={handlePosition}
          valueNow={currentValue}
          valueMin={range[0]}
          valueMax={range[1]}
          orientation={orientation}
          ariaLabel={ariaLabel}
          isDragging={isDragging || focused}
          onKeyDown={handleKeyDown}
          onPointerDown={beginPointer}
          onPointerMove={movePointer}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onLostPointerCapture={endPointer}
        />
      </div>
    </div>
  );
});
