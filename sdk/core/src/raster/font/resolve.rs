// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Choosing the text font and saying why. Pure: callers read files and offer their bytes, so
//! this is the same on every target and easy to test.

use super::{family_key, Flavor, Font, FontSource};
use serde::Serialize;
use std::collections::BTreeSet;

pub const TARGET_FAMILY: &str = "Adobe Clean Spectrum VF";
/// Where Adobe employees get the font (employees only).
pub const DOWNLOAD_URL: &str =
    "https://inside.corp.adobe.com/content/inside/en/brand-center/font.html";
pub const ENV_VAR: &str = "DESIGN_DATA_FONT";

/// A font file that was found but cannot be used, and why.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Rejected {
    pub origin: String,
    pub reason: String,
}

/// Which font draws text, and what to tell the user when it is not the one they want.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FontStatus {
    /// The family looked for.
    pub target: String,
    /// True when `using` is the target family (or a font the user chose explicitly).
    pub found: bool,
    /// Path of the font text is drawn with, or the bundled fallback's name.
    pub using: String,
    /// True when text is drawn in the bundled fallback.
    pub fallback: bool,
    /// Files of the target family that cannot be used (a CFF `.otf`, an italic).
    pub rejected: Vec<Rejected>,
    /// Other Adobe Clean families on the machine (Creative Cloud's Adobe Clean), not used.
    pub related: Vec<String>,
    /// Directories that exist and were searched.
    pub searched: Vec<String>,
    /// What to tell the user, ready to show.
    pub help: String,
}

/// The font to draw with and its status.
#[derive(Debug, Clone)]
pub struct Resolved {
    pub font: Option<FontSource>,
    pub status: FontStatus,
}

/// Collects candidate files and picks the best match for a family.
pub struct Resolver {
    target: String,
    key: String,
    best: Option<(u8, String, Vec<u8>)>,
    rejected: Vec<Rejected>,
    related: BTreeSet<String>,
    pub searched: Vec<String>,
}

impl Resolver {
    pub fn new(target: &str) -> Self {
        Self {
            target: target.into(),
            key: family_key(target),
            best: None,
            rejected: vec![],
            related: BTreeSet::new(),
            searched: vec![],
        }
    }

    /// Consider one file. Anything that is not a font is ignored without comment.
    pub fn offer(&mut self, origin: &str, data: Vec<u8>) {
        let Ok((info, data)) = Font::inspect(data) else {
            return;
        };
        let Some(family) = info.family.clone() else {
            return;
        };
        let key = family_key(&family);
        if key != self.key {
            if key.starts_with("adobeclean") {
                self.related.insert(family);
            }
            return;
        }
        let mut reject = |reason: &str| {
            self.rejected.push(Rejected {
                origin: origin.into(),
                reason: reason.into(),
            })
        };
        if info.flavor == Flavor::Cff {
            return reject(
                "is the PostScript-outline (CFF) version; the TrueType (.ttf) file is needed",
            );
        }
        if info
            .subfamily
            .as_deref()
            .is_some_and(|s| s.to_ascii_lowercase().contains("italic"))
        {
            return reject("is the Italic file; the Roman file is needed");
        }
        if let Err(e) = Font::parse(data.clone()) {
            return reject(&format!("cannot be read: {e}"));
        }
        let rank = if info.variable { 2 } else { 1 };
        if self.best.as_ref().is_none_or(|b| rank > b.0) {
            self.best = Some((rank, origin.into(), data));
        }
    }

    /// Note a file that was asked for by name and could not be used.
    pub fn reject(&mut self, origin: &str, reason: &str) {
        self.rejected.push(Rejected {
            origin: origin.into(),
            reason: reason.into(),
        });
    }

    /// The best match, else `fallback`, with the status that explains it.
    pub fn finish(self, fallback: Option<FontSource>) -> Resolved {
        let related: Vec<String> = self.related.into_iter().collect();
        let mut status = FontStatus {
            target: self.target.clone(),
            found: false,
            using: String::new(),
            fallback: false,
            rejected: self.rejected,
            related,
            searched: self.searched,
            help: String::new(),
        };
        if let Some((_, origin, data)) = self.best {
            status.found = true;
            status.help = format!("Using {origin}.");
            status.using = origin.clone();
            return Resolved {
                font: Some(FontSource { data, origin }),
                status,
            };
        }
        status.fallback = fallback.is_some();
        status.using = fallback
            .as_ref()
            .map_or("placeholder bars".into(), |f| f.origin.clone());
        status.help = help(&status);
        Resolved {
            font: fallback,
            status,
        }
    }
}

