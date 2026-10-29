// Copyright 2026 Adobe. All rights reserved.
import { sanitizeTokenName } from "../color-system/cssLibrary";
import type { OutputGamut, PaletteColor } from "../color-system/model";
import { paletteColorCss } from "../color-system/paletteValue";
import {
  PALETTE_SCALE_ID,
  type GeneratedToken,
  tokenStableKey,
  tokenUuid,
} from "./model";

export function generatePaletteTokens(
  palette: readonly PaletteColor[],
  outputGamut: OutputGamut,
): GeneratedToken[] {
  return palette.map((color) => ({
    uuid: tokenUuid(tokenStableKey(PALETTE_SCALE_ID, color.id)),
    name: { colorName: sanitizeTokenName(color.name), contrastValue: "" },
    value: paletteColorCss(color, outputGamut),
    source: {
      tokenType: "color",
      scaleId: PALETTE_SCALE_ID,
      contrastId: color.id,
    },
  }));
}
