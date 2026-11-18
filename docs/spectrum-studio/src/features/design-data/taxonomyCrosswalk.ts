// Copyright 2026 Adobe. All rights reserved.
import crosswalkData from "../../data/taxonomy-crosswalk.json" with { type: "json" };
import type { TaxonomyProjection } from "../taxonomy/model";
import type { TokenPanelId } from "../tokens/view/tokenPanelRegistry";

/**
 * The single translation layer between Studio's Registry taxonomy and
 * design-data's older vocabulary. Rules live in
 * `src/data/taxonomy-crosswalk.json`; every consumer (output names, identity
 * adoption, migration analysis) reads them through this module. Each rule
 * names the gap and RFC that retires it.
 */
export type CrosswalkRuleKind =
  | "add-field"
  | "rename-key"
  | "rename-term"
  | "value-type"
  | "drop-field"
  | "mode-default"
  | "tier";

export type CrosswalkRetiredBy = "design-data" | "studio" | "decision";

export interface CrosswalkRule {
  id: string;
  kind: CrosswalkRuleKind;
  /** Which project's change retires the rule; `decision` needs review first. */
  retireBy: CrosswalkRetiredBy;
  studio: {
    key?: string;
    value?: string;
    terms?: Record<string, string>;
    tiers?: string[];
  };
  designData: { field?: string; value?: string; valueType?: string };
  appliesTo: { tokenTypes?: string[]; tiers?: string[] };
  gapId: string;
  rfc: string;
  retireWhen: string;
  notes: string;
}

export interface TaxonomyCrosswalk {
  schemaVersion: number;
  designDataRevision: string;
  rules: CrosswalkRule[];
}

export const taxonomyCrosswalk = crosswalkData as TaxonomyCrosswalk;

export interface CrosswalkOptions {
  tokenType?: string;
  crosswalk?: TaxonomyCrosswalk;
}

type Name = Readonly<Record<string, unknown>>;

const kinds = new Set<string>([
  "add-field",
  "rename-key",
  "rename-term",
  "value-type",
  "drop-field",
  "mode-default",
  "tier",
]);

function applies(rule: CrosswalkRule, tokenType: string | undefined) {
  const types = rule.appliesTo.tokenTypes;
  return !types || (tokenType !== undefined && types.includes(tokenType));
}

function translate(
  name: Name,
  { tokenType, crosswalk = taxonomyCrosswalk }: CrosswalkOptions,
  comparison: boolean,
): Record<string, unknown> {
  const rules = crosswalk.rules.filter((rule) => applies(rule, tokenType));
  let entries = Object.entries(name);
  // Terms are renamed under their Studio key, before any key rename.
  for (const rule of rules) {
    const terms = rule.studio.terms;
    if (rule.kind !== "rename-term" || !rule.studio.key || !terms) continue;
    const rename = (value: unknown) =>
      typeof value === "string" && Object.hasOwn(terms, value)
        ? terms[value]
        : value;
    entries = entries.map(([key, value]) =>
      key === rule.studio.key
        ? [key, Array.isArray(value) ? value.map(rename) : rename(value)]
        : [key, value],
    );
  }
  for (const rule of rules) {
    const from = rule.studio.key;
    const to = rule.designData.field;
    if (rule.kind !== "rename-key" || !from || !to) continue;
    if (entries.some(([key]) => key === to)) continue;
    entries = entries.map(([key, value]) => [key === from ? to : key, value]);
  }
  for (const rule of rules) {
    if (rule.kind !== "value-type" || rule.designData.valueType !== "number")
      continue;
    entries = entries.map(([key, value]) =>
      key === rule.designData.field &&
      typeof value === "string" &&
      /^\d+$/.test(value)
        ? [key, Number(value)]
        : [key, value],
    );
  }
  for (const rule of rules) {
    const field = rule.designData.field;
    const value = rule.designData.value;
    if (rule.kind !== "add-field" || !field || value === undefined) continue;
    if (
      !entries.some(([key, current]) => key === field && current !== undefined)
    )
      entries = [[field, value], ...entries.filter(([key]) => key !== field)];
  }
  if (comparison)
    for (const rule of rules)
      if (rule.kind === "drop-field" && rule.studio.key)
        entries = entries.filter(([key]) => key !== rule.studio.key);
  return Object.fromEntries(entries);
}

/** Studio name fields spelled the way design-data publishes them. Keeps Studio-only fields so emitted names stay unique. */
export function toDesignDataName(
  name: Name,
  options: CrosswalkOptions = {},
): Record<string, unknown> {
  return translate(name, options, false);
}

/** Like `toDesignDataName`, and also drops Studio-only fields that design-data has no counterpart for. Analysis only. */
export function toComparisonName(
  name: Name,
  options: CrosswalkOptions = {},
): Record<string, unknown> {
  return translate(name, options, true);
}

/**
 * The crosswalk's key renames and number conversions for this name, in the
 * reviewed-mapping `nameFields` shape (Studio key → design-data field). Lets
 * consumers that read untranslated names apply the same rules.
 */
