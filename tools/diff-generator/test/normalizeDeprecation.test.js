/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import normalizeDeprecation from "../src/lib/normalize-deprecation.js";

test("hoists set-level deprecated to top when all sets are deprecated", (t) => {
  const input = {
    t1: {
      sets: {
        desktop: { value: "1", deprecated: true },
        mobile: { value: "2", deprecated: true },
      },
    },
  };
  const out = normalizeDeprecation(input);
  t.is(out.t1.deprecated, true);
  t.is(out.t1.sets.desktop.deprecated, undefined);
  t.is(out.t1.sets.mobile.deprecated, undefined);
  t.is(input.t1.deprecated, undefined);
  t.is(input.t1.sets.desktop.deprecated, true);
});

test("cleans sets when top-level deprecated already true", (t) => {
  const input = {
    t1: {
      deprecated: true,
      sets: {
        desktop: { deprecated: true },
        mobile: { deprecated: true },
      },
    },
  };
  const out = normalizeDeprecation(input);
  t.is(out.t1.deprecated, true);
  t.is(out.t1.sets.desktop.deprecated, undefined);
  t.is(out.t1.sets.mobile.deprecated, undefined);
});

test("does not change when only some sets are deprecated", (t) => {
  const input = {
    t1: {
      sets: {
        desktop: { deprecated: true },
        mobile: { value: "x" },
      },
    },
  };
  const out = normalizeDeprecation(input);
  t.is(out.t1.deprecated, undefined);
  t.is(out.t1.sets.desktop.deprecated, true);
  t.is(out.t1.sets.mobile.value, "x");
});

test("does not change tokens without sets", (t) => {
  const input = {
    t1: {
      value: "{blue-800}",
      uuid: "u1",
    },
  };
  const out = normalizeDeprecation(input);
  t.deepEqual(out, input);
});

test("skips empty sets object", (t) => {
  const input = {
    t1: { sets: {} },
  };
  const out = normalizeDeprecation(input);
  t.deepEqual(out, input);
});

test("skips non-object token values", (t) => {
  const input = { bad: "not-a-token" };
  const out = normalizeDeprecation(input);
  t.deepEqual(out, input);
});
