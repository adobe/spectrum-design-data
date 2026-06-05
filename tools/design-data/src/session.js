// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * On-disk authoring-session store — JS port of sdk/core/src/authoring/session.rs.
 *
 * Session state is one JSON file per session in the sessions directory, matching
 * the file format produced by the Rust CLI so that in-progress sessions started by
 * the CLI can be continued here and vice versa.
 *
 * NOTE: `stepIntent` (the NLP suggestion-ranking step) still delegates to the CLI
 * because the `suggest` API is not yet exposed on the wasm surface. All other
 * session operations (start, classification, values, commit, cancel, get, list)
 * run fully in-process.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import {
  buildTokenFromWizard,
  writeToken,
  writeProductContext,
} from "./write.js";
import { validateTokenAgainstSchema, resolveSchemaDir } from "./validate.js";

/**
 * Return the directory where session JSON files are stored.
 * Mirrors `sessions_dir()` from sdk/core/src/authoring/session.rs.
 *
 * @returns {string}
 */
function sessionsDir() {
  if (process.env.DESIGN_DATA_AUTHORING_SESSIONS_DIR) {
    return process.env.DESIGN_DATA_AUTHORING_SESSIONS_DIR;
  }
  let base;
  if (process.platform === "win32") {
    base = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  } else if (process.platform === "darwin") {
    base = join(homedir(), "Library", "Application Support");
  } else {
    base = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  }
  return join(base, "design-data", "authoring-sessions");
}

function sessionPath(sessionId) {
  return join(sessionsDir(), `${sessionId}.json`);
}

function atomicWriteSession(draft) {
  const dir = sessionsDir();
  mkdirSync(dir, { recursive: true });
  const tmp =
    sessionPath(draft.session_id) + ".tmp." + randomUUID().slice(0, 8);
  writeFileSync(tmp, JSON.stringify(draft, null, 2) + "\n", "utf-8");
  renameSync(tmp, sessionPath(draft.session_id));
}

function readSessionOrThrow(sessionId) {
  try {
    return JSON.parse(readFileSync(sessionPath(sessionId), "utf-8"));
  } catch {
    throw new Error(`Session not found: ${sessionId}`);
  }
}

/**
 * Start a new authoring session.
 *
 * @param {string} datasetPath - Absolute path to the token dataset directory.
 * @returns {{ session_id: string, dataset_path: string, wizard: object }}
 */
export function startSession(datasetPath) {
  const sessionId = randomUUID();
  const draft = {
    session_id: sessionId,
    dataset_path: datasetPath,
    wizard: {
      intent: null,
      classification: null,
      values: null,
    },
  };
  atomicWriteSession(draft);
  return draft;
}

/**
 * Get the current state of a session.
 *
 * @param {string} sessionId
 */
export function getSession(sessionId) {
  return readSessionOrThrow(sessionId);
}

/**
 * List all active sessions.
 *
 * @returns {object[]}
 */
export function listSessions() {
  const dir = sessionsDir();
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"))
      .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")));
  } catch {
    return [];
  }
}

/**
 * Update the classification step (layer, property, nameFields).
 *
 * @param {string} sessionId
 * @param {{ layer: string, property: string, nameFields?: Array<{key:string,value:string}> }} opts
 * @returns {object} Updated session draft.
 */
export function stepClassification(
  sessionId,
  { layer, property, nameFields = [] },
) {
  const draft = readSessionOrThrow(sessionId);
  draft.wizard.classification = { layer, property, nameFields };
  atomicWriteSession(draft);
  return draft;
}

/**
 * Update the values step (mode-specific literal or alias rows).
 *
 * @param {string} sessionId
 * @param {Array<{mode_combo: string[][], kind: 'Literal'|'Alias', alias_target: string, literal: string}>} rows
 * @returns {object} Updated session draft.
 */
export function stepValues(sessionId, rows) {
  const draft = readSessionOrThrow(sessionId);
  draft.wizard.values = rows;
  atomicWriteSession(draft);
  return draft;
}

/**
 * Commit the session: build the token from wizard state, validate it against its
 * JSON Schema (Layer-1), write it to disk, and delete the session file.
 *
 * @param {object} opts
 * @param {string} opts.sessionId
 * @param {string} opts.schemaUrl - The `$schema` URL for the token type.
 * @param {string} opts.target - Target file path.
 * @param {string} [opts.rationale]
 * @param {string} [opts.productContext]
 * @param {string} [opts.schemaPath] - Path to the schemas/ directory (contains
 *   token-types/ and token-file.json). Defaults to @adobe/spectrum-tokens schemas.
 *   Pass an explicit path when working with a custom schema set.
 * @param {boolean} [opts.isOverride]
 * @returns {{ writtenTo: string, productContextUpdated: boolean, tokenKey: string }}
 * @throws {Error} When the built token fails Layer-1 JSON-Schema validation.
 */
export function commitSession({
  sessionId,
  schemaUrl,
  target,
  rationale,
  productContext,
  schemaPath,
  isOverride = false,
}) {
  const draft = readSessionOrThrow(sessionId);

  if (!draft.wizard.classification) {
    throw new Error(
      `Session ${sessionId} has no classification step — call stepClassification first.`,
    );
  }
  if (!draft.wizard.values || draft.wizard.values.length === 0) {
    throw new Error(
      `Session ${sessionId} has no values step — call stepValues first.`,
    );
  }

  const [tokenKey, token] = buildTokenFromWizard({
    schemaUrl,
    classification: draft.wizard.classification,
    rows: draft.wizard.values,
    uuid: randomUUID(),
  });

  // Layer-1: validate the built token against its JSON Schema before writing.
  // Validation runs when a schema directory is available. If schemaPath is
  // explicitly provided it must resolve (throws on bad path). If it is omitted
  // and auto-discovery finds nothing (e.g. @adobe/spectrum-tokens not installed),
  // validation is skipped rather than blocking the commit.
  const schemaDir = resolveSchemaDir(schemaPath ?? null, {
    required: !!schemaPath,
  });
  if (schemaDir) {
    const validation = validateTokenAgainstSchema(token, schemaDir);
    if (!validation.valid) {
      const summary = validation.errors.map((e) => e.message).join("; ");
      throw new Error(`Token failed JSON-Schema validation: ${summary}`);
    }
  }

  const result = writeToken(tokenKey, token, {
    target,
    productContext,
    rationale,
    isOverride,
  });

  // Delete session file after successful commit.
  try {
    unlinkSync(sessionPath(sessionId));
  } catch {
    /* already gone */
  }

  return { ...result, tokenKey };
}

/**
 * Cancel and delete a session.
 *
 * @param {string} sessionId
 * @returns {{ cancelled: string }}
 */
export function cancelSession(sessionId) {
  try {
    unlinkSync(sessionPath(sessionId));
  } catch {
    /* already gone — idempotent */
  }
  return { cancelled: sessionId };
}
