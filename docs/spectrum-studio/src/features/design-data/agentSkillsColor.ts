// Copyright 2026 Adobe. All rights reserved.
import {
  contrastStepIndex,
  scaleContrasts,
} from "../color-system/contrastSteps";
import type { ColorScale } from "../color-system/model";
import { resolveColorDocument } from "../color-system/resolution";
import {
  conditionSources,
  conditionText,
  type ConditionSource,
} from "../logic/conditional";
import type { ConditionalRule, Rule, RuleConditionNode } from "../logic/model";
import type { Mode, ModeSet } from "../modes/model";
import { FOUNDATION_PARAMETERS } from "../modes/parameters";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";
import { projectClassification, type TaxonomyTerm } from "../taxonomy/model";
import { termLabel } from "../taxonomy/termPresentation";
import {
  authoredText,
  COLOR_SKILL_NAME,
  sentence,
  type SkillDiagnostic,
  type SkillSection,
  type SkillSource,
  type SkillSystem,
} from "./agentSkills";

interface ScaleStep {
  index: number;
  /** Authored target ratio against the primary background. */
  contrast: number;
  /** Lowest target ratio across every combination of color modes. */
  minimumContrast: number;
}

/** WCAG 2.2 success criteria 1.4.3 (text) and 1.4.11 (non-text) minimums. */
const TEXT_CONTRAST = 4.5;
const NON_TEXT_CONTRAST = 3;

/** Every combination of one mode from each color mode set. */
function colorModeCombinations(modeSets: readonly ModeSet[]): Mode[][] {
  return modeSets
    .filter((set) =>
      set.authoringCapabilities?.some((capability) =>
        capability.startsWith("color."),
      ),
    )
    .reduce<
      Mode[][]
    >((combinations, set) => combinations.flatMap((combination) => set.modes.map((mode) => [...combination, mode])), [[]]);
}

/** Named steps in scale order; undefined when the scale's naming cannot be resolved. */
function scaleSteps(
  system: SkillSystem,
  scale: ColorScale,
): ScaleStep[] | undefined {
  try {
    const resolved = colorModeCombinations(system.modeSets).map((modes) => {
      const document = resolveColorDocument(
        system.colorSystem,
        modes,
        undefined,
        {
          modeSets: [...system.modeSets],
        },
      );
      const resolvedScale =
        document.scales.find((item) => item.id === scale.id) ?? scale;
      return new Map(
        scaleContrasts(document, resolvedScale).map((step) => [
          step.id,
          step.value,
        ]),
      );
    });
    return scaleContrasts(system.colorSystem, scale).map((step, position) => ({
      index: contrastStepIndex(
        position,
        scale,
        system.rules,
        system.colorSystem.contrasts,
      ),
      contrast: step.value,
      minimumContrast: Math.min(
        step.value,
        ...resolved.map((values) => values.get(step.id) ?? step.value),
      ),
    }));
  } catch {
    return undefined;
  }
}

type ContrastUse = "text" | "non-text" | "decorative";
const USE_LABEL: Record<ContrastUse, string> = {
  text: "safe for text",
  "non-text": "for interface elements and graphics, not body text",
  decorative: "for decoration or exempt uses only",
};

function contrastUse(ratio: number): ContrastUse {
  if (ratio >= TEXT_CONTRAST) return "text";
  return ratio >= NON_TEXT_CONTRAST ? "non-text" : "decorative";
}

/** Rounded down so the skill never overstates contrast. */
const ratioText = (ratio: number) => `${Math.floor(ratio * 10) / 10}:1`;

interface ScaleContrast {
  name: string;
  steps: ScaleStep[];
}

