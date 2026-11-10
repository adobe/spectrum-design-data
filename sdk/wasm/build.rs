// Copyright 2026 Adobe. All rights reserved.

use std::path::PathBuf;

/// `const <name>: &[(&str, &str)]` of every `*.json` file (file name, contents) in
/// `packages/design-data/<dir>`, sorted by path.
fn embed_dir(dir: &str, name: &str) -> String {
    let root = PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap())
        .join("../../packages/design-data")
        .join(dir);
    println!("cargo:rerun-if-changed={}", root.display());
    let mut paths: Vec<_> = std::fs::read_dir(&root)
        .unwrap_or_else(|e| {
            panic!("canonical {dir} directory is required for embedded builds: {e}")
        })
        .map(|entry| entry.expect("read directory entry").path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "json"))
        .collect();
    paths.sort();
    let mut source = format!("const {name}: &[(&str, &str)] = &[\n");
    for path in paths {
        let path = path.canonicalize().expect("resolve embedded path");
        println!("cargo:rerun-if-changed={}", path.display());
        let filename = path.file_name().unwrap().to_str().unwrap();
        source.push_str(&format!(
            "({filename:?}, include_str!({:?})),\n",
            path.to_str().unwrap()
        ));
    }
    source.push_str("];\n");
    source
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    if std::env::var_os("CARGO_FEATURE_EMBEDDED").is_none() {
        return;
    }
    let output = PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
    std::fs::write(
        output.join("embedded_relationships.rs"),
        embed_dir("relationships", "EMBEDDED_RELATIONSHIPS"),
    )
    .expect("write embedded relationships source");
    std::fs::write(
        output.join("embedded_icons.rs"),
        embed_dir("icons", "EMBEDDED_ICONS"),
    )
    .expect("write embedded icons source");
}
