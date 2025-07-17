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
  assert,
  isObject,
  isString,
  isBoolean,
  isNumber,
} from "../src/lib/helpers.js";

test("isObject - returns true for plain objects", (t) => {
  t.true(isObject({}));
  t.true(isObject({ a: 1 }));
  t.true(isObject(new Object()));
});

test("isObject - returns false for non-objects", (t) => {
  t.false(isObject(null));
  t.false(isObject(undefined));
  t.false(isObject(42));
  t.false(isObject("string"));
  // Arrays are objects in JavaScript, so isObject returns true for them
  t.true(isObject([]));
  t.false(isObject(true));
});

test("isString - returns true for strings", (t) => {
  t.true(isString("hello"));
  t.true(isString(""));
  t.true(isString(String("hello")));
});

test("isString - returns false for non-strings", (t) => {
  t.false(isString(42));
  t.false(isString({}));
  t.false(isString([]));
  t.false(isString(null));
  t.false(isString(undefined));
  t.false(isString(true));
});

test("isBoolean - returns true for booleans", (t) => {
  t.true(isBoolean(true));
  t.true(isBoolean(false));
});

test("isBoolean - returns false for non-booleans", (t) => {
  t.false(isBoolean(1));
  t.false(isBoolean(0));
  t.false(isBoolean("true"));
  t.false(isBoolean("false"));
  t.false(isBoolean({}));
  t.false(isBoolean([]));
  t.false(isBoolean(null));
  t.false(isBoolean(undefined));
});

test("isNumber - returns true for numbers", (t) => {
  t.true(isNumber(42));
  t.true(isNumber(0));
  t.true(isNumber(-42));
  t.true(isNumber(3.14));
  t.true(isNumber(Infinity));
  t.true(isNumber(NaN));
});

test("isNumber - returns false for non-numbers", (t) => {
  t.false(isNumber("42"));
  t.false(isNumber({}));
  t.false(isNumber([]));
  t.false(isNumber(null));
  t.false(isNumber(undefined));
  t.false(isNumber(true));
});

test("assert - does not throw when condition is true", (t) => {
  t.notThrows(() => assert(true));
  t.notThrows(() => assert(1));
  t.notThrows(() => assert("hello"));
  t.notThrows(() => assert({}));
});

test("assert - throws when condition is false without message", (t) => {
  const error = t.throws(() => assert(false));
  // Error constructor converts undefined message to empty string
  t.is(error.message, "");
});

test("assert - throws when condition is false with message", (t) => {
  const customMessage = "This is a custom error message";
  const error = t.throws(() => assert(false, customMessage));
  t.is(error.message, customMessage);
});

test("assert - throws when condition is falsy without message", (t) => {
  const error1 = t.throws(() => assert(0));
  // Error constructor converts undefined message to empty string
  t.is(error1.message, "");

  const error2 = t.throws(() => assert(""));
  t.is(error2.message, "");

  const error3 = t.throws(() => assert(null));
  t.is(error3.message, "");
});

test("assert - throws when condition is falsy with message", (t) => {
  const customMessage = "Falsy value error";

  const error1 = t.throws(() => assert(0, customMessage));
  t.is(error1.message, customMessage);

  const error2 = t.throws(() => assert("", customMessage));
  t.is(error2.message, customMessage);

  const error3 = t.throws(() => assert(null, customMessage));
  t.is(error3.message, customMessage);
});
