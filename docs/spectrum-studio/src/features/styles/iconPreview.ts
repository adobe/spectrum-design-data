// Copyright 2026 Adobe. All rights reserved.
import { UI_GLYPHS } from "../structures/elements";
import { ORDERED_CATEGORY_IDS } from "../taxonomy/orderedVocabulary";
import { PREVIEW_TERM_IDS } from "../tokens/valuePreview";
import {
  isSpectrumIconName,
  type SpectrumIconName,
} from "../icons/spectrumIconNames.generated";
import type { StyleRecipe } from "./model";

export function styleIconChoices(recipe: StyleRecipe) {
  const category = ORDERED_CATEGORY_IDS.element;
  const element =
    recipe.classification[category] ??
    recipe.name.classification?.[category] ??
    (recipe.name.categoryId === category ? recipe.name.termId : undefined);
  return element === PREVIEW_TERM_IDS.uiIcon ? UI_GLYPHS : undefined;
}

export function styleSampleIcon(
  recipe: StyleRecipe,
  requested: unknown,
): SpectrumIconName {
  const allowed = styleIconChoices(recipe);
  return isSpectrumIconName(requested) &&
    (!allowed || allowed.some((name) => name === requested))
    ? requested
    : allowed
      ? "ChevronDown"
      : "Home";
}
