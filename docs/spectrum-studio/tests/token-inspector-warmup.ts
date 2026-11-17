// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { atom, createStore } from "jotai";
import { warmAtomsWhenIdle } from "../src/features/tokens/inspectorWarmup";

function fakeScheduler() {
  const queue: (() => void)[] = [];
  return {
    schedule: (task: () => void) => {
      queue.push(task);
      return () => {
        const index = queue.indexOf(task);
        if (index >= 0) queue.splice(index, 1);
      };
    },
    runNext: () => queue.shift()?.(),
    get pending() {
      return queue.length;
    },
  };
}

function countingAtoms(count: number) {
  const reads = Array.from({ length: count }, () => 0);
  const atoms = reads.map((_, index) =>
    atom(() => {
      reads[index] += 1;
      return index;
    }),
  );
  return { reads, atoms };
}

{
  const store = createStore();
  const done = atom(false);
  const { reads, atoms } = countingAtoms(3);
  const idle = fakeScheduler();
  warmAtomsWhenIdle(store, atoms, done, idle.schedule);
  assert.deepEqual(reads, [0, 0, 0], "nothing is computed until idle");
  idle.runNext();
  assert.deepEqual(reads, [1, 0, 0], "one atom is computed per idle slot");
  idle.runNext();
  idle.runNext();
  assert.deepEqual(reads, [1, 1, 1]);
  assert.equal(store.get(done), false);
  idle.runNext();
  assert.equal(store.get(done), true, "warm flag is set after the last atom");
  assert.equal(idle.pending, 0);
  store.get(atoms[0]);
  assert.equal(reads[0], 1, "warmed values stay cached in the store");
}

{
  const store = createStore();
  const done = atom(false);
  const { reads, atoms } = countingAtoms(3);
  const idle = fakeScheduler();
  const cancel = warmAtomsWhenIdle(store, atoms, done, idle.schedule);
  idle.runNext();
  cancel();
  assert.equal(idle.pending, 0, "cancel removes the scheduled slot");
  assert.deepEqual(reads, [1, 0, 0]);
  assert.equal(store.get(done), false);
}

{
  const store = createStore();
  const done = atom(true);
  const { reads, atoms } = countingAtoms(2);
  const idle = fakeScheduler();
  warmAtomsWhenIdle(store, atoms, done, idle.schedule);
  assert.equal(idle.pending, 0, "already-warm data schedules no work");
  assert.deepEqual(reads, [0, 0]);
}

{
  const store = createStore();
  const done = atom(false);
  const failing = atom((): number => {
    throw new Error("broken");
  });
  const { reads, atoms } = countingAtoms(1);
  const idle = fakeScheduler();
  warmAtomsWhenIdle(store, [failing, ...atoms], done, idle.schedule);
  idle.runNext();
  idle.runNext();
  idle.runNext();
  assert.deepEqual(reads, [1], "a failing atom does not stop warm-up");
  assert.equal(store.get(done), true);
}

console.log("token inspector warm-up: ok");
