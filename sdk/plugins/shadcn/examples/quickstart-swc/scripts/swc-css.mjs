// Copyright 2026 Adobe. All rights reserved.
// Copies SWC gen 2's published light-DOM stylesheets into src/swc/ and renames the
// token custom properties from --swc-* to --spectrum-* so they read the shadcn theme.
// Component hooks such as --swc-button-gap keep their name.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = 'node_modules/@adobe/spectrum-wc/dist';
const files = ['global-button.css', 'global-action-button.css', 'link.css', 'global-link.css'];
const tokenNames = new Set([...readFileSync(`${dist}/tokens.css`, 'utf8').matchAll(/--swc-([a-z0-9-]+):/g)].map((m) => m[1]));

mkdirSync('src/swc', { recursive: true });
const used = new Set();
for (const file of files) {
  const css = readFileSync(`${dist}/${file}`, 'utf8').replace(/var\(--swc-([a-z0-9-]+)/g, (all, name) => {
    if (!tokenNames.has(name)) return all;
    used.add(name);
    return `var(--spectrum-${name}`;
  });
  // index.css imports link.css first; an @import left mid-file is dropped by the bundler.
  writeFileSync(`src/swc/${file}`, css.replace('@import url("./link.css");', ''));
}
writeFileSync('src/swc/used-tokens.json', JSON.stringify([...used].sort(), null, 2) + '\n');
console.log(`${files.length} files, ${used.size} token variables renamed`);

// Inputs for compare.html: our theme as plain CSS (no Tailwind), and the token names both sides define.
const theme = JSON.parse(readFileSync('spectrum-theme.json', 'utf8')).cssVars;
const block = (selector, vars) =>
  `${selector} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}\n`;
writeFileSync('src/theme-only.css', block(':root', { ...theme.theme, ...theme.light }) + block('.dark', theme.dark));
mkdirSync('public', { recursive: true });
const shared = [...tokenNames].filter((n) => `spectrum-${n}` in { ...theme.theme, ...theme.light }).sort();
writeFileSync('public/names.json', JSON.stringify(shared));
console.log(`${shared.length} token names defined by both`);
