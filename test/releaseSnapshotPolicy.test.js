// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workflow = readFileSync(".github/workflows/release-snapshot.yml", "utf8");

function stepScript(name) {
  const pattern = new RegExp(
    `^      - name: ${name}\\n(?:(?!      - ).*\\n)*?        run: \\|\\n((?:          .*\\n)+)`,
    "m",
  );
  const match = workflow.match(pattern);
  if (!match) {
    throw new Error(`Missing shell script for workflow step: ${name}`);
  }
  return match[1].replace(/^ {10}/gm, "");
}

for (const branch of ["snapshot-size-token-taxonomy", "snapshot/field-label"]) {
  test(`snapshot branch guard accepts ${branch}`, (t) => {
    const result = spawnSync(
      "bash",
      ["-e", "-c", stepScript("Validate snapshot branch")],
      {
        env: { ...process.env, BRANCH: branch, REF_TYPE: "branch" },
        encoding: "utf8",
      },
    );
    t.is(result.error, undefined);
    t.is(result.status, 0, result.stderr);
  });
}

for (const [branch, refType] of [
  ["main", "branch"],
  ["beta", "branch"],
  ["feature/snapshot-size-token-taxonomy", "branch"],
  ["fix/snapshot-release-oidc", "branch"],
  ["snapshot-", "branch"],
  ["snapshot/", "branch"],
  ["snapshot-size-token-taxonomy", "tag"],
]) {
  test(`snapshot branch guard rejects ${refType} ${branch}`, (t) => {
    const result = spawnSync(
      "bash",
      ["-e", "-c", stepScript("Validate snapshot branch")],
      {
        env: { ...process.env, BRANCH: branch, REF_TYPE: refType },
        encoding: "utf8",
      },
    );
    t.is(result.error, undefined);
    t.is(result.status, 1);
    t.regex(result.stdout, /::error::.*disposable snapshot/);
  });
}

for (const [branch, fragment] of [
  ["snapshot-size-token-taxonomy", "size-token-taxonomy"],
  ["snapshot/field-label", "field-label"],
  ["snapshot-snapshot-example", "snapshot-example"],
]) {
  test(`snapshot tag fragment strips only the leading prefix from ${branch}`, (t) => {
    const directory = mkdtempSync(join(tmpdir(), "snapshot-policy-"));
    t.teardown(() => rmSync(directory, { recursive: true, force: true }));
    const output = join(directory, "output");
    const result = spawnSync(
      "bash",
      ["-e", "-c", stepScript("Split branch name")],
      {
        env: { ...process.env, BRANCH: branch, GITHUB_OUTPUT: output },
        encoding: "utf8",
      },
    );
    t.is(result.error, undefined);
    t.is(result.status, 0, result.stderr);
    t.is(readFileSync(output, "utf8"), `fragment=${fragment}\n`);
  });
}

test("snapshot branch guard runs before checkout, setup, and versioning", (t) => {
  const guard = workflow.indexOf("- name: Validate snapshot branch");
  t.true(guard >= 0);
  for (const step of [
    "- name: Split branch name",
    "- uses: actions/checkout@",
    "- uses: moonrepo/setup-toolchain@",
    "- name: Snapshot release",
  ]) {
    t.true(workflow.indexOf(step) > guard, step);
  }
  t.regex(workflow, /BRANCH: \$\{\{ github\.ref_name \}\}/);
  t.regex(workflow, /REF_TYPE: \$\{\{ github\.ref_type \}\}/);
});

test("snapshot policy documents disposal and preserves consuming versioning", (t) => {
  const header = workflow.slice(0, workflow.indexOf("\non:"));
  t.regex(header, /disposable publishing branches/);
  t.regex(header, /Never merge their snapshot release commits/);
  t.regex(header, /intentionally consumes pending changesets/);
  t.regex(header, /Keep the original changesets on the source branch/);
  const release = stepScript("Snapshot release");
  t.regex(release, /pnpm changeset version --snapshot \$SNAPSHOT_TAG/);
  t.true(release.indexOf("git commit") > release.indexOf("changeset version"));
  t.true(
    release.indexOf("verify-package.mjs") >
      release.indexOf("changeset version"),
  );
  t.true(release.indexOf("git commit") > release.indexOf("verify-package.mjs"));
  t.true(
    release.indexOf("git push origin HEAD") > release.indexOf("git commit"),
  );
});

test("snapshot wasm build is gated and transferred before publishing", (t) => {
  const build = workflow.slice(
    workflow.indexOf("\n  build-wasm:"),
    workflow.indexOf("\n  release:"),
  );
  const publish = workflow.slice(workflow.indexOf("\n  release:"));
  t.regex(build, /needs: get-snapshot-tag/);
  t.regex(build, /targets: wasm32-unknown-unknown/);
  t.regex(build, /run: moon run sdk-wasm:build/);
  t.regex(build, /uses: actions\/upload-artifact@v4/);
  t.regex(build, /name: wasm-pkg-build\n\s+path: sdk\/wasm\/pkg/);
  t.regex(build, /if-no-files-found: error/);
  t.regex(publish, /needs: \[get-snapshot-tag, build-wasm\]/);
  t.regex(publish, /uses: actions\/download-artifact@v4/);
  t.regex(publish, /name: wasm-pkg-build\n\s+path: sdk\/wasm\/pkg/);
  t.false(publish.includes("moonrepo/setup-toolchain"));
  t.false(publish.includes("moon run"));
  t.true(
    publish.indexOf("Download wasm package build") <
      publish.indexOf("Snapshot release"),
  );
  const release = stepScript("Snapshot release");
  t.true(
    release.indexOf("verify-package.mjs") <
      release.indexOf("changeset publish"),
  );
  t.regex(
    publish,
    /inputs\.tag \|\| needs\.get-snapshot-tag\.outputs\.fragment/,
  );
});

test("stable publishing requires wasm build and tarball verification", (t) => {
  const stable = readFileSync(".github/workflows/release.yml", "utf8");
  const build = stable.slice(
    stable.indexOf("\n  build-wasm:"),
    stable.indexOf("\n  build-binaries:"),
  );
  const publish = stable.slice(stable.indexOf("\n  release:"));
  t.regex(build, /if-no-files-found: error/);
  t.regex(publish, /needs: \[changesets, build-binaries, build-wasm\]/);
  t.regex(publish, /needs\.build-wasm\.result == 'success'/);
  const verify = publish.indexOf(
    "run: node sdk/wasm/scripts/verify-package.mjs",
  );
  t.true(verify > publish.indexOf("Download wasm package build"));
  t.true(verify < publish.indexOf("- name: Publish packages"));
});
