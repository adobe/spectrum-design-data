# Copyright 2026 Adobe. All rights reserved.
"""Extract Rust syntax and Cargo manifest facts, not a compiler call graph."""

import argparse
import importlib.metadata
import json
from pathlib import Path
import platform
import tomllib

from tree_sitter import Language, Parser
import tree_sitter_rust


def extract(root, files):
    parser = Parser(Language(tree_sitter_rust.language()))
    nodes = {}
    edges = []
    diagnostics = []
    known = set(files)
    manifests = {}
    statistics = {"files": 0, "parse_errors": 0, "crates": 0, "uses": 0}

    def node(identity, **attributes):
        nodes.setdefault(identity, {"id": identity, **attributes})
        return identity

    def edge(source, target, kind, file, line=1, **attributes):
        edges.append({
            "source": source, "target": target, "kind": kind,
            "evidence": {"file": file, "line": line, "extractor": "tree-sitter-rust" if file.endswith(".rs") else "tomllib"},
            **attributes,
        })

    def relative(path):
        return path.resolve().relative_to(root.resolve()).as_posix()

    for file in files:
        if Path(file).name == "Cargo.toml":
            with (root / file).open("rb") as stream:
                manifests[file] = tomllib.load(stream)
            if "package" in manifests[file]:
                statistics["crates"] += 1
                identity = node(f"crate:{file}", kind="rust_crate", name=manifests[file]["package"]["name"])
                edge(identity, f"file:{file}", "crate_manifest", file, status="resolved")

    def dependencies(value, manifest, pointer=""):
        for key, child in value.items():
            path = f"{pointer}/{key}"
            if key in ("dependencies", "dev-dependencies", "build-dependencies") and isinstance(child, dict):
                for name, dependency in child.items():
                    local = dependency.get("path") if isinstance(dependency, dict) else None
                    candidate = (root / manifest).parent / local / "Cargo.toml" if local else None
                    target_manifest = relative(candidate) if candidate and candidate.resolve().is_relative_to(root.resolve()) else None
                    status = "resolved" if target_manifest in manifests else "external" if not local else "unresolved"
                    target = f"file:{target_manifest}" if status == "resolved" else node(
                        f"{status}:crate:{manifest}:{name}", kind=status, name=name,
                        **({"candidate": target_manifest} if target_manifest else {}),
                    )
                    edge(f"file:{manifest}", target, "cargo_dependency", manifest, status=status, name=name, pointer=f"{path}/{name}")
            elif isinstance(child, dict):
                dependencies(child, manifest, path)

    for file, value in manifests.items():
        dependencies(value, file)

    for file in files:
        if not file.endswith(".rs"):
            continue
        statistics["files"] += 1
        source = (root / file).read_bytes()
        tree = parser.parse(source)
        containing = [manifest for manifest in manifests if (root / file).is_relative_to((root / manifest).parent)]
        manifest = max(containing, key=len) if containing else None
        directory = (root / file).parent
        base = directory if Path(file).name in ("lib.rs", "main.rs", "mod.rs") else directory / Path(file).stem

        def text(value):
            return source[value.start_byte:value.end_byte].decode("utf8")

        def walk(value, module_base):
            if value.type == "ERROR" or value.is_missing:
                statistics["parse_errors"] += 1
                diagnostics.append({"kind": "rust_parse_error", "file": file, "line": value.start_point.row + 1, "syntax": text(value)[:150]})
            if value.type == "mod_item":
                name_node = value.child_by_field_name("name")
                body = value.child_by_field_name("body")
                name = text(name_node)
                if body is None:
                    candidates = [module_base / f"{name}.rs", module_base / name / "mod.rs"]
                    previous = value.prev_named_sibling
                    attributes = []
                    while previous and previous.type == "attribute_item":
                        attributes.append(text(previous))
                        if text(previous).startswith("#[path"):
                            literals = [child for child in descendants(previous) if child.type == "string_literal"]
                            if literals:
                                candidates = [directory / json.loads(text(literals[0]))]
                        previous = previous.prev_named_sibling
                    matches = [relative(candidate) for candidate in candidates if candidate.resolve().is_relative_to(root.resolve()) and relative(candidate) in known]
                    status = "resolved" if len(matches) == 1 else "unresolved"
                    target = f"file:{matches[0]}" if status == "resolved" else node(
                        f"unresolved:rust-module:{file}:{value.start_byte}", kind="unresolved", name=name,
                    )
                    edge(f"file:{file}", target, "rust_module", file, value.start_point.row + 1, status=status, attributes=attributes)
                else:
                    for child in body.named_children:
                        walk(child, module_base / name)
                    return
            elif value.type == "use_declaration":
                statistics["uses"] += 1
                spelling = text(value)
                target = node(f"rust-use:{file}:{value.start_byte}", kind="unresolved", syntax=spelling)
                edge(f"file:{file}", target, "rust_use_syntax", file, value.start_point.row + 1, status="unresolved")
            elif value.type == "macro_invocation":
                macro = value.child_by_field_name("macro")
                if macro and text(macro).split("::")[-1] in ("include", "include_str", "include_bytes", "include_dir"):
                    strings = [child for child in descendants(value) if child.type in ("string_literal", "raw_string_literal")]
                    literal = text(strings[0]) if len(strings) == 1 else None
                    raw = None
                    if literal and literal.startswith('"'):
                        raw = json.loads(literal)
                    elif literal and literal.startswith("r"):
                        raw = literal[literal.index('"') + 1:literal.rindex('"')]
                    direct = value.named_children[-1] if value.named_children else None
                    simple = direct is not None and len(direct.named_children) == 1 and direct.named_children[0].type in ("string_literal", "raw_string_literal")
                    if raw is not None and simple:
                        if "$CARGO_MANIFEST_DIR" in raw and manifest:
                            candidate = Path(raw.replace("$CARGO_MANIFEST_DIR", str((root / manifest).parent)))
                        else:
                            candidate = directory / raw
                        path = relative(candidate) if candidate.resolve().is_relative_to(root.resolve()) else None
                        if path in known:
                            target = f"file:{path}"
                            status = "resolved"
                        elif path and any(name.startswith(f"{path}/") for name in known):
                            target = node(f"directory:{path}", kind="directory", path=path)
                            status = "resolved"
                            for name in files:
                                if name.startswith(f"{path}/"):
                                    edge(target, f"file:{name}", "directory_member", file, value.start_point.row + 1, status="resolved")
                        else:
                            target = node(f"unresolved:rust-include:{file}:{value.start_byte}", kind="unresolved", literal=raw)
                            status = "unresolved"
                    else:
                        target = node(f"unresolved:rust-include:{file}:{value.start_byte}", kind="unresolved", syntax=text(value)[:300])
                        status = "unresolved"
                    edge(f"file:{file}", target, "rust_include", file, value.start_point.row + 1, status=status)
            for child in value.named_children:
                walk(child, module_base)

        def descendants(value):
            for child in value.named_children:
                yield child
                yield from descendants(child)

        walk(tree.root_node, base)

    return {
        "nodes": list(nodes.values()), "edges": edges, "diagnostics": diagnostics, "statistics": statistics,
        "provenance": {
            "python": platform.python_version(),
            "tree-sitter": importlib.metadata.version("tree-sitter"),
            "tree-sitter-rust": importlib.metadata.version("tree-sitter-rust"),
        },
    }


if __name__ == "__main__":
    arguments = argparse.ArgumentParser()
    arguments.add_argument("--root", required=True, type=Path)
    arguments.add_argument("--inventory", required=True, type=Path)
    arguments.add_argument("--output", required=True, type=Path)
    options = arguments.parse_args()
    files = [entry["path"] for entry in json.loads(options.inventory.read_text())["files"]]
    result = extract(options.root, files)
    options.output.write_text(json.dumps(result, indent=2) + "\n")
