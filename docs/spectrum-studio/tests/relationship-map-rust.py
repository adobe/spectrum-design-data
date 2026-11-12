# Copyright 2026 Adobe. All rights reserved.
import importlib.util
from pathlib import Path
import tempfile
import unittest

path = Path(__file__).resolve().parents[1] / "scripts/relationshipMapRust.py"
spec = importlib.util.spec_from_file_location("relationship_map_rust", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
Path(module.__cached__).unlink(missing_ok=True)


class RustRelationships(unittest.TestCase):
    def test_syntax_manifests_includes_and_errors(self):
        with tempfile.TemporaryDirectory(prefix="relationship-map-rust-") as directory:
            root = Path(directory)
            contents = {
                "sdk/Cargo.toml": '[workspace]\nmembers = ["a", "b"]\n',
                "sdk/a/Cargo.toml": '[package]\nname = "a"\nversion = "0.1.0"\n[dependencies]\nb = { path = "../b" }\nserde = "1"\n',
                "sdk/b/Cargo.toml": '[package]\nname = "b"\nversion = "0.1.0"\n',
                "sdk/a/src/lib.rs": 'mod first;\nmod second;\nuse crate::first::Value;\nconst TEXT: &str = include_str!("data.txt");\nmod nested { mod child; }\n#[cfg(test)]\n#[path = "test_impl.rs"]\nmod tests;\n',
                "sdk/a/src/first.rs": "pub struct Value;\n",
                "sdk/a/src/second.rs": "pub struct Value;\n",
                "sdk/a/src/nested/child.rs": "pub const CHILD: u8 = 1;\n",
                "sdk/a/src/test_impl.rs": "pub const TEST: bool = true;\n",
                "sdk/a/src/data.txt": "embedded",
                "sdk/b/src/lib.rs": "pub fn broken( {\n",
            }
            for name, text in contents.items():
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text)
            result = module.extract(root, list(contents))
            edges = result["edges"]
            self.assertEqual(result["statistics"]["crates"], 2)
            self.assertGreater(result["statistics"]["parse_errors"], 0)
            self.assertTrue(any(edge["kind"] == "cargo_dependency" and edge["target"] == "file:sdk/b/Cargo.toml" for edge in edges))
            self.assertTrue(any(edge["kind"] == "rust_include" and edge["target"] == "file:sdk/a/src/data.txt" for edge in edges))
            for name in ("first.rs", "second.rs", "nested/child.rs", "test_impl.rs"):
                self.assertTrue(any(edge["kind"] == "rust_module" and edge["target"] == f"file:sdk/a/src/{name}" for edge in edges), name)
            uses = [edge for edge in edges if edge["kind"] == "rust_use_syntax"]
            self.assertEqual(len(uses), 1)
            self.assertEqual(uses[0]["status"], "unresolved")


if __name__ == "__main__":
    unittest.main()
