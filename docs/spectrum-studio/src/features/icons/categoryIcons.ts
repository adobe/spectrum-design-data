// Copyright 2026 Adobe. All rights reserved.
import configuration from "../../data/category-icons.json" with { type: "json" };
import {
  isSpectrumIconName as isIconName,
  type SpectrumIconName,
} from "./spectrumIconNames.generated";

export interface CategoryIconConfiguration {
  fallbackIcon: string;
  categories: Readonly<Record<string, string>>;
  aliases: Readonly<Record<string, string>>;
}
export type CategoryIconKey =
  | keyof typeof configuration.categories
  | keyof typeof configuration.aliases;
export const categoryIconConfiguration: CategoryIconConfiguration =
  configuration;
export const registeredCategoryKeys = Object.keys({
  ...configuration.categories,
  ...configuration.aliases,
});
const normalize = (key: string) => key.trim().toLowerCase();

function matchingKeys(values: Readonly<Record<string, string>>, key: string) {
  return Object.keys(values).filter(
    (candidate) => normalize(candidate) === normalize(key),
  );
}

export function validateCategoryIcons(
  config: CategoryIconConfiguration,
): string[] {
  const issues: string[] = [];
  if (config.fallbackIcon !== "Circle")
    issues.push(`Fallback icon must be Circle, not "${config.fallbackIcon}".`);
  const seen = new Set<string>();
  for (const [key, name] of Object.entries(config.categories)) {
    if (!normalize(key) || seen.has(normalize(key)))
      issues.push(`Duplicate or empty category key: ${key}.`);
    seen.add(normalize(key));
    if (!isIconName(name))
      issues.push(`Unsupported icon "${name}" for category "${key}".`);
  }
  for (const [alias, target] of Object.entries(config.aliases)) {
    if (!normalize(alias) || seen.has(normalize(alias)))
      issues.push(`Duplicate or empty category alias: ${alias}.`);
    seen.add(normalize(alias));
    if (matchingKeys(config.categories, target).length !== 1)
      issues.push(
        `Alias "${alias}" must target one canonical category, not "${target}".`,
      );
  }
  return issues;
}

export function resolveCategoryIcon(
  category: string,
  config: CategoryIconConfiguration = categoryIconConfiguration,
): {
  iconName: SpectrumIconName;
  issue?: string;
} {
  const fail = (reason: string) => ({
    iconName: "Circle" as const,
    issue: `Category icon configuration: ${reason}`,
  });
  const keys = matchingKeys(config.categories, category);
  const aliases = matchingKeys(config.aliases, category);
  if (keys.length + aliases.length > 1)
    return fail(`ambiguous association for "${category}".`);
  let key = keys[0];
  if (aliases.length) {
    const target = config.aliases[aliases[0]];
    const targets = matchingKeys(config.categories, target);
    if (targets.length !== 1)
      return fail(`alias "${category}" has invalid target "${target}".`);
    key = targets[0];
  }
  if (!key) return fail(`missing association for "${category}".`);
  const name = config.categories[key];
  if (!isIconName(name))
    return fail(`unsupported icon "${name}" for "${category}".`);
  if (config.fallbackIcon !== "Circle")
    return fail(`fallback icon must be Circle, not "${config.fallbackIcon}".`);
  return { iconName: name };
}

export function createCategoryIconReporter(report: (message: string) => void) {
  const reported = new Set<string>();
  return (message: string) => {
    if (!reported.has(message)) {
      reported.add(message);
      report(message);
    }
  };
}
