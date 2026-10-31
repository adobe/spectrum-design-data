// Copyright 2026 Adobe. All rights reserved.
// Keeps every notification on the shared provider. See
// .agents/rules/notifications.mdc.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "src");
const provider = "components/notifications/NotificationProvider.tsx";

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const problems: string[] = [];
for (const path of files(root)) {
  const file = relative(root, path);
  const source = readFileSync(path, "utf8");
  if (file !== provider && /\b(ToastQueue|ToastContainer)\b/.test(source))
    problems.push(`${file}: use useNotify() instead of ToastQueue`);
  if (/\b(useDeletionToast|DeletionToastProvider|notifyDeleted)\b/.test(source))
    problems.push(`${file}: replace the old deletion toast with useNotify()`);
  for (const match of source.matchAll(
    /<AlertDialog\b[\s\S]{0,600}?\btitle=(?:"([^"]*)"|\{\s*"([^"]*)"\s*\})/g,
  )) {
    const title = match[1] ?? match[2];
    if (title.trim().endsWith("?"))
      problems.push(`${file}: alert dialog title "${title}" is a question`);
  }
}

assert.deepEqual(problems, [], `\n${problems.join("\n")}`);
console.log("notification usage: ok");
