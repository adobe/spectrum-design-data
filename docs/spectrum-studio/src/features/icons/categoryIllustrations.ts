// Copyright 2026 Adobe. All rights reserved.
import {
  categoryIconConfiguration,
  resolveCategoryIcon,
} from "./categoryIcons";

const illustrationByIconName = {
  Filters: "Filters",
} as const;

export function resolveCategoryIllustration(category: string) {
  const { iconName, issue } = resolveCategoryIcon(
    category,
    categoryIconConfiguration,
  );
  return issue
    ? undefined
    : illustrationByIconName[iconName as keyof typeof illustrationByIconName];
}