export function crosswalkNameFields(
  name: Name,
  { tokenType, crosswalk = taxonomyCrosswalk }: CrosswalkOptions = {},
): Record<string, { reference: string; normalization?: "integer" }> {
  const rules = crosswalk.rules.filter((rule) => applies(rule, tokenType));
  const numeric = new Set(
    rules.flatMap((rule) =>
      rule.kind === "value-type" &&
      rule.designData.valueType === "number" &&
      rule.designData.field
        ? [rule.designData.field]
        : [],
    ),
  );
  return Object.fromEntries(
    Object.entries(name).flatMap(([key, value]) => {
      const rename = rules.find(
        (rule) =>
          rule.kind === "rename-key" &&
          rule.studio.key === key &&
          rule.designData.field &&
          !Object.hasOwn(name, rule.designData.field),
      );
      const reference = rename?.designData.field ?? key;
      const integer =
        numeric.has(reference) &&
        typeof value === "string" &&
        /^\d+$/.test(value);
      if (reference === key && !integer) return [];
      return [
        [
          key,
          { reference, ...(integer && { normalization: "integer" as const }) },
        ],
      ];
    }),
  );
}

export function designDataNameFields(
  flat: TaxonomyProjection["flat"],
  type: TokenPanelId,
): TaxonomyProjection["flat"] {
  return toDesignDataName(flat, {
    tokenType: type,
  }) as TaxonomyProjection["flat"];
}

/** Values the crosswalk fills in for `field` when a Studio token type omits it, e.g. `property` per foundation. */
export function crosswalkFieldDefaults(
  field: string,
  crosswalk = taxonomyCrosswalk,
): Partial<Record<TokenPanelId, string>> {
  return Object.fromEntries(
    crosswalk.rules.flatMap((rule) =>
      rule.kind === "add-field" &&
      rule.designData.field === field &&
      rule.designData.value !== undefined
        ? (rule.appliesTo.tokenTypes ?? []).map((type) => [
            type,
            rule.designData.value!,
          ])
        : [],
    ),
  );
}

export function crosswalkIssues(crosswalk: TaxonomyCrosswalk): string[] {
  const issues: string[] = [];
  if (crosswalk.schemaVersion !== 1)
    issues.push("Crosswalk schemaVersion must be 1.");
  if (!/^[0-9a-f]{40}$/.test(crosswalk.designDataRevision))
    issues.push("Crosswalk designDataRevision must be a 40-character commit.");
  const ids = new Set<string>();
  for (const rule of crosswalk.rules) {
    const label = rule.id || "(missing id)";
    if (!/^XW-\d{3}$/.test(rule.id))
      issues.push(`${label}: id must look like XW-001.`);
    if (ids.has(rule.id)) issues.push(`${label}: duplicate rule id.`);
    ids.add(rule.id);
    if (!kinds.has(rule.kind)) issues.push(`${label}: unknown kind.`);
    if (!["design-data", "studio", "decision"].includes(rule.retireBy))
      issues.push(
        `${label}: retireBy must be design-data, studio or decision.`,
      );
    if (!/^LTAX-\d{3}$/.test(rule.gapId))
      issues.push(`${label}: gapId must name a gap register entry.`);
    if (!rule.rfc) issues.push(`${label}: every rule needs an RFC.`);
    if (!rule.retireWhen) issues.push(`${label}: say when the rule retires.`);
    if (rule.kind !== "add-field" && !rule.studio.key)
      issues.push(`${label}: ${rule.kind} needs studio.key.`);
    if (
      ["add-field", "rename-key", "rename-term", "value-type"].includes(
        rule.kind,
      ) &&
      !rule.designData.field
    )
      issues.push(`${label}: ${rule.kind} needs designData.field.`);
    if (rule.kind === "add-field" && rule.designData.value === undefined)
      issues.push(`${label}: add-field needs designData.value.`);
    if (rule.kind === "value-type" && rule.designData.valueType !== "number")
      issues.push(`${label}: value-type only supports number.`);
    if (rule.kind === "rename-term") {
      const targets = Object.values(rule.studio.terms ?? {});
      if (!targets.length) issues.push(`${label}: rename-term needs terms.`);
      if (new Set(targets).size !== targets.length)
        issues.push(
          `${label}: two Studio terms translate to the same design-data value.`,
        );
    }
  }
  return issues;
}

export interface CrosswalkReference {
  /** Field names design-data currently publishes (`packages/design-data/fields`). */
  fields: ReadonlySet<string>;
  /** Term ids per design-data field, when known. */
  terms?: ReadonlyMap<string, ReadonlySet<string>>;
  /** RFC paths that exist. */
  rfcs?: ReadonlySet<string>;
}

export interface CrosswalkLifecycle {
  /** design-data already uses Studio's vocabulary for these rules. */
  readyToRetire: string[];
  /** Rules whose RFC document is missing. */
  missingRfc: string[];
}

