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
//! dispatcher in `update_command.rs` matches on `Command::parse`, the Tab
//! autocomplete in `update.rs` iterates `Command::ALL` canonical names, and the
//! home-screen `COMMANDS` table in `logo.rs` is kept in lock-step by a
//! bidirectional sync test (see the `tests` module below). Adding a variant here
//! is the one place a new command is declared; everything else derives from it.

/// Declare the `Command` enum together with its `ALL` list, `canonical()` name,
/// and `aliases()` from a single table.
///
/// Generating all four from one source makes drift impossible: a variant can't
/// exist without an entry here, and that entry necessarily populates `ALL`,
/// `canonical()`, and `aliases()`. This is the zero-dependency stand-in for what
/// a `strum`-style derive would provide.
macro_rules! define_commands {
    ($(
        $variant:ident => $canonical:literal $(| $alias:literal)*
    ),+ $(,)?) => {
        /// A dispatchable palette command.
        ///
        /// Each variant maps to exactly one canonical name (the string typed
        /// after `:`) and zero or more aliases. `parse` accepts either form; the
        /// rest of the code only reasons about variants.
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub(crate) enum Command {
            $($variant),+
        }

        impl Command {
            /// Every command variant, for exhaustive iteration in tests and
            /// autocomplete. Generated from the table, so it can never omit a
            /// variant.
            pub(crate) const ALL: &'static [Command] = &[$(Command::$variant),+];

            /// The primary name typed after `:` (e.g. `Describe => "describe"`).
            pub(crate) fn canonical(self) -> &'static str {
                match self {
                    $(Command::$variant => $canonical),+
                }
            }

            /// Accepted alternate names that dispatch to the same variant.
            pub(crate) fn aliases(self) -> &'static [&'static str] {
                match self {
                    $(Command::$variant => &[$($alias),*]),+
                }
            }
        }
    };
}

define_commands! {
    Query => "query",
    Resolve => "resolve",
    Describe => "describe" | "component",
    Validate => "validate",
    New => "new" | "create",
    Find => "find",
    Name => "name",
}

impl Command {
    /// Parse a command token (the part before the first space) into a variant.
    ///
    /// Matching is case-insensitive on the canonical name or any alias, mirroring
    /// the lowercase normalization done by `handle_palette_submit`.
    pub(crate) fn parse(cmd: &str) -> Option<Command> {
        let cmd = cmd.to_lowercase();
        Command::ALL
            .iter()
            .copied()
            .find(|c| c.canonical() == cmd || c.aliases().iter().any(|&a| a == cmd))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::logo::COMMANDS;

    /// Extract the command token from a `COMMANDS` entry name, e.g.
    /// `":describe <component>" -> "describe"`. Returns `None` for non-palette
    /// entries (global keys like `?` / `q` that don't start with `:`).
    ///
    /// This relies on the convention that every palette command in `COMMANDS`
    /// is written `:<name> [<args>]` and global keys are not. A future global key
    /// with `:`-prefixed syntax would need this filter revisited.
    fn command_token(name: &str) -> Option<&str> {
        let rest = name.strip_prefix(':')?;
        Some(rest.split_whitespace().next().unwrap_or(rest))
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
                matches, 1,
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
