// Copyright 2026 Adobe. All rights reserved.
import configuration from "../../data/category-icons.json";
import type { ChangeItem, ChangeTopic } from "../changelog/changes";
import type { TokenPanelId } from "../tokens/view/tokenPanelRegistry";
import type { ElementKind } from "../structures/elements";

type RequiredCategoryKey =
  | ChangeTopic
  | TokenPanelId
  | `source.${ChangeItem["sourceKind"]}`
  | `element.${ElementKind}`;
export const categoryIconCoverage = {
  ...configuration.categories,
  ...configuration.aliases,
} satisfies Record<RequiredCategoryKey, string>;