/** Which rules design-data has made unnecessary, so the crosswalk only shrinks. */
export function crosswalkLifecycle(
  crosswalk: TaxonomyCrosswalk,
  reference: CrosswalkReference,
): CrosswalkLifecycle {
  const readyToRetire = crosswalk.rules
    .filter((rule) => {
      const key = rule.studio.key;
      if (rule.kind === "rename-key" || rule.kind === "drop-field")
        return !!key && reference.fields.has(key);
      if (rule.kind === "rename-term") {
        const known = reference.terms?.get(rule.designData.field ?? "");
        return (
          !!known &&
          Object.keys(rule.studio.terms ?? {}).every((term) => known.has(term))
        );
      }
      return false;
    })
    .map((rule) => rule.id);
  const rfcs = reference.rfcs;
  const missingRfc = rfcs
    ? crosswalk.rules
        .filter((rule) => !rfcs.has(rule.rfc))
        .map((rule) => rule.id)
    : [];
  return { readyToRetire, missingRfc };
}

const code = (value: string) => `\`${value}\``;

function studioSide(rule: CrosswalkRule): string {
  const { key = "", value, terms, tiers } = rule.studio;
  switch (rule.kind) {
    case "add-field":
      return `no ${code(rule.designData.field ?? "")} field`;
    case "rename-term":
      return `${code(key)} terms ${Object.keys(terms ?? {})
        .map(code)
        .join(", ")}`;
    case "value-type":
      return `${code(key)} stored as text`;
    case "mode-default":
      return `explicit ${code(`${key}: ${value}`)} rows`;
    case "tier":
      return `${code(key)} allowed on ${(tiers ?? []).join(" and ")} tokens`;
    default:
      return `${code(key)} field`;
  }
}

function designDataSide(rule: CrosswalkRule): string {
  const { field = "", value, valueType } = rule.designData;
  switch (rule.kind) {
    case "add-field":
      return `requires ${code(`${field}: ${value}`)}`;
    case "rename-term":
      return `${code(field)} terms ${Object.values(rule.studio.terms ?? {})
        .map(code)
        .join(", ")}`;
    case "value-type":
      return `${code(field)} is a ${valueType}`;
    case "drop-field":
      return "has no matching field";
    case "mode-default":
      return `omits ${code(field)} on default rows`;
    case "tier":
      return `${code(field)} has no tier metadata`;
    default:
      return `${code(field)} field`;
  }
}

const handoffSections: [CrosswalkRetiredBy, string, string][] = [
  [
    "design-data",
    "design-data changes",
    "An agent may apply these on a separate design-data branch by following the RFC's agent brief.",
  ],
  ["studio", "Studio changes", "Fixed in Studio; design-data stays as it is."],
  [
    "decision",
    "Needs a decision",
    "Review the RFC options with design-data maintainers before anyone changes either project.",
  ],
];

/** Markdown handoff for agents updating design-data; generated so it never drifts from the rules. */
export function crosswalkHandoff(crosswalk = taxonomyCrosswalk): string {
  const lines = [
    "<!-- Copyright 2026 Adobe. All rights reserved. -->",
    "<!-- Generated from src/data/taxonomy-crosswalk.json by `pnpm crosswalk:handoff`. Do not edit by hand. -->",
    "",
    "# design-data handoff",
    "",
    "Studio translates its Registry vocabulary into design-data names with the",
    "rules in `src/data/taxonomy-crosswalk.json`. Each rule below says which",
    "project's change retires it. When every rule is retired, Studio no longer",
    "needs a crosswalk.",
    "",
    `Pinned design-data revision: ${code(crosswalk.designDataRevision)}.`,
  ];
  for (const [owner, title, intro] of handoffSections) {
    const rules = crosswalk.rules.filter((rule) => rule.retireBy === owner);
    lines.push("", `## ${title}`, "", intro);
    if (!rules.length) lines.push("", "None.");
    for (const rule of rules) {
      const types = rule.appliesTo.tokenTypes;
      lines.push(
        "",
        `### ${rule.id}: ${rule.kind}${types ? ` (${types.join(", ")})` : ""}`,
        "",
        `- Studio: ${studioSide(rule)}.`,
        `- design-data: ${designDataSide(rule)}.`,
        `- Retire when: ${rule.retireWhen}`,
        `- RFC: [${rule.rfc.replace(/^docs\/rfcs\//, "")}](${rule.rfc.replace(/^docs\/rfcs\//, "")}), gap ${rule.gapId}.`,
      );
    }
  }
  lines.push(
    "",
    "## After a change merges",
    "",
    "1. Update `designDataRevision` in `src/data/taxonomy-crosswalk.json`.",
    "2. Delete the retired rule, then run `pnpm --dir docs/spectrum-studio check:focused --only taxonomy-crosswalk`.",
    "3. Regenerate this page with `pnpm --dir docs/spectrum-studio crosswalk:handoff`.",
    "",
  );
  return lines.join("\n");
}
