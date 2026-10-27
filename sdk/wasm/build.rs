// Copyright 2026 Adobe. All rights reserved.

use std::path::PathBuf;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    if std::env::var_os("CARGO_FEATURE_EMBEDDED").is_none() {
        return;
    }
    let root = PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap())
        .join("../../packages/design-data/relationships");
    println!("cargo:rerun-if-changed={}", root.display());
    let mut paths: Vec<_> = std::fs::read_dir(&root)
        .expect("canonical relationships directory is required for embedded builds")
        .map(|entry| entry.expect("read relationship entry").path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "json"))
        .collect();
    paths.sort();
    let mut source = String::from("const EMBEDDED_RELATIONSHIPS: &[(&str, &str)] = &[\n");
    for path in paths {
        let path = path.canonicalize().expect("resolve relationship path");
        println!("cargo:rerun-if-changed={}", path.display());
        let filename = path.file_name().unwrap().to_str().unwrap();
        source.push_str(&format!(
            "({filename:?}, include_str!({:?})),\n",
            path.to_str().unwrap()
        ));
    }
    source.push_str("];\n");
    let output = PathBuf::from(std::env::var_os("OUT_DIR").unwrap());
    std::fs::write(output.join("embedded_relationships.rs"), source)
        .expect("write embedded relationships source");
}