/// A font the user named (`--font` or `DESIGN_DATA_FONT`): used as given, if it is readable.
pub fn explicit(origin: &str, data: Vec<u8>, via: &str) -> Result<Resolved, String> {
    let font = Font::parse(data.clone()).map_err(|e| format!("{origin}: {e}"))?;
    let family = font.family().unwrap_or_else(|| "unnamed font".into());
    Ok(Resolved {
        font: Some(FontSource {
            data,
            origin: origin.into(),
        }),
        status: FontStatus {
            target: TARGET_FAMILY.into(),
            found: true,
            using: origin.into(),
            fallback: false,
            rejected: vec![],
            related: vec![],
            searched: vec![],
            help: format!("Using {origin} ({family}), set with {via}."),
        },
    })
}

fn help(s: &FontStatus) -> String {
    let mut parts: Vec<String> = s
        .rejected
        .iter()
        .map(|r| format!("Found {} but it {}.", r.origin, r.reason))
        .collect();
    if s.rejected.is_empty() && !s.related.is_empty() {
        parts.push(format!(
            "Found {} on this machine, but previews need {}, which is a different font.",
            s.related.join(", "),
            s.target
        ));
    }
    parts.push(format!(
        "{} was not found, so text is drawn in {} and may differ slightly in width.",
        s.target, s.using
    ));
    parts.push(format!(
        "Adobe employees can download it from the Brand Center ({DOWNLOAD_URL}). \
         Install AdobeCleanSpectrumVF-Roman.ttf (double-click it), or set {ENV_VAR} to the file's path."
    ));
    parts.join(" ")
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::raster::font::tests::{font, SS3};

    /// A minimal font file with only a `name` table: enough to identify, not to draw.
    pub fn fake_font(flavor: &[u8; 4], family: &str, subfamily: &str) -> Vec<u8> {
        let utf16 = |s: &str| -> Vec<u8> { s.encode_utf16().flat_map(u16::to_be_bytes).collect() };
        let (fam, sub) = (utf16(family), utf16(subfamily));
        let mut name = vec![0, 0, 0, 2, 0, 30];
        for (id, off, len) in [(1u16, 0usize, fam.len()), (2, fam.len(), sub.len())] {
            for v in [3u16, 1, 0x409, id, len as u16, off as u16] {
                name.extend_from_slice(&v.to_be_bytes());
            }
        }
        name.extend_from_slice(&fam);
        name.extend_from_slice(&sub);
        let mut out = flavor.to_vec();
        out.extend_from_slice(&[0, 1, 0, 16, 0, 0, 0, 0]);
        out.extend_from_slice(b"name\0\0\0\0");
        out.extend_from_slice(&28u32.to_be_bytes());
        out.extend_from_slice(&(name.len() as u32).to_be_bytes());
        out.extend_from_slice(&name);
        out
    }

    fn target() -> String {
        font().family().unwrap()
    }

    fn resolver() -> Resolver {
        Resolver::new(&target())
    }

    #[test]
    fn picks_the_matching_truetype_font_and_ignores_the_rest() {
        let mut r = resolver();
        r.offer("noise.bin", vec![1, 2, 3]);
        r.offer("other.otf", fake_font(b"OTTO", "Open Sans", "Regular"));
        r.offer("/fonts/ss3.ttf", SS3.to_vec());
        let out = r.finish(None);
        assert!(out.status.found && !out.status.fallback);
        assert_eq!(out.status.using, "/fonts/ss3.ttf");
        assert_eq!(out.font.unwrap().origin, "/fonts/ss3.ttf");
        assert!(out.status.rejected.is_empty() && out.status.related.is_empty());
        assert_eq!(out.status.help, "Using /fonts/ss3.ttf.");
    }

    #[test]
    fn a_cff_version_of_the_family_is_reported_not_used() {
        let mut r = resolver();
        r.offer("/fonts/clean.otf", fake_font(b"OTTO", &target(), "Regular"));
        let out = r.finish(None);
        assert!(!out.status.found && out.font.is_none());
        assert_eq!(out.status.rejected.len(), 1);
        assert!(out
            .status
            .help
            .contains("Found /fonts/clean.otf but it is the PostScript-outline (CFF) version"));
        assert!(out.status.help.contains(".ttf"));
        assert!(out.status.help.contains(DOWNLOAD_URL) && out.status.help.contains(ENV_VAR));
    }

    #[test]
    fn another_adobe_clean_family_is_named_but_never_used() {
        let mut r = Resolver::new(TARGET_FAMILY);
        r.offer("cc/.1.otf", fake_font(b"OTTO", "Adobe Clean", "Bold"));
        r.offer("cc/.2.otf", fake_font(b"OTTO", "Adobe Clean Serif", "Bold"));
        r.offer("cc/.3.otf", fake_font(b"OTTO", "Adobe Clean", "Light"));
        let fallback = FontSource {
            data: vec![],
            origin: "bundled Source Sans 3".into(),
        };
        let out = r.finish(Some(fallback));
        assert!(!out.status.found && out.status.fallback);
        assert_eq!(out.status.related, vec!["Adobe Clean", "Adobe Clean Serif"]);
        assert!(out
            .status
            .help
            .contains("Found Adobe Clean, Adobe Clean Serif on this machine"));
        assert!(out.status.help.contains(
            "Adobe Clean Spectrum VF was not found, so text is drawn in bundled Source Sans 3"
        ));
        assert_eq!(out.font.unwrap().origin, "bundled Source Sans 3");
    }

    #[test]
    fn an_italic_file_is_skipped_for_roman_text() {
        let italic: Vec<u8> = {
            let mut d = SS3.to_vec();
            let from: Vec<u8> = "Regular"
                .encode_utf16()
                .flat_map(u16::to_be_bytes)
                .collect();
            let to: Vec<u8> = "Italics"
                .encode_utf16()
                .flat_map(u16::to_be_bytes)
                .collect();
            let mut i = 0;
            while let Some(p) = d[i..].windows(from.len()).position(|w| w == from) {
                d[i + p..i + p + from.len()].copy_from_slice(&to);
                i += p + from.len();
            }
            d
        };
        let mut only = resolver();
        only.offer("/f/italic.ttf", italic.clone());
        let out = only.finish(None);
        assert!(!out.status.found, "{:?}", out.status);
        assert!(out.status.rejected[0].reason.contains("Italic"));
        let mut both = resolver();
        both.offer("/f/italic.ttf", italic);
        both.offer("/f/roman.ttf", SS3.to_vec());
        let out = both.finish(None);
        assert_eq!(out.status.using, "/f/roman.ttf");
    }

    #[test]
    fn the_first_of_equal_matches_wins_and_a_broken_one_is_rejected() {
        let mut r = resolver();
        r.offer("/a.ttf", SS3.to_vec());
        r.offer("/b.ttf", SS3.to_vec());
        assert_eq!(r.finish(None).status.using, "/a.ttf");
        // The right name but no glyph data: found, unusable, and said so.
        let mut r = resolver();
        r.offer(
            "/broken.ttf",
            fake_font(&[0, 1, 0, 0], &target(), "Regular"),
        );
        let out = r.finish(None);
        assert!(
            out.status.rejected[0].reason.contains("cannot be read"),
            "{:?}",
            out.status
        );
    }

    #[test]
    fn an_explicit_font_is_used_as_given_or_refused_with_the_reason() {
        let ok = explicit("/mine.ttf", SS3.to_vec(), "--font").unwrap();
        assert!(ok.status.found && !ok.status.fallback);
        assert!(
            ok.status.help.contains("set with --font") && ok.status.help.contains("SourceSans3VF")
        );
        let err = explicit("/mine.otf", b"OTTO\0\0\0\0\0\0\0\0".to_vec(), "--font").unwrap_err();
        assert!(err.contains("/mine.otf") && err.contains("CFF"), "{err}");
    }

    #[test]
    fn status_serializes_for_json_output() {
        let v = serde_json::to_value(resolver().finish(None).status).unwrap();
        assert_eq!(v["fallback"], false);
        assert_eq!(v["using"], "placeholder bars");
        assert!(v["help"].as_str().unwrap().contains("was not found"));
        assert!(v["rejected"].as_array().unwrap().is_empty());
    }
}
