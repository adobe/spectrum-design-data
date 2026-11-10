// Copyright 2026 Adobe. All rights reserved.
import { concreteColor } from "../color-system/data-vis/colors";
import { fromTypographyUnit } from "../typography/units";
import { tokenIdentity } from "./canonicalIdentity";
import type { BrowserToken, BrowserTokenSource } from "./browserModel";
import type {
  BrowserTokenEdits,
  TokenShadowLayer,
  TokenValue,
} from "./browserEditTypes";

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

export const MISSING_VALUE_MESSAGE = "Set a value for this token.";

export function canonicalBrowserSources(
  sources: readonly BrowserTokenSource[],
  edits: BrowserTokenEdits,
): BrowserTokenSource[] {
  return sources.map((source) => {
    const identity = tokenIdentity(edits, source.sourceId ?? source.id);
    return identity
      ? {
          ...source,
          sourceId: identity.sourceId,
          id: identity.conceptId,
          ...(source.referenceId && {
            referenceId:
              tokenIdentity(edits, source.referenceId)?.conceptId ??
              source.referenceId,
          }),
        }
      : source;
  });
}

export function resolveBrowserTokens(
  sources: BrowserTokenSource[],
  edits: BrowserTokenEdits,
  modeKey: string,
  { includeManual = false }: { includeManual?: boolean } = {},
): BrowserToken[] {
  const allSources = canonicalBrowserSources(sources, edits);
  for (const [id, edit] of Object.entries(edits)) {
    const manual = edit.authoring?.manual;
    if (!manual || allSources.some((source) => source.id === id)) continue;
    const target = manual.targetId
      ? allSources.find((source) => source.id === manual.targetId)
      : undefined;
    allSources.push({
      id,
      type: manual.type,
      unit: manual.unit,
      groupId: manual.groupId,
      groupLabel: "Manual tokens",
      name: id,
      generatedName: id,
      value: target?.value ?? "",
      generatedValue: target?.value ?? "",
      manual: true,
      tier: manual.tier,
      referenceId: manual.targetId,
      classificationScope: manual.scope,
    });
  }
  const tokens = allSources.map((source): BrowserToken => {
    const edit = edits[source.id];
    const modeValue =
      source.dataVis?.static || source.resolvedValue
        ? undefined
        : edit?.values[source.modeKey ?? modeKey];
    return {
      ...source,
      originalSource: source.originalSource ?? source,
      name: edit?.name ?? source.name,
      value: modeValue?.value ?? source.value,
      description: edit?.description ?? "",
      status: edit?.status ?? "draft",
      nameOverridden:
        edit?.name !== undefined || source.name !== source.generatedName,
      valueOverridden:
        modeValue !== undefined ||
        !!source.legacyOverridden ||
        !!source.resolvedValue?.overridden,
      stale:
        (modeValue !== undefined &&
          modeValue.baseline !== source.generatedValue) ||
        (edit?.nameBaseline !== undefined &&
          edit.nameBaseline !== source.generatedName) ||
        !!source.legacyStale ||
        !!source.resolvedValue?.stale,
      classificationOverride: edit?.authoring?.classification,
      ...(source.manual && {
        tier: edit?.authoring?.manual
          ? edit.authoring.manual.tier
          : source.tier,
        classificationScope: edit?.authoring?.manual?.scope,
      }),
      lifecycle: edit?.authoring?.lifecycle,
    };
  });
  const byId = new Map(tokens.map((token) => [token.id, token]));
  const resolved = new Set<string>();
  const visiting = new Set<string>();
  function resolve(token: BrowserToken): BrowserToken {
    if (resolved.has(token.id)) return token;
    if (visiting.has(token.id))
      throw new Error("Token references form a cycle.");
    visiting.add(token.id);
    const authoring = edits[token.id]?.authoring;
    const frozen = authoring?.lifecycle?.frozen;
    const assignment = frozen
      ? assignmentForMode(frozen, modeKey)
      : authoring && !token.dataVis?.static
        ? assignmentForMode(authoring.assignments, modeKey)
        : undefined;
    if (frozen && !assignment)
      throw new Error(
        "This deprecated token has no frozen value for the selected modes.",
      );
    const referenceId =
      assignment?.kind === "reference"
        ? assignment.targetId
        : assignment
          ? undefined
          : token.referenceId;
    if (referenceId) {
      const target = byId.get(referenceId);
      if (!target)
        throw new Error("The referenced token is unavailable in these modes.");
      if (!compatibleTokenTypes(token, target))
        throw new Error(
          "Choose a token with a compatible value type and unit.",
        );
      resolve(target);
      if (target.validationError) throw new Error(target.validationError);
      token.value = target.value;
      token.literalShadows = target.literalShadows;
      token.shadows = target.shadows;
      token.referenceId = target.id;
      token.referenceName = target.name;
    } else if (token.manual && !assignment)
      throw new Error(MISSING_VALUE_MESSAGE);
    else if (assignment?.kind === "literal") {
      if (token.type !== "elevation")
        parseBrowserTokenValue(
          { ...token, displayUnit: undefined, alias: undefined },
          String(assignment.value),
        );
      else if (!assignment.shadows)
        throw new Error("Complete shadow values require structured layers.");
      token.value = assignment.shadows
        ? shadowText(assignment.shadows)
        : assignment.value;
      token.literalShadows = assignment.shadows;
      token.referenceId = undefined;
      token.referenceName = undefined;
      if (assignment.shadows) token.shadows = undefined;
    }
    if (assignment) {
      token.valueOverridden = !frozen && !token.manual;
      const baseline =
        authoring?.baselines && assignmentForMode(authoring.baselines, modeKey);
      token.stale ||=
        baseline !== undefined && baseline !== token.generatedValue;
      token.valuePreview = undefined;
    }
    visiting.delete(token.id);
    resolved.add(token.id);
    return token;
  }
  return tokens
    .filter((token) => includeManual || !token.manual)
    .map((token) => {
      try {
        return resolve(token);
      } catch (failure) {
        visiting.delete(token.id);
        token.validationError =
          failure instanceof Error ? failure.message : String(failure);
        return token;
      }
    });
}

export function parseBrowserTokenValue(
  token: BrowserTokenSource,
  input: string,
): TokenValue {
  if (token.alias)
    throw new Error(
      "Aliases resolve their canonical token's value. Delete the alias or edit its source.",
    );
  if (token.type === "elevation")
    throw new Error("Edit complete shadows in the Elevation foundation.");
  if (token.type === "opacity") {
    const text = input.trim();
    const value =
      Number(text.replace(/%$/, "").trim()) / (text.endsWith("%") ? 100 : 1);
    if (!text || !Number.isFinite(value) || value < 0 || value > 1)
      throw new Error("Enter an opacity from 0% to 100%.");
    return value;
  }
  if (token.type === "colors") {
    const value = input.trim();
    try {
      concreteColor(value);
      return value;
    } catch {
      throw new Error("Enter a valid color value.");
    }
  }
  const shownUnit = token.displayUnit ?? token.unit;
  const text = input
    .trim()
    .replace(shownUnit ? new RegExp(`${shownUnit}$`, "i") : /$^/, "")
    .trim();
  const value = text === "" ? NaN : Number(text);
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Enter a non-negative numeric value.");
  return token.displayUnit && token.unit === "px"
    ? fromTypographyUnit(value, token.displayUnit)
    : value;
}
