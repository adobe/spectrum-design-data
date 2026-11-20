// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringGuardConfiguration,
  assertAuthoringUpdate,
  prepareAuthoringUpdates,
  registerAuthoringGuard,
  withValidatedAuthoringUpdates,
} from "../src/state/authoringGuards";
import {
  collectNumericProposals,
  deferNumericProposal,
  reportNumericProposalFailure,
  type NumericProposal,
} from "../src/features/edit-session/numericProposal";
import { rebaseDraft } from "../src/features/edit-session/rebaseDraft";
import {
  applyPersistedWrites,
  createIsolatedPersistedStore,
  persistedAtom,
  recordPersistedWrites,
} from "../src/state/persist";
import { atom } from "jotai";
import {
  NumericDrafts,
  type NumericChange,
} from "../src/features/edit-session/NumericDrafts";

const initial = {
  scales: [
    { id: "a", base: 4, ratio: 2 },
    { id: "b", base: 8, ratio: 3 },
  ],
};
const first = {
  scales: [{ id: "a", base: 5, ratio: 2 }, initial.scales[1]],
};
const second = {
  scales: [{ id: "a", base: 4, ratio: 2.5 }, initial.scales[1]],
};
const composed = rebaseDraft(initial, second, first, true);
assert.deepEqual(composed, {
  scales: [{ id: "a", base: 5, ratio: 2.5 }, initial.scales[1]],
});
assert.deepEqual(
  rebaseDraft(initial, first, {
    scales: [initial.scales[1], { ...initial.scales[0], ratio: 3 }],
  }),
  {
    scales: [initial.scales[1], { id: "a", base: 5, ratio: 3 }],
  },
  "An unrelated edit and reordering preserve the edited item's identity.",
);
assert.throws(
  () => rebaseDraft(initial, first, { scales: [initial.scales[1]] }),
  /removed/,
);
assert.throws(
  () =>
    rebaseDraft(initial, first, {
      scales: [{ ...initial.scales[0], base: 7 }, initial.scales[1]],
    }),
  /changed/,
);
assert.deepEqual(rebaseDraft({ a: 1, b: 2 }, { a: 1 }, { a: 3, b: 2 }), {
  a: 3,
});
assert.deepEqual(initial.scales[0], { id: "a", base: 4, ratio: 2 });
assert.deepEqual(
  rebaseDraft(
    [{ id: "a", value: 1 }],
    [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ],
    [
      { id: "a", value: 3 },
      { id: "c", value: 4 },
    ],
    true,
  ),
  [
    { id: "a", value: 3 },
    { id: "c", value: 4 },
    { id: "b", value: 2 },
  ],
  "Independent contributions survive composition.",
);
assert.throws(
  () => rebaseDraft([], [{ id: "a", value: 1 }], [{ id: "a", value: 2 }], true),
  /different settings/,
);
assert.throws(
  () => rebaseDraft([1], [1, 2], [1, 3], true),
  /list changed/,
  "Unidentified list edits cannot replace unrelated additions.",
);

const proposal: NumericProposal = {
  source: "scaleTypes",
  previous: [],
  next: [],
};
assert.equal(deferNumericProposal(proposal), false);
assert.throws(() =>
  collectNumericProposals(() => {
    assert.equal(deferNumericProposal(proposal), true);
    throw new Error("Action failed");
  }),
);
assert.deepEqual(
  collectNumericProposals(() => {
    deferNumericProposal(proposal);
  }),
  [proposal],
);
assert.equal(
  deferNumericProposal(proposal),
  false,
  "A failed action cannot leave proposal capture enabled.",
);
assert.throws(
  () =>
    collectNumericProposals(() => {
      deferNumericProposal(proposal);
      reportNumericProposalFailure("The action reported a validation error.");
    }),
  /reported a validation error/,
  "An action that catches and reports failure cannot publish captured proposals.",
);

let guardCalls = 0;
registerAuthoringGuard("numeric-edit-core", (_get, updates) => {
  guardCalls++;
  if (updates.has("invalid")) throw new Error("Invalid source");
});
const store = createStore();
const isolated = createStore();
const next = { base: 12 };
let current = true;
const prepare = () =>
  prepareAuthoringUpdates(
    store.get,
    async () => {
      assertAuthoringUpdate(isolated.get, "source", next);
      return {
        value: next,
        updates: new Map([["source", next]]),
        guards: authoringGuardConfiguration(),
      };
    },
    () => current,
  );
