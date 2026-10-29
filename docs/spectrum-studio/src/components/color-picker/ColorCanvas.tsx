// Copyright 2026 Adobe. All rights reserved.
import { memo, useEffect, useRef, useState } from "react";
import {
  ActionButton,
  Content,
  Heading,
  InlineAlert,
} from "@react-spectrum/s2";
import type { ChannelName, ColorSpaceConfig, PickerGamut } from "./colorUtils";
import type { PlaneDomains } from "../../features/color-system/colorPlane";
import {
  RasterCache,
  RasterQueue,
  rasterKey,
  type RasterResponse,
  type RasterSpec,
} from "./colorRaster";
import "./color-picker.css";

const cache = new RasterCache();
export interface ColorCanvasProps {
  thirdChannelValue: number;
  config: ColorSpaceConfig;
  channels: readonly [ChannelName, ChannelName];
  gamut: PickerGamut;
  colorScheme: "light" | "dark";
  size?: number;
  pixelRatio?: number;
  domains?: PlaneDomains;
  outside?: "transparent" | "dead-zone";
}

export const ColorCanvas = memo(function ColorCanvas({
  thirdChannelValue,
  config,
  channels,
  gamut,
  colorScheme,
  size = 200,
  pixelRatio = 1,
  domains,
  outside = "dead-zone",
}: ColorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef<RasterSpec | null>(null);
  const dispatch = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<{
    working: boolean;
    readyKey?: string;
    error?: string;
  }>({ working: true });
  const [encoding, setEncoding] = useState<RasterSpec["encoding"]>("srgb");
  const [attempt, setAttempt] = useState(0);
  const backingSize = Math.min(
    1024,
    Math.max(1, Math.round(size * Math.min(2, Math.max(1, pixelRatio)))),
  );
  const spec: RasterSpec = {
    size: backingSize,
    config,
    channels,
    gamut,
    colorScheme,
    thirdChannelValue,
    domains,
    outside,
    encoding,
  };
  const key = rasterKey(spec);
  const working = !status.error && (status.working || status.readyKey !== key);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let worker: Worker | undefined;
    let frame = 0;
    let disposed = false;
    setStatus({ working: true });
    try {
      let context: CanvasRenderingContext2D | null;
      try {
        context = canvas.getContext("2d", { colorSpace: "display-p3" });
      } catch {
        context = canvas.getContext("2d");
      }
      context ??= canvas.getContext("2d");
      if (!context)
        throw new Error("This browser cannot create a color canvas.");
      const ctx = context;
      const actual =
        ctx.getContextAttributes().colorSpace === "display-p3"
          ? "display-p3"
          : "srgb";
      setEncoding(actual);
      worker = new Worker(new URL("./colorCanvas.worker.ts", import.meta.url), {
        type: "module",
      });
      const queue = new RasterQueue();
      const paint = (pixels: Uint8ClampedArray, request: RasterSpec) => {
        canvas.width = request.size;
        canvas.height = request.size;
        const image = ctx.createImageData(request.size, request.size, {
          colorSpace: actual,
        });
        image.data.set(pixels);
        ctx.putImageData(image, 0, 0);
        setStatus({ working: false, readyKey: rasterKey(request) });
      };
      const flush = () => {
        frame = 0;
        const request = queue.take();
        if (request) worker?.postMessage(request);
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(flush);
      };
      dispatch.current = () => {
        const current = latest.current;
        if (!current) return;
        const request: RasterSpec = { ...current, encoding: actual };
        const requestKey = rasterKey(request);
        queue.request(requestKey, request);
        const cached = cache.get(requestKey);
        if (cached) {
          queue.pending = null;
          paint(cached, request);
        } else {
          setStatus({ working: true });
          schedule();
        }
      };
      worker.onmessage = ({ data }: MessageEvent<RasterResponse>) => {
        const running = queue.running;
        if (!running || running.id !== data.id || disposed) return;
        const isCurrent = queue.finish(data.id);
        if ("error" in data) {
          if (isCurrent) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setStatus({ working: false, error: data.error });
          }
        } else {
          const pixels = new Uint8ClampedArray(data.pixels);
          cache.set(data.key, pixels);
          if (isCurrent) paint(pixels, running.spec);
        }
        if (queue.pending) schedule();
      };
      worker.onerror = (event) => {
        event.preventDefault();
        if (!disposed) {
          worker?.terminate();
          dispatch.current = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setStatus({
            working: false,
            error: event.message || "The color renderer failed.",
          });
        }
      };
      dispatch.current();
    } catch (failure) {
      setStatus({
        working: false,
        error: failure instanceof Error ? failure.message : String(failure),
      });
    }
    return () => {
      disposed = true;
      dispatch.current = null;
      cancelAnimationFrame(frame);
      worker?.terminate();
    };
  }, [attempt]);

  useEffect(() => {
    latest.current = spec;
    dispatch.current?.();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`colorPickerCanvas${outside === "transparent" ? " colorAnalysisRaster" : ""}`}
        aria-label={
          outside === "transparent" ? "OKLCh gamut slice" : "Color area"
        }
        aria-busy={working}
        data-render-state={
          status.error ? "error" : working ? "updating" : "ready"
        }
        data-render-key={status.readyKey}
        data-encoding={encoding}
        style={{ width: size, height: size }}
      />
      {outside === "transparent" && working && (
        <span className="colorAnalysisUpdating" role="status">
          Updating colors...
        </span>
      )}
      {status.error && (
        <InlineAlert variant="negative">
          <Heading>Could not render colors</Heading>
          <Content>
            {status.error}{" "}
            <ActionButton onPress={() => setAttempt((value) => value + 1)}>
              Retry color rendering
            </ActionButton>
          </Content>
        </InlineAlert>
      )}
    </>
  );
});
