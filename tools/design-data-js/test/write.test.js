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

import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import test from 'ava';
import {
  writeProductContext,
  writeToken,
  buildTokenFromWizard,
} from '../src/write.js';

// Use a unique temp directory per test run.
const TMP = join(tmpdir(), 'design-data-js-test-' + randomUUID().slice(0, 8));

test.before(() => mkdirSync(TMP, { recursive: true }));
test.after(() => rmSync(TMP, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// writeProductContext
// ---------------------------------------------------------------------------

test('writeProductContext creates file with specVersion and layer', (t) => {
  const output = join(TMP, 'product-context-new.json');
  const msg = writeProductContext({ output });
  t.is(typeof msg, 'string');
  t.true(msg.includes('Wrote'));
  const doc = JSON.parse(readFileSync(output, 'utf-8'));
  t.is(doc.specVersion, '1.0.0-draft');
  t.is(doc.layer, 'product');
  t.is(doc.createdBy?.type, 'agent');
  t.is(typeof doc.createdAt, 'string');
});

test('writeProductContext embeds rationale when provided', (t) => {
  const output = join(TMP, 'product-context-rationale.json');
  writeProductContext({ output, rationale: 'test reason' });
  const doc = JSON.parse(readFileSync(output, 'utf-8'));
  t.is(doc.rationale, 'test reason');
});

test('writeProductContext overwrites createdAt on repeated calls', (t) => {
  const output = join(TMP, 'product-context-overwrite.json');
  writeProductContext({ output });
  const first = JSON.parse(readFileSync(output, 'utf-8')).createdAt;
  writeProductContext({ output });
  const second = JSON.parse(readFileSync(output, 'utf-8')).createdAt;
  // Both should be valid ISO timestamps.
  t.true(new Date(first).getTime() <= new Date(second).getTime());
});

// ---------------------------------------------------------------------------
// writeToken
// ---------------------------------------------------------------------------

test('writeToken creates target file with token at key', (t) => {
  const target = join(TMP, 'tokens.json');
  const token = {
    $schema: 'https://example.com/schema.json',
    uuid: randomUUID(),
    name: { property: 'test-prop' },
    value: '#ffffff',
  };
  const result = writeToken('test-key', token, { target });
  t.is(result.writtenTo, target);
  t.false(result.productContextUpdated);
  const file = JSON.parse(readFileSync(target, 'utf-8'));
  t.deepEqual(file['test-key'], token);
});

test('writeToken merges into existing file', (t) => {
  const target = join(TMP, 'tokens-merge.json');
  const existing = { 'existing-key': { value: '#000' } };
  writeToken('existing-key', existing['existing-key'], { target });
  writeToken('new-key', { value: '#fff' }, { target });
  const file = JSON.parse(readFileSync(target, 'utf-8'));
  t.truthy(file['existing-key']);
  t.truthy(file['new-key']);
});

test('writeToken updates productContext when provided', (t) => {
  const target = join(TMP, 'tokens-pc.json');
  const pc = join(TMP, 'product-context-pc.json');
  const result = writeToken('tk', { value: '#abc' }, { target, productContext: pc, rationale: 'why' });
  t.true(result.productContextUpdated);
  const doc = JSON.parse(readFileSync(pc, 'utf-8'));
  t.is(doc.rationale, 'why');
});

// ---------------------------------------------------------------------------
// buildTokenFromWizard
// ---------------------------------------------------------------------------

test('buildTokenFromWizard builds a simple base-value token', (t) => {
  const [key, token] = buildTokenFromWizard({
    schemaUrl: 'https://example.com/schema.json',
    classification: { layer: 'product', property: 'background-color' },
    rows: [{ mode_combo: [], kind: 'Literal', alias_target: '', literal: '#ffffff' }],
    uuid: 'aaaaaaaa-0001-4000-8000-000000000001',
  });
  t.is(typeof key, 'string');
  t.true(key.startsWith('background-color'));
  t.is(token.value, '#ffffff');
  t.is(token.layer, 'product');
  t.is(token.$schema, 'https://example.com/schema.json');
  t.is(token.uuid, 'aaaaaaaa-0001-4000-8000-000000000001');
});

test('buildTokenFromWizard builds an alias token', (t) => {
  const [, token] = buildTokenFromWizard({
    schemaUrl: 'https://example.com/schema.json',
    classification: { layer: 'product', property: 'border-color' },
    rows: [{ mode_combo: [], kind: 'Alias', alias_target: 'accent-color', literal: '' }],
    uuid: randomUUID(),
  });
  t.deepEqual(token.value, { ref: 'accent-color' });
});
