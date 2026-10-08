// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import {
  findComponentByName,
  getAllComponents,
  getCategories,
  getComponentDoc,
  getComponentsByCategory,
  getStats,
  searchComponents,
} from "../src/data/docs.js";

test("lists components and categories from design-data", (t) => {
  const all = getAllComponents();
  t.true(all.length > 0);
  const categories = getCategories();
  t.true(categories.length > 0);
  t.true(getComponentsByCategory(categories[0]).length > 0);
});

test("stats total matches the component list", (t) => {
  t.is(getStats().total, getAllComponents().length);
});

test("finds, searches and renders a component", (t) => {
  const component = findComponentByName("accordion");
  t.truthy(component);
  t.true(searchComponents("accordion").length > 0);
  const doc = getComponentDoc(component.category, component.slug);
  t.truthy(doc);
});
