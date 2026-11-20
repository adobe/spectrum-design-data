// Copyright 2026 Adobe. All rights reserved.
import type { ColorSystemDocument } from "../color-system/model";
import type { Rule } from "../logic/model";
import type { AdaptiveClaims, ModeSet } from "../modes/model";
import type { StylesDocument } from "../styles/model";
import type { TaxonomyDocument } from "../taxonomy/model";
import { hash32 } from "../tokens/model";
import { canonicalJson } from "./canonicalJson";

/** Bump when templates change so downloaded skills show they are out of date. */
export const SKILLS_GENERATOR_VERSION = 1;
export const INDEX_SKILL_NAME = "spectrum-design-system";
export const COLOR_SKILL_NAME = "spectrum-color";

export type SkillAreaId = "index" | "color";

/** The saved authored documents skills read. Skills never write to them. */
export interface SkillSystem {
  taxonomy: TaxonomyDocument;
  colorSystem: ColorSystemDocument;
  styles: StylesDocument;
  rules: readonly Rule[];
  modeSets: readonly ModeSet[];
  adaptiveClaims: AdaptiveClaims;
}

/** Missing or unusable intent, reported in Studio instead of invented text. */
export interface SkillDiagnostic {
  area: SkillAreaId;
  /** What is affected, in designer language (for example "Color role positive"). */
  subject: string;
  message: string;
  fix: string;
}

export interface SkillSection {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  /** Numbered steps, for decision procedures. */
  steps?: readonly string[];
}

/** Everything a skill says, before it becomes Markdown. */
export interface SkillSource {
  area: SkillAreaId;
  name: string;
  title: string;
  description: string;
  sections: readonly SkillSection[];
  diagnostics: readonly SkillDiagnostic[];
}

export interface GeneratedSkill {
  area: SkillAreaId;
  name: string;
  title: string;
  description: string;
  /** Path inside the download, `<name>/SKILL.md`. */
  path: string;
  markdown: string;
  fingerprint: string;
  diagnostics: readonly SkillDiagnostic[];
}

const PLACEHOLDER_TEXT = /needs addressed/i;

/** Authored text, or "" when it is empty or a known placeholder. */
export function authoredText(value: string | undefined): string {
  const text = value?.trim() ?? "";
  return PLACEHOLDER_TEXT.test(text) ? "" : text;
}

/** Ends authored text with a full stop so it reads as a sentence. */
export function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** Stable across key order; diagnostics are excluded because they are not skill text. */
export function skillFingerprint(source: SkillSource): string {
  const input = canonicalJson({
    version: SKILLS_GENERATOR_VERSION,
    name: source.name,
    title: source.title,
    description: source.description,
    sections: source.sections,
  });
  return [hash32(input, 0x811c9dc5), hash32(input, 0x9747b28c)]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

function renderSection(section: SkillSection): string {
  const blocks = [`## ${section.heading}`];
  for (const paragraph of section.paragraphs ?? []) blocks.push(paragraph);
  if (section.steps?.length)
    blocks.push(
      section.steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    );
  if (section.bullets?.length)
    blocks.push(section.bullets.map((bullet) => `- ${bullet}`).join("\n"));
  return blocks.join("\n\n");
}

/** Renders a skill with no dates or machine paths, so equal sources give equal files. */
export function renderSkill(source: SkillSource): GeneratedSkill {
  const fingerprint = skillFingerprint(source);
  const frontmatter = [
    "---",
    `name: ${source.name}`,
    `description: ${JSON.stringify(source.description)}`,
    "metadata:",
    "  generator: spectrum-studio",
    `  generator-version: "${SKILLS_GENERATOR_VERSION}"`,
    `  fingerprint: ${fingerprint}`,
    "---",
  ].join("\n");
  const markdown = `${[
    frontmatter,
    `# ${source.title}`,
    ...source.sections.map(renderSection),
  ].join("\n\n")}\n`;
  return {
    area: source.area,
    name: source.name,
    title: source.title,
    description: source.description,
    path: `${source.name}/SKILL.md`,
    markdown,
    fingerprint,
    diagnostics: source.diagnostics,
  };
}

/** The entry skill: where to start and the rules every area shares. */
export function buildIndexSkillSource(
  areas: readonly SkillSource[],
): SkillSource {
  return {
    area: "index",
    name: INDEX_SKILL_NAME,
    title: "Spectrum design system",
    description:
      "Start here when designing with Spectrum design tokens. Lists the Spectrum design skills and the rules that apply to all of them.",
    sections: [
      {
        heading: "Purpose",
        paragraphs: [
          "Spectrum design tokens describe intent: what an element means and how it should behave. Use these skills to choose tokens by that intent. They explain how to use the system, not how it is built.",
        ],
      },
      {
        heading: "Skills",
        bullets: areas.map(
          (area) =>
            `[${area.name}](../${area.name}/SKILL.md): ${area.description}`,
        ),
      },
      {
        heading: "Rules for every skill",
        bullets: [
          "Choose by meaning, not by look. Pick the role or purpose that matches the element, then the token that belongs to it.",
          "Only use names listed in these skills or returned by the design-data service. Never invent roles, steps or token names.",
          "Use the same token in every mode. Modes and user settings change the resolved value, not the token you choose.",
          "These skills contain no values on purpose. Look up a value only when you need the value itself.",
        ],
      },
    ],
    diagnostics: [],
  };
}
