// Copyright 2026 Adobe. All rights reserved.
import {
  createColorFromCoords,
  getCanvasPixelColor,
  getChannelRange,
  getDeadZoneColor,
  isOutOfGamut,
  type ChannelName,
  type ColorSpaceConfig,
  type PickerGamut,
} from "./colorUtils";
import {
  convertLinearGamut,
  oklabToLinear,
  toGamma,
  toLinear,
  type LinearRgb,
  type RgbGamut,
} from "../../features/color-system/colorMath";
import {
  planeCoordinates,
  type PlaneDomains,
} from "../../features/color-system/colorPlane";

export interface RasterSpec {
  size: number;
  config: ColorSpaceConfig;
  channels: readonly [ChannelName, ChannelName];
  gamut: PickerGamut;
  colorScheme: "light" | "dark";
  thirdChannelValue: number;
  encoding: Exclude<RgbGamut, "rec2020">;
  domains?: PlaneDomains;
  outside?: "transparent" | "dead-zone";
}
export interface RasterRequest {
  id: number;
  key: string;
  spec: RasterSpec;
}
export type RasterResponse =
  | { id: number; key: string; pixels: ArrayBuffer }
  | { id: number; key: string; error: string };

export function rasterKey(spec: RasterSpec) {
  return JSON.stringify({
    ...spec,
    colorScheme: spec.outside === "transparent" ? undefined : spec.colorScheme,
  });
}

export function renderColorRaster(spec: RasterSpec) {
  const { size, config, channels, gamut, encoding, thirdChannelValue } = spec;
  if (
    !Number.isInteger(size) ||
    size < 1 ||
    size > 1024 ||
    !Number.isFinite(thirdChannelValue)
  ) {
    throw new Error("Invalid color raster size or slice.");
  }
  const third = config.channels.indexOf(config.thirdChannel);
  const ix = config.channels.indexOf(channels[0]);
  const iy = config.channels.indexOf(channels[1]);
  if (
    third < 0 ||
    ix < 0 ||
    iy < 0 ||
    ix === iy ||
    ix === third ||
    iy === third
  )
    throw new Error("Invalid color raster channels.");
  const domains = spec.domains ?? [
    getChannelRange(channels[0], config.id),
    getChannelRange(channels[1], config.id),
  ];
  if (
    domains.some(
      ([lo, hi]) => !Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo,
    )
  )
    throw new Error("Invalid color plane domains.");
  const pixels = new Uint8ClampedArray(size * size * 4);
  const deadZone = getDeadZoneColor(spec.colorScheme);
  const coords = config.channels.map(() => 0);
  coords[third] = thirdChannelValue;
  const fastOklab = config.id === "oklab" && third === 0 && gamut !== "Rec2020";
  const fastRgb =
    (config.id === "srgb" || config.id === "p3") && gamut !== "Rec2020";
  const target = gamut === "Display-P3" ? "display-p3" : "srgb";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const halfPixel = spec.domains ? 0.5 : 0;
      const [a, b] = planeCoordinates(
        x + halfPixel,
        y + halfPixel,
        size,
        domains,
      );
      coords[ix] = a;
      coords[iy] = b;
      let rgb: readonly number[];
      let inGamut: boolean;
      if (fastOklab || fastRgb) {
        const source: LinearRgb = fastOklab
          ? oklabToLinear([coords[0], coords[1], coords[2]])
          : [toLinear(coords[0]), toLinear(coords[1]), toLinear(coords[2])];
        const sourceGamut = config.id === "p3" ? "display-p3" : "srgb";
        const linear = convertLinearGamut(source, sourceGamut, target);
        inGamut =
          fastOklab && (thirdChannelValue === 0 || thirdChannelValue === 1)
            ? coords[1] === 0 && coords[2] === 0
            : linear.every((value) => value >= -1e-7 && value <= 1 + 1e-7);
        rgb = convertLinearGamut(source, sourceGamut, encoding).map((value) =>
          Math.round(Math.min(1, Math.max(0, toGamma(value))) * 255),
        );
      } else {
        const color = createColorFromCoords(config, coords);
        inGamut = !isOutOfGamut(color, gamut);
        rgb = getCanvasPixelColor(color, encoding);
      }
      if (!inGamut && spec.outside === "transparent") continue;
      const fill = inGamut ? rgb : deadZone;
      pixels[offset] = fill[0];
      pixels[offset + 1] = fill[1];
      pixels[offset + 2] = fill[2];
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

export class RasterCache {
  private entries = new Map<string, Uint8ClampedArray>();
  bytes = 0;
  constructor(readonly budget = 8 * 1024 * 1024) {}
  get(key: string) {
    const value = this.entries.get(key);
    if (value) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }
  set(key: string, pixels: Uint8ClampedArray) {
    const old = this.entries.get(key);
    if (old) {
      this.bytes -= old.byteLength;
      this.entries.delete(key);
    }
    if (pixels.byteLength > this.budget) return;
    this.entries.set(key, pixels);
    this.bytes += pixels.byteLength;
    while (this.bytes > this.budget) {
      const first = this.entries.entries().next().value;
      if (!first) break;
      this.entries.delete(first[0]);
      this.bytes -= first[1].byteLength;
    }
  }
}

export class RasterQueue {
  private sequence = 0;
  current = 0;
  running: RasterRequest | null = null;
  pending: RasterRequest | null = null;
  request(key: string, spec: RasterSpec) {
    if (this.running?.key === key) {
      this.current = this.running.id;
      this.pending = null;
      return;
    }
    if (this.pending?.key === key) {
      this.current = this.pending.id;
      return;
    }
    this.pending = { id: ++this.sequence, key, spec };
    this.current = this.sequence;
  }
  take() {
    if (this.running || !this.pending) return null;
    this.running = this.pending;
    this.pending = null;
    return this.running;
  }
  finish(id: number) {
    if (this.running?.id !== id) return false;
    this.running = null;
    return id === this.current;
  }
}
