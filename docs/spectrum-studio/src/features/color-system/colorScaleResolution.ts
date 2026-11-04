// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "./model";
import { resolveColorDocument } from "./resolution";
import type { Mode, ModeSet } from "../modes/model";
import type { PreviewOverrides } from "../modes/previewState";
import type { OpacityDocument } from "../opacity/model";
import type { BrowserTokenEdits } from "../tokens/browserModel";
import { resolveOpacity } from "../opacity/generation";
import { opacityColorStops, opacityStopsEnabled } from "./colorScaleType";
import { resolvedBackgroundLinear } from "./surfaceGeneration";
import { renderGamutForOutput } from "./colorMath";
import { ColorScaleOutputError } from "./colorScaleType";

export interface ResolvedColorScaleDocument extends ColorSystemDocument {
  readonly colorOutputIssues?: readonly string[];
}

export function assertColorScaleOutput(document: ResolvedColorScaleDocument) {
  if (document.colorOutputIssues?.length)
    throw new ColorScaleOutputError(document.colorOutputIssues.join(" "));
}

export function resolveColorScaleDocument(
  base: ColorSystemDocument,
  modes: readonly Mode[],
  preview?: PreviewOverrides,
  options: {
    applyMultiplier?: boolean;
    applyPolarity?: boolean;
    modeSets?: ModeSet[];
    opacity?: OpacityDocument;
    browserTokenEdits?: BrowserTokenEdits;
  } = {},
): ResolvedColorScaleDocument {
  const resolved = resolveColorDocument(base, modes, preview, options);
  if (!opacityStopsEnabled(resolved.settings)) return resolved;
  const opacity = resolveOpacity(
    {
      colorSystem: base,
      opacity: options.opacity,
      browserTokenEdits: options.browserTokenEdits,
      modeSets: options.modeSets ?? [],
    },
    modes,
    preview,
  );
  if (opacity.issues.length)
    return { ...resolved, contrasts: [], colorOutputIssues: opacity.issues };
  return {
    ...resolved,
    contrasts: opacityColorStops(
      opacity,
      resolvedBackgroundLinear(resolved),
      resolved.settings,
      renderGamutForOutput(resolved.settings.colorOutput),
    ),
  };
}
