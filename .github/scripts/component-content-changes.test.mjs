// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { semanticallyEqual } from './component-content-changes.mjs';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

// #1561 (be208cef) moved "implementations" after "documentBlocks" in action-bar.json and changed nothing else.
test('the #1561 key reorder is not a content change', () => {
  const before = fixture('component-formatting-before.json');
  const after = fixture('component-formatting-after.json');
  assert.notEqual(before, after);
  assert.ok(semanticallyEqual(before, after));
});

test('whitespace inside text is normalized', () => {
  assert.ok(semanticallyEqual('{"a":"x  y\\n z"}', '{"a":" x y z "}'));
});

test('a changed value or array order is a content change', () => {
  assert.ok(!semanticallyEqual('{"a":"x"}', '{"a":"y"}'));
  assert.ok(!semanticallyEqual('{"a":[1,2]}', '{"a":[2,1]}'));
});
