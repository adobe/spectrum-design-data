// Copyright 2026 Adobe. All rights reserved.
import {
  projectBrowserTokens,
  type BrowserToken,
} from "../tokens/browserModel";
import {
  assertTaxonomy,
  type Classification,
  type TaxonomyDocument,
  type TaxonomySegment,
  type TaxonomyValue,
} from "./model";
import type { CanonicalAliasRow } from "../tokens/aliasTargets";
import { aliasReferencePacket, type AliasDocument } from "../tokens/aliases";
export const TAXONOMY_PROFILE = "leonardo-flat-taxonomy-v1";
export interface TaxonomyExport {
  schemaVersion: 1;
  profileId: typeof TAXONOMY_PROFILE;
  taxonomy: TaxonomyDocument;
  tokens: {
    id: string;
    context: string;
    value: string | number;
    classification: Classification;
    flatName: Record<string, TaxonomyValue | TaxonomyValue[]>;
    name: string;
    path: TaxonomySegment[];
  }[];
}
export function buildTaxonomyExport(
  document: TaxonomyDocument,
  combinations: { modeKey: string; tokens: BrowserToken[] }[],
  profile: string = TAXONOMY_PROFILE,
): TaxonomyExport {
  if (profile !== TAXONOMY_PROFILE)
    throw new Error(
      `Unsupported taxonomy profile "${profile}". This packet is not an upstream design-data profile.`,
    );
  assertTaxonomy(document);
  const tokens = combinations.flatMap((combination) =>
    projectBrowserTokens(combination.tokens, document).map((token) => ({
      token,
      context: combination.modeKey,
    })),
  );
  const issues = tokens.flatMap(({ token, context }) =>
    (token.projection?.issues ?? ["Missing projection."]).map(
      (issue) => `${token.id} (${context}): ${issue}`,
    ),
  );
  const names = new Map<string, string>();
  for (const { token } of tokens) {
    const name = token.projection?.name;
    if (!name) continue;
    const owner = names.get(name.toLowerCase());
    if (owner && owner !== token.id)
      issues.push(
        `Serialized-name collision across mode contexts: ${name} (${owner}, ${token.id}).`,
      );
    names.set(name.toLowerCase(), token.id);
  }

  if (issues.length)
    throw new Error(
      `Taxonomy export blocked. Explicit reviewed mapping is required.\n${issues.join("\n")}`,
    );
  return {
    schemaVersion: 1,
    profileId: TAXONOMY_PROFILE,
    taxonomy: structuredClone(document),
    tokens: tokens.map(({ token, context }) => ({
      id: token.id,
      context,
      value: token.value,
      classification: token.projection!.classification,
      flatName: token.projection!.flat,
      name: token.projection!.name,
      path: token.projection!.segments,
    })),
  };
}

export function buildCanonicalTaxonomyExport(
  document: TaxonomyDocument,
  rows: readonly CanonicalAliasRow[],
  aliases: AliasDocument,
) {
  assertTaxonomy(document);
  const references = aliasReferencePacket(aliases, rows);
  const tokens = rows.map((row) => {
    const projection = row.token.projection;
    if (!projection || projection.issues.length)
      throw new Error(`Taxonomy export blocked for ${row.name}.`);
    const base = {
      id: row.rowId,
      conceptId: row.id,
      context: row.context,
      classification: projection.classification,
      flatName: projection.flat,
      name: row.name,
      path: projection.segments,
    };
    return { ...base, ...canonicalTaxonomyValue(row, rows) };
  });
  return {
    schemaVersion: 1,
    profileId: TAXONOMY_PROFILE,
    taxonomy: structuredClone(document),
    tokens,
    aliases: references,
  };
}

export function canonicalTaxonomyValue(
  row: CanonicalAliasRow,
  rows: readonly CanonicalAliasRow[],
): { $ref: string } | { value: string | number; unit?: string } {
  const semantic = row.token.semantic;
  if (semantic && "$ref" in semantic.token) {
    const targets = rows.filter(
      (candidate) =>
        candidate.id === semantic.target.id &&
        (JSON.parse(candidate.context) as [string, string][]).every(
          ([axis, mode]) => semantic.selection[axis] === mode,
        ),
    );
    if (targets.length !== 1)
      throw new Error(
        `Taxonomy export blocked: ${row.name} needs exactly one emitted primitive target.`,
      );
    return { $ref: targets[0].rowId };
  }
  return {
    value: row.token.value,
    ...(row.token.unit && { unit: row.token.unit }),
  };
}
