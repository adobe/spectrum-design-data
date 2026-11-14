// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `:preview <component>` end to end: the real dataset through the palette, the overlay
//! drawn into a `TestBackend`, and the keys that redraw it. The font search is pointed at an
//! empty machine so the result does not depend on the fonts installed where this runs.

mod common;
use common::{empty_graph, key, render_to_buffer, settle, update_ctx_builder};

use crossterm::event::KeyCode;
use design_data_core::data_source::{self, CliPathOverrides};
use design_data_core::raster::font::discover::{Env, Os};
use design_data_tui::app::Modal;
use design_data_tui::preview::{PreviewRequest, PreviewSource, PreviewState};
use design_data_tui::{Message, Model};
use ratatui::{buffer::Buffer, style::Color};
use std::path::PathBuf;
use std::sync::Arc;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn source() -> Arc<PreviewSource> {
    let root = repo_root();
    let resolved = data_source::resolve(&root, &CliPathOverrides::default()).expect("resolve");
    let no_fonts = Env {
        os: Os::Linux,
        home: None,
        win_dir: None,
        local_app_data: None,
        app_data: None,
        font_override: None,
    };
    Arc::new(
        PreviewSource::new(root.join("packages/design-data/tokens"), Arc::new(resolved))
            .with_font_env(no_fonts),
    )
}

fn preview(model: &Model) -> &PreviewState {
    match model.modal() {
        Some(Modal::Preview(p)) => p,
        _ => panic!("no preview overlay is open"),
    }
}

fn run(model: &mut Model, input: &str) {
    let graph = empty_graph();
    let ctx = update_ctx_builder(&graph).preview(source()).build();
    settle(model, Message::PaletteSubmit(input.into()), &ctx);
}

fn press(model: &mut Model, code: KeyCode) {
    let graph = empty_graph();
    let ctx = update_ctx_builder(&graph).preview(source()).build();
    settle(model, Message::Key(key(code)), &ctx);
}

