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

import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import test from 'ava';
import {
  startSession,
  getSession,
  listSessions,
  stepClassification,
  stepValues,
  commitSession,
  cancelSession,
} from '../src/session.js';

const SESSION_DIR = join(tmpdir(), 'design-data-sessions-' + randomUUID().slice(0, 8));
const OUTPUT_DIR = join(tmpdir(), 'design-data-output-' + randomUUID().slice(0, 8));

test.before(() => {
  mkdirSync(SESSION_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  // Override sessions directory to our tmp location.
  process.env.DESIGN_DATA_AUTHORING_SESSIONS_DIR = SESSION_DIR;
});

test.after(() => {
  delete process.env.DESIGN_DATA_AUTHORING_SESSIONS_DIR;
  rmSync(SESSION_DIR, { recursive: true, force: true });
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
});

test('startSession returns a draft with session_id and wizard state', (t) => {
  const draft = startSession('/path/to/dataset');
  t.is(typeof draft.session_id, 'string');
  t.is(draft.dataset_path, '/path/to/dataset');
  t.is(draft.wizard.intent, null);
  t.is(draft.wizard.classification, null);
});

test('getSession returns the stored session', (t) => {
  const draft = startSession('/path');
  const loaded = getSession(draft.session_id);
  t.is(loaded.session_id, draft.session_id);
});

test('getSession throws for unknown session_id', (t) => {
  t.throws(() => getSession('no-such-session-' + randomUUID()), { message: /not found/ });
});

test('stepClassification updates wizard classification', (t) => {
  const draft = startSession('/path');
  const updated = stepClassification(draft.session_id, {
    layer: 'product',
    property: 'background-color',
    nameFields: [{ key: 'component', value: 'button' }],
  });
  t.is(updated.wizard.classification.property, 'background-color');
  t.is(updated.wizard.classification.layer, 'product');
  t.deepEqual(updated.wizard.classification.nameFields, [{ key: 'component', value: 'button' }]);
});

test('stepValues updates wizard values', (t) => {
  const draft = startSession('/path');
  const rows = [{ mode_combo: [], kind: 'Literal', alias_target: '', literal: '#fff' }];
  const updated = stepValues(draft.session_id, rows);
  t.deepEqual(updated.wizard.values, rows);
});

test('listSessions includes active sessions', (t) => {
  const draft = startSession('/path');
  const sessions = listSessions();
  t.true(sessions.some((s) => s.session_id === draft.session_id));
});

test('cancelSession removes the session file', (t) => {
  const draft = startSession('/path');
  const result = cancelSession(draft.session_id);
  t.is(result.cancelled, draft.session_id);
  t.throws(() => getSession(draft.session_id), { message: /not found/ });
});

test('cancelSession is idempotent', (t) => {
  const draft = startSession('/path');
  cancelSession(draft.session_id);
  t.notThrows(() => cancelSession(draft.session_id));
});

test('commitSession writes token and removes session', (t) => {
  const draft = startSession('/path');
  stepClassification(draft.session_id, {
    layer: 'product',
    property: 'background-color',
  });
  stepValues(draft.session_id, [
    { mode_combo: [], kind: 'Literal', alias_target: '', literal: '#ffffff' },
  ]);
  const target = join(OUTPUT_DIR, 'output.json');
  const result = commitSession({
    sessionId: draft.session_id,
    schemaUrl: 'https://example.com/schema.json',
    target,
  });
  t.is(result.writtenTo, target);
  t.is(typeof result.tokenKey, 'string');
  // Session should be gone after commit.
  t.throws(() => getSession(draft.session_id), { message: /not found/ });
});

test('commitSession throws if classification not set', (t) => {
  const draft = startSession('/path');
  t.throws(
    () =>
      commitSession({
        sessionId: draft.session_id,
        schemaUrl: 'https://example.com/schema.json',
        target: join(OUTPUT_DIR, 'x.json'),
      }),
    { message: /classification/ },
  );
});
