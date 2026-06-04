---
"@adobe/design-data-tui": patch
---
Add tui-verify skill, generic rmux runner, and layout size-breakpoint tests.

- **.claude/skills/tui-verify/SKILL.md**: new agent skill teaching the 3-tier
  verification strategy (in-process buffer assertions, live rmux+asciinema,
  visual asciinema+agg / Ghostty+screencapture).
- **tools/demo/auto/verify-tui.sh**: generic ad-hoc TUI verification runner;
  sources `lib/rmux-drive.sh`, accepts a step file
  (send/type/wait/expect/refute directives), drives the real binary at 120×36.
- **tools/demo/moon.yml**: add `demo:tui-verify` task (local, rmux on PATH).
- **sdk/tui/tests/layout.rs**: committed layout breakpoint tests at 120×36,
  80×24, 80×33 (exact logo threshold), 80×32 (one below), and panic-safety
  cases. Documents that the logo threshold in terminal coordinates is 33 rows
  (content area = terminal_height - 2).