/** One line per step index: the usual use across scales, then each exception. */
function stepGuide(scales: readonly ScaleContrast[]): string[] {
  const indices = [
    ...new Set(scales.flatMap((scale) => scale.steps.map((s) => s.index))),
  ].sort((left, right) => left - right);
  return indices.map((index) => {
    const entries = scales.flatMap((scale) => {
      const step = scale.steps.find((item) => item.index === index);
      return step
        ? [
            {
              name: scale.name,
              ratio: step.minimumContrast,
              use: contrastUse(step.minimumContrast),
            },
          ]
        : [];
    });
    const byUse = (use: ContrastUse) =>
      entries.filter((entry) => entry.use === use);
    const usual = (["text", "non-text", "decorative"] as const).reduce(
      (best, use) => (byUse(use).length > byUse(best).length ? use : best),
    );
    const lowest = (items: typeof entries) =>
      ratioText(Math.min(...items.map((item) => item.ratio)));
    const exceptions = entries.filter((entry) => entry.use !== usual);
    const usualNames = byUse(usual).map((entry) => entry.name);
    const except = exceptions.length
      ? ` except ${exceptions.map((entry) => entry.name).join(", ")}`
      : "";
    const scope =
      entries.length === scales.length
        ? `every scale${except}`
        : usualNames.length * 2 <= scales.length
          ? `${usualNames.join(", ")} ${usualNames.length === 1 ? "scale" : "scales"}`
          : `every scale with this step${except}`;
    const parts = [
      `**${index}** on ${scope}: ${USE_LABEL[usual]} (lowest ${lowest(byUse(usual))}).`,
      ...exceptions.map(
        (entry) =>
          `\`${entry.name}-${index}\`: ${USE_LABEL[entry.use]} (lowest ${ratioText(entry.ratio)}).`,
      ),
    ];
    return parts.join(" ");
  });
}

/** Lowest step from which every listed scale meets the use at every higher step. */
function threshold(scales: readonly ScaleContrast[], use: ContrastUse) {
  const meets = (step: ScaleStep) =>
    use === "text"
      ? step.minimumContrast >= TEXT_CONTRAST
      : step.minimumContrast >= NON_TEXT_CONTRAST;
  const indices = [
    ...new Set(scales.flatMap((scale) => scale.steps.map((s) => s.index))),
  ].sort((left, right) => right - left);
  let found: number | undefined;
  for (const index of indices) {
    const ok = scales.every((scale) =>
      scale.steps.every((step) => step.index < index || meets(step)),
    );
    if (!ok) break;
    found = index;
  }
  return found;
}

/** True when a higher step name always means more contrast. */
function contrastRisesWithStep(steps: readonly ScaleStep[]) {
  const sorted = [...steps].sort((left, right) => left.index - right.index);
  return sorted.every(
    (step, position) =>
      position === 0 || step.contrast > sorted[position - 1].contrast,
  );
}

function nodeText(
  node: RuleConditionNode,
  sources: readonly ConditionSource[],
  nested = false,
): string {
  if (node.kind === "condition") return conditionText(node, sources);
  const text = node.children
    .map((child) => nodeText(child, sources, true))
    .join(node.operator === "and" ? " and " : " or ");
  return nested && node.children.length > 1 ? `(${text})` : text;
}

function offsetText(offset: number) {
  if (offset === 0) return "uses the resting token";
  const steps = Math.abs(offset) === 1 ? "1 step" : `${Math.abs(offset)} steps`;
  return `moves ${steps} ${offset > 0 ? "higher" : "lower"} than the resting token, on the same scale`;
}

const termOrder = (terms: readonly TaxonomyTerm[]) =>
  new Map(terms.map((term, position) => [term.id, position]));

