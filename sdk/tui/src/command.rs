// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! The enumerable set of `:cmd` palette commands (GH #1096).
//!
//! `Command` is the single source of truth for which palette commands exist. The
//! dispatcher in `update/command.rs` matches on `Command::parse`, the Tab
//! autocomplete in `update.rs` iterates `Command::ALL` canonical names, and the
//! home-screen `COMMANDS` table in `logo.rs` is kept in lock-step by a
//! bidirectional sync test (see the `tests` module below). Adding a variant here
//! is the one place a new command is declared; everything else derives from it.

/// Declare the `Command` enum together with its `ALL` list, `canonical()` name,
/// `aliases()`, and `description()` from a single table.
///
/// Generating all four from one source makes drift impossible: a variant can't
/// exist without an entry here, and that entry necessarily populates `ALL`,
/// `canonical()`, `aliases()`, and `description()`. This is the zero-dependency
/// stand-in for what a `strum`-style derive would provide.
macro_rules! define_commands {
    ($(
        $variant:ident => $canonical:literal $(| $alias:literal)* , $desc:literal
    ),+ $(,)?) => {
        /// A dispatchable palette command.
        ///
        /// Each variant maps to exactly one canonical name and zero or more
        /// aliases. `parse` accepts either form; the rest of the code only
        /// reasons about variants.
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum Command {
            $($variant),+
        }

        impl Command {
            /// Every command variant, for exhaustive iteration in tests and
            /// autocomplete. Generated from the table, so it can never omit a
            /// variant.
            pub const ALL: &'static [Command] = &[$(Command::$variant),+];

            /// The primary name typed at the prompt (e.g. `Describe => "describe"`).
            pub fn canonical(self) -> &'static str {
                match self {
                    $(Command::$variant => $canonical),+
                }
            }

            /// Accepted alternate names that dispatch to the same variant.
            pub fn aliases(self) -> &'static [&'static str] {
                match self {
                    $(Command::$variant => &[$($alias),*]),+
                }
            }

            /// One-line description shown in the live command list on the home screen.
            pub fn description(self) -> &'static str {
                match self {
                    $(Command::$variant => $desc),+
                }
            }
        }
    };
}

define_commands! {
    Query   => "query",                    "Filter tokens  e.g. background-color/*",
    Resolve => "resolve",                  "Resolve a property through the cascade",
    Describe => "describe" | "component",  "Inspect a component schema",
    Validate => "validate",               "Validate all tokens against schemas",
    New     => "new" | "create",          "Open the token authoring wizard",
    Name    => "name",                    "Open the token naming wizard",
    Find    => "find",                    "Open the fuzzy-find token explorer",
    Quit    => "quit",                    "Quit the TUI",
}

impl Command {
    /// Parse a command token (the part before the first space) into a variant.
    ///
    /// Matching is case-insensitive on the canonical name or any alias, mirroring
    /// the lowercase normalization done by `handle_palette_submit`. All command
    /// names are ASCII, so `eq_ignore_ascii_case` lets this stay allocation-free.
    pub fn parse(cmd: &str) -> Option<Command> {
        Command::ALL.iter().copied().find(|c| {
            c.canonical().eq_ignore_ascii_case(cmd)
                || c.aliases().iter().any(|&a| a.eq_ignore_ascii_case(cmd))
        })
    }

    /// Return all commands whose canonical name or any alias starts with the
    /// first whitespace-delimited token of `input` (lowercased). An empty input
    /// returns all commands. Used by the live command list and Tab autocomplete.
    pub fn filter(input: &str) -> Vec<Command> {
        let tok = input.split_whitespace().next().unwrap_or("").to_lowercase();
        if tok.is_empty() {
            return Command::ALL.to_vec();
        }
        Command::ALL
            .iter()
            .copied()
            .filter(|c| {
                c.canonical().starts_with(tok.as_str())
                    || c.aliases().iter().any(|&a| a.starts_with(tok.as_str()))
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::logo::COMMANDS;

    /// Extract the command token from a `COMMANDS` entry name, e.g.
    /// `"describe <component>" -> "describe"`. Returns `None` for non-palette
    /// entries (global keys like `?` that are not dispatchable commands).
    ///
    /// Commands are identified by checking whether the first token parses to a
    /// `Command` variant; the `?` help row and any future global-key rows are
    /// skipped because they don't parse.
    fn command_token(name: &str) -> Option<&str> {
        let tok = name.split_whitespace().next()?;
        // Only return this token if it actually parses as a command — that way
        // the `?` row and similar global-key rows are silently ignored.
        Command::parse(tok)?;
        Some(tok)
    }

    /// Every `Command` variant must have exactly one matching `COMMANDS` entry.
    ///
    /// This closes the COMMANDS -> dispatch direction: a command that the
    /// dispatcher handles but that nobody documents on the home screen fails here.
    #[test]
    fn every_command_has_a_commands_entry() {
        for cmd in Command::ALL {
            let matches = COMMANDS
                .iter()
                .filter(|(name, _)| command_token(name) == Some(cmd.canonical()))
                .count();
            assert_eq!(
                matches,
                1,
                "Command::{cmd:?} (`{}`) must map to exactly one COMMANDS entry, found {matches}; \
                 update logo.rs",
                cmd.canonical()
            );
        }
    }

    /// Every palette entry in `COMMANDS` must parse to a `Command` variant.
    ///
    /// This closes the dispatch -> COMMANDS direction: a `:` entry documented on
    /// the home screen but not handled by the dispatcher fails here.
    #[test]
    fn every_commands_entry_maps_to_a_command() {
        for (name, _) in COMMANDS {
            let Some(token) = command_token(name) else {
                continue;
            };
            assert!(
                Command::parse(token).is_some(),
                "COMMANDS entry {name:?} (`{token}`) does not map to a Command variant; \
                 add it to command.rs or remove it from logo.rs"
            );
        }
    }

    /// Aliases must parse and must not collide with any canonical name.
    #[test]
    fn aliases_parse_and_do_not_collide() {
        for cmd in Command::ALL {
            for &alias in cmd.aliases() {
                assert_eq!(
                    Command::parse(alias),
                    Some(*cmd),
                    "alias `{alias}` should parse to Command::{cmd:?}"
                );
                assert!(
                    Command::ALL.iter().all(|c| c.canonical() != alias),
                    "alias `{alias}` collides with a canonical command name"
                );
            }
        }
    }

    /// `parse` is case-insensitive, matching the palette's lowercase normalization.
    #[test]
    fn parse_is_case_insensitive() {
        assert_eq!(Command::parse("QUERY"), Some(Command::Query));
        assert_eq!(Command::parse("Component"), Some(Command::Describe));
        assert_eq!(Command::parse("bogus"), None);
    }
}
