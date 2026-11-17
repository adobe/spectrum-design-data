// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import type {
  TaxonomyCategory,
  TaxonomyDocument,
} from "../src/features/taxonomy/model";
import {
  applicableCategories,
  assignTerm,
  rankTermMatches,
} from "../src/features/taxonomy/termMenu";
import {
  aliasSourceToken,
  tokenClassificationScope,
} from "../src/features/tokens/classificationScope";

const category = (
  id: string,
  name: string,
  overrides: Partial<TaxonomyCategory> = {},
): TaxonomyCategory => ({
  id,
  key: id,
  name,
  description: "",
  valueType: "string",
  cardinality: "one",
  scopes: ["colors", "spacing"],
  required: false,
  includeInProjections: true,
  ...overrides,
});

const taxonomy: TaxonomyDocument = {
  schemaVersion: 1,
  order: ["role", "family", "size", "empty", "primitive"],
  classifications: {},
  categories: [
    category("family", "Color family", {
      scopes: ["colors"],
      description: "Hue group such as blue or red",
    }),
    category("role", "Color role", { description: "Intent of the color" }),
    category("size", "Size", { cardinality: "ordered" }),
    category("empty", "Variant"),
    category("primitive", "Scale", { allowedTokenTiers: ["primitive"] }),
  ],
  terms: [
    { id: "accent", categoryId: "role", value: "accent", description: "" },
    {
      id: "neutral",
      categoryId: "role",
      value: "neutral",
      description: "Grays used for blue-free surfaces",
    },
    { id: "blue", categoryId: "family", value: "blue", description: "" },
    {
      id: "light-blue",
      categoryId: "family",
      value: "light-blue",
      description: "",
    },
    { id: "bluish", categoryId: "family", value: "bluish", description: "" },
    { id: "small", categoryId: "size", value: "small", description: "" },
    { id: "large", categoryId: "size", value: "large", description: "" },
  ],
};

{
  const ids = (scope: "colors" | "spacing", tier?: "semantic") =>
    applicableCategories(taxonomy, scope, tier, {}).map((item) => item.id);
  assert.deepEqual(ids("colors", "semantic"), [
    "role",
    "family",
    "size",
    "empty",
  ]);
  assert.deepEqual(ids("spacing", "semantic"), ["role", "size", "empty"]);
  assert.ok(ids("spacing").includes("primitive"));
  assert.ok(
    ids("colors").includes("empty"),
    "categories without terms stay listed",
  );
}

{
  const ids = applicableCategories(taxonomy, "colors", "semantic", {
    role: "accent",
    size: ["small"],
    empty: [],
  }).map((item) => item.id);
  assert.deepEqual(ids, ["family", "empty"], "assigned categories are hidden");
}

{
  const categories = applicableCategories(taxonomy, "colors", undefined, {});
  const rank = (query: string) =>
    rankTermMatches(query, categories, taxonomy.terms).map(
      (match) => match.term.id,
    );
  assert.deepEqual(rank("  "), []);
  assert.deepEqual(rank("blue"), ["blue", "light-blue", "neutral", "bluish"]);
  assert.deepEqual(rank("BLU"), ["blue", "bluish", "light-blue", "neutral"]);
  assert.deepEqual(rank("light blue"), ["light-blue"]);
  assert.deepEqual(
    rank("role"),
    ["accent", "neutral"],
    "category names match their terms",
  );
  assert.deepEqual(
    rank("hue"),
    ["blue", "light-blue", "bluish"],
    "category descriptions match their terms",
  );
  assert.deepEqual(rank("intent accent"), ["accent"]);
  assert.deepEqual(rank("zzz"), []);
}

{
  const size = taxonomy.categories.find((item) => item.id === "size")!;
  const role = taxonomy.categories.find((item) => item.id === "role")!;
  assert.deepEqual(
    assignTerm({ size: ["small", "large"], role: "accent" }, size, "large"),
    { size: ["large"], role: "accent" },
  );
  assert.deepEqual(assignTerm({ role: "accent" }, role, "neutral"), {
    role: "neutral",
  });
}

{
  const scope = (token: Parameters<typeof aliasSourceToken>[0]) =>
    tokenClassificationScope(aliasSourceToken(token));
  assert.equal(
    scope({ type: "colors", semantic: {} as never }),
    "colors",
    "aliases of Structure tokens use the token type",
  );
  assert.equal(scope({ type: "spacing", style: {} as never }), "spacing");
  assert.equal(
    scope({ type: "colors", classificationScope: "styles" }),
    "styles",
    "aliases keep the Styles naming context",
  );
}

console.log("classification-term-menu: ok");
