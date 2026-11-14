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
use super::{inspect_head, Font, FontSource, Inspect};
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

/// Largest font file considered. Adobe's variable fonts are about 1 MB.
const MAX_FONT_BYTES: u64 = 25 * 1024 * 1024;
/// Smaller files cannot hold a font and a name table.
const MIN_FONT_BYTES: u64 = 1024;
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

/// Bytes read from the start of a file: enough for any table directory (a font has well under
/// 200 tables, 16 bytes each).
const HEAD_BYTES: usize = 4096;

/// Identify a file from its table directory and `name` table, reading a few KB, never the
/// whole file. `None` for anything that is not a usable-size TrueType or CFF font; Creative
/// Cloud keeps encrypted files beside its fonts, and they fail the header check here.
fn inspect_file(path: &Path) -> Option<Inspect> {
    let mut f = fs::File::open(path).ok()?;
    let len = f.metadata().ok().filter(|m| m.is_file())?.len();
    if !(MIN_FONT_BYTES..=MAX_FONT_BYTES).contains(&len) {
        return None;
    }
    let mut head = vec![0u8; HEAD_BYTES.min(len as usize)];
    f.read_exact(&mut head).ok()?;
    inspect_head(&head, len, &mut |offset, n| {
        f.seek(SeekFrom::Start(offset)).ok()?;
        let mut table = vec![0u8; n];
        f.read_exact(&mut table).ok()?;
        Some(table)
    })
}

/// Choose the text font: `DESIGN_DATA_FONT` when set, else the best match for `target` in the
/// font folders, else `fallback`. Explicit `--font` paths are handled by the caller.
///
/// Files are identified by a few KB each; only the winner is read in full, and if it turns
/// out not to parse it is reported and the next best is tried, so a damaged file never keeps a
/// good one from being used.
pub fn discover(target: &str, env: &Env, fallback: Option<FontSource>) -> Resolved {
    let mut env_rejected = None;
    if let Some(path) = &env.font_override {
        let origin = path.display().to_string();
        match fs::read(path) {
            Ok(data) => match explicit(&origin, data, super::resolve::ENV_VAR) {
                Ok(done) => return done,
                Err(e) => {
                    env_rejected = Some((
                        origin,
                        format!("is unusable (set with {}): {e}", super::resolve::ENV_VAR),
                    ))
                }
            },
            Err(e) => {
                env_rejected = Some((
                    origin,
                    format!("cannot be read (set with {}): {e}", super::resolve::ENV_VAR),
                ))
            }
        }
    }
    let (mut searched, mut candidates, mut seen) = (Vec::new(), Vec::new(), 0);
    for dir in font_dirs(env) {
        if !dir.is_dir() {
            continue;
        }
        searched.push(dir.display().to_string());
        let mut files = Vec::new();
        files_under(&dir, 0, &mut files);
        for file in files {
            seen += 1;
            if seen > MAX_FILES {
                break;
            }
            if let Some(info) = inspect_file(&file) {
                candidates.push((file.display().to_string(), info));
            }
        }
    }
    let mut unusable: Vec<(String, String)> = Vec::new();
    loop {
        let mut resolver = Resolver::new(target);
        resolver.searched = searched.clone();
        if let Some((origin, reason)) = &env_rejected {
            resolver.reject(origin, reason);
        }
        for (origin, reason) in &unusable {
            resolver.reject(origin, reason);
        }
        for (origin, info) in &candidates {
            if !unusable.iter().any(|(o, _)| o == origin) {
                resolver.offer_info(origin, info);
            }
        }
        let mut resolved = resolver.finish(fallback.clone());
        if !resolved.status.found {
            return resolved;
        }
        let origin = resolved.status.using.clone();
        match fs::read(&origin)
            .map_err(|e| e.to_string())
            .and_then(|data| {
                Font::parse(data.clone()).map_err(|e| e.to_string())?;
                Ok(data)
            }) {
            Ok(data) => {
                resolved.font = Some(FontSource { data, origin });
                return resolved;
            }
            Err(e) => unusable.push((origin, format!("cannot be read: {e}"))),
        }
    }
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

    /// The fixture with its `head` table's unitsPerEm zeroed: it identifies by name but will
    /// not parse as a font.
    fn damaged() -> Vec<u8> {
        let mut d = SS3.to_vec();
        let count = u16::from_be_bytes([d[4], d[5]]) as usize;
        let rec = (0..count)
            .map(|i| 12 + 16 * i)
            .find(|&r| &d[r..r + 4] == b"head")
            .expect("head table");
        let off = u32::from_be_bytes(d[rec + 8..rec + 12].try_into().unwrap()) as usize;
        d[off + 18..off + 20].fill(0);
        d
    }

    #[test]
    fn a_damaged_match_is_reported_and_the_next_good_one_is_used() {
        let home = tempfile::tempdir().unwrap();
        let (bad, good) = (
            home.path().join("Library/Fonts/a-damaged.ttf"),
            home.path().join("Library/Fonts/b-good.ttf"),
        );
        put(&bad, &damaged());
        put(&good, SS3);
        let out = discover(&font().family().unwrap(), &mac(home.path()), None);
        assert!(out.status.found, "{:?}", out.status);
        assert_eq!(out.status.using, good.display().to_string());
        assert!(out.font.is_some(), "the winner's bytes are read");
        let r = &out.status.rejected;
        assert_eq!(r.len(), 1, "{r:?}");
        assert_eq!(r[0].origin, bad.display().to_string());
        assert!(r[0].reason.contains("cannot be read"), "{}", r[0].reason);
    }

    #[test]
    fn only_a_damaged_match_falls_back_with_the_reason() {
        let home = tempfile::tempdir().unwrap();
        put(&home.path().join("Library/Fonts/only.ttf"), &damaged());
        let fb = FontSource {
            data: vec![1],
            origin: "bundled Source Sans 3".into(),
        };
        let out = discover(&font().family().unwrap(), &mac(home.path()), Some(fb));
        assert!(!out.status.found && out.status.fallback);
        assert_eq!(out.status.rejected.len(), 1);
        assert!(
            out.status.help.contains("only.ttf but it cannot be read"),
            "{}",
            out.status.help
        );
        assert_eq!(out.font.unwrap().origin, "bundled Source Sans 3");
    }

    #[test]
    fn a_font_is_identified_without_reading_it_in_full() {
        // 20 MB of padding after a real font: identifying it must not need that much I/O, and
        // the name table is found by seeking, so the padding is never touched.
        let home = tempfile::tempdir().unwrap();
        let mut big = SS3.to_vec();
        big.resize(20 * 1024 * 1024, 0);
        let path = home.path().join("Library/Fonts/padded.ttf");
        put(&path, &big);
        let info = inspect_file(&path).expect("identifies");
        assert_eq!(info.family.as_deref(), Some("SourceSans3VF"));
        // Beyond the size cap it is not considered at all.
        big.resize(26 * 1024 * 1024, 0);
        put(&path, &big);
        assert!(inspect_file(&path).is_none());
        assert!(inspect_file(&home.path().join("nope.ttf")).is_none());
    }

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
