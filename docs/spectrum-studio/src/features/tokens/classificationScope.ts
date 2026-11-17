// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyScope } from "../taxonomy/model";
import type { BrowserTokenSource } from "./browserModel";

/**
 * Registry context used to classify a token. Tokens are classified by their
 * token type at every tier. Styles and Structure-generated tokens keep their
 * generators' naming contexts, which are not token types.
 */
export function tokenClassificationScope(
  token: Pick<
    BrowserTokenSource,
    "type" | "style" | "semantic" | "classificationScope"
  >,
): TaxonomyScope {
  if (token.style || token.classificationScope === "styles") return "styles";
  if (token.semantic) return "structures";
  return token.type;
}

/**
 * The source token as its new alias will be saved: same token type and tier,
 * keeping only the Styles naming context. Structure contexts belong to the
 * generator, so aliases are classified by their token type.
 */
export function aliasSourceToken<
  T extends Pick<
    BrowserTokenSource,
    "type" | "style" | "semantic" | "classificationScope"
  >,
>(token: T): T {
  return { ...token, style: undefined, semantic: undefined };
}
