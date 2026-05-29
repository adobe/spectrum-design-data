# TUI Replay Debugging

The TUI supports recording and replaying sessions for deterministic bug reproduction.

## Recording a session

```sh
design-data --record /tmp/session.jsonl packages/design-data-spec/tokens
```

Every `Message` dispatched during the session is appended to the file as one line of
newline-delimited JSON (NDJSON). The file is human-readable and can be truncated with
a text editor.

## Replaying a session

```sh
design-data --replay /tmp/session.jsonl packages/design-data-spec/tokens
```

The replay path feeds each recorded message through `update` with a `TestBackend`,
then prints the final rendered buffer to stdout. No terminal is required.

## Bisecting a bug

1. Record a session that reproduces the bug.
2. Find the approximate failing message with binary search:

```sh
# Keep only the first N lines and replay.
head -N /tmp/session.jsonl > /tmp/half.jsonl
design-data --replay /tmp/half.jsonl packages/design-data-spec/tokens
```

3. Narrow `N` until you find the exact message that triggers the wrong state.
4. Inspect that line of the NDJSON to understand the event:

```sh
sed -n '42p' /tmp/session.jsonl | python3 -m json.tool
```
