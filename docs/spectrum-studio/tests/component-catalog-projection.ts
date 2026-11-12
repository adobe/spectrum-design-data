// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { componentTokenCatalog } from "../src/features/components/references";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";

for (const withAuthoring of [false, true]) {
  const source = createDefaultSnapshot();
  if (!withAuthoring) source.browserTokenEdits = {};
  const recipes = source.styles!.recipes;
  const recipe = recipes[0];
  const appearance = recipe.appearance;
  let appearanceReads = 0;
  Object.defineProperty(recipe, "appearance", {
    enumerable: true,
    get() {
      appearanceReads++;
      return appearance;
    },
  });
  const variants = buildTshirtArtifacts(source);
  const full = canonicalAliasRows(
    completeAliasSource(source),
    variants,
    "preserve-for-review",
  );
  const expectedReads = appearanceReads;
  assert.ok(expectedReads > 0);
  const expectedStyles = full.filter((row) => row.token.style);
  assert.ok(expectedStyles.length > 0);
  appearanceReads = 0;
  const catalog = componentTokenCatalog(source);
  assert.equal(
    appearanceReads,
    expectedReads,
    "A complete catalog projects each Style once, even with authored identities.",
  );
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  const actualStyles = catalog.filter((token) => recipeIds.has(token.ownerId));
  assert.equal(actualStyles.length, expectedStyles.length);
  for (const row of expectedStyles) {
    const token = actualStyles.find((token) => token.id === row.rowId);
    assert.ok(token);
    assert.equal(token.name, row.name);
    assert.deepEqual(token.context, row.token.style!.context);
    assert.deepEqual(
      token.value,
      row.token.unit === "px" && typeof row.token.value === "number"
        ? `${row.token.value}px`
        : row.token.value,
    );
  }
}
console.log(
  "Component catalog: one Style projection and exact complete canonical Style rows, with and without authored identities, passed.",
);
