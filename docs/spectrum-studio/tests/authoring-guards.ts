// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { atom, createStore } from "jotai";
import {
  assertAuthoringUpdate,
  registerAuthoringGuard,
  withValidatedAuthoringUpdates,
} from "../src/state/authoringGuards";

const library = atom("original");
const foundation = atom({ ruleId: "original" });
const registry = atom("original");
const libraryWriter = atom(null, (get, set, next: string) => {
  assertAuthoringUpdate(get, "test/library", next);
  set(library, next);
});
const foundationWriter = atom(null, (get, set, next: { ruleId: string }) => {
  assertAuthoringUpdate(get, "test/foundation", next);
  set(foundation, next);
});
const registryWriter = atom(null, (get, set, next: string) => {
  assertAuthoringUpdate(get, "test/registry", next);
  set(registry, next);
});
registerAuthoringGuard("test/nested-authoring-updates", (get, updates) => {
  const rule = updates.has("test/library")
    ? updates.get("test/library")
    : get(library);
  const document = updates.has("test/foundation")
    ? updates.get("test/foundation")
    : get(foundation);
  assert.ok(document && typeof document === "object" && "ruleId" in document);
  assert.equal(document.ruleId, rule, "Foundation rule must remain available.");
});

const store = createStore();
const next = { ruleId: "replacement" };
withValidatedAuthoringUpdates(
  store.get,
  new Map<string, unknown>([
    ["test/library", "replacement"],
    ["test/foundation", next],
  ]),
  () => {
    store.set(libraryWriter, "replacement");
    const contributed = { ...next };
    withValidatedAuthoringUpdates(
      store.get,
      new Map<string, unknown>([
        ["test/foundation", contributed],
        ["test/registry", "contributed"],
      ]),
      () => {
        store.set(registryWriter, "contributed");
        store.set(foundationWriter, contributed);
      },
    );
    store.set(foundationWriter, next);
  },
);
assert.equal(store.get(library), "replacement");
assert.deepEqual(store.get(foundation), next);
assert.equal(store.get(registry), "contributed");

assert.throws(
  () =>
    withValidatedAuthoringUpdates(
      store.get,
      new Map<string, unknown>([
        ["test/library", "replacement"],
        ["test/foundation", next],
      ]),
      () => {
        withValidatedAuthoringUpdates(
          store.get,
          new Map([["test/foundation", { ruleId: "unavailable" }]]),
          () => {
            assert.fail("Invalid nested proposals must not be committed.");
          },
        );
      },
    ),
  /Foundation rule must remain available/,
);
assert.equal(store.get(library), "replacement");
assert.deepEqual(store.get(foundation), next);

const other = createStore();
withValidatedAuthoringUpdates(
  store.get,
  new Map<string, unknown>([
    ["test/library", "replacement"],
    ["test/foundation", next],
  ]),
  () => {
    assert.throws(
      () => other.set(libraryWriter, "replacement"),
      /Foundation rule must remain available/,
      "A proposal in one store cannot authorize another store's writes.",
    );
  },
);
assert.equal(other.get(library), "original");
assert.deepEqual(other.get(foundation), { ruleId: "original" });
assert.throws(
  () => store.set(foundationWriter, { ruleId: "unavailable" }),
  /Foundation rule must remain available/,
  "Finishing a batch restores ordinary validation.",
);

console.log("Nested authoring proposals and cross-store isolation passed.");
