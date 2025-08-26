/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import {
  isObject,
  isString,
  isBoolean,
  isNumber,
  isArray,
  deepClone,
  getNestedProperty,
  capitalize,
} from "../src/core/helpers.js";

test("isObject correctly identifies objects", (t) => {
  t.true(isObject({}));
  t.true(isObject({ key: "value" }));
  t.false(isObject(null));
  t.false(isObject(undefined));
  t.false(isObject("string"));
  t.false(isObject(123));
  t.false(isObject([]));
});

test("isString correctly identifies strings", (t) => {
  t.true(isString("hello"));
  t.true(isString(new String("hello")));
  t.false(isString(123));
  t.false(isString({}));
  t.false(isString(null));
});

test("isBoolean correctly identifies booleans", (t) => {
  t.true(isBoolean(true));
  t.true(isBoolean(false));
  t.false(isBoolean("true"));
  t.false(isBoolean(1));
  t.false(isBoolean({}));
});

test("isNumber correctly identifies numbers", (t) => {
  t.true(isNumber(123));
  t.true(isNumber(0));
  t.true(isNumber(-1));
  t.true(isNumber(3.14));
  t.false(isNumber("123"));
  t.false(isNumber({}));
  t.false(isNumber(null));
});

test("isArray correctly identifies arrays", (t) => {
  t.true(isArray([]));
  t.true(isArray([1, 2, 3]));
  t.false(isArray({}));
  t.false(isArray("array"));
  t.false(isArray(null));
});

test("deepClone creates independent copies", (t) => {
  const original = {
    a: 1,
    b: {
      c: 2,
      d: [3, 4, { e: 5 }],
    },
    f: new Date("2024-01-01"),
  };

  const cloned = deepClone(original);

  // Should be deep equal but not the same reference
  t.deepEqual(cloned, original);
  t.not(cloned, original);
  t.not(cloned.b, original.b);
  t.not(cloned.b.d, original.b.d);
  t.not(cloned.b.d[2], original.b.d[2]);

  // Modifying clone shouldn't affect original
  cloned.b.c = 999;
  t.is(original.b.c, 2);
  t.is(cloned.b.c, 999);
});

test("getNestedProperty safely accesses nested properties", (t) => {
  const obj = {
    a: {
      b: {
        c: "value",
      },
    },
    x: null,
  };

  t.is(getNestedProperty(obj, "a.b.c"), "value");
  t.is(getNestedProperty(obj, "a.b"), obj.a.b);
  t.is(getNestedProperty(obj, "nonexistent"), undefined);
  t.is(getNestedProperty(obj, "a.nonexistent.c"), undefined);
  t.is(getNestedProperty(obj, "x.y"), undefined);
  t.is(getNestedProperty(obj, "nonexistent", "default"), "default");
});

test("capitalize works correctly", (t) => {
  t.is(capitalize("hello"), "Hello");
  t.is(capitalize("HELLO"), "HELLO");
  t.is(capitalize("h"), "H");
  t.is(capitalize(""), "");
  t.is(capitalize(null), null);
  t.is(capitalize(undefined), undefined);
  t.is(capitalize(123), 123);
});
