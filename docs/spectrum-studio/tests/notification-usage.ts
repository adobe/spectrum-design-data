// Copyright 2026 Adobe. All rights reserved.
// Keeps every notification on the shared provider. See
// .agents/rules/notifications.mdc.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { LIFECYCLE_KINDS } from "../src/features/notifications/lifecycleKinds";

const root = join(import.meta.dirname, "..", "src");
const provider = "components/notifications/NotificationProvider.tsx";
const lifecycleKinds = new Set(
  Object.entries(LIFECYCLE_KINDS)
    .filter(([, policy]) => policy === "lifecycle")
    .map(([kind]) => kind),
);

/** Returns the text of each `notify.remove(...)` call. */
function removeCalls(source: string) {
  const calls: string[] = [];
  for (const match of source.matchAll(/\bnotify\.remove\(/g)) {
    let depth = 0;
    let index = match.index + match[0].length - 1;
    for (; index < source.length; index++) {
      if (source[index] === "(") depth++;
      else if (source[index] === ")" && --depth === 0) break;
    }
    calls.push(source.slice(match.index, index + 1));
  }
  return calls;
}

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
  // Deletes of output data follow the deletion and deprecation workflow.
  // See .agents/rules/deletion-and-deprecation.mdc.
  for (const call of removeCalls(source)) {
    const kinds = [
      ...(call.match(/\bkind:\s*([^\n]+)/)?.[1] ?? "").matchAll(
        /"([A-Za-z]+)"/g,
      ),
    ].map((entry) => entry[1]);
    const kind = kinds.find((entry) => lifecycleKinds.has(entry));
    if (kind && !/\blifecycle:/.test(call))
      problems.push(
        `${file}: notify.remove for "${kind}" needs a lifecycle descriptor`,
      );
  }
}

assert.deepEqual(problems, [], `\n${problems.join("\n")}`);
console.log("notification usage: ok");
