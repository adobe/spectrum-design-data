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
 * Build-time token resolver for s2-tokens-viewer.
 *
 * Reads the object-map token files that prepare.mjs deposited under tokens/, enumerates
 * every slug and its context keys, then resolves each (slug, context) pair via
 * Dataset.resolveReference() from @adobe/design-data-wasm (node build, no init() needed).
 *
 * Emits tokens/resolved.json:
 *   {
 *     _meta: { generated, slugCount, resolvedCount, wasmCount, missingCount, datasetTokenCount },
 *     tokens: { [slug]: { [ctx]: { value, chain } } }
 *   }
 *
 * Run via `moon run viewer:resolve` or `node scripts/resolve.mjs` from docs/s2-tokens-viewer/.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tokensDir = join(root, 'tokens');
const cascadeDir = join(root, 'cascade');
const outPath = join(tokensDir, 'resolved.json');
const colorComponentOutPath = join(tokensDir, 'color-component.json');
const layoutComponentOutPath = join(tokensDir, 'layout-component.json');
const layoutComponentSrcPath = join(root, 'node_modules/@adobe/spectrum-tokens/src/layout-component.json');

// The CTR migration (#1330) removed the aggregated color-component.json and reorganized
// component tokens into per-component files (action-bar.json, avatar.json, ...). The viewer's
// "Component colors" tab still expects one aggregated file, so this rebuilds it at build time.
const FOUNDATION_FILES = new Set([
  'color-palette.json',
  'color-aliases.json',
  'semantic-color-palette.json',
  'icons.json',
  'layout.json',
  'layout-component.json',
  'typography.json',
]);

// Context key → cascade name-object field mapping (from spike Phase C).
const CTX_MAP = {
  light:     { colorScheme: 'light' },
  dark:      { colorScheme: 'dark' },
  wireframe: { colorScheme: 'wireframe' },
  desktop:   { scale: 'desktop' },
  mobile:    { scale: 'mobile' },
};

/**
 * Return true if obj looks like a token record (not a package.json, manifest, etc.)
 */
function isTokenRecord(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return obj.$schema !== undefined || obj.value !== undefined || obj.sets !== undefined;
}

/**
 * Load and merge all object-map token files from tokensDir.
 * Returns:
 *   slugs: Map<string, Set<string>>  — slug → set of context keys it has
 *   sourceMap: Object                — merged { slug: entry } across all files (priority: later files win)
 */
function loadObjectMap() {
  const slugs = new Map();
  const files = readdirSync(tokensDir)
    .filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'resolved.json' && f !== 'color-component.json')
    .sort(); // deterministic order

  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(tokensDir, file), 'utf-8'));
    } catch (e) {
      console.warn(`[resolve] Skipping unparseable file: ${file} — ${e.message}`);
      continue;
    }
    if (Array.isArray(data)) continue; // cascade format — skip

    for (const [slug, entry] of Object.entries(data)) {
      if (!isTokenRecord(entry)) continue;
      const ctxKeys = entry.sets ? Object.keys(entry.sets).filter(k => k in CTX_MAP) : [];
      // Merge context keys across files (union).
      if (slugs.has(slug)) {
        for (const k of ctxKeys) slugs.get(slug).add(k);
      } else {
        slugs.set(slug, new Set(ctxKeys));
      }
    }
  }
  return { slugs };
}

/**
 * True if a resolved value string is a color (hex or rgb/rgba).
 */
function isColorValue(value) {
  return typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\()/i.test(value);
}

/**
 * True if any of a token's alias values (flat `value` or per-context `sets.*.value`)
 * resolve to a color, using the same Dataset the rest of this script already loaded.
 */
function resolvesToColor(ds, entry) {
  const values = entry.sets
    ? Object.values(entry.sets).map(set => set.value)
    : [entry.value];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    if (!value.includes('{')) {
      if (isColorValue(value)) return true;
      continue;
    }
    for (const ctx of Object.values(CTX_MAP)) {
      const r = ds.resolveReference(value, ctx);
      if (r && isColorValue(r.value)) return true;
    }
  }
  return false;
}

/**
 * Rebuild the aggregated color-component.json that the CTR migration (#1330) removed, by
 * scanning the per-component object-map files for color-domain tokens (color-set/opacity
 * schema, or an alias value that resolves to a color).
 */
function buildColorComponentFile(ds) {
  const aggregated = {};
  const files = readdirSync(tokensDir)
    .filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'resolved.json'
      && f !== 'color-component.json' && !FOUNDATION_FILES.has(f))
    .sort(); // deterministic order

  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(tokensDir, file), 'utf-8'));
    } catch {
      continue; // already warned about unparseable files in loadObjectMap()
    }
    if (Array.isArray(data)) continue; // cascade format — skip

    for (const [name, entry] of Object.entries(data)) {
      if (!isTokenRecord(entry) || !entry.component) continue;
      const schema = entry.$schema || '';
      const isColorDomain = schema.endsWith('color-set.json') || schema.endsWith('opacity.json')
        || resolvesToColor(ds, entry);
      if (isColorDomain) aggregated[name] = entry;
    }
  }

  writeFileSync(colorComponentOutPath, JSON.stringify(aggregated, null, 2));
  console.log(`[resolve] Wrote ${colorComponentOutPath} (${Object.keys(aggregated).length} tokens)`);
}

