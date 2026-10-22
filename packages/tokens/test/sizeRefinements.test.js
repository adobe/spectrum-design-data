/*
Copyright 2026 Adobe. All rights reserved.
Licensed under the Apache License, Version 2.0.
*/

import test from "ava";
import { getAllTokens, readJson } from "../index.js";

const sourceUrl = new URL("../../design-data/", import.meta.url);
const sourceTokens = (
  await Promise.all(
    ["layout", "layout-component"].map((file) =>
      readJson(new URL(`tokens/${file}.tokens.json`, sourceUrl)),
    ),
  )
).flat();
const byKey = new Map(
  sourceTokens.map((token) => [token.name.legacyKey, token]),
);
const legacyTokens = await getAllTokens();
const aliasSchema =
  "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/alias.json";

for (const [key, targetKey, value] of [
  ["container-maximum-width-2x-small", "size-1200", "144px"],
  ["container-maximum-width-extra-small", "size-1300", "192px"],
  ["container-maximum-width-small", "size-1400", "240px"],
  ["list-item-minimum-height", "size-600", "40px"],
]) {
  test(`${key} aliases ${targetKey} (${value}) in canonical and legacy data`, (t) => {
    const token = byKey.get(key);
    const target = byKey.get(targetKey);

    t.truthy(token);
    t.truthy(target);
    t.is(token.$schema, aliasSchema);
    t.is(token.$ref, target.uuid);
    t.false(Object.hasOwn(token, "value"));
    t.is(target.value, value);
    t.is(legacyTokens[key].$schema, aliasSchema);
    t.is(legacyTokens[key].value, `{${targetKey}}`);
    t.is(legacyTokens[targetKey].value, value);
    t.is(legacyTokens[key].uuid, token.uuid);
  });
}

test("the new container maximum width uses the 2x-small taxonomy", (t) => {
  t.deepEqual(byKey.get("container-maximum-width-2x-small").name, {
    structure: "container",
    property: "maximum-width",
    size: "xxs",
    legacyKey: "container-maximum-width-2x-small",
  });
});

for (const [key, uuid, value] of [
  ["banner-width", "1236fe9c-ea39-415c-94b6-e35333bbfe39", "896px"],
  ["banner-height", "b9e67494-44bb-48d9-b4e6-d2385c6ab41d", "56px"],
  ["banner-minimum-height", "e271c350-f967-4425-8f24-12be5f43f7c7", "56px"],
]) {
  test(`${key} drops the medium size while preserving its identity and value`, (t) => {
    const token = byKey.get(key);

    t.truthy(token);
    t.false(Object.hasOwn(token.name, "size"));
    t.is(token.uuid, uuid);
    t.is(token.value, value);
    t.false(byKey.has(`${key}-medium`));
    t.false(Object.hasOwn(legacyTokens, `${key}-medium`));
    t.is(legacyTokens[key].uuid, uuid);
    t.is(legacyTokens[key].value, value);
  });
}

for (const [file, key, targetKey, count] of [
  [
    "card",
    "card-maximum-width-extra-small",
    "container-maximum-width-2x-small",
    1,
  ],
  [
    "card",
    "card-maximum-width-large",
    "container-maximum-width-extra-large",
    1,
  ],
  [
    "card",
    "card-maximum-width-extra-large",
    "container-maximum-width-2x-large",
    1,
  ],
  ["tooltip", "tooltip-maximum-width", "container-maximum-width-2x-small", 2],
  ["color-wheel", "color-wheel-minimum-width", "size-1200", 2],
  [
    "illustrated-message",
    "illustrated-message-horizontal-maximum-width",
    "container-maximum-width-2x-large",
    1,
  ],
  [
    "illustrated-message",
    "illustrated-message-vertical-maximum-width",
    "container-maximum-width-large",
    1,
  ],
  ["alert-banner", "alert-banner-minimum-height", "banner-minimum-height", 2],
]) {
  test(`${key} maps every scale to ${targetKey}`, async (t) => {
    const relationships = await readJson(
      new URL(`relationships/${file}.json`, sourceUrl),
    );
    const matches = relationships.filter((token) => token.legacyKey === key);
    const target = byKey.get(targetKey);

    t.is(matches.length, count);
    t.truthy(target);
    for (const token of matches) {
      t.is(token.lifecycle.replacedBy, target.uuid);
    }
    t.is(legacyTokens[key].renamed, targetKey);
  });
}
