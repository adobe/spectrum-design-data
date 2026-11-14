// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Finding an installed font on this machine: the user's font folders and Adobe's Creative
//! Cloud font cache. Native only; WebAssembly callers read files themselves and offer the
//! bytes to a [`Resolver`].

use super::resolve::{explicit, Resolved, Resolver};
use super::FontSource;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

/// Largest font file read. Adobe's variable fonts are about 1 MB.
const MAX_FONT_BYTES: u64 = 25 * 1024 * 1024;
/// Folders deeper than this are not entered (Creative Cloud keeps fonts one level down).
const MAX_DEPTH: usize = 4;
/// Files looked at before giving up, so a huge font folder cannot stall a render.
const MAX_FILES: usize = 20_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Os {
    Mac,
    Windows,
    Linux,
}

/// What the folder list depends on, so tests can supply their own.
#[derive(Debug, Clone)]
pub struct Env {
    pub os: Os,
    pub home: Option<PathBuf>,
    pub win_dir: Option<PathBuf>,
    pub local_app_data: Option<PathBuf>,
    pub app_data: Option<PathBuf>,
    /// `DESIGN_DATA_FONT`: a font file the user pointed at.
    pub font_override: Option<PathBuf>,
}

impl Env {
    pub fn current() -> Env {
        let var = |k: &str| {
            std::env::var_os(k)
                .filter(|v| !v.is_empty())
                .map(PathBuf::from)
        };
        Env {
            os: if cfg!(target_os = "macos") {
                Os::Mac
            } else if cfg!(windows) {
                Os::Windows
            } else {
                Os::Linux
            },
            home: var("HOME").or_else(|| var("USERPROFILE")),
            win_dir: var("WINDIR"),
            local_app_data: var("LOCALAPPDATA"),
            app_data: var("APPDATA"),
            font_override: var(super::resolve::ENV_VAR),
        }
    }
}

/// Folders to search, in order.
pub fn font_dirs(env: &Env) -> Vec<PathBuf> {
    let under = |base: &Option<PathBuf>, rest: &str| base.as_ref().map(|b| b.join(rest));
    let dirs: Vec<Option<PathBuf>> = match env.os {
        Os::Mac => vec![
            under(&env.home, "Library/Fonts"),
            Some("/Library/Fonts".into()),
            under(
                &env.home,
                "Library/Application Support/Adobe/CoreSync/plugins/livetype",
            ),
            under(&env.home, "Library/Application Support/Adobe/Fonts"),
        ],
        Os::Windows => vec![
            under(&env.local_app_data, "Microsoft/Windows/Fonts"),
            under(&env.win_dir, "Fonts"),
            under(&env.app_data, "Adobe/CoreSync/plugins/livetype"),
        ],
        Os::Linux => vec![
            under(&env.home, ".local/share/fonts"),
            under(&env.home, ".fonts"),
            Some("/usr/share/fonts".into()),
            Some("/usr/local/share/fonts".into()),
        ],
    };
    dirs.into_iter().flatten().collect()
}

/// Every file under `dir`, hidden ones included, in name order. Directory links are not followed.
fn files_under(dir: &Path, depth: usize, out: &mut Vec<PathBuf>) {
    let Ok(read) = fs::read_dir(dir) else { return };
    let mut entries: Vec<_> = read.flatten().collect();
    entries.sort_by_key(|e| e.file_name());
    for e in entries {
        let Ok(kind) = e.file_type() else { continue };
        if kind.is_dir() {
            if depth < MAX_DEPTH {
                files_under(&e.path(), depth + 1, out);
            }
        } else if kind.is_file() || kind.is_symlink() {
            out.push(e.path());
        }
    }
}

/// The first four bytes say whether a file is TrueType or CFF; everything else is skipped
/// without reading it (Creative Cloud keeps encrypted files beside the fonts).
fn looks_like_font(path: &Path) -> bool {
    let Ok(mut f) = fs::File::open(path) else {
        return false;
    };
    if f.metadata().map_or(true, |m| {
        !m.is_file() || m.len() > MAX_FONT_BYTES || m.len() < 1024
    }) {
        return false;
    }
    let mut head = [0u8; 4];
    f.read_exact(&mut head).is_ok() && matches!(&head, [0, 1, 0, 0] | b"true" | b"OTTO")
}

/// Choose the text font: `DESIGN_DATA_FONT` when set, else the best match for `target` in the
/// font folders, else `fallback`. Explicit `--font` paths are handled by the caller.
pub fn discover(target: &str, env: &Env, fallback: Option<FontSource>) -> Resolved {
    let mut resolver = Resolver::new(target);
    if let Some(path) = &env.font_override {
        let origin = path.display().to_string();
        match fs::read(path) {
            Ok(data) => match explicit(&origin, data, super::resolve::ENV_VAR) {
                Ok(done) => return done,
                Err(e) => resolver.reject(
                    &origin,
                    &format!("is unusable (set with {}): {e}", super::resolve::ENV_VAR),
                ),
            },
            Err(e) => resolver.reject(
                &origin,
                &format!("cannot be read (set with {}): {e}", super::resolve::ENV_VAR),
            ),
        }
    }
    let mut seen = 0;
    for dir in font_dirs(env) {
        if !dir.is_dir() {
            continue;
        }
        resolver.searched.push(dir.display().to_string());
        let mut files = Vec::new();
        files_under(&dir, 0, &mut files);
        for file in files {
            seen += 1;
            if seen > MAX_FILES {
                break;
            }
            if looks_like_font(&file) {
                if let Ok(data) = fs::read(&file) {
                    resolver.offer(&file.display().to_string(), data);
                }
            }
        }
    }
    resolver.finish(fallback)
}