const prepared = await prepare();
assert.equal(guardCalls, 1);
let writes = 0;
prepared.commit(store.get, () => {
  assertAuthoringUpdate(store.get, "source", next);
  writes++;
});
assert.equal(writes, 1);
assert.equal(
  guardCalls,
  1,
  "The exact validated write does not rebuild output.",
);
assert.throws(() => prepared.commit(store.get, () => undefined), /current/);

const crossStore = await prepare();
assert.throws(
  () => crossStore.commit(isolated.get, () => undefined),
  /current/,
);
const stale = await prepare();
current = false;
assert.throws(() => stale.commit(store.get, () => undefined), /current/);
await assert.rejects(prepare(), /source or validation rules changed/);
current = true;

const changed = await prepare();
const beforeMismatch = guardCalls;
changed.commit(store.get, () => {
  assertAuthoringUpdate(store.get, "source", { ...next });
  assertAuthoringUpdate(store.get, "source", next);
});
assert.equal(
  guardCalls,
  beforeMismatch + 2,
  "Unexpected writes invalidate the prepared batch and run normal guards.",
);
const revised = await prepare();
registerAuthoringGuard("numeric-edit-core-new-rule", () => {});
assert.throws(() => revised.commit(store.get, () => undefined), /current/);

const beforeSync = guardCalls;
withValidatedAuthoringUpdates(store.get, new Map([["source", next]]), () => {
  assertAuthoringUpdate(store.get, "source", next);
});
assert.equal(guardCalls, beforeSync + 1);
assert.throws(() =>
  withValidatedAuthoringUpdates(store.get, new Map([["invalid", next]]), () => {
    writes++;
  }),
);
assert.equal(writes, 1);
const beforeCapture = guardCalls;
const taxonomy = { terms: [] };
const combined = new Map<string, unknown>([
  ["foundations/typography", next],
  ["registry/taxonomy", taxonomy],
]);
assert.deepEqual(
  collectNumericProposals(() =>
    withValidatedAuthoringUpdates(store.get, combined, () => {
      writes++;
    }),
  ),
  [
    { source: "typography", previous: undefined, next },
    { source: "taxonomy", previous: undefined, next: taxonomy },
  ],
);
assert.equal(
  writes,
  1,
  "A captured batch cannot partially write related data.",
);
assert.equal(
  guardCalls,
  beforeCapture,
  "Captured batches defer generation guards.",
);
assert.throws(
  () =>
    collectNumericProposals(() =>
      withValidatedAuthoringUpdates(
        store.get,
        new Map([...combined, ["unsupported-related-data", {}]]),
        () => {
          writes++;
        },
      ),
    ),
  /cannot defer/,
);
assert.equal(writes, 1);
const stored = persistedAtom({
  key: "numeric-core-test",
  schemaVersion: 1,
  initialize: () => ({ value: 1 }),
  validate: (value): value is { value: number } =>
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "number" &&
    Number.isFinite(value.value),
});
const recorded = recordPersistedWrites(() =>
  isolated.set(stored, { value: 2 }),
);
assert.deepEqual([...recorded], [["numeric-core-test", { value: 2 }]]);
const apply = atom(null, (get, set, updates: ReadonlyMap<string, unknown>) =>
  applyPersistedWrites(get, set, updates),
);
const rawPrepared = await prepareAuthoringUpdates(
  store.get,
  async () => ({
    value: undefined,
    updates: recorded,
    guards: authoringGuardConfiguration(),
  }),
  () => true,
);
const beforeRaw = guardCalls;
rawPrepared.commit(store.get, () => {
  store.set(apply, recorded);
});
assert.deepEqual(store.get(stored), { value: 2 });
assert.equal(guardCalls, beforeRaw);
assert.throws(() =>
  store.set(
    apply,
    new Map([
      ["numeric-core-test", { value: 3 }],
      ["unregistered-source", {}],
    ]),
  ),
);
assert.deepEqual(
  store.get(stored),
  { value: 2 },
  "All prepared targets are checked before any write.",
);
assert.deepEqual(
  collectNumericProposals(() => isolated.set(stored, { value: 4 })),
  [],
  "A nonnumeric source keeps its normal synchronous behavior.",
);
const captured = persistedAtom({
  key: "foundations/spacing",
  schemaVersion: 1,
  initialize: () => ({ value: 1 }),
  validate: (value): value is { value: number } =>
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "number",
});
const beforeSingleCapture = guardCalls;
assert.deepEqual(
  collectNumericProposals(() => isolated.set(captured, { value: 2 })),
  [{ source: "spacing", previous: { value: 1 }, next: { value: 2 } }],
);
assert.deepEqual(isolated.get(captured), { value: 1 });
assert.equal(guardCalls, beforeSingleCapture);
const unguardedInitial = persistedAtom({
  key: "invalid",
  schemaVersion: 1,
  initialize: () => ({ value: 1 }),
  validate: (value): value is { value: number } =>
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "number",
});
const beforeSeed = guardCalls;
const seeded = createIsolatedPersistedStore(
  new Map([["invalid", { value: 2 }]]),
);
assert.equal(guardCalls, beforeSeed, "Isolated seeding requires only schemas.");
assert.deepEqual(seeded.get(unguardedInitial), { value: 2 });
assert.deepEqual(store.get(unguardedInitial), { value: 1 });
assert.throws(
  () => seeded.set(unguardedInitial, { value: 3 }),
  /Invalid source/,
  "Seeding cannot disable subsequent guards, even in the isolated store.",
);
assert.deepEqual(seeded.get(unguardedInitial), { value: 2 });
assert.throws(
  () => createIsolatedPersistedStore(new Map([["invalid", { value: "bad" }]])),
  /invalid data/,
);

