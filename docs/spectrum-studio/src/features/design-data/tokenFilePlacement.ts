// Copyright 2026 Adobe. All rights reserved.

/**
 * Decides which file a design-data token belongs in, inside the practice copy's
 * `tokens/` folder (see docs/rfcs/design-data-token-file-layout.md).
 *
 * The tier is never guessed here: callers pass the official tier the
 * design-data SDK reports for each row. Every row of one concept lands in the
 * same file, so adding, removing or deprecating a mode never moves a file.
 */

/** Bump when the rule changes, so stored copies know to be rewritten. */
export const TOKEN_PLACEMENT_RULE_VERSION = 1;

export const TOKEN_TIERS = ["primitive", "semantic", "component"] as const;
export type TokenTier = (typeof TOKEN_TIERS)[number];

export const TOKEN_SUBJECTS = [
  "color",
  "layout",
  "typography",
  "opacity",
  "effects",
  "other",
] as const;
export type TokenSubject = (typeof TOKEN_SUBJECTS)[number];

/** Folder for each tier, relative to the dataset's `tokens/` folder. */
export const TOKEN_TIER_FOLDERS: Record<TokenTier, string> = {
  primitive: "primitives",
  semantic: "semantic",
  component: "components",
};

/** Component-tier tokens without a `component` name field. */
export const UNASSIGNED_COMPONENT = "unassigned";

const SUBJECT_BY_TYPE: Record<string, TokenSubject> = {
  color: "color",
  dimension: "layout",
  multiplier: "layout",
  angle: "layout",
  alignment: "layout",
  "font-family": "typography",
  "font-size": "typography",
  "font-style": "typography",
  "font-weight": "typography",
  "text-transform": "typography",
  typography: "typography",
  opacity: "opacity",
  "drop-shadow": "effects",
  "gradient-stop": "effects",
};

const TIER_RANK: Record<TokenTier, number> = {
  primitive: 0,
  semantic: 1,
  component: 2,
};

export interface PlacementToken {
  uuid: string;
  conceptId?: string;
  $schema?: string;
  $ref?: string;
  name?: Record<string, unknown>;
}

export interface TokenPlacement {
  /** Path relative to the dataset's `tokens/` folder. */
  file: string;
  tier: TokenTier;
  subject: TokenSubject;
  component?: string;
}

/** The token-type name from a `$schema` URI, such as `dimension`. */
export function tokenTypeName(schema: unknown): string | undefined {
  if (typeof schema !== "string") return undefined;
  return /\/token-types\/([a-z0-9-]+)\.json$/.exec(schema)?.[1];
}

/**
 * Every token by its `uuid`, plus each concept by its `conceptId` (an alias may
 * point at either; spec token-format.md, Concept identity). For a concept the
 * first row stands in, which is enough to learn the value type.
 */
export function tokenLookup<T extends PlacementToken>(
  tokens: readonly T[],
): Map<string, T> {
  const lookup = new Map(tokens.map((token) => [token.uuid, token]));
  for (const token of tokens)
    if (token.conceptId && !lookup.has(token.conceptId))
      lookup.set(token.conceptId, token);
  return lookup;
}

/** The subject of the value a token finally resolves to, following aliases. */
export function tokenSubject(
  token: PlacementToken,
  lookup: ReadonlyMap<string, PlacementToken>,
): TokenSubject {
  const seen = new Set<string>();
  let current: PlacementToken | undefined = token;
  while (current && typeof current.$ref === "string") {
    if (seen.has(current.uuid)) return "other";
    seen.add(current.uuid);
    current = lookup.get(current.$ref);
  }
  const type = tokenTypeName(current?.$schema);
  return (type && SUBJECT_BY_TYPE[type]) || "other";
}

export function tokenFilePath(placement: Omit<TokenPlacement, "file">): string {
  if (placement.tier !== "component")
    return `${TOKEN_TIER_FOLDERS[placement.tier]}/${placement.subject}.tokens.json`;
  const component = placement.component ?? UNASSIGNED_COMPONENT;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(component))
    throw new Error(`Component "${component}" cannot be used as a file name.`);
  return `${TOKEN_TIER_FOLDERS.component}/${component}.tokens.json`;
}

/**
 * Places every token. Rows sharing a `conceptId` share one file: the concept
 * takes its highest row tier, the first known subject, and the first component.
 * Each file keeps the rows in their input order, so diffs stay small.
 */
export function placeTokens<T extends PlacementToken>(
  tokens: readonly T[],
  tierOf: (token: T) => TokenTier | undefined,
): { files: Map<string, T[]>; placements: Map<string, TokenPlacement> } {
  const lookup = tokenLookup(tokens);
  const concepts = new Map<string, T[]>();
  for (const token of tokens) {
    const key = token.conceptId ? `concept:${token.conceptId}` : token.uuid;
    const rows = concepts.get(key);
    if (rows) rows.push(token);
    else concepts.set(key, [token]);
  }
  const placements = new Map<string, TokenPlacement>();
  for (const rows of concepts.values()) {
    let tier: TokenTier | undefined;
    for (const row of rows) {
      const rowTier = tierOf(row);
      if (!rowTier) throw new Error(`Token ${row.uuid} has no official tier.`);
      if (!tier || TIER_RANK[rowTier] > TIER_RANK[tier]) tier = rowTier;
    }
    const subject: TokenSubject =
      rows
        .map((row) => tokenSubject(row, lookup))
        .find((value) => value !== "other") ?? "other";
    const component = rows
      .map((row) => row.name?.component)
      .find((value): value is string => typeof value === "string");
    const placement = {
      tier: tier!,
      subject,
      ...(tier === "component" && component ? { component } : {}),
    };
    const file = tokenFilePath(placement);
    for (const row of rows) placements.set(row.uuid, { ...placement, file });
  }
  const files = new Map<string, T[]>();
  for (const token of tokens) {
    const file = placements.get(token.uuid)!.file;
    const rows = files.get(file);
    if (rows) rows.push(token);
    else files.set(file, [token]);
  }
  return { files, placements };
}
