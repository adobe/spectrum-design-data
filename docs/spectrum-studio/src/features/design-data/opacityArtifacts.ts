// Copyright 2026 Adobe. All rights reserved.
import { opacityRows, opacityOutputIssues } from "../opacity/output";
import type { OpacitySource } from "../opacity/generation";
import type { TaxonomyDocument } from "../taxonomy/model";
import { isAlpha } from "../opacity/model";

export interface LocalOpacityToken {
  uuid: string;
  conceptId: string;
  type: "opacity";
  name: {
    property: "opacity";
    scaleIndex: number;
    [key: string]: string | number;
  };
  value: number;
}

export function opacityArtifactIssues(
  tokens: readonly LocalOpacityToken[],
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  for (const token of tokens) {
    if (!uuid.test(token.uuid) || !uuid.test(token.conceptId))
      issues.push(
        "Opacity output requires persisted random concept and row UUIDs.",
      );
    if (ids.has(token.uuid))
      issues.push(`Duplicate opacity row UUID ${token.uuid}.`);
    ids.add(token.uuid);
    if (token.type !== "opacity" || !isAlpha(token.value))
      issues.push(`Opacity ${token.uuid} must have a finite normalized alpha.`);
    if (
      token.name.property !== "opacity" ||
      !Number.isInteger(token.name.scaleIndex) ||
      token.name.scaleIndex < 100 ||
      token.name.scaleIndex % 100 !== 0
    )
      issues.push(
        `Opacity ${token.uuid} must have a Property and positive hundred-based Scale index.`,
      );
  }
  return issues;
}

/**
 * Studio-local output: upstream has no modern opacity value-type schema.
 * Numeric scaleIndex remains subject to LTAX-003; no conformance URI is claimed.
 */
export function buildOpacityArtifacts(
  source: OpacitySource & { taxonomy: TaxonomyDocument },
) {
  const rows = opacityRows(source, source.taxonomy);
  const issues = [
    ...opacityOutputIssues(source),
    ...rows.flatMap((row) => row.issues),
  ];
  const tokens: LocalOpacityToken[] = rows
    .filter((row) => row.uuid && !row.issues.length)
    .map((row) => ({
      uuid: row.uuid!,
      conceptId: row.conceptId,
      type: "opacity",
      name: { property: "opacity", scaleIndex: row.scaleIndex, ...row.context },
      value: row.value,
    }));
  issues.push(...opacityArtifactIssues(tokens));
  return {
    contract: "studio-local-opacity-v1" as const,
    gaps: ["LTAX-002", "LTAX-003", "LTAX-005", "LTAX-007", "LTAX-016"],
    tokens: issues.length ? [] : tokens,
    issues,
  };
}