/**
 * Merge every NON-color component token into the source-shipped `layout-component.json`
 * (which, post-CTR, only retains a handful of leftover icon-size tokens — the rest moved to
 * per-component files). Mirrors buildColorComponentFile()'s scan but takes the opposite side
 * of the same color-domain test, so every component token lands in exactly one aggregate.
 *
 * Seeds from the pristine copy in node_modules (not tokens/layout-component.json, which this
 * function overwrites) so re-running the script never re-reads its own prior output — a token
 * renamed or removed from a per-component source file is dropped, not carried forward forever.
 */
function buildLayoutComponentFile(ds) {
  const aggregated = JSON.parse(readFileSync(layoutComponentSrcPath, 'utf-8'));
  const files = readdirSync(tokensDir)
    .filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'resolved.json'
      && f !== 'color-component.json' && !FOUNDATION_FILES.has(f))
    .sort(); // deterministic order

  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(tokensDir, file), 'utf-8'));
    } catch {
      continue; // already warned about unparseable files in loadObjectMap()
    }
    if (Array.isArray(data)) continue; // cascade format — skip

    for (const [name, entry] of Object.entries(data)) {
      if (!isTokenRecord(entry) || !entry.component) continue;
      const schema = entry.$schema || '';
      const isColorDomain = schema.endsWith('color-set.json') || schema.endsWith('opacity.json')
        || resolvesToColor(ds, entry);
      if (!isColorDomain) aggregated[name] = entry;
    }
  }

  writeFileSync(layoutComponentOutPath, JSON.stringify(aggregated, null, 2));
  console.log(`[resolve] Wrote ${layoutComponentOutPath} (${Object.keys(aggregated).length} tokens)`);
}

/**
 * Load every cascade-format .json file from cascadeDir (produced by
 * `moon run viewer:convert` via `design-data migrate convert`) into one flat token array
 * suitable for Dataset.fromTokens(). Each file is a top-level array of cascade token objects.
 */
function loadCascadeTokens() {
  const tokens = [];
  for (const file of readdirSync(cascadeDir).filter(f => f.endsWith('.json')).sort()) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(cascadeDir, file), 'utf-8'));
    } catch (e) {
      console.warn(`[resolve] Skipping unparseable cascade file: ${file} — ${e.message}`);
      continue;
    }
    if (Array.isArray(data)) tokens.push(...data);
  }
  return tokens;
}

async function main() {
  // Load wasm — node build is synchronous; no init() call needed.
  const wasm = await import('@adobe/design-data-wasm');
  // Build the dataset from the viewer's own cascade-converted source (not Dataset.embedded(),
  // a packages/design-data/tokens snapshot that post-CTR no longer carries component tokens
  // as resolvable entries — see #1330) so every token, including component tokens, resolves.
  const cascadeTokens = loadCascadeTokens();
  const ds = wasm.Dataset.fromTokens(cascadeTokens);
  const datasetTokenCount = ds.tokenCount();

  buildColorComponentFile(ds);
  buildLayoutComponentFile(ds);

  const { slugs } = loadObjectMap();
  console.log(`[resolve] ${slugs.size} slugs, ${datasetTokenCount} tokens in cascade dataset`);

  const resolved = {};
  let wasmCount = 0;
  let missingCount = 0;

  for (const [slug, ctxSet] of slugs) {
    const ref = `{${slug}}`;
    // Tokens without sets (single-value, no context key) still need to be resolved per theme
    // because they may reference tokens that DO have sets (e.g. {blue-900} has light/dark/wireframe).
    const ctxKeys = ctxSet.size > 0 ? [...ctxSet] : Object.keys(CTX_MAP);

    const byCtx = {};
    for (const ctx of ctxKeys) {
      const ctxMap = ctx ? CTX_MAP[ctx] : {};
      const r = ds.resolveReference(ref, ctxMap);

      if (r && r.value !== undefined) {
        byCtx[ctx] = { value: r.value, chain: r.chain };
        wasmCount++;
      }
      // Cross-domain misses (color token asked for layout context, or vice versa) are
      // expected: the viewer always passes a semantically correct context, so we only
      // warn when ALL contexts fail (below).
    }

    if (Object.keys(byCtx).length > 0) {
      resolved[slug] = byCtx;
    } else {
      // Warn only when truly unresolvable across every context.
      console.warn(`[resolve] WARN: {${slug}} unresolvable in all contexts`);
      missingCount++;
    }
  }

  const output = {
    _meta: {
      generated: new Date().toISOString(),
      slugCount: slugs.size,
      resolvedCount: Object.keys(resolved).length,
      wasmCount,
      missingCount,
      datasetTokenCount,
    },
    tokens: resolved,
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[resolve] Wrote ${outPath}`);
  console.log(`[resolve] wasm: ${wasmCount} | missing: ${missingCount}`);

  if (missingCount > 0) {
    console.warn(`[resolve] ${missingCount} entries unresolvable — raw reference strings will show in the viewer.`);
  }
}

main().catch(err => {
  console.error('[resolve] Fatal error:', err);
  process.exit(1);
});
