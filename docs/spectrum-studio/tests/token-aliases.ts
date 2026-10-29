// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  aliasReferencePacket,
  aliasesForSave,
  planAliasesForSave,
  assertAliasTargets,
  EMPTY_ALIASES,
  isAliasDocument,
  removeAlias,
} from "../src/features/tokens/aliases";

const old = [
  { id: "canonical", name: "font-size-100", context: "light" },
  { id: "canonical", name: "font-size-100", context: "dark" },
];
const renamed = old.map((token) => ({ ...token, name: "text-size-100" }));
const aliases = aliasesForSave(EMPTY_ALIASES, old, renamed);
assert.equal(aliases.tokens.length, 1);
assert.deepEqual(aliases.tokens[0].contexts, ["light", "dark"]);
assert.equal(aliases.tokens[0].$ref, "canonical");
assert.deepEqual(aliasesForSave(aliases, renamed, renamed), aliases);
const changedAgain = renamed.map((token) => ({
  ...token,
  name: "text-dimension-100",
}));
const second = aliasesForSave(aliases, renamed, changedAgain);
assert.equal(second.tokens.length, 2);
assert(second.tokens.every((token) => token.$ref === "canonical"));
const resumed = aliasesForSave(second, changedAgain, old);
assert(!resumed.tokens.some((token) => token.name === "font-size-100"));
assert(resumed.tokens.some((token) => token.name === "text-dimension-100"));
const removed = removeAlias(aliases, aliases.tokens[0].id);
assert.deepEqual(
  aliasesForSave(removed, renamed, renamed),
  EMPTY_ALIASES,
  "Generation or an unchanged save does not recreate deleted aliases.",
);
assert.deepEqual(
  aliasesForSave(aliases, renamed, []),
  EMPTY_ALIASES,
  "Target removal removes aliases.",
);
assert.deepEqual(
  aliasesForSave(EMPTY_ALIASES, [], renamed),
  EMPTY_ALIASES,
  "New defaults and first creation do not invent history.",
);
assert.deepEqual(
  aliasesForSave(aliases, renamed, [renamed[0]]).tokens[0].contexts,
  ["light"],
);
assert.throws(
  () =>
    aliasesForSave(EMPTY_ALIASES, old, [
      ...renamed,
      { id: "other", name: "font-size-100", context: "light" },
    ]),
  /conflicts/,
);
assert.throws(
  () =>
    aliasesForSave(
      EMPTY_ALIASES,
      [old[0]],
      [renamed[0], { id: "other", name: "font-size-100", context: "dark" }],
    ),
  /conflicts/,
  "Another token cannot claim an old name even in a different mode.",
);
const reindexed = planAliasesForSave(
  EMPTY_ALIASES,
  old,
  [...renamed, { id: "other", name: "font-size-100", context: "light" }],
  new Set(["canonical"]),
);
assert.deepEqual(reindexed.document, EMPTY_ALIASES);
assert.deepEqual(reindexed.skippedNames, ["font-size-100"]);
assert.throws(
  () =>
    planAliasesForSave(
      EMPTY_ALIASES,
      old,
      [...renamed, { id: "other", name: "font-size-100", context: "light" }],
      new Set(["unrelated"]),
    ),
  /conflicts/,
);
assert.throws(() => assertAliasTargets(aliases, []), /unavailable/);
assert.throws(
  () =>
    assertAliasTargets(
      {
        ...aliases,
        tokens: [{ ...aliases.tokens[0], $ref: aliases.tokens[0].id }],
      },
      renamed,
    ),
  /unavailable/,
);
assert(!isAliasDocument({ ...aliases, unexpected: true }));
assert(
  !isAliasDocument({
    ...aliases,
    tokens: [...aliases.tokens, aliases.tokens[0]],
  }),
);
assert(
  !isAliasDocument({
    ...aliases,
    tokens: [{ ...aliases.tokens[0], contexts: ["light", "light"] }],
  }),
);
const emitted = renamed.map((target) => ({
  ...target,
  rowId: `emitted-${target.context}`,
}));
const packet = aliasReferencePacket(aliases, emitted);
assert.deepEqual(
  packet.map((token) => token.context),
  ["light", "dark"],
);
assert.deepEqual(
  packet.map((token) => token.$ref),
  ["emitted-light", "emitted-dark"],
);
assert.equal(
  new Set(packet.map((token) => token.uuid)).size,
  2,
  "Exported rows have context-specific identities.",
);
assert(packet.every((token) => !("value" in token)));
assert.throws(
  () =>
    aliasReferencePacket(
      aliases,
      emitted.map((target) => ({ ...target, rowId: "" })),
    ),
  /no emitted target/,
);
assert.throws(
  () =>
    assertAliasTargets(aliases, [
      ...renamed,
      { ...renamed[0], name: "conflicting-name" },
    ]),
  /conflicting names/,
);
assert.throws(
  () =>
    assertAliasTargets(aliases, [
      ...renamed,
      { id: aliases.tokens[0].id, name: "new-token", context: "light" },
    ]),
  /shares a canonical/,
);
assert.deepEqual(
  aliasesForSave(
    EMPTY_ALIASES,
    old,
    old.map((target) => ({ ...target, name: target.name.toUpperCase() })),
  ),
  EMPTY_ALIASES,
);
assert.deepEqual(aliasesForSave(aliases, renamed, renamed), aliases);
assert.throws(() => removeAlias(aliases, "missing"), /no longer available/);
assert.throws(
  () =>
    assertAliasTargets(
      {
        ...aliases,
        tokens: [
          ...aliases.tokens,
          { ...aliases.tokens[0], id: crypto.randomUUID() },
        ],
      },
      renamed,
    ),
  /recorded more than once/,
);
assert.deepEqual(
  aliasesForSave(aliases, renamed, [old[0], renamed[1]]).tokens.map((token) => [
    token.name,
    token.contexts,
  ]),
  [
    ["font-size-100", ["dark"]],
    ["text-size-100", ["light"]],
  ],
  "Own-name reuse removes only the redundant mode context and keeps direct references.",
);
console.log(
  "One-time alias creation, identity, direct targets, context isolation, deletion and collision checks passed.",
);
