---
name: notifications
description: How to give users feedback in spectrum-studio when they add, delete, copy, or fail at something. Use when adding any add or delete button, a new kind of authored item, an Undo, a toast, or a confirmation dialog, or when reviewing duplicate or missing toasts. Covers useNotify, the NOTIFICATION_KINDS table, the automatic delete dialog, wording, and tests.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Notifications

Rules: `.agents/rules/notifications.mdc`. Code: `src/features/notifications/`
(`policy.ts` rules and wording, `impact.ts` dry run, `center.ts` one notice per
action) and `src/components/notifications/` (provider and `useNotify`).

## Steps for a new action

1. Decide the action type with the table in `notifications.mdc`. Value edits get
   no notification.
2. Find or add the kind in `NOTIFICATION_KINDS` (`policy.ts`). Pick the tier:
   - `part`: a piece inside an item being edited. Silent.
   - `item`: an authored item. Toast with Undo.
   - `api`: always part of the exported design data. Always confirmed.
3. Call `useNotify()` in the component:

   ```tsx
   const notify = useNotify();

   notify.added("rule", () => addRule(draft));

   notify.remove({
     kind: "rule",
     run: (store) => store.set(deleteRuleAtom, rule.id),
     undo: (removed) => removed && restoreRule(removed),
     onDone: () => setSelected(undefined),
   });
   ```

4. Do not add your own `AlertDialog` for a delete. `notify.remove` shows one
   when the dry run finds removed token names. If a dialog must stay (for
   example a picker of what to delete), pass `confirmed: true`.
5. Wrap Cancel, Reset all, and bulk restores in `notify.quietly(...)` so they do
   not raise "Term added to registry".

## Avoid

- Importing `ToastQueue` or `ToastContainer`.
- Two notifications for one click (for example `notify.error` after
  `notify.edit` already reported it).
- Red toasts for successful deletes.
- Question-mark dialog titles or "OK"/"Yes" buttons.
- Toasting inside atoms or effects that run without a user action.

## Tests

- `pnpm test:notifications`: rules, de-duplication, the color scale
  dialog-delete-undo cycle, and the static usage scan.
- Add a case to `tests/notifications.ts` when you add a kind with special
  behavior.
- `pnpm lint` catches restricted imports.
