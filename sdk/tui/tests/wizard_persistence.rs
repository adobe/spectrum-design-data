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

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers};
use design_data_core::graph::TokenGraph;
use design_data_tui::app::{App, Modal};
use design_data_tui::wizard::{WizardCtx, WizardScreen, WizardState};
use design_data_tui::wizard_draft::{
    from_draft, load_wizard_draft, save_wizard_draft, to_draft, wizard_draft_path,
};
use tempfile::TempDir;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::NONE,
        kind: KeyEventKind::Press,
        state: KeyEventState::NONE,
    }
}

fn empty_ctx(graph: &TokenGraph) -> WizardCtx<'_> {
    WizardCtx { graph, dataset_path: None, schema_registry: None, allow_write: false }
}

// Serialize env-touching tests within this binary to prevent concurrent tests
// from stomping on DESIGN_DATA_TUI_WIZARD_DRAFT.
//
// Scope note: cargo test compiles each tests/*.rs file into a separate binary,
// so this Mutex only covers tests inside wizard_persistence.rs. That's sufficient
// because no other test binary in this crate sets DESIGN_DATA_TUI_WIZARD_DRAFT.
// If a future test file also needs to touch this var, extract the lock into a
// shared test-helper crate or use a file-based lock instead.
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

// ── Round-trip ────────────────────────────────────────────────────────────────

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
        // Simulate setting property via Input::from (mirrors how handle_key would do it)
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

// ── Transient fields reset on restore ────────────────────────────────────────

#[test]
fn restoring_resets_transient_fields() {
    let ws = make_wizard_with_intent("something");
    let mut ws2 = from_draft(to_draft(&ws));
    ws2.diff_preview = Some("fake diff".to_string()); // would be set post-restore
    let restored = from_draft(to_draft(&ws));
    assert!(restored.suggestions.is_empty(), "suggestions should be empty on restore");
    assert!(restored.diff_preview.is_none(), "diff_preview should be None on restore");
    assert!(restored.error.is_none(), "error should be None on restore");
    assert!(!restored.editing_schema_url, "editing_schema_url should be false");
    assert!(!restored.values.editing, "values.editing should be false");
}

// ── App lifecycle: restore ────────────────────────────────────────────────────

#[test]
fn app_new_restores_wizard_from_disk() {
    let _dir = with_temp_draft(|| {
        // Write a draft to disk.
        let ws = make_wizard_with_intent("restore test");
        save_wizard_draft(&to_draft(&ws));

        // A fresh App should pick it up.
        let app = App::new();
        assert!(
            matches!(app.modal, Some(Modal::Wizard(_))),
            "App::new() should restore wizard from disk"
        );
        if let Some(Modal::Wizard(ref ws)) = app.modal {
            assert_eq!(ws.intent.value(), "restore test");
        }
    });
}

#[test]
fn app_new_with_options_false_ignores_draft() {
    let _dir = with_temp_draft(|| {
        let ws = make_wizard_with_intent("should be ignored");
        save_wizard_draft(&to_draft(&ws));

        let app = App::new_with_options(false);
        assert!(
            app.modal.is_none(),
            "--no-resume-wizard: modal should be None even if draft exists on disk"
        );

        // Draft file should still be there (we didn't delete it).
        let path = wizard_draft_path().unwrap();
        assert!(path.exists(), "draft file should remain untouched with --no-resume-wizard");
    });
}

#[test]
fn app_new_with_no_draft_starts_with_no_modal() {
    let _dir = with_temp_draft(|| {
        // No draft file exists — no wizard on startup.
        let app = App::new();
        assert!(app.modal.is_none(), "no draft → no modal");
    });
}

// ── App lifecycle: clear on cancel ───────────────────────────────────────────

#[test]
fn cancelling_wizard_clears_disk_draft() {
    let _dir = with_temp_draft(|| {
        let graph = TokenGraph::default();
        let mut app = App::new();

        // Open the wizard via keyboard.
        app.handle_key(key(KeyCode::Char(':')));
        for ch in "new test token".chars() {
            app.handle_key(key(KeyCode::Char(ch)));
        }
        app.handle_key(key(KeyCode::Enter));
        let ctx = design_data_tui::app::SubmitContext::new(&graph);
        app.submit_palette(&ctx);
        assert!(app.modal.is_some(), "wizard should be open");

        // Persist something.
        if let Some(Modal::Wizard(ref ws)) = app.modal {
            save_wizard_draft(&to_draft(ws));
        }
        assert!(wizard_draft_path().unwrap().exists(), "draft should be on disk");

        // Cancel.
        app.handle_modal_key(key(KeyCode::Esc), &empty_ctx(&graph));
        assert!(app.modal.is_none(), "modal should be closed after Esc");
        assert!(
            !wizard_draft_path().unwrap().exists(),
            "draft should be cleared after cancel"
        );
    });
}

// ── App lifecycle: auto-save on keystrokes ────────────────────────────────────

#[test]
fn wizard_keystroke_persists_state() {
    let _dir = with_temp_draft(|| {
        let graph = TokenGraph::default();
        let mut app = App::new();

        // Open wizard.
        app.handle_key(key(KeyCode::Char(':')));
        for ch in "new".chars() {
            app.handle_key(key(KeyCode::Char(ch)));
        }
        app.handle_key(key(KeyCode::Enter));
        let ctx = design_data_tui::app::SubmitContext::new(&graph);
        app.submit_palette(&ctx);

        // Type into intent field — each key should persist.
        let wiz_ctx = empty_ctx(&graph);
        app.handle_modal_key(key(KeyCode::Char('a')), &wiz_ctx);
        app.handle_modal_key(key(KeyCode::Char('b')), &wiz_ctx);

        let draft_path = wizard_draft_path().unwrap();
        assert!(draft_path.exists(), "wizard keystrokes should auto-save draft");

        let loaded = load_wizard_draft().expect("draft should be loadable");
        let restored = from_draft(loaded);
        assert_eq!(restored.intent.value(), "ab", "persisted intent should match typed text");
    });
}
