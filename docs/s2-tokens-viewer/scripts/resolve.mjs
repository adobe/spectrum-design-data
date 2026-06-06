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
 * Some tokens in the cascade dataset use $ref-based UUID aliasing which the wasm
 * resolveReference prototype does not yet follow (tracked as spectrum-design-data-nyt).
 * For those, a JS fallback resolver walks the object-map chain directly so every slug
 * gets a fully-resolved value.
 *
 * Emits tokens/resolved.json:
 *   {
 *     _meta: { generated, slugCount, resolvedCount, wasmCount, fallbackCount, datasetTokenCount },
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
const outPath = join(tokensDir, 'resolved.json');

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
  const sourceMap = {};
  const files = readdirSync(tokensDir)
    .filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'resolved.json')
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
      // Merge into sourceMap: last writer wins (matches priority order in the old TokenResolverFactory)
      if (!sourceMap[slug]) sourceMap[slug] = entry;
      // Merge context keys
      if (slugs.has(slug)) {
        for (const k of ctxKeys) slugs.get(slug).add(k);
      } else {
        slugs.set(slug, new Set(ctxKeys));
      }
    }
  }
  return { slugs, sourceMap };
}

/**
 * JS fallback resolver: walks object-map alias chain for (slug, ctx).
 * Used when wasm resolveReference returns no terminal value (e.g. $ref-based aliases).
 * Returns { value, chain } with the same shape as ReferenceChainResult.
 */
function resolveObjectMap(slug, ctx, sourceMap, maxDepth = 20) {
  const chain = [`{${slug}}`];
  const seen = new Set([slug]);
  let current = slug;
  let depth = 0;

  while (depth++ < maxDepth) {
    const entry = sourceMap[current];
    if (!entry) break;

    // Pick context-specific value, then single value, then nothing.
    // ctx may be a real context key (light/dark/etc.) or undefined (single-value token).
    let rawValue = (ctx ? entry.sets?.[ctx]?.value : undefined) ?? entry.value;
    if (rawValue === undefined || rawValue === null) break;

    // If it's a reference, follow it
    if (typeof rawValue === 'string' && rawValue.includes('{')) {
      const nextSlug = rawValue.replace(/[{}]/g, '');
      if (seen.has(nextSlug)) {
        chain.push('(circular reference)');
        break;
      }
      seen.add(nextSlug);
      chain.push(`{${nextSlug}}`);
      current = nextSlug;
      continue;
    }

    // Terminal value reached
    if (typeof rawValue === 'object' && rawValue !== null && rawValue.r !== undefined) {
      // RGBA object — store as-is; runtime will convert to rgb() string
      chain.push(`rgba(${rawValue.r},${rawValue.g},${rawValue.b},${rawValue.a})`);
      return { value: rawValue, chain };
    }
    chain.push(String(rawValue));
    return { value: rawValue, chain };
  }

  return { value: undefined, chain };
}

async function main() {
  // Load wasm — node build is synchronous; no init() call needed.
  const wasm = await import('@adobe/design-data-wasm');
  const ds = wasm.Dataset.embedded();
  const datasetTokenCount = ds.tokenCount();

  const { slugs, sourceMap } = loadObjectMap();
  console.log(`[resolve] ${slugs.size} slugs, ${datasetTokenCount} tokens in embedded dataset`);

  const resolved = {};
  let wasmCount = 0;
  let fallbackCount = 0;
  let missingCount = 0;

  for (const [slug, ctxSet] of slugs) {
    const ref = `{${slug}}`;
    // Tokens without sets (single-value, no context key) still need to be resolved per theme
    // because they may reference tokens that DO have sets (e.g. {blue-900} has light/dark/wireframe).
    // Enumerate under all contexts; the object-map fallback will pick the right set entry.
    const ctxKeys = ctxSet.size > 0 ? [...ctxSet] : Object.keys(CTX_MAP);

    const byCtx = {};
    for (const ctx of ctxKeys) {
      const ctxMap = ctx ? CTX_MAP[ctx] : {};
      const r = ds.resolveReference(ref, ctxMap);

      if (r && r.value !== undefined) {
        // Wasm resolved fully (common case: palette tokens, layout tokens).
        byCtx[ctx] = { value: r.value, chain: r.chain };
        wasmCount++;
      } else {
        // Wasm returned no terminal value (e.g. $ref-based alias in cascade).
        // Fall back to JS object-map resolution for value + chain.
        const fb = resolveObjectMap(slug, ctx, sourceMap);
        if (fb.value !== undefined) {
          byCtx[ctx] = { value: fb.value, chain: fb.chain };
          fallbackCount++;
        }
        // else: no result for this ctx — may be a cross-domain miss (color token
        // asked for layout context, or vice versa).  The viewer always passes the
        // semantically correct context, so we only warn if ALL contexts fail below.
      }
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
      fallbackCount,
      missingCount,
      datasetTokenCount,
    },
    tokens: resolved,
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[resolve] Wrote ${outPath}`);
  console.log(`[resolve] wasm: ${wasmCount} | fallback: ${fallbackCount} | missing: ${missingCount}`);

  if (missingCount > 0) {
    console.warn(`[resolve] ${missingCount} entries unresolvable — raw reference strings will show in the viewer.`);
  }
}

main().catch(err => {
  console.error('[resolve] Fatal error:', err);
  process.exit(1);
});
