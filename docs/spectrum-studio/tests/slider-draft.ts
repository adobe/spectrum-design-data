// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { sliderDraftEvents } from "../src/components/editable/useSliderDraft";

/**
 * A slider bound to saved state. Each `render` returns the handlers a new
 * React render would create; saving updates the bound value.
 */
function boundSlider(initial?: number) {
  const pending = { current: undefined as number | undefined };
  const state = {
    value: initial,
    draft: undefined as number | undefined,
    saves: [] as number[],
  };
  const render = () =>
    sliderDraftEvents(
      pending,
      state.value,
      (draft) => {
        state.draft = draft;
      },
      (value) => {
        state.saves.push(value);
        if (initial !== undefined) state.value = value;
      },
    );
  return { state, render, shown: () => state.draft ?? state.value };
}

// A pointer drag moves the slider locally and saves once on release.
const drag = boundSlider(0.5);
drag.render().onChange(0.6);
drag.render().onChange(0.7);
assert.equal(drag.shown(), 0.7);
assert.deepEqual(drag.state.saves, []);
drag.render().onChangeEnd(0.7);
assert.deepEqual(drag.state.saves, [0.7]);
assert.equal(drag.state.draft, undefined);
assert.equal(drag.shown(), 0.7);
drag.render().flush();
assert.deepEqual(drag.state.saves, [0.7], "Blur after release saves nothing.");

// Releasing at the saved value saves nothing.
const unchanged = boundSlider(0.5);
unchanged.render().onChange(0.6);
unchanged.render().onChange(0.5);
unchanged.render().onChangeEnd(0.5);
assert.deepEqual(unchanged.state.saves, []);
assert.equal(unchanged.shown(), 0.5);

// Each keyboard step changes and ends in one handler, so every step saves.
const keyboard = boundSlider(0.5);
for (const step of [0.51, 0.52]) {
  const events = keyboard.render();
  events.onChange(step);
  events.onChangeEnd(step);
}
assert.deepEqual(keyboard.state.saves, [0.51, 0.52]);

// Assistive technology changes the input without an end event; the
// boundary's bubbled change event saves it once.
const assistive = boundSlider(0.5);
assistive.render().onChange(0.25);
assistive.render().flush();
assistive.render().flush();
assert.deepEqual(assistive.state.saves, [0.25]);
assert.equal(assistive.shown(), 0.25);

// Inline label edits and blur with nothing pending save nothing.
const idle = boundSlider(0.5);
idle.render().flush();
assert.deepEqual(idle.state.saves, []);

// Uncontrolled sliders report arrays and keep their own position.
const uncontrolled = boundSlider();
uncontrolled.render().onChange([0.3]);
assert.equal(uncontrolled.state.draft, undefined);
uncontrolled.render().onChangeEnd([0.4]);
assert.deepEqual(uncontrolled.state.saves, [0.4]);

console.log(
  "Slider draft release, keyboard, assistive-technology, idle and uncontrolled save checks passed.",
);
