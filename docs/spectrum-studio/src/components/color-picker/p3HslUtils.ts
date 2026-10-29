// Copyright 2026 Adobe. All rights reserved.
export interface P3HslCoords {
  h: number;
  s: number;
  l: number;
}

export interface P3RgbCoords {
  r: number;
  g: number;
  b: number;
}

export function p3RgbToHsl({ r, g, b }: P3RgbCoords): P3HslCoords {
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    lightness > 0.5
      ? delta / (2 - maximum - minimum)
      : delta / (maximum + minimum);
  let hue: number;

  if (maximum === r) {
    hue = ((g - b) / delta) % 6;
  } else if (maximum === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue *= 60;
  if (hue < 0) hue += 360;

  return { h: hue, s: saturation * 100, l: lightness * 100 };
}

function hueToRgb(p: number, q: number, value: number) {
  let normalized = value;
  if (normalized < 0) normalized += 1;
  if (normalized > 1) normalized -= 1;
  if (normalized < 1 / 6) return p + (q - p) * 6 * normalized;
  if (normalized < 1 / 2) return q;
  if (normalized < 2 / 3) return p + (q - p) * (2 / 3 - normalized) * 6;
  return p;
}

export function p3HslToRgb({ h, s, l }: P3HslCoords): P3RgbCoords {
  const hue = (((h % 360) + 360) % 360) / 360;
  const saturation = s / 100;
  const lightness = l / 100;

  if (saturation === 0) {
    return { r: lightness, g: lightness, b: lightness };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: hueToRgb(p, q, hue + 1 / 3),
    g: hueToRgb(p, q, hue),
    b: hueToRgb(p, q, hue - 1 / 3),
  };
}

export function p3HslToColor(hsl: P3HslCoords) {
  const rgb = p3HslToRgb(hsl);
  return {
    space: "p3",
    coords: [rgb.r, rgb.g, rgb.b] as [number, number, number],
  };
}

export function colorToP3Hsl(color: {
  to(space: string): { coords: number[] };
}): P3HslCoords {
  const [r, g, b] = color.to("p3").coords;
  return p3RgbToHsl({ r, g, b });
}

export function getP3HslChannelRange(channel: keyof P3HslCoords) {
  return channel === "h" ? ([0, 360] as const) : ([0, 100] as const);
}

export function isValidP3Hsl(value: P3HslCoords) {
  return (
    Number.isFinite(value.h) &&
    Number.isFinite(value.s) &&
    Number.isFinite(value.l) &&
    value.h >= 0 &&
    value.h <= 360 &&
    value.s >= 0 &&
    value.s <= 100 &&
    value.l >= 0 &&
    value.l <= 100
  );
}

export function clampP3Hsl(value: P3HslCoords): P3HslCoords {
  return {
    h: Math.min(360, Math.max(0, value.h)),
    s: Math.min(100, Math.max(0, value.s)),
    l: Math.min(100, Math.max(0, value.l)),
  };
}
