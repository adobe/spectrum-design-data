// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import test from "ava";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validatePackedPackage,
  verifyPackage,
} from "../scripts/verify-package.mjs";

const packageDirectory = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(packageDirectory, "package.json"), "utf8"),
);
const artifacts = manifest.files.filter((file) => file.startsWith("pkg/"));

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "wasm-pack-test-"));
  t.teardown(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "package.json"), JSON.stringify(manifest));
  for (const file of artifacts) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    const content = file.endsWith(".wasm")
      ? Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])
      : file.endsWith("package.json")
        ? JSON.stringify({
            type: file.includes("/web/") ? "module" : "commonjs",
          })
        : "fixture";
    writeFileSync(join(directory, file), content);
  }
  return directory;
}

test("complete declared artifact contract passes", (t) => {
  t.is(validatePackedPackage(fixture(t)).name, manifest.name);
});

for (const file of artifacts) {
  test(`missing artifact fails: ${file}`, (t) => {
    const directory = fixture(t);
    rmSync(join(directory, file));
    t.throws(() => validatePackedPackage(directory), {
      message: new RegExp(file.replaceAll(".", "\\.")),
    });
  });
}

test("missing export target fails even when not in files", (t) => {
  const directory = fixture(t);
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      ...manifest,
      exports: { ...manifest.exports, "./missing": "./missing.js" },
    }),
  );
  t.throws(() => validatePackedPackage(directory), { message: /missing\.js/ });
});

for (const file of artifacts.filter((file) => file.endsWith(".wasm"))) {
  test(`empty artifact fails: ${file}`, (t) => {
    const directory = fixture(t);
    writeFileSync(join(directory, file), "");
    t.throws(() => validatePackedPackage(directory), {
      message: /Empty package artifact/,
    });
  });

  test(`corrupt binary fails: ${file}`, (t) => {
    const directory = fixture(t);
    writeFileSync(join(directory, file), Buffer.from([0, 97, 115, 109, 255]));
    t.throws(() => validatePackedPackage(directory), {
      message: /Invalid wasm binary/,
    });
  });
}

test("incorrect nested module type fails", (t) => {
  const directory = fixture(t);
  writeFileSync(join(directory, "pkg/node/package.json"), '{"type":"module"}');
  t.throws(() => validatePackedPackage(directory), {
    message: /Incorrect node module type/,
  });
});

test.serial(
  "actual tarball installs and runs Node and web embedded data",
  (t) => {
    t.notThrows(() => verifyPackage());
  },
);

test.serial(
  "packlist omission fails even when workspace binary exists",
  (t) => {
    const directory = fixture(t);
    const omitted = "pkg/web/design_data_wasm_bg.wasm";
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        ...manifest,
        files: manifest.files.filter((file) => file !== omitted),
      }),
    );
    // The packed declaration still requires the binary; omit it with npmignore.
    writeFileSync(join(directory, ".npmignore"), `${omitted}\n`);
    t.throws(() => verifyPackage(directory), {
      message: /design_data_wasm_bg\.wasm/,
    });
  },
);

test.serial(
  "generated nested gitignore cannot silently omit runtime artifacts",
  (t) => {
    const directory = fixture(t);
    writeFileSync(join(directory, "pkg/web/.gitignore"), "*\n");
    // Explicit files entries may override ignores; a directory packlist exposes
    // the wasm-pack ignore regression without workspace runtime smoke shortcuts.
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        ...manifest,
        files: ["pkg"],
      }),
    );
    t.throws(() => verifyPackage(directory), { message: /design_data_wasm/ });
  },
);
