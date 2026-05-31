// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

mod common;
use common::{key, make_graph, update_ctx};

use crossterm::event::KeyCode;
use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph};
use design_data_tui::app::Modal;
use design_data_tui::wizard::{ValueKind, WizardPath, WizardScreen};
use design_data_tui::{update, Message, Model, Task, UpdateCtx};
use std::path::PathBuf;

fn make_graph_with_modes() -> TokenGraph {
    let ms = ModeSetRecord {
        file: PathBuf::from("mode-sets/color-scheme.json"),
        name: "colorScheme".into(),
        modes: vec!["light".into(), "dark".into()],
        default_mode: "light".into(),
    };
    make_graph().with_mode_sets(vec![ms])
}

fn fixtures_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

/// Open the wizard via `PaletteSubmit("new <intent>")`.
fn open_wizard(model: &mut Model, ctx: &UpdateCtx<'_>, intent: &str) {
    update(model, Message::PaletteSubmit(format!("new {intent}")), ctx);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn new_command_opens_wizard() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "accent background");
    assert!(model.is_modal_open(), "modal should be open after :new");
}

#[test]
fn esc_cancels_wizard() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "accent background");
    let task = update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.is_modal_open(), "modal should close on Esc");
    assert!(
        matches!(task, Task::Cmd(_)),
        "cancel should return Task::Cmd (draft clear)"
    );
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("cancelled"),
        "status should say cancelled: {msg}"
    );
}

#[test]
fn intent_populates_suggestions_on_open() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "accent background");
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert!(
            !ws.suggestions.is_empty(),
            "suggestions should be populated from intent"
        );
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn enter_on_screen_1_advances_to_screen_2() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "accent background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.screen,
            WizardScreen::Classification,
            "should advance to Screen 2"
        );
    } else {
        panic!("expected wizard modal after Enter on Screen 1");
    }
}

#[test]
fn tab_with_suggestion_sets_alias_path_and_jumps_to_confirm() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "accent background");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.screen,
            WizardScreen::Confirm,
            "Tab should jump to Confirm"
        );
        assert!(
            matches!(ws.chosen_path, WizardPath::AliasToExisting(_)),
            "chosen_path should be AliasToExisting"
        );
    } else {
        panic!("expected wizard modal after Tab");
    }
}

#[test]
fn screen_2_layer_cycles_with_arrow_keys() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Right)), &ctx);
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.classification.layer,
            Layer::Platform,
            "Right should advance layer"
        );
    } else {
        panic!("expected wizard modal");
    }
    update(&mut model, Message::Key(key(KeyCode::Left)), &ctx);
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.classification.layer,
            Layer::Foundation,
            "Left should reverse layer"
        );
    }
}

#[test]
fn screen_2_enter_advances_to_screen_3() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.screen,
            WizardScreen::Values,
            "should advance to Screen 3"
        );
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_3_mode_rows_match_cartesian_product() {
    let graph = make_graph_with_modes();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.values.rows.len(),
            2,
            "should have one row per mode combo"
        );
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_3_a_l_toggle_value_kind() {
    let graph = make_graph_with_modes();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Char('l'))), &ctx);
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.values.rows[0].kind,
            ValueKind::Literal,
            "'l' should set Literal"
        );
    }
    update(&mut model, Message::Key(key(KeyCode::Char('a'))), &ctx);
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.values.rows[0].kind,
            ValueKind::Alias,
            "'a' should restore Alias"
        );
    }
}

