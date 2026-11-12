// Copyright 2026 Adobe. All rights reserved.
import type { TshirtArtifactBundle } from "../design-data/tshirtTypes";
import { buildStylesForSource, styleBrowserToken } from "../styles/artifacts";
import type { StyleArtifacts } from "../styles/generation";
import type { AliasTarget } from "./aliases";
import {
  canonicalBaseAliasRows,
  type AliasAuthoringSource,
  type CanonicalAliasRow,
} from "./baseAliasRows";
import { projectBrowserTokens, resolveBrowserTokens } from "./browserModel";
import { tokenIdentity } from "./canonicalIdentity";
import { buildCascadeTokenInventory } from "./cascadeExport";
import { dialogRowsForMode } from "./dialogModel";

export {
  completeAliasSource,
  type AliasAuthoringSource,
  type CanonicalAliasRow,
} from "./baseAliasRows";

export function canonicalAliasRows(
  source: AliasAuthoringSource,
  semantics?: TshirtArtifactBundle,
  projectionPolicy: "strict" | "preserve-for-review" = "strict",
  {
    excludeColors = false,
    includeUnpublished = false,
    excludeStyles = false,
    selections,
  }: {
    excludeColors?: boolean;
    includeUnpublished?: boolean;
    excludeStyles?: boolean;
    selections?: readonly Record<string, string>[];
  } = {},
): CanonicalAliasRow[] {
  const options = { excludeColors, includeUnpublished, selections };
  const baseRows = canonicalBaseAliasRows(
    source,
    semantics,
    projectionPolicy,
    options,
  );
  if (excludeStyles || !source.styles?.recipes.length) return baseRows;
  const output = buildStylesForSource(source, selections);
  const foundationRows = excludeColors
    ? canonicalBaseAliasRows(source, semantics, projectionPolicy, {
        includeUnpublished,
        selections,
      })
    : baseRows;
  const rows = new Map(
    baseRows.map((row) => [JSON.stringify([row.id, row.context]), row]),
  );
  for (const row of canonicalStyleAliasRows(source, foundationRows, output))
    rows.set(JSON.stringify([row.id, row.context]), row);
  return [...rows.values()];
}

export function canonicalStyleAliasRows(
  source: AliasAuthoringSource,
  foundationRows: readonly CanonicalAliasRow[],
  output: StyleArtifacts,
): CanonicalAliasRow[] {
  const compatibleModes = Object.fromEntries(
    source.modeSets
      .filter((axis) => axis.modes.length)
      .map((axis) => [axis.id, axis.modes.map((mode) => mode.id)]),
  );
  const rows: CanonicalAliasRow[] = [];
  for (const modeKey of new Set(output.rows.map((row) => row.modeKey))) {
    const styleRows = output.rows.filter((row) => row.modeKey === modeKey);
    const tokens = projectBrowserTokens(
      resolveBrowserTokens(
        [
          ...dialogRowsForMode(foundationRows, modeKey).map((row) => row.token),
          ...styleRows.map((row) => styleBrowserToken(row, source)),
        ],
        source.browserTokenEdits,
        modeKey,
      ),
      source.taxonomy,
    );
    for (const row of styleRows) {
      const token = tokens.find((token) => token.id === row.conceptId)!;
      rows.push({
        id: row.conceptId,
        rowId: row.token.uuid,
        context: row.modeKey,
        name: token.name,
        token,
        canonicalName: {
          ...row.token.name,
          ...Object.fromEntries(
            Object.entries(token.projection?.flat ?? {}).filter(
              (entry): entry is [string, string | number] =>
                typeof entry[1] === "string" || typeof entry[1] === "number",
            ),
          ),
        },
        compatibleModes,
      });
    }
  }
  return rows;
}

/** Validates source identities without claiming unavailable color values were emitted. */
export function canonicalAliasSourceTargets(
  source: AliasAuthoringSource,
  semantics?: TshirtArtifactBundle,
): AliasTarget[] {
  const inventory = buildCascadeTokenInventory({
    base: source.colorSystem,
    opacity: source.opacity,
    modeSets: source.modeSets,
    activeModes: [],
    activeTokens: [],
    overrides: source.tokenOverrides,
    browserEdits: source.browserTokenEdits,
    taxonomy: source.taxonomy,
    rules: source.rules,
  });
  const compatibleModes = Object.fromEntries(
    source.modeSets
      .filter((axis) => axis.modes.length)
      .map((axis) => [axis.id, axis.modes.map((mode) => mode.id)]),
  );
  return [
    ...canonicalAliasRows(source, semantics, "strict", { excludeColors: true }),
    ...inventory.colorReferences.map((target) => {
      const identity = tokenIdentity(source.browserTokenEdits, target.id);
      const canonical = identity
        ? {
            ...target,
            id: identity.conceptId,
            rowId: identity.rows[target.context] ?? target.rowId,
          }
        : target;
      return { ...canonical, compatibleModes };
    }),
  ];
}
