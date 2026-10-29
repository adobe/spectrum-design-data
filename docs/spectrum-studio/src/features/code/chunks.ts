// Copyright 2026 Adobe. All rights reserved.
export const CODE_CHUNK_LINES = 48;
export type CodeLanguage = "css" | "javascript" | "typescript" | "json";

export function codeChunks(code: string, lines = CODE_CHUNK_LINES): string[] {
  if (!Number.isInteger(lines) || lines < 1)
    throw new Error("Code chunks need a positive line count.");
  const chunks: string[] = [];
  let start = 0,
    cursor = 0,
    count = 0;
  while ((cursor = code.indexOf("\n", cursor)) !== -1) {
    cursor += 1;
    if (++count === lines) {
      chunks.push(code.slice(start, cursor));
      start = cursor;
      count = 0;
    }
  }
  if (start < code.length || !chunks.length) chunks.push(code.slice(start));
  return chunks;
}

/** Keep multiline Prism tokens balanced without changing their original grammar context. */
export function highlightedChunks(
  html: string,
  lines = CODE_CHUNK_LINES,
): string[] {
  if (!Number.isInteger(lines) || lines < 1)
    throw new Error("Code chunks need a positive line count.");
  const chunks: string[] = [],
    open: string[] = [];
  let start = 0,
    count = 0,
    prefix = "";
  for (const match of html.matchAll(/<span\b[^>]*>|<\/span>|\n/g)) {
    if (match[0] === "</span>") {
      if (!open.pop())
        throw new Error("Syntax output contains an unmatched closing span.");
    } else if (match[0] !== "\n") open.push(match[0]);
    else if (++count === lines) {
      const end = match.index + 1;
      chunks.push(
        prefix + html.slice(start, end) + "</span>".repeat(open.length),
      );
      prefix = open.join("");
      start = end;
      count = 0;
    }
  }
  if (open.length) throw new Error("Syntax output contains an unclosed span.");
  const tail = prefix + html.slice(start);
  if (!chunks.length || tail.replace(/<\/?span\b[^>]*>/g, ""))
    chunks.push(tail);
  return chunks;
}
