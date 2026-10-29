// Copyright 2026 Adobe. All rights reserved.
import type { Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";

/** Authoring controls only render in edit mode, so specs that edit data must opt in. */
export async function enableEditMode(page: Page) {
  const snapshot = createDefaultSnapshot();
  await page.addInitScript(
    ({ key, record }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(record));
    },
    {
      key: AUTHORING_STORAGE_KEY,
      record: {
        version: 1,
        working: snapshot,
        saved: snapshot,
        isEditing: true,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
}
