// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { atom, createStore, type Getter } from "jotai";
import {
  assertAuthoringUpdate,
  registerAuthoringGuard,
  withValidatedAuthoringUpdates,
} from "../src/state/authoringGuards";

const unsafe = atom(false);
const a = atom({ value: 1 }),
  b = atom({ value: 2 }),
  c = atom({ value: 3 });
let calls = 0;
registerAuthoringGuard("batch-test", (get, updates) => {
  calls += 1;
  if (get(unsafe) || updates.has("forbidden"))
    throw new Error("Rejected proposal.");
});
const guardedA = atom(
  (get) => get(a),
  (get, set, value: { value: number }) => {
    assertAuthoringUpdate(get, "a", value);
    set(a, value);
  },
);
const guardedB = atom(
  (get) => get(b),
  (get, set, value: { value: number }) => {
    assertAuthoringUpdate(get, "b", value);
    set(b, value);
  },
);
const guardedC = atom(
  (get) => get(c),
  (get, set, value: { value: number }) => {
    assertAuthoringUpdate(get, "c", value);
    set(c, value);
  },
);
const store = createStore();
const nextA = { value: 4 },
  nextB = { value: 5 };
const proposal = new Map<string, unknown>([
  ["a", nextA],
  ["b", nextB],
]);
const apply = atom(null, (get, set) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    set(guardedA, nextA);
    set(guardedB, nextB);
  });
});
store.set(apply);
assert.equal(
  calls,
  1,
  "The complete proposal is checked once, not again for each identical member.",
);
assert.equal(store.get(a), nextA);
assert.equal(store.get(b), nextB);
store.set(guardedA, nextA);
assert.equal(calls, 2, "No authorization survives the synchronous batch.");

calls = 0;
const nested = atom(null, (get, set) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    withValidatedAuthoringUpdates(get, new Map([["a", nextA]]), () => {
      set(guardedA, nextA);
    });
    set(guardedB, nextB);
  });
});
store.set(nested);
assert.equal(calls, 1);

calls = 0;
const unexpected = atom(null, (get, set) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    set(guardedA, nextA);
    set(guardedC, { value: 7 });
    set(guardedB, nextB);
  });
});
store.set(unexpected);
assert.equal(
  calls,
  3,
  "Unplanned writes invalidate earlier authorization before later members commit.",
);

calls = 0;
const different = atom(null, (get, set) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    set(guardedA, { ...nextA });
  });
});
store.set(different);
assert.equal(
  calls,
  2,
  "Equal-looking replacement objects are not the exact approved input.",
);

calls = 0;
const mutableProposal = new Map(proposal);
const changedProposal = atom(null, (get, set) => {
  withValidatedAuthoringUpdates(get, mutableProposal, () => {
    const replacement = { value: 9 };
    mutableProposal.set("a", replacement);
    set(guardedA, replacement);
  });
});
store.set(changedProposal);
assert.equal(
  calls,
  2,
  "The caller cannot rewrite the approved map after validation.",
);

const forbidden = atom(null, (get) => {
  withValidatedAuthoringUpdates(get, new Map([["forbidden", nextA]]), () => {
    throw new Error("Must not write.");
  });
});
assert.throws(() => store.set(forbidden), /Rejected proposal/);

const second = createStore();
second.set(unsafe, true);
const crossStore = atom(null, (get) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    second.set(guardedA, nextA);
  });
});
assert.throws(() => store.set(crossStore), /Rejected proposal/);
assert.equal(
  second.get(a).value,
  1,
  "A different store must validate against its own state.",
);

calls = 0;
const throws = atom(null, (get) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    throw new Error("Commit failure.");
  });
});
assert.throws(() => store.set(throws), /Commit failure/);
store.set(guardedA, nextA);
assert.equal(calls, 2, "Thrown writes also clear their authorization.");

calls = 0;
let lateCalls = 0;
const registration = atom(null, (get, set) => {
  withValidatedAuthoringUpdates(get, proposal, () => {
    registerAuthoringGuard("batch-late", () => {
      lateCalls += 1;
    });
    set(guardedA, nextA);
  });
});
store.set(registration);
assert.equal(calls, 2);
assert.equal(lateCalls, 1, "New or replaced guards invalidate existing proof.");

let publicReads = 0;
registerAuthoringGuard("batch-public", () => {
  publicReads += 1;
});
assertAuthoringUpdate((() => false) as Getter, "outside", "value");
assert.equal(
  publicReads,
  1,
  "Standalone guards retain their original Getter contract.",
);
console.log(
  "Authoring batches: exact combined validation, store isolation, nested scopes, unexpected writes, registry changes and cleanup passed.",
);
