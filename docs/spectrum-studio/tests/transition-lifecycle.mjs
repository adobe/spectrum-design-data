// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.resolve("@react-spectrum/s2"));
const packageRoot = dirname(require.resolve("react-aria/package.json"));
const collectionRequire = createRequire(import.meta.resolve("react-aria-components"));
assert.equal(dirname(collectionRequire.resolve("react-aria/package.json")), packageRoot);

class TransitionTarget extends EventTarget {
  isConnected = true;
  cancellations = new Map();

  addEventListener(type, listener, options) {
    if (type !== "transitioncancel") return super.addEventListener(type, listener, options);
    if (this.cancellations.has(listener)) return;
    const callback = (event) => {
      if (options?.once) this.cancellations.delete(listener);
      listener.call(this, event);
    };
    this.cancellations.set(listener, callback);
    super.addEventListener(type, callback, options);
  }

  removeEventListener(type, listener, options) {
    if (type !== "transitioncancel") return super.removeEventListener(type, listener, options);
    const callback = this.cancellations.get(listener);
    if (callback) super.removeEventListener(type, callback, options);
    this.cancellations.delete(listener);
  }
}

function dispatch(receiver, type, target, propertyName) {
  const event = new Event(type);
  Object.defineProperty(event, "target", { value: target });
  if (propertyName !== undefined) Object.defineProperty(event, "propertyName", { value: propertyName });
  receiver.dispatchEvent(event);
}

const globals = new Map(["window", "document", "requestAnimationFrame"].map((name) =>
  [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
try {
  for (const format of ["mjs", "js", "cjs"]) {
    const body = new TransitionTarget();
    const frames = [];
    globalThis.window = {};
    globalThis.document = { readyState: "complete", body };
    globalThis.requestAnimationFrame = (callback) => frames.push(callback);
    const file = join(packageRoot, `dist/private/utils/runAfterTransition.${format}`);
    const { runAfterTransition } = format === "cjs" ? require(file) : await import(pathToFileURL(file).href);
    const frame = () => { for (const callback of frames.splice(0)) callback(0); };
    const start = (target, ...properties) => {
      for (const property of properties) dispatch(body, "transitionrun", target, property);
    };

    const detached = new TransitionTarget();
    start(detached, "opacity", "transform");
    let completed = 0;
    runAfterTransition(() => completed++);
    frame();
    assert.equal(completed, 0, `${format}: wait for the complete active transition`);
    detached.isConnected = false;
    dispatch(detached, "transitioncancel", detached, "opacity");
    assert.equal(completed, 0, `${format}: one canceled property does not finish another`);
    assert.equal(detached.cancellations.size, 1, `${format}: keep listening for remaining canceled properties`);
    dispatch(detached, "transitioncancel", detached, "transform");
    assert.equal(completed, 1, `${format}: release queued work after all detached properties cancel`);
    assert.equal(detached.cancellations.size, 0, `${format}: remove the listener after the final property`);
    dispatch(detached, "transitioncancel", detached, "transform");
    dispatch(body, "transitionend", detached, "opacity");
    assert.equal(completed, 1, `${format}: ignore duplicate browser completion events`);

    const parent = new TransitionTarget(), child = new TransitionTarget();
    start(parent, "opacity");
    start(child, "transform");
    let nested = 0;
    runAfterTransition(() => nested++);
    frame();
    dispatch(child, "transitioncancel", child, "transform");
    dispatch(parent, "transitioncancel", child, "transform");
    assert.equal(parent.cancellations.size, 1, `${format}: a bubbling child cancellation does not consume its parent's listener`);
    parent.isConnected = false;
    dispatch(parent, "transitioncancel", parent, "opacity");
    assert.equal(nested, 1, `${format}: nested cancellation releases queued work exactly once`);
    assert.equal(parent.cancellations.size, 0);
    assert.equal(child.cancellations.size, 0);

    const first = new TransitionTarget(), second = new TransitionTarget();
    start(first, "width", "height");
    start(second, "opacity");
    let all = 0;
    const sharedCallback = () => all++;
    runAfterTransition(sharedCallback);
    runAfterTransition(sharedCallback);
    frame();
    dispatch(first, "transitioncancel", first, "width");
    dispatch(body, "transitionend", first, "height");
    assert.equal(first.cancellations.size, 0);
    assert.equal(all, 0, `${format}: preserve other elements' active transitions`);
    dispatch(body, "transitionend", second, "opacity");
    assert.equal(all, 1, `${format}: retain callback deduplication and normal completion`);
    assert.equal(second.cancellations.size, 0);

    start(second, "opacity");
    let restarted = 0;
    runAfterTransition(() => restarted++);
    frame();
    dispatch(second, "transitioncancel", second, "opacity");
    assert.equal(restarted, 1, `${format}: install fresh cancellation handling when an element transitions again`);
    assert.equal(second.cancellations.size, 0);

    let immediate = 0;
    dispatch(body, "transitionrun", new TransitionTarget());
    runAfterTransition(() => immediate++);
    assert.equal(immediate, 0);
    frame();
    assert.equal(immediate, 1, `${format}: preserve next-frame callbacks and ignore non-transition events`);
    assert.equal(frames.length, 0);
  }
} finally {
  for (const [name, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
}

console.log("Installed transition formats preserve queued callbacks, multiple-property and nested cancellation, duplicates, restarts and listener cleanup.");
