// Copyright 2026 Adobe. All rights reserved.
import { EMPTY_STYLES } from "../styles/model";
import { withStylesVocabulary } from "../styles/vocabulary";
import { isTaxonomyDocument } from "../taxonomy/model";

export function upgradeStylesSnapshot<T>(source: T): T {
  if (!source || typeof source !== "object") return source;
  return {
    ...source,
    ...(!("styles" in source) && { styles: structuredClone(EMPTY_STYLES) }),
    ...("taxonomy" in source &&
      isTaxonomyDocument(source.taxonomy) && {
        taxonomy: withStylesVocabulary(source.taxonomy),
      }),
  };
}
