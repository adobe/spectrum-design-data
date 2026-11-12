// Copyright 2026 Adobe. All rights reserved.
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const studio = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repository = resolve(studio, "../..");
const excluded =
  /(?:^|[/\\{,])(?:node_modules|\.pnpm|\.git|vendor|\.cache|dist|coverage|reports|test-results|playwright-report|storybook-static)(?=[/\\},]|$)/;
const inside = (path, root) => {
  const value = relative(root, path);
  return (
    value === "" ||
    (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value))
  );
};

export function admitTool(input) {
  const name = (input.toolName ?? input.tool_name ?? "")
    .split(".")
    .at(-1)
    .toLowerCase();
  const raw = input.toolArgs ?? input.tool_input ?? {};
  if (name === "apply_patch") return {};
  const args = typeof raw === "string" ? JSON.parse(raw) : raw;
  const cwd = resolve(input.cwd ?? repository);
  const command = args.command ?? "";
  const deny = (reason) => ({
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  });
  if (Array.isArray(args.tool_uses)) {
    let modified = false;
    const calls = [];
    for (const call of args.tool_uses) {
      const result = admitTool({
        cwd,
        toolName: call.recipient_name,
        toolArgs: call.parameters,
      });
      if (result.permissionDecision === "deny") return result;
      modified ||= result.modifiedArgs !== undefined;
      calls.push({
        ...call,
        parameters: result.modifiedArgs ?? call.parameters,
      });
    }
    return modified ? { modifiedArgs: { ...args, tool_uses: calls } } : {};
  }
  if (
    typeof command === "string" &&
    command.includes("STUDIO_ADMISSION_PROBE_DENY")
  )
    return deny("Studio admission probe: harmless command denied as expected.");
  const scopePaths = Array.isArray(args.paths)
    ? args.paths
    : args.paths
      ? [args.paths]
      : [];
  const touchesStudio =
    inside(cwd, studio) ||
    (typeof command === "string" && /spectrum-studio/.test(command)) ||
    scopePaths.some(
      (path) => typeof path === "string" && inside(resolve(cwd, path), studio),
    ) ||
    (["rg", "grep", "glob"].includes(name) &&
      cwd === repository &&
      (!scopePaths.length ||
        scopePaths.some((path) => resolve(cwd, path) === repository))) ||
    (inside(cwd, repository) &&
      /\b(?:rg|grep|find|xargs|parallel)\b/.test(command)) ||
    /spectrum.studio/i.test(args.prompt ?? "");
  if (!touchesStudio) return {};
  if (["rg", "grep", "glob"].includes(name)) {
    if (!scopePaths.length)
      return deny(
        "Studio searches need an explicit Studio or source-package path.",
      );
    if (
      scopePaths.some((path) => {
        if (typeof path !== "string") return true;
        const target = resolve(cwd, path);
        return (
          ![studio, resolve(repository, "packages")].some((root) =>
            inside(target, root),
          ) || excluded.test(target)
        );
      })
    )
      return deny(
        "Search only Studio/source packages; exclude dependencies, caches, generated output and reports.",
      );
    const searchGlob =
      args.glob ?? (name === "glob" ? args.pattern : undefined);
    if (
      typeof searchGlob === "string" &&
      !searchGlob.startsWith("!") &&
      excluded.test(searchGlob)
    )
      return deny(
        "Search globs must not include dependencies, caches, generated output or reports.",
      );
    if (
      args.head_limit !== undefined &&
      (!Number.isInteger(args.head_limit) ||
        args.head_limit <= 0 ||
        args.head_limit > 200)
    )
      return deny("Use a bounded search result limit of at most 200.");
    return name === "glob" || args.head_limit !== undefined
      ? {}
      : { modifiedArgs: { ...args, head_limit: 200 } };
  }
  if (["task", "agent"].includes(name))
    return deny(
      "Automatic Studio delegation is disabled by the project safety policy. Work directly; a separate policy exception needs user approval.",
    );
  if (!["bash", "powershell"].includes(name)) return {};
  if (typeof command !== "string")
    return deny("Studio shell commands must be explicit strings.");
  // Recognize only simple, known invocation forms. This is not a shell parser.
  const safeRunner =
    /^(?:cd (?:docs\/spectrum-studio|\/[^;&|`$<>]*\/docs\/spectrum-studio) && )?pnpm (?:(?:--dir docs\/spectrum-studio|--filter @adobe\/spectrum-studio) )?(?:check:focused|check:list)(?: [a-zA-Z0-9_.,:/=* -]+)?$/;
  if (safeRunner.test(command.trim())) {
    if (/--(?:all|profile ci)\b/.test(command) && !command.includes("--scope-approved"))
      return deny(
        "Broad local checks need explicit user scope approval. CI budgets are not a local policy exception.",
      );
    return {};
  }
  if (
    /\b(?:pnpm|moon|tsx|tsc|vite|playwright|storybook|node|npm|npx|yarn|bun|cargo|python|python3|rg|grep|find|xargs|parallel|sh|bash|zsh|powershell|pwsh)\b/.test(
      command,
    ) ||
    /[;&|`$<>]|\n/.test(command)
  )
    return deny(
      "Use the bounded Studio runner: pnpm --dir docs/spectrum-studio check:focused --only <check-id>. Inspect with check:list. No direct tests, broad searches, detached jobs or compound workarounds.",
    );
  if (
    !/^(?:git (?:status|diff|log|show|rev-parse)|pwd|command -v|ps -|curl (?:--head|-I)|ls(?: |$))/.test(
      command.trim(),
    )
  )
    return deny(
      "Unrecognized Studio command. Use a named bounded check or request a narrowly scoped policy exception.",
    );
  return {};
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(
      `${JSON.stringify(admitTool(JSON.parse(readFileSync(0, "utf8"))))}\n`,
    );
  } catch {
    process.stdout.write(
      `${JSON.stringify({
        permissionDecision: "deny",
        permissionDecisionReason:
          "Studio admission input could not be validated; no workload was started.",
      })}\n`,
    );
    process.exitCode = 1;
  }
}
