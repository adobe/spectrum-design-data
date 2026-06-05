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
 * Token write helpers — pure Node.js implementations of the CLI's write and
 * write-token operations. No native binary required.
 *
 * These mirror `design-data write` and `design-data write-token` but run
 * in-process, with atomic file writes (tmp-then-rename) for safety.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Atomically write `content` to `dest` (via a `.tmp` sibling).
 *
 * @param {string} dest
 * @param {string} content
 */
function atomicWrite(dest, content) {
  const tmp = dest + '.tmp.' + randomUUID().slice(0, 8);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, dest);
}

/**
 * Write or update a `product-context.json` document.
 *
 * Mirrors `design-data write --output <path> [--rationale <text>]`.
 * Creates the file if absent with the standard `specVersion`/`layer`/`createdBy`
 * scaffold; overwrites in place if it already exists.
 *
 * @param {object} opts
 * @param {string} opts.output - Destination file path.
 * @param {string} [opts.rationale] - Optional rationale string to embed.
 * @returns {string} Confirmation message (matches CLI stdout).
 */
export function writeProductContext({ output, rationale } = {}) {
  const dest = resolve(output);
  let doc;
  try {
    doc = JSON.parse(readFileSync(dest, 'utf-8'));
  } catch {
    doc = {
      specVersion: '1.0.0-draft',
      layer: 'product',
    };
  }
  if (rationale != null) doc.rationale = rationale;
  doc.createdBy = { type: 'agent', tool: 'design-data' };
  doc.createdAt = new Date().toISOString();

  atomicWrite(dest, JSON.stringify(doc, null, 2) + '\n');
  return `Wrote ${dest}`;
}

/**
 * Write a single token into a target JSON file.
 *
 * Mirrors `design-data write-token <key>` (without JSON-Schema validation —
 * structural validation requires the schema files, which callers should handle
 * at a higher level or via the CLI if strict validation is needed).
 *
 * The target file is treated as an object-keyed token map (legacy format):
 *   `{ "<key>": { ...token fields... } }`
 * If the file is absent it is created; if it exists the key is merged in.
 *
 * @param {string} key - Token key, e.g. `"accent-background-color-default"`.
 * @param {object} token - The token object to write (must include `$schema`, `uuid`, etc.).
 * @param {object} [opts]
 * @param {string} opts.target - Target file path.
 * @param {string} [opts.productContext] - Optional path to product-context.json to update.
 * @param {string} [opts.rationale] - Rationale to embed in the product-context update.
 * @param {boolean} [opts.isOverride] - Whether this is a product-layer override.
 * @returns {{ writtenTo: string, productContextUpdated: boolean }}
 */
export function writeToken(key, token, { target, productContext, rationale, isOverride = false } = {}) {
  const dest = resolve(target);
  let existing;
  try {
    existing = JSON.parse(readFileSync(dest, 'utf-8'));
  } catch {
    existing = {};
  }
  existing[key] = token;
  atomicWrite(dest, JSON.stringify(existing, null, 2) + '\n');

  let productContextUpdated = false;
  if (productContext) {
    writeProductContext({ output: productContext, rationale });
    productContextUpdated = true;
  }

  return { writtenTo: dest, productContextUpdated };
}

/**
 * Build a cascade-format token object from authoring-session wizard state.
 *
 * Converts the wizard's `rows` (ValueRowInput[]) into either a simple
 * `{ value }` token or a `{ sets: { ... } }` multi-mode token.
 *
 * @param {object} opts
 * @param {string} opts.schemaUrl - The `$schema` URL.
 * @param {object} opts.classification - `{ layer, property, nameFields }`.
 * @param {Array<{mode_combo: string[][], kind: 'Literal'|'Alias', alias_target: string, literal: string}>} opts.rows
 * @param {string} opts.uuid - Token UUID.
 * @returns {[string, object]} Tuple of [tokenKey, tokenObject].
 */
export function buildTokenFromWizard({ schemaUrl, classification, rows, uuid }) {
  const { layer, property, nameFields = [] } = classification;
  const name = { property };
  for (const { key, value } of nameFields) name[key] = value;

  const tokenKey = [property, ...nameFields.map(({ value }) => value)].join('/');

  // Build the value portion from rows.
  let tokenValue;
  if (rows.length === 1 && rows[0].mode_combo.length === 0) {
    // Single base value — simple format.
    const row = rows[0];
    tokenValue = row.kind === 'Alias'
      ? { value: { ref: row.alias_target } }
      : { value: row.literal };
  } else {
    // Multi-mode format: group rows by the first dimension key.
    const sets = {};
    for (const row of rows) {
      let target = sets;
      const pairs = row.mode_combo;
      for (let i = 0; i < pairs.length; i++) {
        const [k, v] = pairs[i];
        if (i < pairs.length - 1) {
          target[k] = target[k] ?? {};
          target = target[k][v] = target[k][v] ?? {};
        } else {
          target[k] = target[k] ?? {};
          target[k][v] = row.kind === 'Alias'
            ? { value: { ref: row.alias_target } }
            : { value: row.literal };
        }
      }
    }
    tokenValue = { sets };
  }

  const token = {
    $schema: schemaUrl,
    uuid: uuid ?? randomUUID(),
    name,
    layer,
    ...tokenValue,
  };

  return [tokenKey, token];
}