#[cfg(test)]
mod tests {
    use super::super::resolve::tests::fake_font;
    use super::super::tests::{font, SS3};
    use super::*;

    fn mac(home: &Path) -> Env {
        Env {
            os: Os::Mac,
            home: Some(home.to_path_buf()),
            win_dir: None,
            local_app_data: None,
            app_data: None,
            font_override: None,
        }
    }

    fn put(path: &Path, data: &[u8]) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, data).unwrap();
    }

    fn big(mut d: Vec<u8>) -> Vec<u8> {
        d.resize(2048, 0);
        d
    }

    #[test]
    fn folder_lists_per_os() {
        let home = PathBuf::from("/h");
        let mut env = mac(&home);
        let d = font_dirs(&env);
        assert_eq!(d[0], home.join("Library/Fonts"));
        assert!(d.iter().any(|p| p.ends_with("CoreSync/plugins/livetype")));
        assert!(d.contains(&PathBuf::from("/Library/Fonts")));
        env.os = Os::Linux;
        assert!(font_dirs(&env).contains(&home.join(".local/share/fonts")));
        env.os = Os::Windows;
        env.win_dir = Some("C:/Windows".into());
        env.app_data = Some("C:/Users/u/AppData/Roaming".into());
        let d = font_dirs(&env);
        assert!(d.contains(&PathBuf::from("C:/Windows").join("Fonts")));
        assert!(d.iter().any(|p| p.ends_with("CoreSync/plugins/livetype")));
        // Variables that are unset drop their folder rather than guessing one.
        env.win_dir = None;
        env.app_data = None;
        assert_eq!(font_dirs(&env).len(), 0);
    }

    #[test]
    fn finds_a_font_in_a_hidden_creative_cloud_subfolder_by_its_header_not_its_name() {
        let home = tempfile::tempdir().unwrap();
        let cc = home
            .path()
            .join("Library/Application Support/Adobe/CoreSync/plugins/livetype");
        // A TrueType font named .otf, beside CFF fonts and encrypted junk.
        put(&cc.join(".r/.14548.otf"), SS3);
        put(
            &cc.join(".t/.7180.otf"),
            &big(fake_font(b"OTTO", "Adobe Clean", "Regular")),
        );
        put(&cc.join(".e/.10887"), &big(b"\xb2\x59\x3b\x76".to_vec()));
        let out = discover(&font().family().unwrap(), &mac(home.path()), None);
        assert!(out.status.found, "{:?}", out.status);
        assert!(
            out.status.using.ends_with(".r/.14548.otf"),
            "{}",
            out.status.using
        );
        assert!(out.status.searched.iter().any(|d| d.ends_with("livetype")));
        assert_eq!(out.status.related, vec!["Adobe Clean"]);
    }

    #[test]
    fn design_data_font_wins_over_the_scan_and_a_bad_one_is_reported() {
        let home = tempfile::tempdir().unwrap();
        put(&home.path().join("Library/Fonts/scanned.ttf"), SS3);
        let mine = home.path().join("elsewhere/mine.ttf");
        put(&mine, SS3);
        let mut env = mac(home.path());
        env.font_override = Some(mine.clone());
        let out = discover(&font().family().unwrap(), &env, None);
        assert_eq!(out.status.using, mine.display().to_string());
        assert!(out.status.help.contains("set with DESIGN_DATA_FONT"));
        // A path that does not exist is reported, and the scan still runs.
        env.font_override = Some(home.path().join("missing.ttf"));
        let out = discover(&font().family().unwrap(), &env, None);
        assert!(
            out.status.using.ends_with("scanned.ttf"),
            "{:?}",
            out.status
        );
        assert!(out.status.rejected[0].reason.contains("DESIGN_DATA_FONT"));
        // One that is not a usable font is reported with the reason.
        let junk = home.path().join("junk.otf");
        put(&junk, b"OTTO\0\0\0\0\0\0\0\0");
        env.font_override = Some(junk);
        let out = discover(TARGET, &env, None);
        assert!(
            !out.status.found && out.status.rejected[0].reason.contains("CFF"),
            "{:?}",
            out.status
        );
    }

    #[test]
    fn nothing_found_gives_the_fallback_and_the_help() {
        let home = tempfile::tempdir().unwrap();
        put(
            &home.path().join("Library/Fonts/other.otf"),
            &big(fake_font(b"OTTO", "Adobe Clean", "Bold")),
        );
        let fb = FontSource {
            data: vec![1],
            origin: "bundled Source Sans 3".into(),
        };
        let out = discover(TARGET, &mac(home.path()), Some(fb));
        assert!(!out.status.found && out.status.fallback);
        assert_eq!(out.status.related, vec!["Adobe Clean"]);
        assert!(out.status.help.contains("different font"));
        assert_eq!(out.font.unwrap().origin, "bundled Source Sans 3");
        // An empty machine still works, and says what it searched (nothing).
        let empty = tempfile::tempdir().unwrap();
        let out = discover(TARGET, &mac(empty.path()), None);
        assert_eq!(out.status.using, "placeholder bars");
        assert!(out.status.searched.iter().all(|d| d.starts_with('/')));
    }

    const TARGET: &str = "Adobe Clean Spectrum VF";

    #[test]
    fn too_small_and_too_deep_files_are_skipped() {
        let home = tempfile::tempdir().unwrap();
        put(&home.path().join("Library/Fonts/tiny.ttf"), &SS3[..512]);
        let deep = home.path().join("Library/Fonts/a/b/c/d/e/f/deep.ttf");
        put(&deep, SS3);
        let out = discover(&font().family().unwrap(), &mac(home.path()), None);
        assert!(!out.status.found, "{:?}", out.status);
    }
}