type Source = { scale: { base: number; ratio: number }; unrelated: number };
function draftFixture() {
  let source: Source = { scale: { base: 4, ratio: 2 }, unrelated: 0 };
  let reset = 0;
  const timers = new Set<() => void>();
  const messages: string[] = [];
  const jobs: {
    input: { source: Source; proposals: NumericChange<Source>[] };
    signal: AbortSignal;
    resolve: (commit: () => void) => void;
    reject: (error: Error) => void;
  }[] = [];
  let commits = 0;
  const drafts = new NumericDrafts<Source>({
    current: () => ({ source, reset, editing: true }),
    prepare: (input, signal) =>
      new Promise((resolve, reject) => {
        jobs.push({ input, signal, resolve, reject });
      }),
    publish: () => {},
    reportError: (message) => messages.push(message),
    schedule: (run, delay) => {
      assert.equal(delay, 200);
      timers.add(run);
      return () => {
        timers.delete(run);
      };
    },
  });
  return {
    drafts,
    jobs,
    messages,
    get commits() {
      return commits;
    },
    get source() {
      return source;
    },
    edit(id: "base" | "ratio", value: number) {
      drafts.propose(id, [
        {
          source: "scale",
          previous: source.scale,
          next: { ...source.scale, [id]: value },
        },
      ]);
    },
    async quiet() {
      for (const timer of [...timers]) {
        timers.delete(timer);
        timer();
      }
      await Promise.resolve();
    },
    ready(index: number) {
      const job = jobs[index];
      job.resolve(() => {
        commits++;
        source = {
          ...job.input.source,
          ...Object.fromEntries(
            job.input.proposals.map((change) => [change.source, change.next]),
          ),
        };
      });
    },
    external(next: Source) {
      source = next;
      drafts.sourceChanged();
    },
    reset() {
      reset++;
      drafts.sourceChanged();
    },
  };
}
const coalesced = draftFixture();
coalesced.edit("base", 5);
coalesced.edit("base", 6);
coalesced.edit("ratio", 3);
assert.deepEqual(coalesced.source.scale, { base: 4, ratio: 2 });
assert.deepEqual(coalesced.drafts.snapshot().proposals.get("scale")?.next, {
  base: 6,
  ratio: 3,
});
assert.equal(
  coalesced.jobs.length,
  0,
  "Drafts publish before validation starts.",
);
await coalesced.quiet();
assert.equal(coalesced.jobs.length, 1, "Quiet-period edits share one job.");
coalesced.ready(0);
await coalesced.drafts.flush();
assert.deepEqual(coalesced.source.scale, { base: 6, ratio: 3 });
assert.equal(coalesced.commits, 1);
coalesced.drafts.dispose();

const superseded = draftFixture();
superseded.edit("base", 5);
await superseded.quiet();
superseded.edit("base", 8);
assert.equal(superseded.jobs[0].signal.aborted, true);
await superseded.quiet();
superseded.ready(0);
superseded.ready(1);
await superseded.drafts.flush();
assert.equal(superseded.source.scale.base, 8);
assert.equal(superseded.commits, 1, "An obsolete response cannot commit.");
superseded.drafts.dispose();

