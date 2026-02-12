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
  validateComponentName,
  validateLimit,
  validatePropsObject,
  validateStringParam,
} from "../../src/utils/validation.js";

test("validateComponentName accepts non-empty string and trims", (t) => {
  t.is(validateComponentName("action-button"), "action-button");
  t.is(validateComponentName("  text-field  "), "text-field");
});

test("validateComponentName throws for empty string", (t) => {
  const err = t.throws(() => validateComponentName(""));
  t.true(err.message.includes("non-empty string"));
});

test("validateComponentName throws for non-string", (t) => {
  t.throws(() => validateComponentName(null));
  t.throws(() => validateComponentName(undefined));
  t.throws(() => validateComponentName(123));
  t.throws(() => validateComponentName({}));
});

test("validateComponentName throws for path separators", (t) => {
  const err1 = t.throws(() => validateComponentName("foo/bar"));
  t.true(err1.message.includes("path separators"));
  const err2 = t.throws(() => validateComponentName("foo\\bar"));
  t.true(err2.message.includes("path separators"));
});

test("validateLimit returns default for invalid input", (t) => {
  t.is(validateLimit(undefined, 50), 50);
  t.is(validateLimit(NaN, 20), 20);
  t.is(validateLimit(0, 50), 50);
  t.is(validateLimit(-1, 50), 50);
});

test("validateLimit clamps to maxLimit", (t) => {
  t.is(validateLimit(200, 50, 100), 100);
  t.is(validateLimit(50, 50, 100), 50);
});

test("validateLimit accepts valid number", (t) => {
  t.is(validateLimit(25, 50), 25);
  t.is(validateLimit(1, 50), 1);
});

test("validatePropsObject accepts plain object", (t) => {
  const obj = { a: 1 };
  t.is(validatePropsObject(obj), obj);
});

test("validatePropsObject throws for non-object", (t) => {
  t.throws(() => validatePropsObject(null));
  t.throws(() => validatePropsObject(undefined));
  t.throws(() => validatePropsObject("string"));
});

test("validatePropsObject throws for array", (t) => {
  const err = t.throws(() => validatePropsObject([]));
  t.true(err.message.includes("valid object"));
});

test("validateStringParam returns undefined for missing param", (t) => {
  t.is(validateStringParam(undefined, "foo"), undefined);
  t.is(validateStringParam(null, "foo"), undefined);
});

test("validateStringParam returns string for valid param", (t) => {
  t.is(validateStringParam("hello", "foo"), "hello");
});

test("validateStringParam throws for non-string when provided", (t) => {
  const err = t.throws(() => validateStringParam(123, "paramName"));
  t.true(err.message.includes("paramName"));
  t.true(err.message.includes("string"));
});
