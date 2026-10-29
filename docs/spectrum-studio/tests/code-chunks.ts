// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Prism from "prismjs";
import {
  codeChunks,
  highlightedChunks,
  type CodeLanguage,
} from "../src/features/code/chunks";
import { highlightCode } from "../src/features/code/highlight";

for (const source of [
  "",
  "x",
  "x\n",
  "\n\n",
  "a\r\nb\r\nc",
  "a\nb\nc\n",
  "no newline ".repeat(500),
]) {
  for (const lines of [1, 2, 48])
    assert.equal(codeChunks(source, lines).join(""), source);
}
assert.throws(() => codeChunks("x", 0), /positive line count/);
assert.throws(() => highlightedChunks("x", -1), /positive line count/);
assert.throws(() => highlightedChunks("</span>"), /unmatched/);
assert.throws(() => highlightedChunks("<span>"), /unclosed/);
assert.deepEqual(
  highlightedChunks('<span class="token comment">/* a\nb\nc */</span>', 1),
  [
    '<span class="token comment">/* a\n</span>',
    '<span class="token comment">b\n</span>',
    '<span class="token comment">c */</span>',
  ],
);
assert.deepEqual(
  highlightedChunks('<span class="token comment">/* a */\n</span>', 1),
  ['<span class="token comment">/* a */\n</span>'],
);
const stripSpans = (html: string) => html.replace(/<\/?span\b[^>]*>/g, "");
const balanced = (html: string) => {
  let depth = 0;
  for (const match of html.matchAll(/<span\b[^>]*>|<\/span>/g)) {
    depth += match[0] === "</span>" ? -1 : 1;
    assert(depth >= 0);
  }
  assert.equal(depth, 0);
};
const fixtures: Record<CodeLanguage, string> = {
  css: `/* ${"multiline comment\n".repeat(110)} */\n:root { --value: "<script>&"; }\n`,
  javascript: `const text = \`${"template line\n".repeat(110)}\`;\nconsole.log(text < "z" && true);\n`,
  typescript: `${"interface Value { name: string; }\n".repeat(110)}const x: Value = { name: "<img>" };\n`,
  json: JSON.stringify(
    {
      values: Array.from({ length: 250 }, (_, index) => ({
        index,
        text: "<script>&",
      })),
    },
    null,
    2,
  ),
};
for (const [language, code] of Object.entries(fixtures)) {
  const grammar = Prism.languages[language];
  const html = Prism.highlight(code, grammar, language);
  const chunks = highlightCode({ code, language: language as CodeLanguage });
  assert.equal(chunks.length, codeChunks(code).length);
  assert.equal(chunks.map(stripSpans).join(""), stripSpans(html));
  for (const chunk of chunks) balanced(chunk);
  assert(!chunks.join("").includes("<script>"));
  assert(chunks.join("").includes("&lt;"));
}
const large = ":root {\n  --test: 16px;\n}\n".repeat(25_000);
const parts = codeChunks(large);
assert.equal(parts.join(""), large);
assert(parts.every((part) => part.length < 10_000));
const whitespace = 'const text = "\u00a0<script>&";\r\n'.repeat(100);
const preserved = highlightCode({ code: whitespace, language: "javascript" });
assert.equal(preserved.length, codeChunks(whitespace).length);
assert.equal(
  preserved.map(stripSpans).join(""),
  whitespace
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\r/g, "&#13;"),
);
console.log(
  "Code chunks: exact complete text, all grammars, multiline token context, balanced HTML and large output passed.",
);
