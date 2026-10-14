// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import {
  getTokenData,
  getFlatTokenMap,
  getTokenCategories,
  getTokensByCategory,
} from "../../src/data/tokens.js";

test("canonical projection keeps filename and flat lookup APIs consistent", async (t) => {
  const byFile = await getTokenData();
  const flat = await getFlatTokenMap();
  t.true(Object.keys(byFile).length > 0);
  t.deepEqual(flat, Object.assign({}, ...Object.values(byFile)));
  t.is(flat["border-width-100"].value, "1px");
  t.is(flat["picker-border-width"].value, "{border-width-100}");
  t.is(byFile, await getTokenData());
  t.is(flat, await getFlatTokenMap());
});

test("category lookup supports both legacy filenames and category names", async (t) => {
  const byFile = await getTokenData();
  const categories = await getTokenCategories();
  t.deepEqual(
    categories,
    Object.keys(byFile).map((name) => name.replace(".json", "")),
  );
  t.is(await getTokensByCategory("picker"), byFile["picker.json"]);
  t.is(await getTokensByCategory("picker.json"), byFile["picker.json"]);
  t.is(await getTokensByCategory("missing-category"), null);
});