const invalid = draftFixture();
invalid.edit("base", 6);
invalid.drafts.setFieldError("base", "Finish entering this number.");
await invalid.quiet();
await assert.rejects(invalid.drafts.flush(), /Finish entering/);
assert.equal(invalid.jobs.length, 0);
invalid.drafts.setFieldError("base");
const flushed = invalid.drafts.flush();
await Promise.resolve();
assert.equal(
  invalid.jobs.length,
  1,
  "An explicit flush skips the quiet period.",
);
invalid.ready(0);
await flushed;
assert.equal(invalid.source.scale.base, 6);
invalid.drafts.dispose();

const failed = draftFixture();
failed.edit("base", 6);
const failure = failed.drafts.flush();
await Promise.resolve();
failed.jobs[0].reject(new Error("Generation failed."));
await assert.rejects(failure, /Generation failed/);
assert.equal(failed.source.scale.base, 4);
assert.deepEqual(failed.messages, ["Generation failed."]);
failed.edit("base", 7);
const corrected = failed.drafts.flush();
await Promise.resolve();
failed.ready(1);
await corrected;
assert.equal(failed.source.scale.base, 7);
failed.drafts.dispose();

const escaped = draftFixture();
escaped.edit("base", 6);
escaped.edit("ratio", 3);
await escaped.quiet();
escaped.drafts.setFieldError("base", "Finish entering this value.");
escaped.drafts.discardField("base");
assert.equal(escaped.jobs[0].signal.aborted, true);
assert.deepEqual(
  escaped.drafts.snapshot().proposals.get("scale")?.next,
  { base: 4, ratio: 3 },
  "Escape discards only this field, not a sibling proposal.",
);
assert.equal(escaped.drafts.snapshot().errors.size, 0);
escaped.ready(0);
const remaining = escaped.drafts.flush();
await Promise.resolve();
escaped.ready(1);
await remaining;
assert.deepEqual(escaped.source.scale, { base: 4, ratio: 3 });
assert.deepEqual(
  escaped.messages,
  [],
  "Explicit cancellation is not a failure.",
);
escaped.drafts.dispose();

const escapedLast = draftFixture();
escapedLast.edit("base", 6);
escapedLast.drafts.discardField("base");
await escapedLast.quiet();
await escapedLast.drafts.flush();
assert.equal(escapedLast.jobs.length, 0);
assert.equal(escapedLast.drafts.snapshot().status, "idle");
escapedLast.drafts.dispose();

const rebased = draftFixture();
rebased.edit("base", 6);
rebased.external({ scale: { base: 4, ratio: 3 }, unrelated: 1 });
assert.deepEqual(rebased.drafts.snapshot().proposals.get("scale")?.next, {
  base: 6,
  ratio: 3,
});
rebased.external({ scale: { base: 9, ratio: 3 }, unrelated: 1 });
await assert.rejects(rebased.drafts.flush(), /changed/);
assert.equal(rebased.drafts.snapshot().proposals.size, 0);
assert.equal(rebased.source.scale.base, 9);
rebased.drafts.dispose();

const cancelled = draftFixture();
cancelled.edit("base", 6);
const pendingFlush = cancelled.drafts.flush();
await Promise.resolve();
cancelled.reset();
assert.equal(cancelled.jobs[0].signal.aborted, true);
cancelled.ready(0);
await assert.rejects(pendingFlush, /cancelled/);
assert.equal(cancelled.commits, 0);
assert.equal(cancelled.drafts.snapshot().proposals.size, 0);
cancelled.drafts.dispose();
const hidden = draftFixture();
hidden.edit("base", 6);
hidden.drafts.flushSynchronously((input) => () => {
  hidden.external({
    ...input.source,
    ...Object.fromEntries(
      input.proposals.map((change) => [change.source, change.next]),
    ),
  });
});
assert.equal(hidden.source.scale.base, 6);
assert.equal(hidden.drafts.snapshot().proposals.size, 0);
hidden.drafts.dispose();
const reentrant = draftFixture();
reentrant.edit("base", 6);
assert.throws(
  () =>
    reentrant.drafts.flushSynchronously((input) => () => {
      reentrant.external({
        ...input.source,
        scale: { base: 6, ratio: 2 },
      });
      reentrant.edit("ratio", 3);
    }),
  /changed while it was being applied/,
);
assert.deepEqual(reentrant.source.scale, { base: 6, ratio: 2 });
assert.deepEqual(
  reentrant.drafts.snapshot().proposals.get("scale")?.next,
  { base: 6, ratio: 3 },
  "A reentrant edit cannot be cleared by a synchronous pagehide flush.",
);
reentrant.drafts.dispose();
console.log(
  "Numeric proposal composition and prepared acceptance checks passed.",
);
