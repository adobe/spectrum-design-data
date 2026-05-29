# TUI Architecture

The `design-data` TUI follows **The Elm Architecture (TEA)** — a functional
state machine where a single `update` function is the only place state can change, and
all I/O is described as data (`Task`) rather than executed inline.

## Layered overview

```
cli/src/main.rs → app_launch::launch  parse args, build Model + UpdateCtx, call lib::run
   │
runtime.rs     Event loop — poll crossterm → Message → update → execute_task → draw
   │                └── execute_task runs Task::Cmd closures synchronously
   │
update.rs      Pure state-transition function
   │           update(model, msg, ctx) -> Task<Message>
   │           No fs/clipboard/network — those return Task::Cmd
   │
model.rs       Application state (mode: Mode, active_view, palette_history, …)
   │
view.rs        Rendering — draw(model, frame, theme, primer_line)
               Stateless; called once per frame
```

## Core types

### `Message`

A flat event enum (`src/message.rs`). Every user action that can change state is a
`Message` variant. Serializable (Serde) for `--record`/`--replay` debugging.

Key variants: `Key(KeyEvent)`, `Mouse(MouseEvent)`, `Tick`, `PaletteSubmit(String)`,
`WriteDone(Result<PathBuf, String>)`, `ClipboardDone(Option<String>)`.

**Variant size budget: ≤ 128 bytes.** Box large payloads. Enforced by `tests/budget.rs`.

### `Model`

Application state (`src/model.rs`). A single `mode: Mode` sum type replaces the old
flat boolean soup — impossible combinations (palette open while a modal is active) are
now compile-time errors.

```
Mode::Browsing(BrowsingState { mouse: MouseMode })
Mode::InModal(ModalState { modal: Modal })
Mode::InPalette(PaletteState { mode, input, history_cursor })

MouseMode::Normal | SelectionEnabled | Selecting { start, end }
```

Other fields at root: `quit`, `active_view`, `status_message`, `pending_yank`,
`palette_history`, `hit_regions`.

### `Task<Msg>`

A description of side work to run **outside** `update` (`src/task.rs`).

```rust
Task::None                                    // nothing to do
Task::Cmd(Box<dyn FnOnce() -> Msg + Send>)    // run a closure, feed result back
Task::Batch(Vec<Task<Msg>>)                   // run several tasks
```

The runtime calls `execute_task` after each `update` call. All current `Cmd` closures
are synchronous (FS writes, clipboard) — async is deferred.

### `UpdateCtx<'a>`

Read-only external context passed alongside `Message` (`src/update.rs`). Holds the
token graph, dataset/schema paths, and the `allow_write` flag. Tests use
`UpdateCtx::minimal(graph)`, which sets all path fields to `None` and `allow_write`
to `false` — sufficient for tests that exercise key/palette/modal behavior without
touching the filesystem.

## The `update` contract

```rust
pub fn update(model: &mut Model, msg: Message, ctx: &UpdateCtx<'_>) -> Task<Message>
```

* **Must not** call `std::fs`, clipboard, or any async runtime inline.
* **Must not** block — every potentially-slow operation returns `Task::Cmd`.
* Treat `UpdateCtx` as read-only; only `model` is mutated.
* Inline FS reads (`describe`, `validate`) are tagged `// TODO(#1023)`. Issue [#1023](https://github.com/adobe/spectrum-design-data/issues/1023)
  landed write-side effects (clipboard, draft) but the read-side migration is still
  open — see the TODO comments in `src/update_command.rs`.

## The runtime loop (`runtime::run`)

```
loop {
    draw(model, frame, theme, primer_line)  ← draw FIRST; first frame renders before any input
    rebuild hit_regions
    poll(16ms)
    if event:
        Key(Enter) while palette open → capture input text first
        → update(model, msg, ctx)
        → execute_task(task, model, ctx)
        if Enter closed palette → update(model, PaletteSubmit(text), ctx)
    else:
        → update(model, Tick, ctx)
    if model.quit { break }
}
```

## Testing patterns

### Unit tests — `update` directly

```rust
let graph = make_graph_with_tokens(&["accent-color"]);
let ctx = update_ctx(&graph);          // UpdateCtx::minimal
let mut model = Model::new();

update(&mut model, Message::PaletteSubmit("query property=accent-color".into()), &ctx);
assert!(matches!(model.active_view, ActiveView::Query(_)));
```

### Render tests — Buffer-cell assertions

```rust
let buf = render_to_buffer(&mut model, 80, 24);
assert_eq!(buf.cell((0, 0)).unwrap().symbol(), "▶");    // primer arrow
find_row_containing(&buf, "accent-color", 80, 24);      // token in results
```

### Replay tests — deterministic message streams

```rust
replay(&mut terminal, Model::new(), &ctx, &Theme::terminal(), TEST_PRIMER,
       vec![Message::PaletteSubmit("query property=accent-color".into())].into_iter())?;
```

See `REPLAY.md` for the `--record`/`--replay` CLI workflow.

## Non-goals

* **No `Component` trait** — iced deprecated it as an anti-pattern in TEA-on-Rust.
  Use plain Rust functions instead.
* **No second frontend** — `view.rs` targets Ratatui only. Targeting a web UI would
  require a separate rendering layer.
* **No async runtime** — `Task::Perform` and subscription streams are deferred until
  needed. The current polling cadence is sufficient.
* **No rewrite in one PR** — `App` and its methods are still present for backward-
  compat integration tests (`write.rs`, `wizard_persistence.rs`). They will be retired
  gradually as tests migrate.

## References

* [iced 0.14](https://github.com/iced-rs/iced) — `Task<Message>`, identity-keyed
  `Subscription`, flat Message enum, `&mut Model` in update
* [rmux](https://github.com/Helvesec/rmux) — the `tests/budget.rs` LOC-cap pattern
  and `Buffer`-cell assertion style were borrowed from rmux's render-testing approach
* [ratatui-elm](https://github.com/justdeeevin/ratatui-elm) — closest ratatui+Elm
  precedent; review before extending the runtime adapter
