// Copyright 2026 Adobe. All rights reserved.
import {
  gamutClamp,
  linearToHex,
  outputColorCss,
  renderGamutForOutput,
  requiresOutputGamutMapping,
} from "./colorMath";
import type { ColorStopInput, OutputGamut } from "./model";

/** A stored chroma coordinate of 100 is OKLCh chroma 0.4. */
export const MAX_CHROMA = 0.4;
export const MAX_AUTHORED_CHROMA = 125;

export type PaletteChannels = ColorStopInput;

export function paletteColorLinear(
  color: PaletteChannels,
  outputGamut: OutputGamut,
) {
  return gamutClamp(
    color.lightness,
    (color.chroma / 100) * MAX_CHROMA,
    color.hue,
    renderGamutForOutput(outputGamut),
    requiresOutputGamutMapping(outputGamut),
  );
}

/** Value in the output format; this is the token and CSS value. */
export function paletteColorCss(
  color: PaletteChannels,
  outputGamut: OutputGamut,
) {
  return outputColorCss(paletteColorLinear(color, outputGamut), outputGamut);
}

/** sRGB hex for swatches, which parse only RGB-family strings. */
export function paletteColorHex(
  color: PaletteChannels,
  outputGamut: OutputGamut,
) {
  return linearToHex(
    paletteColorLinear(color, outputGamut),
    renderGamutForOutput(outputGamut),
  );
}
