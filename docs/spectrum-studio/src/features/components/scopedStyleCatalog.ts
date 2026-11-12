// Copyright 2026 Adobe. All rights reserved.
import { canonicalJson } from "../design-data/canonicalJson";
import { buildTshirtArtifacts } from "../design-data/tshirtArtifacts";
import { styleContexts } from "../styles/artifacts";
import { buildStyleArtifacts } from "../styles/generation";
import {
  canonicalAliasRows,
  canonicalStyleAliasRows,
  completeAliasSource,
} from "../tokens/aliasTargets";
import { withTaxonomyProjection } from "../taxonomy/model";
import type { ComponentColorWitness } from "./colorWitness";
import {
  componentStyleToken,
  componentTokenCatalog,
  type ComponentToken,
  type ComponentTokenSource,
} from "./references";

function foundationInput(source: ComponentTokenSource) {
  return {
    ...completeAliasSource(source),
    styles: undefined,
    structures: source.structures,
  };
}
function identitiesOnly(source: ComponentTokenSource) {
  const edits = Object.values(source.browserTokenEdits ?? {});
  return (
    edits.some((edit) => edit.authoring?.identity) &&
    edits.every(
      (edit) =>
        Object.keys(edit).every(
          (key) => key === "values" || key === "authoring",
        ) &&
        !Object.keys(edit.values).length &&
        (!edit.authoring ||
          (Object.keys(edit.authoring).every(
            (key) => key === "identity" || key === "assignments",
          ) &&
            !Object.keys(edit.authoring.assignments).length)),
    )
  );
}
function metadata(token: ComponentToken) {
  return canonicalJson({ ...token, value: null, displayValue: "" });
}

/** Reuse only immutable store-owned foundations; public catalog calls stay cold. */
export function createScopedStyleCatalog() {
  let basis:
    | {
        input: ReturnType<typeof foundationInput>;
        styles: ComponentTokenSource["styles"];
        tokens: ComponentToken[];
        rows: ReturnType<typeof canonicalAliasRows>;
        foundationIds: Set<string>;
        contexts: ReturnType<typeof styleContexts>;
      }
    | undefined;
  return (
    current: ComponentTokenSource,
    candidate: ComponentTokenSource,
    colorWitness: ComponentColorWitness | null = null,
  ): ComponentToken[] => {
    const input = foundationInput(candidate);
    const accepted = foundationInput(current);
    const sameInput = (other: typeof input) =>
      (Object.keys(input) as (keyof typeof input)[]).every(
        (key) => input[key] === other[key],
      );
    if (
      !candidate.styles ||
      !current.styles ||
      !sameInput(accepted) ||
      candidate.styles.publications !== current.styles.publications ||
      !identitiesOnly(candidate)
    )
      return componentTokenCatalog(candidate, colorWitness);

    if (!basis || !sameInput(basis.input) || basis.styles !== current.styles) {
      const rows = canonicalAliasRows(
        completeAliasSource(current),
        buildTshirtArtifacts(current),
        "preserve-for-review",
        { excludeStyles: true },
      );
      basis = {
        input,
        styles: current.styles,
        tokens: componentTokenCatalog(current, colorWitness),
        rows,
        foundationIds: new Set(rows.map((row) => row.rowId)),
        contexts: styleContexts(current),
      };
    }
    const prepared = basis;
    return withTaxonomyProjection(input.taxonomy, () => {
      const previousRecipes = current.styles!.recipes;
      const recipes = candidate.styles!.recipes;
      if (
        recipes.length !== previousRecipes.length ||
        recipes.some((recipe, index) => recipe.id !== previousRecipes[index].id)
      )
        return componentTokenCatalog(candidate, colorWitness);
      const changed = recipes.filter(
        (recipe, index) => recipe !== previousRecipes[index],
      );
      const owners = new Set(changed.map((recipe) => recipe.id));
      const output = buildStyleArtifacts(
        { ...candidate.styles!, recipes: changed },
        input.taxonomy,
        input.rules,
        input.modeSets,
        prepared.contexts,
      );
      if (output.issues.length)
        return componentTokenCatalog(candidate, colorWitness);
      const rows = canonicalStyleAliasRows(
        completeAliasSource(candidate),
        prepared.rows,
        output,
      );
      const replacements = new Map(
        rows.map((row) => [
          row.rowId,
          { ...componentStyleToken(row), outputError: undefined },
        ]),
      );
      const previous = prepared.tokens.filter(
        (token) => token.kind === "semantic" && owners.has(token.ownerId),
      );
      if (
        previous.length !== replacements.size ||
        rows.some((row) => prepared.foundationIds.has(row.rowId)) ||
        previous.some((token) => {
          const next = replacements.get(token.id);
          return !next || metadata(token) !== metadata(next);
        })
      )
        return componentTokenCatalog(candidate, colorWitness);
      const tokens = prepared.tokens.map(
        (token) => replacements.get(token.id) ?? token,
      );
      basis = { ...prepared, styles: candidate.styles, tokens };
      return tokens;
    });
  };
}
