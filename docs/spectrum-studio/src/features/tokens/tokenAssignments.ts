// Copyright 2026 Adobe. All rights reserved.
import type { BrowserTokenSource } from "./browserModel";
import type {
  TokenAssignment,
  TokenAuthoring,
  TokenShadowLayer,
} from "./browserEditTypes";
import { assertShadowValue } from "../design-data/shadowValue";

export const modePairs = (key: string): [string, string][] => {
  const parsed: unknown = JSON.parse(key);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (pair: unknown) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every((part) => typeof part === "string"),
    )
  )
    throw new Error("Invalid token mode context.");
  const pairs: [string, string][] = parsed;
  if (new Set(pairs.map(([id]) => id)).size !== pairs.length)
    throw new Error("A mode context repeats a mode set.");
  return pairs;
};

export function assignmentForMode<T>(
  assignments: Readonly<Record<string, T>>,
  key: string,
): T | undefined {
  const selected = new Map(modePairs(key));
  const matches = Object.entries(assignments)
    .filter(([context]) =>
      modePairs(context).every(([axis, mode]) => selected.get(axis) === mode),
    )
    .sort(([a], [b]) => modePairs(b).length - modePairs(a).length);
  if (
    matches.length > 1 &&
    modePairs(matches[0][0]).length === modePairs(matches[1][0]).length
  )
    throw new Error(
      "Overlapping token assignments have the same mode specificity.",
    );
  return matches[0]?.[1];
}

export function compatibleTokenTypes(
  token: Pick<BrowserTokenSource, "type" | "unit" | "groupId">,
  target: Pick<BrowserTokenSource, "type" | "unit" | "groupId">,
) {
  if (token.unit !== target.unit) return false;
  if (token.type === "typography" || target.type === "typography")
    return token.type === target.type && token.groupId === target.groupId;
  const dimensions = ["spacing", "size", "radius"];
  return (
    token.type === target.type ||
    (dimensions.includes(token.type) && dimensions.includes(target.type))
  );
}

export function shadowText(layers: readonly TokenShadowLayer[]): string {
  return layers
    .map(
      (layer) =>
        `${layer.x} ${layer.y} ${layer.blur} ${layer.spread} ${layer.color}`,
    )
    .join(", ");
}

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
        ].includes(key),
    )
  )
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
      !text(value.manual.targetId) ||
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
