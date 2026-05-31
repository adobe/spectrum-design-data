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

/**
 * Copy spec markdown from packages/design-data-spec/spec/ into
 * docs/site/src/spec/ for 11ty, injecting frontmatter, rewriting
 * links, and prepending a draft disclaimer banner.
 *
 * The source files are the npm package source of truth and must not
 * be modified — all transformation happens here at copy time.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specSrc = join(__dirname, '../../../packages/design-data-spec/spec');
const specDest = join(__dirname, '../src/spec');

const DRAFT_BANNER = `<div class="spec-draft-banner" style="margin-block-end: 2rem; padding: 1rem; border-left: 4px solid var(--spectrum-notice-visual-color, #e68619); background: var(--spectrum-notice-background-color, #fff3e0);">
  <strong>Draft Specification (v1.0.0-draft)</strong> — This specification is under active development. Normative text and schemas may change before the stable 1.0.0 release.
</div>\n\n`;

// Remove stale generated files so renamed/deleted chapters don't linger.
rmSync(specDest, { recursive: true, force: true });
mkdirSync(specDest, { recursive: true });

for (const file of readdirSync(specSrc)) {
  if (!file.endsWith('.md')) continue;

  let content = readFileSync(join(specSrc, file), 'utf8');

  // Derive title from the first # heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

  // Build frontmatter
  const frontmatter = [
    '---',
    `title: "${title}"`,
    'spec_version: "1.0.0-draft"',
  ];
  // index.md needs an explicit permalink so it lives at /spec/ not /spec/index/
  if (file === 'index.md') {
    frontmatter.push('permalink: /spec/');
  }
  frontmatter.push('---\n');

  // Rewrite sibling links: ](token-format.md) → ](../token-format/)
  // Also handles fragment links: ](token-format.md#section) → ](../token-format/#section)
  // Special case: ](index.md) → ](../)
  // index.md lives at /spec/ so sibling links are relative without ../
  const isIndex = file === 'index.md';
  content = content.replace(
    /\]\((?!https?:\/\/|#)([a-z0-9-]+)\.md(#[^)]+)?\)/g,
    (match, slug, fragment) => {
      const frag = fragment || '';
      if (slug === 'index') return isIndex ? `](./${frag})` : `](../${frag})`;
      return isIndex ? `](${slug}/${frag})` : `](../${slug}/${frag})`;
    },
  );

  // Rewrite schema links: ](../schemas/X) → ](/schemas/X)
  content = content.replace(
    /\]\(\.\.\/schemas\/([^)]+)\)/g,
    '](/schemas/$1)',
  );

  const output = frontmatter.join('\n') + '\n' + DRAFT_BANNER + content;
  writeFileSync(join(specDest, file), output);
}

// Restore the 11ty directory data file (deleted by the rmSync above).
writeFileSync(
  join(specDest, 'spec.json'),
  JSON.stringify(
    {
      layout: 'base.liquid',
      tags: ['spec'],
      permalink: '/spec/{{ page.fileSlug }}/',
    },
    null,
    2,
  ) + '\n',
);

console.log('Spec files copied to docs/site/src/spec/');