#[test]
fn screen_3_enter_advances_to_screen_4() {
    let fixtures = fixtures_path();
    let graph = make_graph();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(fixtures.as_path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(
            ws.screen,
            WizardScreen::Confirm,
            "should advance to Screen 4"
        );
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_4_empty_rationale_blocks_submit() {
    let fixtures = fixtures_path();
    let graph = make_graph();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(fixtures.as_path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // Submit with empty rationale
    assert!(
        model.is_modal_open(),
        "modal should stay open when rationale is empty"
    );
}

#[test]
fn screen_4_diff_preview_is_populated_on_enter() {
    let fixtures = fixtures_path();
    let graph = make_graph();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(fixtures.as_path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx); // focus → property
    for c in "background-color".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(ws.screen, WizardScreen::Confirm);
        let diff = ws
            .diff_preview
            .as_ref()
            .expect("diff_preview should be populated");
        assert!(diff.contains('+'), "diff should contain '+' lines");
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_4_submit_closes_modal_and_sets_status() {
    let fixtures = fixtures_path();
    let graph = make_graph();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(fixtures.as_path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4
    for c in "Needed for the checkout redesign".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    let task = update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    assert!(!model.is_modal_open(), "modal should close after submit");
    assert!(
        matches!(task, Task::Cmd(_)),
        "submit should return Task::Cmd (draft clear)"
    );
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("write disabled") || msg.contains("preview"),
        "status should mention preview/write disabled: {msg}"
    );
}

#[test]
fn screen_4_multi_mode_diff_emits_sets_for_every_row() {
    // Regression guard for the first-row-only write bug: a graph with a
    // color-scheme mode set produces light + dark rows, and the Confirm diff
    // must serialize both as a `sets` block — not just the first row.
    let fixtures = fixtures_path();
    let graph = make_graph_with_modes();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(fixtures.as_path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3 (light + dark)
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4 (build_diff)
    if let Some(Modal::Wizard(ref ws)) = model.modal() {
        assert_eq!(ws.values.rows.len(), 2, "two mode-combo rows expected");
        let diff = ws
            .diff_preview
            .as_ref()
            .expect("diff_preview should be populated");
        assert!(
            diff.contains("sets"),
            "multi-mode token must emit a `sets` block, got:\n{diff}"
        );
        assert!(diff.contains("light"), "diff should include the light set");
        assert!(diff.contains("dark"), "diff should include the dark set");
        assert!(
            !diff.contains("$alias"),
            "alias rows must use the canonical `$ref` key, not `$alias`"
        );
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_3_assembled_token_serializes_every_mode_row_as_sets() {
    // Companion to the diff regression above, but asserting on the *structured*
    // token object the write path serializes. `perform_write` and `build_diff`
    // both derive from `assembled_token`, so parsing `sets.light` / `sets.dark`
    // here guards against a future divergence between the diff preview and the
    // JSON that actually lands on disk — caught against parsed values rather than
    // diff text.
    let fixtures = fixtures_path();
    let graph = make_graph_with_modes();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(fixtures.as_path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3 (light + dark)

    let Some(Modal::Wizard(ref ws)) = model.modal() else {
        panic!("expected wizard modal");
    };
    assert_eq!(ws.values.rows.len(), 2, "two mode-combo rows expected");

    let token = ws.assembled_token();
    let sets = token
        .get("sets")
        .and_then(|v| v.as_object())
        .unwrap_or_else(|| panic!("multi-mode token must serialize a `sets` object, got: {token}"));
    assert!(
        sets.contains_key("light"),
        "sets must include the light row, got: {sets:?}"
    );
    assert!(
        sets.contains_key("dark"),
        "sets must include the dark row, got: {sets:?}"
    );
    assert!(
        token.get("value").is_none() && token.get("$ref").is_none(),
        "multi-mode token must not collapse to a single flat value/$ref, got: {token}"
    );
}

// ── No-write guard (uses tempfile for FS-absence assertion) ─────────────────────

#[test]
fn submit_does_not_create_foundation_json_without_allow_write() {
    let graph = make_graph();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let foundation_file = tmpdir.path().join("foundation.json");
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(tmpdir.path()),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: design_data_core::query::TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();

    // Drive the wizard to Screen 4 and submit without --allow-write.
    open_wizard(&mut model, &ctx, "background");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx); // focus property
    for c in "background".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4
    for c in "Rationale text here".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // submit (preview only)

    assert!(
        !foundation_file.exists(),
        "wizard submit without --allow-write must NOT write"
    );
}

// ── WizardState unit test ─────────────────────────────────────────────────────

#[test]
fn assembled_name_joins_property_and_fields() {
    use design_data_tui::wizard::WizardState;
    let mut ws = WizardState::new();
    use tui_input::Input;
    ws.classification.property = Input::from("background-color".to_string());
    ws.classification
        .name_fields
        .push(design_data_tui::wizard::NameField {
            key: "variant".into(),
            value: Input::from("hover".to_string()),
        });
    assert_eq!(ws.assembled_name(), "background-color-hover");
}
