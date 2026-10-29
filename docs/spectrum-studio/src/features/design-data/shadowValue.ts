// Copyright 2026 Adobe. All rights reserved.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import Color from "colorjs.io";
import shadowSchema from "../../data/design-data-shadow-profile/value-types/drop-shadow.schema.json" with { type: "json" };
import type { GeneratedShadow } from "../elevation/model";

export const SHADOW_VALUE_TYPE = "value-types/drop-shadow.schema.json";
export interface DraftShadowLayer {
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
}
export class ShadowArtifactError extends Error {
  constructor(message: string) {
    super(`Shadow export: ${message}`);
    this.name = "ShadowArtifactError";
  }
}
function fail(message: string): never {
  throw new ShadowArtifactError(message);
}
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
});
addFormats(ajv);
ajv.addKeyword({
  keyword: "x-valueType",
  schemaType: ["string", "array"],
  valid: true,
});
const validateValue = ajv.compile<DraftShadowLayer[]>(shadowSchema);
const dimension = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?px$/;

export function assertShadowValue(
  value: unknown,
): asserts value is DraftShadowLayer[] {
  if (!validateValue(value))
    fail(`invalid shadow value: ${ajv.errorsText(validateValue.errors)}`);
  value.forEach((layer, index) => {
    for (const field of ["x", "y", "blur", "spread"] as const) {
      const text = layer[field];
      if (!dimension.test(text) || !Number.isFinite(Number(text.slice(0, -2))))
        fail(`/value/${index}/${field}: expected a finite px literal.`);
      if (field === "blur" && Number(text.slice(0, -2)) < 0)
        fail(`/value/${index}/blur: blur cannot be negative.`);
    }
    let color: Color;
    try {
      color = new Color(layer.color);
    } catch {
      return fail(`/value/${index}/color: invalid literal color.`);
    }
    if (
      color.coords.some(
        (channel) => channel === null || !Number.isFinite(Number(channel)),
      ) ||
      !Number.isFinite(Number(color.alpha)) ||
      Number(color.alpha) < 0 ||
      Number(color.alpha) > 1
    )
      fail(`/value/${index}/color: invalid color channels or alpha.`);
  });
}

export function projectShadowValue(
  shadows: readonly GeneratedShadow[],
): DraftShadowLayer[] {
  if (!shadows.length)
    fail(
      "an empty-valued shadow token is unsupported; an empty foundation publishes no tokens.",
    );
  const value = shadows.map((shadow, index) => {
    if (shadow.inset !== false)
      fail(`/shadows/${index}/inset: only outset shadows are supported.`);
    for (const field of [
      "offsetX",
      "offsetY",
      "blur",
      "spread",
      "opacity",
    ] as const) {
      if (!Number.isFinite(shadow[field]))
        fail(`/shadows/${index}/${field}: expected a finite number.`);
    }
    if (shadow.opacity < 0 || shadow.opacity > 1)
      fail(`/shadows/${index}/opacity: expected a value between zero and one.`);
    return {
      x: `${shadow.offsetX}px`,
      y: `${shadow.offsetY}px`,
      blur: `${shadow.blur}px`,
      spread: `${shadow.spread}px`,
      color: shadow.color,
    };
  });
  assertShadowValue(value);
  return value;
}