function colorStateRules(rules: readonly Rule[]): ConditionalRule[] {
  return rules
    .filter(
      (rule): rule is ConditionalRule =>
        rule.type === "conditional" &&
        !!rule.outputs?.length &&
        (rule.applicability?.kind !== "specific" ||
          rule.applicability.types.includes("color")),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function buildColorSkillSource(system: SkillSystem): SkillSource {
  const { taxonomy, colorSystem, styles, modeSets } = system;
  const diagnostics: SkillDiagnostic[] = [];
  const report = (subject: string, message: string, fix: string) =>
    diagnostics.push({ area: "color", subject, message, fix });
  const order = termOrder(taxonomy.terms);
  const category = (key: string) =>
    taxonomy.categories.find((item) => item.key === key);
  const propertyCategory = category("property");
  const indexCategory = category("scaleIndex");
  const colorTerm = taxonomy.terms.find(
    (term) =>
      term.categoryId === propertyCategory?.id && term.value === "color",
  );
  const roles = styles.colorRoles
    .map((role) => ({
      role,
      term: taxonomy.terms.find((term) => term.id === role.roleTermId),
    }))
    .sort(
      (left, right) =>
        (order.get(left.role.roleTermId) ?? Infinity) -
          (order.get(right.role.roleTermId) ?? Infinity) ||
        left.role.id.localeCompare(right.role.id),
    );

  const roleCategory = roles.find((entry) => entry.term)?.term?.categoryId;
  const roleCategoryRecord = taxonomy.categories.find(
    (item) => item.id === roleCategory,
  );
  const roleBullets: string[] = [];
  const unorderedScales = new Set<string>();
  let contrastOrdered = roles.length > 0;
  for (const { role, term } of roles) {
    if (!term) {
      report(
        "Color role",
        "A color role points to a Registry term that no longer exists, so it was left out.",
        "In Styles, choose a registered role term for this color role.",
      );
      continue;
    }
    const label = termLabel(term.value);
    const subject = `Color role “${label}”`;
    const scale = colorSystem.scales.find((item) => item.id === role.scaleId);
    if (!scale) {
      report(
        subject,
        "Its assigned color scale is missing, so it was left out.",
        "In Styles, assign a color scale to this role.",
      );
      continue;
    }
    const steps = scaleSteps(system, scale);
    if (!steps?.length) {
      report(
        subject,
        `The ${scale.name} scale has no named steps, so it was left out.`,
        "In Color, check the scale's contrast steps and naming rule.",
      );
      continue;
    }
    if (!contrastRisesWithStep(steps) && !unorderedScales.has(scale.id)) {
      unorderedScales.add(scale.id);
      contrastOrdered = false;
      report(
        `${scale.name} scale`,
        "A higher step does not always mean more contrast, so the skill can't promise how steps compare.",
        "In Color, order the scale's contrast steps from least to most contrast.",
      );
    }
    const description = authoredText(term.description);
    if (!description)
      report(
        subject,
        "It has no description, so agents can't tell when to use it.",
        `In Registry, add a description to the “${label}” term in ${roleCategoryRecord?.name ?? "its category"}.`,
      );
    const parts = [`**${label}**:`];
    if (description) parts.push(sentence(description));
    parts.push(
      `Uses the ${scale.name} scale, steps ${steps.map((step) => step.index).join(", ")}.`,
    );
    const pattern = rolePattern(steps[0].index, term);
    if (pattern) parts.push(`Token names follow \`${pattern}\`.`);
    roleBullets.push(parts.join(" "));
  }

  function rolePattern(index: number, term: TaxonomyTerm) {
    const label = termLabel(term.value);
    const indexTerm = taxonomy.terms.find(
      (item) => item.categoryId === indexCategory?.id && item.value === index,
    );
    if (!propertyCategory || !colorTerm || !indexCategory || !indexTerm) {
      report(
        `Color role “${label}”`,
        "Its token names can't be described because the Property (color) or Scale index terms are missing.",
        "In Registry, add the missing Property or Scale index terms.",
      );
      return undefined;
    }
    const projection = projectClassification(
      taxonomy,
      {
        [term.categoryId]: term.id,
        [propertyCategory.id]: colorTerm.id,
        [indexCategory.id]: indexTerm.id,
      },
      "styles",
      "semantic",
    );
    const { formatValue, separator } = kebabCaseNameFormatter;
    const pattern = projection.segments
      .map((segment) =>
        segment.categoryId === indexCategory.id
          ? "{step}"
          : segment.values.map(formatValue).join(separator),
      )
      .join(separator);
    if (
      projection.issues.length ||
      !pattern.includes("{step}") ||
      pattern.replace("{step}", formatValue(index)) !== projection.name
    ) {
      report(
        `Color role “${label}”`,
        "Its token names don't follow a single pattern, so no pattern is given.",
        "In Registry, review the naming order for color role tokens.",
      );
      return undefined;
    }
    return pattern;
  }

  const sources = conditionSources(taxonomy, modeSets);
  const stateSections: string[] = [];
  for (const rule of colorStateRules(system.rules)) {
    const description = authoredText(rule.description);
    if (!description)
      report(
        `Rule “${rule.name}”`,
        "It has no description, so agents can't tell what it is for.",
        "In Rules, add a description to this rule.",
      );
    const states = rule.outputs!.flatMap((output) =>
      Object.values(output.classification).flatMap((value) =>
        (Array.isArray(value) ? value : [value]).flatMap((termId) => {
          const term = taxonomy.terms.find((item) => item.id === termId);
          return term ? [term] : [];
        }),
      ),
    );
    states.sort(
      (left, right) =>
        (order.get(left.id) ?? Infinity) - (order.get(right.id) ?? Infinity),
    );
    for (const state of states)
      if (!authoredText(state.description))
        report(
          `State “${termLabel(state.value)}”`,
          "It has no description, so agents can't tell when the state applies.",
          `In Registry, add a description to the “${termLabel(state.value)}” term.`,
        );
    const bullets = [
      `Applies when ${nodeText(rule.when, sources)}.`,
      `Creates state tokens for: ${states.map((state) => termLabel(state.value)).join(", ")}.`,
      ...rule.branches.map(
        (branch) =>
          `When ${nodeText(branch.when, sources)}, the state token ${offsetText(branch.then.offset)}.`,
      ),
      `${rule.branches.length ? "Otherwise" : "In every mode"}, the state token ${offsetText(rule.otherwise.offset)}.`,
    ];
    stateSections.push(
      [
        `**${rule.name}**${description ? `: ${sentence(description)}` : ""}`,
        ...bullets.map((bullet) => `  - ${bullet}`),
      ].join("\n"),
    );
  }

  const colorSets = modeSets.filter((set) =>
    set.authoringCapabilities?.some((capability) =>
      capability.startsWith("color."),
    ),
  );
  const modeBullets = colorSets.map((set) => {
    const description = authoredText(set.description);
    if (!description)
      report(
        `Mode set “${set.name}”`,
        "It has no description, so agents can't tell what it changes.",
        "In Modes, add a description to this mode set.",
      );
    const modes = set.modes
      .map((mode) =>
        mode.id === set.defaultModeId ? `${mode.name} (default)` : mode.name,
      )
      .join(", ");
    return `**${set.name}**:${description ? ` ${sentence(description)}` : ""} Options: ${modes}.`;
  });
  const adaptive = FOUNDATION_PARAMETERS.filter(
    (parameter) => parameter.foundation === "color",
  ).flatMap((parameter) => {
    const set = modeSets.find(
      (item) => item.id === system.adaptiveClaims[parameter.id],
    );
    return set
      ? [`${parameter.label} adapts to the user's ${set.name} setting.`]
      : [];
  });

  const hasRoles = roleBullets.length > 0;
  const hasStates = stateSections.length > 0;
  const hasModes = modeBullets.length > 0;
  const sections: SkillSection[] = [
    {
      heading: "Purpose",
      paragraphs: [
        "Use this skill when choosing a color for any interface element. It explains what each color role means, how its steps compare, and how states and modes change the result.",
      ],
    },
  ];
  if (hasRoles)
    sections.push({
      heading: "How color steps work",
      paragraphs: [
        "Each color role uses one color scale. Its tokens are numbered steps on that scale.",
        ...(contrastOrdered
          ? [
              "A higher step means more contrast against the background. Use lower steps for quiet fills and higher steps for text, icons and borders that must stand out.",
            ]
          : []),
        "Step numbers are names, not measurements. Don't calculate with them or create steps that aren't listed.",
      ],
    });
  if (hasRoles) {
    const scaleContrasts = colorSystem.scales
      .filter((scale) => !scale.lifecycle?.deprecated)
      .flatMap((scale) => {
        const steps = scaleSteps(system, scale);
        return steps?.length ? [{ name: scale.name, steps }] : [];
      })
      .sort((left, right) => left.name.localeCompare(right.name));
    const textFrom = threshold(scaleContrasts, "text");
    const nonTextFrom = threshold(scaleContrasts, "non-text");
    sections.push({
      heading: "Contrast and use",
      paragraphs: [
        "Each step has a minimum contrast ratio against the primary background, and that ratio decides what the step can be used for. The ratios in Contrast by step are the lowest in any color scheme or contrast setting, so the guidance holds in every mode. Exported colors always meet these minimums.",
      ],
      bullets: [
        `**${TEXT_CONTRAST}:1 or more**: safe for text, including body text, and everything else. WCAG 2.2 success criterion 1.4.3 Contrast (Minimum), level AA (https://www.w3.org/TR/WCAG22/#contrast-minimum).`,
        `**${NON_TEXT_CONTRAST}:1 to under ${TEXT_CONTRAST}:1**: for interface elements and meaningful graphics, such as icons, input and button borders, focus indicators and chart marks. WCAG 2.2 success criterion 1.4.11 Non-text Contrast, level AA (https://www.w3.org/TR/WCAG22/#non-text-contrast). Also enough for large text (at least 18 point, or 14 point bold), but not body text.`,
        `**Under ${NON_TEXT_CONTRAST}:1**: only for decoration, or uses WCAG exempts: disabled elements, decorative graphics, logos, and fills where a border or text carries the meaning.`,
        "This guidance assumes the element sits on the primary background. On another surface or color the ratio changes, so check it before relying on it.",
      ],
    });
    sections.push({
      heading: "Contrast by step",
      paragraphs: [
        [
          textFrom !== undefined &&
            `Step ${textFrom} and higher is safe for text on every scale.`,
          nonTextFrom !== undefined &&
            `Step ${nonTextFrom} and higher is safe for interface elements and graphics on every scale.`,
          "Exceptions are listed by scale token name. To check a role's step, find the role's scale in Color roles, then look up the step here, but still use the role token in designs.",
        ]
          .filter(Boolean)
          .join(" "),
      ],
      bullets: stepGuide(scaleContrasts),
    });
  }
  sections.push({
    heading: "Choosing a color",
    steps: [
      "Decide what the element means, then pick the matching role from Color roles. Don't pick a role for how it looks.",
      contrastOrdered
        ? "Pick a step by how much the element should stand out from its background, then confirm it in Contrast by step: text needs a step that is safe for text on that scale, and interface elements and meaningful graphics need at least a step for interface elements."
        : "Pick one of the role's listed steps, then confirm it in Contrast by step: text needs a step that is safe for text on that scale, and interface elements and meaningful graphics need at least a step for interface elements.",
      ...(hasStates
        ? [
            "If the element has a hover or focus state, use the state token described in Interaction states instead of choosing a different step.",
          ]
        : []),
      ...(hasModes
        ? [
            "Use the same token in every mode. Modes and user settings change the resolved color.",
          ]
        : []),
      "Look up the token's value with the design-data service only when you need the value itself.",
    ],
  });
  if (hasRoles)
    sections.push({
      heading: "Color roles",
      paragraphs: authoredText(roleCategoryRecord?.description)
        ? [sentence(authoredText(roleCategoryRecord?.description))]
        : [],
      bullets: roleBullets,
    });
  if (roleCategoryRecord && !authoredText(roleCategoryRecord.description))
    report(
      `Registry category “${roleCategoryRecord.name}”`,
      "It has no description, so agents get no overview of the roles.",
      `In Registry, add a description to the ${roleCategoryRecord.name} category.`,
    );
  if (hasStates)
    sections.push({
      heading: "Interaction states",
      paragraphs: [
        "These rules create state tokens from the resting token. Use the generated state token; don't shift steps yourself.",
      ],
      bullets: stateSections,
    });
  if (hasModes || adaptive.length)
    sections.push({
      heading: "Modes and user settings",
      paragraphs: [
        "Modes change resolved colors without changing token names. Design once with tokens and let each mode resolve them.",
      ],
      bullets: [...modeBullets, ...adaptive],
    });
  sections.push({
    heading: "Don't",
    bullets: [
      "Don't choose a color by its look. Choose the role that matches the meaning.",
      "Don't invent roles, steps or token names that aren't listed here or returned by the design-data service.",
      ...(hasRoles
        ? [
            "Don't use a step for text, icons or borders unless Contrast by step allows it on that scale.",
          ]
        : []),
      ...(hasStates
        ? [
            "Don't make hover or focus colors by moving steps. Use the state tokens.",
          ]
        : []),
      ...(hasModes
        ? ["Don't switch tokens for each mode. Let modes resolve them."]
        : []),
      "Don't copy color values into designs. Always reference the token.",
    ],
  });
  sections.push({
    heading: "Looking up values",
    paragraphs: [
      "This skill has no color values on purpose. When you need one, ask the design-data service for the token by name, along with the modes you're designing for.",
    ],
  });

  return {
    area: "color",
    name: COLOR_SKILL_NAME,
    title: "Spectrum color",
    description:
      "Choose Spectrum color tokens by meaning: color roles, contrast steps, interaction states and modes. Use when picking a color for any interface element.",
    sections,
    diagnostics,
  };
}
