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
 * Build the DesignData.xcframework + Package.swift for native Swift/macOS distribution.
 *
 * Steps:
 *   1. Build the static lib for aarch64-apple-darwin and x86_64-apple-darwin (release,
 *      --features embedded).
 *   2. `lipo -create` the two .a archives into a universal static lib.
 *   3. `cargo run --bin uniffi-bindgen generate --language swift` → Swift glue + C headers.
 *   4. `xcodebuild -create-xcframework` → DesignData.xcframework (static variant).
 *   5. Emit a Package.swift declaring a binaryTarget + a Sources wrapper.
 *
 * Prerequisites:
 *   - Xcode Command Line Tools (`xcode-select --install`)
 *   - Rust targets: `rustup target add aarch64-apple-darwin x86_64-apple-darwin`
 *   - The embedded cache blob must exist: `moon run sdk-swift:cache-build`
 *
 * Run:
 *   node sdk/swift/scripts/build-swift.mjs
 * or via moon:
 *   moon run sdk-swift:build
 */

import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

// Resolve paths relative to sdk/swift/
const swiftDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(swiftDir, '../../..');
const sdkRoot = resolve(swiftDir, '..');
const distDir = join(swiftDir, 'dist');
const generatedDir = join(swiftDir, 'generated');
const targetDir = join(sdkRoot, 'target');

const PACKAGE = 'design-data-swift';
const FEATURES = '--features embedded';
const TARGETS = ['aarch64-apple-darwin', 'x86_64-apple-darwin'];

function run(cmd, args, opts = {}) {
  console.log(`\n→ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function runShell(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ---------------------------------------------------------------------------
// 1. Compile static libs for each macOS arch
// ---------------------------------------------------------------------------

mkdirSync(distDir, { recursive: true });
mkdirSync(generatedDir, { recursive: true });

for (const target of TARGETS) {
  run('cargo', [
    'build', '--release',
    '--package', PACKAGE,
    '--target', target,
    '--features', 'embedded',
  ], { cwd: sdkRoot });
}

// ---------------------------------------------------------------------------
// 2. Create universal static lib with lipo
// ---------------------------------------------------------------------------

const archLibs = TARGETS.map(
  t => join(targetDir, t, 'release', 'libdesign_data_swift.a'),
);
const universalLib = join(distDir, 'libdesign_data_swift_universal.a');

run('lipo', ['-create', ...archLibs, '-output', universalLib]);
console.log(`\n✓ Universal static lib: ${universalLib}`);

// ---------------------------------------------------------------------------
// 3. Generate Swift bindings via uniffi-bindgen
// ---------------------------------------------------------------------------

// Use the aarch64 dylib (or any arch) as the library for metadata extraction.
// The cdylib is needed by uniffi-bindgen to read ABI metadata; the staticlib
// ships in the XCFramework.
const aarch64DylibDir = join(targetDir, 'aarch64-apple-darwin', 'release');

run('cargo', [
  'run', '--release',
  '--package', PACKAGE,
  '--bin', 'uniffi-bindgen',
  '--',
  'generate',
  '--library', join(aarch64DylibDir, 'libdesign_data_swift.dylib'),
  '--language', 'swift',
  '--out-dir', generatedDir,
], { cwd: sdkRoot });

console.log(`\n✓ Swift bindings generated in ${generatedDir}`);

// ---------------------------------------------------------------------------
// 4. Create XCFramework
// ---------------------------------------------------------------------------

// The generated headers directory (uniffi emits a .h and .modulemap there).
const xcframeworkPath = join(distDir, 'DesignData.xcframework');

// Remove existing xcframework first (xcodebuild refuses to overwrite)
if (existsSync(xcframeworkPath)) {
  runShell(`rm -rf "${xcframeworkPath}"`);
}

run('xcodebuild', [
  '-create-xcframework',
  '-library', universalLib,
  '-headers', generatedDir,
  '-output', xcframeworkPath,
]);

console.log(`\n✓ XCFramework: ${xcframeworkPath}`);

// ---------------------------------------------------------------------------
// 5. Emit Package.swift
// ---------------------------------------------------------------------------

// Read the crate version from Cargo.toml for the Swift Package version comment.
let crateVersion = '0.1.0';
try {
  const cargo = (await import('node:fs')).readFileSync(join(swiftDir, 'Cargo.toml'), 'utf8');
  const m = cargo.match(/^version\s*=\s*"([^"]+)"/m);
  if (m) crateVersion = m[1];
} catch { /* ignore */ }

const packageSwift = `// swift-tools-version: 5.9
// Design Data — Swift Package
// Version: ${crateVersion}
//
// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

import PackageDescription

let package = Package(
    name: "DesignData",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "DesignData", targets: ["DesignData"]),
    ],
    targets: [
        // The prebuilt XCFramework containing the universal static Rust lib.
        .binaryTarget(
            name: "DesignDataFFI",
            path: "DesignData.xcframework"
        ),
        // Thin Swift source wrapper that re-exports the UniFFI-generated glue.
        //
        // The generated DesignDataSwift.swift (in Sources/DesignData/) is the file
        // produced by \`cargo run --bin uniffi-bindgen generate --language swift\`.
        // Copy it here after each XCFramework build, or set up a build plugin.
        .target(
            name: "DesignData",
            dependencies: ["DesignDataFFI"],
            path: "Sources/DesignData"
        ),
    ]
)
`;

writeFileSync(join(distDir, 'Package.swift'), packageSwift);
console.log(`\n✓ Package.swift written to ${distDir}/Package.swift`);

// Create Sources/DesignData directory and copy the generated Swift glue there.
const sourcesDir = join(distDir, 'Sources', 'DesignData');
mkdirSync(sourcesDir, { recursive: true });

// Copy the generated Swift file (uniffi names it after the crate, with _ → camelCase).
// uniffi-bindgen emits "design_data_swift.swift" for crate name "design-data-swift".
const generatedSwift = join(generatedDir, 'design_data_swift.swift');
if (existsSync(generatedSwift)) {
  const dest = join(sourcesDir, 'DesignDataSwift.swift');
  (await import('node:fs')).copyFileSync(generatedSwift, dest);
  console.log(`✓ Copied Swift glue → ${dest}`);
} else {
  console.warn(`⚠ Generated Swift file not found at ${generatedSwift} — copy it manually to ${sourcesDir}/`);
}

console.log('\n✓ Build complete.');
console.log(`  XCFramework: ${xcframeworkPath}`);
console.log(`  Package.swift: ${distDir}/Package.swift`);
console.log('\nTo consume via SPM:');
console.log('  .package(path: "path/to/sdk/swift/dist")');
console.log('  or publish the dist/ directory as a tagged release and reference by URL.');
