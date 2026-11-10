// Copyright 2026 Adobe. All rights reserved.
import { isTokenTier } from "./tier";
import type { BrowserTokenSource } from "./browserModel";
import type { TokenAssignment, TokenAuthoring } from "./browserEditTypes";
import { assertShadowValue } from "../design-data/shadowValue";
import { isTokenIdentity } from "./canonicalIdentity";
import { modePairs } from "./browserResolution";
export {
  assignmentForMode,
  compatibleTokenTypes,
  modePairs,
  shadowText,
} from "./browserResolution";

export function literalAssignment(
  source: BrowserTokenSource,
): Extract<TokenAssignment, { kind: "literal" }> {
  return {
    kind: "literal",
    value: source.value,
    ...(source.shadows?.length && {
      shadows: source.shadows.map((layer) => ({
        x: `${layer.offsetX}px`,
        y: `${layer.offsetY}px`,
        blur: `${layer.blur}px`,
        spread: `${layer.spread}px`,
        color: layer.color,
      })),
    }),
    ...(source.literalShadows && { shadows: source.literalShadows }),
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const modeMap = (
  value: unknown,
  validate: (item: unknown) => boolean,
): boolean =>
  object(value) &&
  Object.entries(value).every(([key, item]) => {
    try {
      modePairs(key);
      return validate(item);
    } catch {
      return false;
    }
  });
export function isTokenAssignment(value: unknown): value is TokenAssignment {
  if (!object(value)) return false;
  if (value.kind === "reference")
    return (
      text(value.targetId) &&
      !!value.targetId &&
      Object.keys(value).length === 2
    );
  const valid =
    value.kind === "literal" &&
    (text(value.value) ||
      (typeof value.value === "number" && Number.isFinite(value.value))) &&
    Object.keys(value).every((key) =>
      ["kind", "value", "shadows"].includes(key),
    ) &&
    (value.shadows === undefined ||
      (Array.isArray(value.shadows) &&
        value.shadows.length > 0 &&
        value.shadows.every(
          (layer: unknown) =>
            object(layer) &&
            Object.keys(layer).length === 5 &&
            ["x", "y", "blur", "spread", "color"].every((key) =>
              text(layer[key]),
            ),
        )));
  if (!valid) return false;
  if (value.shadows !== undefined) {
    try {
      assertShadowValue(value.shadows);
    } catch {
      return false;
    }
  }
  return true;
}
export function isTokenAuthoring(value: unknown): value is TokenAuthoring {
  if (!object(value) || !modeMap(value.assignments, isTokenAssignment))
    return false;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          "assignments",
          "baselines",
          "classification",
          "manual",
          "lifecycle",
          "identity",
        ].includes(key),
    )
  )
    return false;
  if (value.identity !== undefined && !isTokenIdentity(value.identity))
    return false;
  if (
    value.baselines !== undefined &&
    !modeMap(
      value.baselines,
      (item) =>
        typeof item === "string" ||
        (typeof item === "number" && Number.isFinite(item)),
    )
  )
    return false;
  if (
    value.classification !== undefined &&
    (!object(value.classification) ||
      !Object.values(value.classification).every(
        (term) => text(term) || (Array.isArray(term) && term.every(text)),
      ))
  )
    return false;
  if (
    value.manual !== undefined &&
    (!object(value.manual) ||
      ![
        "colors",
        "typography",
        "spacing",
        "size",
        "radius",
        "opacity",
        "elevation",
      ].includes(String(value.manual.type)) ||
      !["px", ""].includes(String(value.manual.unit)) ||
      (value.manual.tier !== undefined && !isTokenTier(value.manual.tier)) ||
      (value.manual.targetId !== undefined && !text(value.manual.targetId)) ||
      !text(value.manual.groupId) ||
      (value.manual.scope !== undefined && value.manual.scope !== "structures"))
  )
    return false;
  const lifecycle = value.lifecycle;
  return (
    lifecycle === undefined ||
    (object(lifecycle) &&
      text(lifecycle.deprecatedComment) &&
      Array.isArray(lifecycle.replacementIds) &&
      lifecycle.replacementIds.every(text) &&
      (lifecycle.introduced === undefined || text(lifecycle.introduced)) &&
      (lifecycle.deprecatedIn === undefined || text(lifecycle.deprecatedIn)) &&
      (lifecycle.frozen === undefined ||
        modeMap(
          lifecycle.frozen,
          (item) => isTokenAssignment(item) && item.kind === "literal",
        )))
  );
}
