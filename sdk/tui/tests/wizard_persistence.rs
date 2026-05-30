// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Wizard draft persistence tests (Q3 of RFC #973).

use std::env;
use std::sync::Mutex;

mod common;
use common::{empty_graph, key, update_ctx};

use crossterm::event::KeyCode;
use design_data_core::graph::TokenGraph;
use design_data_tui::app::Modal;
use design_data_tui::wizard::{WizardScreen, WizardState};
use design_data_tui::wizard_draft::{
    from_draft, load_wizard_draft, save_wizard_draft, to_draft, wizard_draft_path,
};
use design_data_tui::{update, Message, Model, Task};
use tempfile::TempDir;

// Serialize env-touching tests within this binary to prevent concurrent tests
// from stomping on DESIGN_DATA_TUI_WIZARD_DRAFT.
static DRAFT_ENV_LOCK: Mutex<()> = Mutex::new(());

fn with_temp_draft<F: FnOnce()>(f: F) -> TempDir {
    let dir = TempDir::new().unwrap();
    let draft_path = dir.path().join("wizard-draft.json");
    let _guard = DRAFT_ENV_LOCK.lock().unwrap();
    env::set_var("DESIGN_DATA_TUI_WIZARD_DRAFT", &draft_path);
    f();
    env::remove_var("DESIGN_DATA_TUI_WIZARD_DRAFT");
    dir
}

fn make_wizard_with_intent(intent: &str) -> WizardState {
    WizardState::new_with_intent(intent)
}

// ── Round-trip (pure WizardState serialization, no App/update needed) ────────

#[test]
fn round_trip_preserves_intent_and_rationale() {
    let _dir = with_temp_draft(|| {
        let ws = make_wizard_with_intent("accent background");
        let draft = to_draft(&ws);
        save_wizard_draft(&draft);

        let loaded = load_wizard_draft().expect("draft should be on disk");
        let restored = from_draft(loaded);
        assert_eq!(restored.intent.value(), "accent background");
        assert_eq!(restored.rationale.value(), "");
    });
}

#[test]
fn round_trip_preserves_classification_fields() {
    use design_data_core::graph::Layer;
    let _dir = with_temp_draft(|| {
        let mut ws = make_wizard_with_intent("color");
        ws.classification.layer = Layer::Platform;
        ws.classification.property = tui_input::Input::from("background-color".to_string());

        let restored = from_draft(to_draft(&ws));
        assert_eq!(restored.classification.layer, Layer::Platform);
        assert_eq!(restored.classification.property.value(), "background-color");
    });
}

#[test]
fn round_trip_preserves_screen() {
    let _dir = with_temp_draft(|| {
        let mut ws = make_wizard_with_intent("bg");
        ws.screen = WizardScreen::Classification;
        let restored = from_draft(to_draft(&ws));
        assert_eq!(restored.screen, WizardScreen::Classification);
    });
}

#[test]
fn restoring_resets_transient_fields() {
    let ws = make_wizard_with_intent("something");
    let mut ws2 = from_draft(to_draft(&ws));
    ws2.diff_preview = Some("fake diff".to_string());
    let restored = from_draft(to_draft(&ws));
    assert!(restored.suggestions.is_empty());
    assert!(restored.diff_preview.is_none());
    assert!(restored.error.is_none());
    assert!(!restored.editing_schema_url);
    assert!(!restored.values.editing);
}

// ── Model lifecycle: restore ──────────────────────────────────────────────────

#[test]
fn model_new_with_options_restores_wizard_from_disk() {
    let _dir = with_temp_draft(|| {
        let ws = make_wizard_with_intent("restore test");
        save_wizard_draft(&to_draft(&ws));

        let model = Model::new_with_options(true);
        assert!(
            matches!(model.modal(), Some(Modal::Wizard(_))),
            "Model::new_with_options(true) should restore wizard from disk"
        );
        if let Some(Modal::Wizard(ref ws)) = model.modal() {
            assert_eq!(ws.intent.value(), "restore test");
        }
    });
}

#[test]
fn model_new_with_options_false_ignores_draft() {
    let _dir = with_temp_draft(|| {
        let ws = make_wizard_with_intent("should be ignored");
        save_wizard_draft(&to_draft(&ws));

        let model = Model::new_with_options(false);
        assert!(
            !model.is_modal_open(),
            "--no-resume-wizard: modal should be None even if draft exists on disk"
        );
        let path = wizard_draft_path().unwrap();
        assert!(
            path.exists(),
            "draft file should remain untouched with --no-resume-wizard"
        );
    });
}

#[test]
fn model_new_with_no_draft_starts_with_no_modal() {
    let _dir = with_temp_draft(|| {
        let model = Model::new_with_options(true);
        assert!(!model.is_modal_open(), "no draft → no modal");
    });
}

// ── Model lifecycle: clear on cancel ─────────────────────────────────────────

#[test]
fn cancelling_wizard_returns_draft_clear_task() {
    let _dir = with_temp_draft(|| {
        let graph = empty_graph();
        let ctx = update_ctx(&graph);
        let mut model = Model::new();

        // Open wizard and persist a draft manually.
        update(
            &mut model,
            Message::PaletteSubmit("new test token".into()),
            &ctx,
        );
        assert!(model.is_modal_open(), "wizard should be open");
        if let Some(Modal::Wizard(ref ws)) = model.modal() {
            save_wizard_draft(&to_draft(ws));
        }
        assert!(
            wizard_draft_path().unwrap().exists(),
            "draft should be on disk"
        );

        // Cancel — should return Task::Cmd that clears the draft.
        let task = update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
        assert!(!model.is_modal_open(), "modal should be closed after Esc");
        assert!(
            task.is_cmd(),
            "cancel should return Task::Cmd for draft clear"
        );

        // Execute the task to verify it clears the draft file.
        if let Task::Cmd(f) = task {
            f();
        }
        assert!(
            !wizard_draft_path().unwrap().exists(),
            "draft should be cleared after cancel"
        );
    });
}

// ── Model lifecycle: auto-save on keystrokes ──────────────────────────────────

#[test]
fn wizard_keystroke_returns_persist_task() {
    let _dir = with_temp_draft(|| {
        let graph = TokenGraph::default();
        let ctx = update_ctx(&graph);
        let mut model = Model::new();

        update(&mut model, Message::PaletteSubmit("new".into()), &ctx);
        assert!(model.is_modal_open());

        // Type into intent field — each key that advances WizardEvent::Continue
        // should return Task::Cmd (save_wizard_draft).
        let task = update(&mut model, Message::Key(key(KeyCode::Char('a'))), &ctx);
        // WizardEvent::Continue → Task::Cmd(save_wizard_draft)
        assert!(
            task.is_cmd(),
            "wizard keystroke should return Task::Cmd (save_wizard_draft)"
        );

        // Execute any task so the draft lands on disk.
        if let Task::Cmd(f) = task {
            f();
        }
        let task2 = update(&mut model, Message::Key(key(KeyCode::Char('b'))), &ctx);
        if let Task::Cmd(f) = task2 {
            f();
        }

        let draft_path = wizard_draft_path().unwrap();
        assert!(
            draft_path.exists(),
            "wizard keystrokes should auto-save draft via Task::Cmd"
        );

        let loaded = load_wizard_draft().expect("draft should be loadable");
        let restored = from_draft(loaded);
        assert_eq!(
            restored.intent.value(),
            "ab",
            "persisted intent should match typed text"
        );
    });
}