fn text(buf: &Buffer) -> String {
    (0..buf.area.height)
        .map(|y| {
            (0..buf.area.width)
                .map(|x| buf[(x, y)].symbol())
                .collect::<String>()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn half_block_cells(buf: &Buffer) -> usize {
    let mut n = 0;
    for y in 0..buf.area.height {
        for x in 0..buf.area.width {
            n += usize::from(buf[(x, y)].symbol() == "▀");
        }
    }
    n
}

#[test]
fn the_palette_opens_an_overlay_with_the_component_drawn_in_half_blocks() {
    let mut model = Model::new();
    run(&mut model, "preview badge");
    let p = preview(&model);
    assert_eq!(p.request.component, "badge");
    assert!(!p.request.size.is_empty() && p.sizes.contains(&p.request.size));
    assert!(p.width > 100 && p.height > 40 && p.rgba.len() == (p.width * p.height * 4) as usize);
    assert!(
        p.font_fallback && p.font.contains("bundled Source Sans 3"),
        "{}",
        p.font
    );
    assert!(
        model.status_message.is_none(),
        "the 'rendering' message is cleared"
    );

    let buf = render_to_buffer(&mut model, 100, 36);
    let shown = text(&buf);
    assert!(shown.contains("Preview: badge"), "{shown}");
    assert!(shown.contains("Font: bundled Source Sans 3"), "{shown}");
    assert!(
        shown.contains("design-data fonts"),
        "the fallback says how to fix it"
    );
    assert!(shown.contains("c light/dark · s size · t state · Esc close"));
    assert!(half_block_cells(&buf) > 100, "the picture is drawn");
}

#[test]
fn the_keys_draw_it_again_and_escape_closes() {
    let mut model = Model::new();
    run(&mut model, "preview badge");
    let before = preview(&model).clone();

    press(&mut model, KeyCode::Char('c'));
    let dark = preview(&model);
    assert_eq!(dark.request.color_scheme, "dark");
    assert_ne!(dark.rgba, before.rgba, "dark colors differ");
    press(&mut model, KeyCode::Char('c'));
    assert_eq!(preview(&model).request.color_scheme, "light");
    assert_eq!(
        preview(&model).rgba,
        before.rgba,
        "back to the first picture"
    );

    press(&mut model, KeyCode::Char('s'));
    assert_ne!(preview(&model).request.size, before.request.size);
    press(&mut model, KeyCode::Char('t'));
    assert_eq!(preview(&model).request.states, vec!["hover"]);

    // Keys with no meaning in the overlay do nothing and reach nothing behind it.
    press(&mut model, KeyCode::Char('x'));
    press(&mut model, KeyCode::Down);
    assert!(model.modal().is_some());
    press(&mut model, KeyCode::Esc);
    assert!(model.modal().is_none(), "Esc closes the overlay");
    assert!(!model.quit);
}

#[test]
fn arguments_choose_the_size_state_and_scheme() {
    let mut model = Model::new();
    run(&mut model, "preview badge size=l state=hover scheme=dark");
    let p = preview(&model);
    assert_eq!(p.request.size, "l");
    assert_eq!(p.request.states, vec!["hover"]);
    assert_eq!(p.request.color_scheme, "dark");
    let shown = text(&render_to_buffer(&mut model, 100, 36));
    assert!(
        shown.contains("Preview: badge · l · dark · hover"),
        "{shown}"
    );
}

#[test]
fn an_unknown_component_names_the_ones_that_exist() {
    let mut model = Model::new();
    run(&mut model, "preview zzz-nope");
    assert!(model.modal().is_none());
    let msg = model
        .status_message
        .as_ref()
        .expect("an error is shown")
        .text
        .clone();
    assert!(
        msg.contains("no visual recipe for 'zzz-nope'") && msg.contains("available:"),
        "{msg}"
    );
    assert!(msg.contains("badge") && msg.contains("button"), "{msg}");
}

#[test]
fn bad_arguments_never_start_a_render() {
    for (input, want) in [
        ("preview", "component ID required"),
        ("preview Badge", "invalid component ID"),
        ("preview badge color=red", "unknown option 'color'"),
        ("preview badge size", "expected name=value"),
    ] {
        let mut model = Model::new();
        run(&mut model, input);
        let msg = model
            .status_message
            .as_ref()
            .map(|m| m.text.clone())
            .unwrap_or_default();
        assert!(msg.contains(want), "{input}: {msg}");
        assert!(model.modal().is_none());
    }
    // A session with no dataset says so rather than doing nothing.
    let graph = empty_graph();
    let ctx = update_ctx_builder(&graph).build();
    let mut model = Model::new();
    settle(
        &mut model,
        Message::PaletteSubmit("preview badge".into()),
        &ctx,
    );
    assert!(model
        .status_message
        .unwrap()
        .text
        .contains("no dataset loaded"));
}

#[test]
fn a_late_result_never_replaces_another_modal_and_a_failure_keeps_the_picture() {
    let state = source()
        .render(&PreviewRequest::parse("badge").unwrap())
        .unwrap();
    let graph = empty_graph();
    let ctx = update_ctx_builder(&graph).preview(source()).build();

    // The user opened Help while the render ran: the result is dropped.
    let mut model = Model::new();
    settle(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    assert!(matches!(model.modal(), Some(Modal::Help(_))));
    settle(
        &mut model,
        Message::PreviewDone(Box::new(Ok(state.clone()))),
        &ctx,
    );
    assert!(matches!(model.modal(), Some(Modal::Help(_))));

    // A redraw that fails leaves the old picture and says why in the footer.
    let mut model = Model::new();
    settle(&mut model, Message::PreviewDone(Box::new(Ok(state))), &ctx);
    settle(
        &mut model,
        Message::PreviewDone(Box::new(Err("size 'xxl' is not in this recipe".into()))),
        &ctx,
    );
    assert_eq!(preview(&model).notes[0], "size 'xxl' is not in this recipe");
    let shown = text(&render_to_buffer(&mut model, 100, 36));
    assert!(
        shown.contains("Note: size 'xxl' is not in this recipe"),
        "{shown}"
    );
}

#[test]
fn half_block_cells_carry_the_picture_colors() {
    // A 2x2 picture: red on top, blue below. Drawn at the maximum zoom of 3 it is six cells
    // wide and three tall; the middle row straddles the colors.
    let mut rgba = Vec::new();
    for color in [
        [255, 0, 0, 255],
        [255, 0, 0, 255],
        [0, 0, 255, 255],
        [0, 0, 255, 255],
    ] {
        rgba.extend_from_slice(&color);
    }
    let state = PreviewState {
        request: PreviewRequest::parse("badge size=m").unwrap(),
        sizes: vec!["m".into()],
        width: 2,
        height: 2,
        rgba,
        scene_width: 2.0,
        scene_height: 2.0,
        font: "test.ttf".into(),
        font_fallback: false,
        notes: vec![],
    };
    let graph = empty_graph();
    let ctx = update_ctx_builder(&graph).build();
    let mut model = Model::new();
    settle(&mut model, Message::PreviewDone(Box::new(Ok(state))), &ctx);
    let buf = render_to_buffer(&mut model, 60, 20);
    let mut seen = [false; 3];
    for y in 0..buf.area.height {
        for x in 0..buf.area.width {
            let c = &buf[(x, y)];
            if c.symbol() != "▀" {
                continue;
            }
            match (c.fg, c.bg) {
                (Color::Rgb(255, 0, 0), Color::Rgb(255, 0, 0)) => seen[0] = true,
                (Color::Rgb(255, 0, 0), Color::Rgb(0, 0, 255)) => seen[1] = true,
                (Color::Rgb(0, 0, 255), Color::Rgb(0, 0, 255)) => seen[2] = true,
                other => panic!("unexpected cell colors {other:?}"),
            }
        }
    }
    assert_eq!(seen, [true; 3]);
    assert_eq!(half_block_cells(&buf), 6 * 3);
}

#[test]
fn a_tiny_terminal_does_not_panic() {
    let mut model = Model::new();
    run(&mut model, "preview badge");
    for (w, h) in [(20, 6), (8, 4), (1, 1), (200, 60)] {
        let _ = render_to_buffer(&mut model, w, h);
    }
}
