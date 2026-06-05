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
 * MCP tool definitions for @adobe/design-data-mcp.
 *
 * All tools run in-process via @adobe/design-data-wasm — no CLI binary or npx
 * required. Dataset.embedded() provides the canonical Spectrum snapshot with
 * zero configuration.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

let _wasm;
/** Lazy-load and cache the wasm module (nodejs target, no init() required). */
async function getWasm() {
  if (!_wasm) _wasm = await import('@adobe/design-data-wasm');
  return _wasm;
}

/** Return the @adobe/spectrum-design-data package root directory, or null. */
function resolveSpectrumDataPackage() {
  try {
    const req = createRequire(import.meta.url);
    return dirname(req.resolve('@adobe/spectrum-design-data/package.json'));
  } catch {
    return null;
  }
}

export function createDesignDataTools() {
  return [
    // ── primer ─────────────────────────────────────────────────────────────
    {
      name: 'design-data-primer',
      description:
        'Get a structural overview of the Spectrum design dataset: token count, ' +
        'available mode-sets (color-scheme, scale, contrast), component list, ' +
        'taxonomy fields, and data provenance. Call this at the start of a ' +
        'design-token session to understand what data is available.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      async handler() {
        const wasm = await getWasm();
        const ds = wasm.Dataset.embedded();

        return {
          source: 'embedded',
          tokenCount: ds.tokenCount(),
          modeSets: {
            colorScheme: wasm.getFieldValues('colorScheme') ?? [],
            scale: wasm.getFieldValues('scale') ?? [],
            contrast: wasm.getFieldValues('contrast') ?? [],
          },
          taxonomyFields: {
            indexed: ['property', 'component', 'variant', 'state', 'colorScheme', 'scale', 'contrast', 'uuid'],
            advisory: wasm.getAdvisoryFields() ?? [],
          },
          components: wasm.getFieldValues('component') ?? [],
          properties: wasm.getFieldValues('property') ?? [],
        };
      },
    },

    // ── query ───────────────────────────────────────────────────────────────
    {
      name: 'design-data-query',
      description:
        'Filter Spectrum tokens by a query expression. ' +
        'Expression syntax: `component=button`, `component=button,state=hover`, ' +
        '`property=color-*`, `colorScheme=dark`. ' +
        'Returns an array of matching token objects.',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description:
              'Query expression, e.g. "component=button" or "property=color-*,component=action-button"',
          },
        },
        required: ['filter'],
        additionalProperties: false,
      },
      async handler({ filter }) {
        const wasm = await getWasm();
        return wasm.Dataset.embedded().query(filter);
      },
    },

    // ── suggest ─────────────────────────────────────────────────────────────
    {
      name: 'design-data-suggest',
      description:
        'Suggest Spectrum tokens matching a natural-language intent. ' +
        'Returns ranked matches with confidence scores, token names, and values. ' +
        'Use when the user describes what they need rather than knowing the token name.',
      inputSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description:
              'Natural-language description of the design need, e.g. "primary CTA button background color"',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of suggestions to return (default: 5)',
            default: 5,
          },
        },
        required: ['intent'],
        additionalProperties: false,
      },
      async handler({ intent, limit = 5 }) {
        const wasm = await getWasm();
        const ds = wasm.Dataset.embedded();
        // Keyword-based ranking over token names. The NLP-ranked CLI suggest is
        // more accurate; this runs fully in-process without the CLI.
        const words = intent.toLowerCase().split(/\s+/).filter(Boolean);
        const allTokens = ds.query('');
        const scored = allTokens
          .map((token) => {
            const nameStr = token.name.toLowerCase();
            const matches = words.filter((w) => nameStr.includes(w)).length;
            const confidence = words.length > 0 ? matches / words.length : 0;
            return { token, confidence };
          })
          .filter(({ confidence }) => confidence > 0)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, limit);

        return scored.map(({ token, confidence }) => ({
          name: token.name,
          confidence: Math.round(confidence * 100) / 100,
          uuid: token.uuid,
          raw: token.raw,
        }));
      },
    },

    // ── component ───────────────────────────────────────────────────────────
    {
      name: 'design-data-component',
      description:
        "Get the full component declaration for a Spectrum component by ID. " +
        "Returns the component's displayName, description, and all available options " +
        "(variants, sizes, states, boolean props, etc.). " +
        'Component IDs are kebab-case, e.g. button, action-button, text-field, picker.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Component ID in kebab-case, e.g. button, action-button, picker, text-field',
          },
        },
        required: ['id'],
        additionalProperties: false,
      },
      async handler({ id }) {
        const pkgRoot = resolveSpectrumDataPackage();
        if (!pkgRoot) {
          throw new Error(
            `@adobe/spectrum-design-data is not installed — cannot load component "${id}". ` +
            `Install it with: pnpm add @adobe/spectrum-design-data`,
          );
        }
        const componentFile = join(pkgRoot, 'components', `${id}.json`);
        if (!existsSync(componentFile)) {
          throw new Error(
            `Component not found: "${id}". ` +
            `Call design-data-primer to see available component IDs.`,
          );
        }
        return JSON.parse(readFileSync(componentFile, 'utf-8'));
      },
    },

    // ── resolve ─────────────────────────────────────────────────────────────
    {
      name: 'design-data-resolve',
      description:
        'Resolve the concrete value of a Spectrum token property for a given ' +
        'mode-set context (color-scheme, scale, contrast). ' +
        'Returns the winning token with its resolved value.',
      inputSchema: {
        type: 'object',
        properties: {
          property: {
            type: 'string',
            description: 'Token property name, e.g. background-color-default, accent-color',
          },
          colorScheme: { type: 'string', description: 'Color scheme mode, e.g. "light" or "dark"' },
          scale: { type: 'string', description: 'Scale mode, e.g. "desktop" or "mobile"' },
          contrast: { type: 'string', description: 'Contrast mode, e.g. "regular" or "high"' },
        },
        required: ['property'],
        additionalProperties: false,
      },
      async handler({ property, colorScheme, scale, contrast }) {
        const wasm = await getWasm();
        const context = {};
        if (colorScheme) context.colorScheme = colorScheme;
        if (scale) context.scale = scale;
        if (contrast) context.contrast = contrast;
        const result = wasm.Dataset.embedded().resolve(property, context);
        if (!result) {
          throw new Error(
            `No token found for property "${property}" in context ${JSON.stringify(context)}`,
          );
        }
        return result;
      },
    },
  ];
}
