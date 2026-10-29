// Copyright 2026 Adobe. All rights reserved.
import type Color from "colorjs.io";
import {
  contrastRatio,
  luminance,
  toLinear,
  type RgbGamut,
} from "../colorMath";
import { renderedColor } from "./colors";
import { simulateColor, SIMULATOR_VERSION } from "./cvd";
import type { VisionProfile } from "./model";

export const MEASUREMENT_VERSION = `ciede2000-lab-d50-1:${SIMULATOR_VERSION}`;
const MAX_COLOR_CACHE = 40965;
const MAX_PAIR_CACHE = 32768;

export function deltaE2000(first: Color, second: Color) {
  return first.deltaE(second, "2000");
}

export function renderedContrast(first: Color, second: Color) {
  const y = (color: Color) => {
    const space =
      color.space.id === "rec2020"
        ? "rec2020"
        : color.space.id === "p3"
          ? "p3"
          : "srgb";
    const [r, g, b] = color.to(space).coords;
    if (![r, g, b].every(Number.isFinite))
      throw new Error("Contrast has unavailable color channels.");
    const gamut = space === "p3" ? "display-p3" : space;
    return luminance(
      [toLinear(r, gamut), toLinear(g, gamut), toLinear(b, gamut)],
      gamut,
    );
  };
  return contrastRatio(y(first), y(second));
}

export interface PairMeasurement {
  first: string;
  second: string;
  background: string;
  deltaE: number;
  contrast: number;
  firstBackgroundContrast: number;
  secondBackgroundContrast: number;
  profile: VisionProfile;
}

export class MeasurementCache {
  private colors = new Map<string, Color>();
  private pairs = new Map<string, PairMeasurement>();
  conversions = 0;
  comparisons = 0;
  hits = 0;

  get colorCacheSize() {
    return this.colors.size;
  }
  get pairCacheSize() {
    return this.pairs.size;
  }

  color(
    value: string,
    background: string,
    profile: VisionProfile,
    gamut: RgbGamut,
  ) {
    const key = JSON.stringify([
      MEASUREMENT_VERSION,
      value,
      background,
      profile,
      gamut,
    ]);
    const cached = this.colors.get(key);
    if (cached) return cached;
    const rendered = renderedColor(value, background, gamut);
    const color =
      profile === "normal" ? rendered : simulateColor(rendered, profile);
    this.conversions++;
    this.colors.set(key, color);
    if (this.colors.size > MAX_COLOR_CACHE)
      this.colors.delete(this.colors.keys().next().value!);
    return color;
  }

  pair(
    first: string,
    second: string,
    background: string,
    profile: VisionProfile = "normal",
    gamut: RgbGamut = "srgb",
  ): PairMeasurement {
    const ordered = [first, second].sort();
    const key = JSON.stringify([
      MEASUREMENT_VERSION,
      ...ordered,
      background,
      profile,
      gamut,
    ]);
    const cached = this.pairs.get(key);
    if (cached) {
      this.hits++;
      return orient(cached, first === ordered[0]);
    }
    const a = this.color(ordered[0], background, profile, gamut),
      b = this.color(ordered[1], background, profile, gamut);
    const bg = this.color(background, background, profile, gamut);
    const result = {
      first: a.toString({ precision: 7 }),
      second: b.toString({ precision: 7 }),
      background: bg.toString({ precision: 7 }),
      deltaE: deltaE2000(a, b),
      contrast: renderedContrast(a, b),
      firstBackgroundContrast: renderedContrast(a, bg),
      secondBackgroundContrast: renderedContrast(b, bg),
      profile,
    };
    this.comparisons++;
    this.pairs.set(key, result);
    if (this.pairs.size > MAX_PAIR_CACHE)
      this.pairs.delete(this.pairs.keys().next().value!);
    return orient(result, first === ordered[0]);
  }

  backgroundContrast(
    value: string,
    background: string,
    gamut: RgbGamut = "srgb",
  ) {
    return renderedContrast(
      this.color(value, background, "normal", gamut),
      this.color(background, background, "normal", gamut),
    );
  }
}

function orient(pair: PairMeasurement, forward: boolean): PairMeasurement {
  return forward
    ? pair
    : {
        ...pair,
        first: pair.second,
        second: pair.first,
        firstBackgroundContrast: pair.secondBackgroundContrast,
        secondBackgroundContrast: pair.firstBackgroundContrast,
      };
}
